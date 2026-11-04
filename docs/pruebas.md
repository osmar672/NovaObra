# Informe de pruebas

Fecha: 4 de noviembre de 2026. Ejecución real en Linux x86_64, Node.js 24.22.1 y MySQL 8.0.46 (Ubuntu), con InnoDB. La instancia MySQL se ejecutó localmente sin Docker. Los paquetes se verificaron mediante firma del índice oficial de Ubuntu y hashes SHA-256 antes de usarlos.

## Resultados

| Comando y directorio                    | Resultado                                         | Cobertura ejecutada                                                                                                                           |
| --------------------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm test` en backend                   | 5 pruebas aprobadas                               | IDs, cantidades, importes, correos, fechas, campos prohibidos, protección de estados, JSON y respuestas HTTP                                  |
| `npm run test:integration` en backend   | 5 pruebas aprobadas (2 escenarios y 3 subpruebas) | MySQL real, diez tablas y diez claves foráneas, restricciones, CRUD, inventario, rollback, precisión monetaria y consulta/edición concurrente |
| `npm run test:ui` en frontend           | 8 escenarios aprobados                            | Chromium con React → Express → MySQL; CRUD de los cinco catálogos, navegación, compras/ventas, ajustes y regresiones de respuestas atrasadas  |
| Newman 6.2.3, colección de verificación | 139 solicitudes y 419 aserciones aprobadas        | Diez recursos, persistencia, validaciones, estados comerciales, stock, cancelaciones y reintentos                                             |
| `npm run build` en frontend             | Aprobado                                          | Compilación de producción React/Vite                                                                                                          |
| `npm run db:setup -- --seed` en backend | Aprobado                                          | Esquema y datos iniciales en novaobra_db                                                                                                      |

La prueba de concurrencia envía dos confirmaciones simultáneas que compiten por las mismas unidades: una obtiene 200 y la otra 409; el saldo final permanece no negativo. El rollback se verifica intentando una venta de dos productos: el primero tiene stock y el segundo no. Se comprueba que no cambian ni el stock inicial, ni el estado del borrador, ni el número de movimientos.

La cancelación de una compra con unidades ya vendidas se rechaza por stock insuficiente. Tras cancelar la venta, la cancelación de la compra sí se completa. Confirmar o cancelar de nuevo no duplica movimientos. Un ajuste repetido con la misma clave de solicitud responde 409 y no duplica el saldo.

Las pruebas de navegador crean registros reales y comprueban su persistencia consultando la API que lee MySQL. Los catálogos temporales se eliminan al terminar; el escenario comercial conserva su producto y las operaciones canceladas como historial, con stock cero. No usa datos simulados. La integración de backend usa bases temporales independientes y las elimina al finalizar.

## Regresiones de esta revisión

- **Navegación:** se retiene una respuesta real de categorías, se navega a proveedores y se libera la respuesta anterior. La tabla debe conservar los proveedores. También se retiene la consulta de un detalle comercial: al cambiar de sección, ese resultado no debe abrir otro formulario. No se sustituyen datos con respuestas simuladas.
- **Consulta comercial concurrente:** se fuerza una edición real entre el momento de leer una operación y entregar su resultado HTTP. Tanto compras como ventas deben devolver total y líneas coherentes. La lectura corregida usa un solo JOIN.
- **Precisión:** valores como `12.340001`, `0.000001` y `1.0000000000000002` se rechazan con 400 en productos y detalles comerciales, sin guardar cambios. Se aceptan valores normales como `0.29`, `1.1` y el máximo permitido.
- **Formularios pendientes:** se prueban creación, consulta, edición y eliminación de proveedores, clientes y empleados; correo inválido, desactivación cuando corresponde y rechazo de una eliminación cancelada por el usuario.
- **Ajustes:** se prueban entrada, salida, cantidad negativa, stock insuficiente, compensación y repetición de la clave enviada realmente por React. El historial queda conciliado con saldo cero.

Las nuevas regresiones se contrastaron con el código anterior. Las dos de navegación fallaron con el frontend anterior y pasaron con la corrección. En backend, el código anterior aceptó precios inválidos (201 en lugar de 400) y devolvió total 7 con líneas que sumaban 29.75 en la lectura intercalada; las correcciones superaron esos mismos casos. El código corregido quedó restaurado después de esa comprobación.

Todas las pruebas ampliadas usaron bases MySQL temporales. Las de integración crean y eliminan sus propias bases; UI y Newman ejecutaron fixtures independientes sobre otra base temporal con semilla y una cuenta limitada a esa base. Los datos existentes de novaobra_db no se usaron para esta revisión.

## Reproducir

Desde backend, con MySQL iniciado y `.env` configurado:

```sh
npm ci
npm test
npm run test:integration
```

La integración necesita un usuario de pruebas con permisos para crear y eliminar bases `novaobra_test_*`. No usar una cuenta administrativa para el servidor habitual. Un usuario limitado a novaobra_db puede ejecutar la aplicación, pero no el ejecutor aislado de integración.

Para UI, iniciar `npm start` en backend y `npm run dev` en frontend. Desde otra terminal en frontend:

```sh
npx playwright-core install chromium
npm run test:ui
```

Si Chromium ya está instalado, definir `CHROMIUM_PATH` con su ruta. En esta máquina Linux se ejecutó:

```sh
CHROMIUM_PATH=/usr/bin/chromium CHROMIUM_NO_SANDBOX=1 npm run test:ui
```

CHROMIUM_NO_SANDBOX solo fue necesario para el navegador de pruebas en este contenedor. El proyecto no depende de Docker. La descarga de un navegador para pruebas puede requerir acceso adicional a los servidores de Playwright; no es necesaria para iniciar NovaObra. En PowerShell configurar las variables de sesión con `$env:CHROMIUM_PATH` y después ejecutar el mismo comando npm.

## Colección Postman automatizada

Desde la raíz, con Express conectado a una base de desarrollo desechable:

```sh
npm exec --yes --package=newman@6.2.3 -- newman run postman/NovaObra.verificacion.postman_collection.json --bail
```

La colección crea sus propios catálogos y relaciones, captura los IDs de las respuestas y valida cada resultado. Conserva el historial de las operaciones comerciales con stock conciliado a cero. No ejecutarla contra una base de uso habitual. Puede importarse en Postman; en esta revisión se ejecutó mediante Newman, su ejecutor de colecciones. El informe JSON local `artifacts/postman-verificacion.json` registró 139 solicitudes, 419 aserciones y cero fallos y se excluye de Git y del ZIP por ser una salida regenerable.

## Fallos encontrados y resueltos

- MySQL no estaba instalado y la descarga directa inicial fue denegada por la red. Se utilizó una distribución oficial firmada de Ubuntu; las pruebas MySQL posteriores sí se ejecutaron y pasaron.
- La primera prueba del selector de categoría encontró un nombre accesible que incluía opciones. Se asignaron nombres accesibles explícitos a los controles y se volvió a ejecutar satisfactoriamente.
- Se reforzó el instalador para impedir la semilla cuando cualquiera de las tablas ya contiene datos. La semilla incluye IDs iniciales explícitos y su repetición se rechaza sin duplicar registros.

## Límites de lo verificado

No se utilizó la aplicación de escritorio Postman. Su colección de verificación sí se ejecutó completa con Newman contra la API y MySQL reales. No se ha verificado Windows o macOS, ni realizado una prueba de carga o un despliegue público. La comprobación en la computadora de presentación sigue pendiente porque no se tiene acceso a ese equipo. La aplicación es académica y local, sin autenticación por requisito. Las pruebas son representativas de los flujos solicitados; no equivalen a cobertura exhaustiva de todas las combinaciones de datos.

El ZIP pasó la comprobación CRC y se extrajo en una carpeta limpia. Desde esa copia se ejecutaron `npm ci` tanto en backend como frontend, las cinco pruebas unitarias/HTTP, las cinco pruebas de integración (dos escenarios con tres subpruebas) con MySQL real y la compilación de producción. Todos pasaron. Se verificó que incluye los archivos de bloqueo y `.env.example`, y que excluye `.env`, `node_modules`, historial Git y archivos temporales. Las pruebas de navegador se ejecutaron contra los servicios iniciados desde el repositorio de desarrollo; la copia extraída se verificó mediante instalación, pruebas de backend/integración y compilación.

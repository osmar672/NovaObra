# Informe de pruebas

Fecha: 4 de noviembre de 2026. Ejecución real en Linux x86_64, Node.js 24.22.1 y MySQL 8.0.46 (Ubuntu), con InnoDB. La instancia MySQL se ejecutó localmente sin Docker. Los paquetes se verificaron mediante firma del índice oficial de Ubuntu y hashes SHA-256 antes de usarlos.

## Resultados

| Comando y directorio | Resultado | Cobertura ejecutada |
|---|---|---|
| `npm test` en backend | 5 pruebas aprobadas | IDs, cantidades, importes, correos, fechas, campos prohibidos, protección de estados, JSON y respuestas HTTP |
| `npm run test:integration` en backend | 2 escenarios aprobados | MySQL real, diez tablas, diez claves foráneas, CHECK, duplicados, CRUD, totales, confirmaciones, cancelaciones, rollback, reintentos y concurrencia; semilla consistente |
| `npm run test:ui` en frontend | 2 escenarios aprobados | Chromium con React → Express → MySQL; CRUD de categorías/productos, nueve módulos, viewport móvil, compra/venta con confirmación y cancelación |
| `npm run build` en frontend | Aprobado | Compilación de producción React/Vite |
| `npm run db:setup -- --seed` en backend | Aprobado | Esquema y datos iniciales en novaobra_db |

La prueba de concurrencia envía dos confirmaciones simultáneas que compiten por las mismas unidades: una obtiene 200 y la otra 409; el saldo final permanece no negativo. El rollback se verifica intentando una venta de dos productos: el primero tiene stock y el segundo no. Se comprueba que no cambian ni el stock inicial, ni el estado del borrador, ni el número de movimientos.

La cancelación de una compra con unidades ya vendidas se rechaza por stock insuficiente. Tras cancelar la venta, la cancelación de la compra sí se completa. Confirmar o cancelar de nuevo no duplica movimientos. Un ajuste repetido con la misma clave de solicitud responde 409 y no duplica el saldo.

Las pruebas de navegador crean registros reales y comprueban su persistencia consultando la API que lee MySQL. Los catálogos temporales se eliminan al terminar; el escenario comercial conserva su producto y las operaciones canceladas como historial, con stock cero. No usa datos simulados. La integración de backend usa bases temporales independientes y las elimina al finalizar.

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

## Fallos encontrados y resueltos

- MySQL no estaba instalado y la descarga directa inicial fue denegada por la red. Se utilizó una distribución oficial firmada de Ubuntu; las pruebas MySQL posteriores sí se ejecutaron y pasaron.
- La primera prueba del selector de categoría encontró un nombre accesible que incluía opciones. Se asignaron nombres accesibles explícitos a los controles y se volvió a ejecutar satisfactoriamente.
- Se reforzó el instalador para impedir la semilla cuando cualquiera de las tablas ya contiene datos. La semilla incluye IDs iniciales explícitos y su repetición se rechaza sin duplicar registros.

## Límites de lo verificado

No se ejecutó la aplicación Postman: se entrega su colección importable y se comprobaron los endpoints mediante los ejecutores HTTP. No se ha verificado Windows o macOS, ni realizado una prueba de carga o un despliegue público. La aplicación es académica y local, sin autenticación por requisito. Las pruebas son representativas de los flujos solicitados; no equivalen a cobertura exhaustiva de todas las combinaciones de datos.

El ZIP pasó la comprobación CRC y se extrajo en una carpeta limpia. Desde esa copia se ejecutaron `npm ci` tanto en backend como frontend, las cinco pruebas de backend, los dos escenarios de integración con MySQL real y la compilación de producción. Todos pasaron. Se verificó que incluye los archivos de bloqueo y `.env.example`, y que excluye `.env`, `node_modules`, historial Git y archivos temporales. Las pruebas de navegador se ejecutaron contra los servicios iniciados desde el repositorio de desarrollo; la copia extraída se verificó mediante instalación, pruebas de backend/integración y compilación.

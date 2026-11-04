# Informe de pruebas

Este informe corresponde a la revisión anterior con `novaobra_db`. Para la configuración actual `NovaObra` y el iniciador único, consultar [verificación del inicio](verificacion-inicio.md).

Fecha: 4 de noviembre de 2026. Ejecución real en Linux x86_64, Node.js 24.22.1, Chromium 155 y MySQL 8.0.46/InnoDB. Los binarios MySQL usados en la nube se obtuvieron de Ubuntu y se verificaron mediante firma del índice y SHA-256. No se utilizó Docker ni se agregaron dependencias de aplicación para las mejoras.

## Resultados de la revisión

| Verificación                        | Resultado                                  | Alcance ejecutado                                                                           |
| ----------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------- |
| `npm test`, backend                 | 6 pruebas aprobadas                        | Validación, respuestas HTTP, estados y analizador de respaldos                              |
| `npm run test:integration`, backend | 13 pruebas aprobadas                       | API/MySQL, inventario, concurrencia, reportes, CSV y configuración del instalador           |
| `npm run test:backup`, backend      | 1 integración aprobada                     | Respaldo y restauración real con clientes MySQL 8 y protecciones del destino                |
| `npm run test:migrations`, backend  | 2 pruebas aprobadas                        | Pasos 001/002, semilla, rollback, versión MySQL y protección previa de tablas/vistas ajenas |
| `npm run test:ui`, frontend         | 10 escenarios aprobados                    | Flujos anteriores más filtros, paginación, CSV, reportes, reposición y PDF real             |
| Newman, colección de verificación   | 139 solicitudes y 419 aserciones aprobadas | Diez recursos, CRUD, persistencia, estados y errores                                        |
| Newman, colección de mejoras        | 38 solicitudes y 99 aserciones aprobadas   | Reportes, nombres, filtros, CSV, comprobantes y reposición                                  |
| `npm run build`, frontend           | Aprobado                                   | Compilación React/Vite                                                                      |
| Arranque con puerto HTTP ocupado    | Aprobado                                   | Termina con código 1 y EADDRINUSE; no anuncia disponibilidad                                |

Los conteos de integración incluyen escenarios superiores y subpruebas del ejecutor de Node. No son un conteo de endpoints. Las dos colecciones Postman sumaron 177 solicitudes y 518 aserciones, sin fallos. Sus informes JSON regenerables se guardaron en `artifacts/` y se excluyen de Git y del ZIP.

## Casos comprobados

- **Inventario y concurrencia:** compras/ventas confirmadas actualizan stock y movimientos juntos. Dos ventas simultáneas que compiten por las mismas unidades dan 200 y 409, sin stock negativo. Una venta de varios productos con uno insuficiente deja todo igual mediante rollback. Confirmaciones, cancelaciones y claves repetidas no duplican movimientos.
- **Lecturas coherentes:** se fuerza una edición comercial real intercalada con una consulta. Total y líneas se mantienen de la misma instantánea. También se conservan las regresiones de navegación y detalles atrasados con respuestas reales retenidas, sin sustituir los datos.
- **Precios:** se rechaza precisión adicional como `12.340001`, sin guardar ni alterar registros; se aceptan importes normales y el máximo permitido.
- **Reportes:** límites de fechas inclusivos, exclusión de borradores/cancelaciones, ingresos, compras, cantidades y margen estimado correcto. El costo utilizado es el precio de compra actual, como indica la interfaz.
- **Consultas:** búsqueda literal de `%` y `_`, búsquedas por códigos/contactos/nombres, validación de estados/fechas/límites y rechazo de entradas de inyección SQL. La paginación conserva nombres relacionados y mantiene compatibilidad con listas sin paginar.
- **CSV:** BOM UTF-8, comillas y saltos de línea escapados, neutralización de cadenas que parecen fórmulas, filtros conservados y exportación de todas las páginas. Se comprobaron los bytes de descargas reales del navegador.
- **Reposición:** solo productos activos, stock menor o igual al mínimo, sugerencia hasta mínimo más una unidad, faltante y costo calculados. El enlace del dashboard abre el mismo conjunto filtrado.
- **Comprobantes:** cliente, empleado, códigos, nombres, precios y total coinciden con MySQL. Chromium generó PDF real con cabecera `%PDF`, comprobante visible y navegación oculta. Un comprobante abierto se invalida al cambiar la venta; al reabrir una venta cancelada muestra ese estado.
- **Respaldo/restauración:** se compararon las diez tablas y sus filas, claves foráneas, stock, contadores AUTO_INCREMENT con huecos y textos con comillas, acentos, saltos de línea y puntos y coma. Se rechazaron archivos ya existentes, datos SQL arbitrarios, cambios de base y destinos con tablas, incluso vacías o con triggers. Un fallo de clave foránea produjo rollback de inserciones. Las credenciales temporales se eliminaron.

UI y Newman utilizaron fixtures propios sobre una base temporal con semilla y cuenta limitada. Las integraciones crearon sus propias bases y las eliminaron al terminar. No se necesitó modificar los registros existentes de novaobra_db.

## Fallos detectados y corregidos

Las regresiones anteriores se contrastaron con el código previo: la navegación mostraba una tabla de otra sección, un detalle atrasado abría un formulario fuera de su pantalla y la lectura comercial podía mezclar total y líneas. Las correcciones superaron esos casos.

Durante estas mejoras se detectó que el acceso a productos por reponer incluía inactivos; se alineó el filtro con el dashboard y se repitieron las pruebas. La revisión final también cerró el comprobante obsoleto tras cancelar una venta y restringió la restauración a bases sin tablas ni vistas, para impedir estructuras o triggers preexistentes. Se verificó además que un puerto ocupado produce un error real de arranque.

## Reproducir

Desde backend, con MySQL 8 y una cuenta de pruebas autorizada para crear/eliminar bases temporales:

```sh
npm ci
npm test
npm run test:integration
npm run test:backup
npm run test:migrations
```

El respaldo requiere los clientes oficiales MySQL 8 en PATH o las variables MYSQL_PATH y MYSQLDUMP_PATH. La cuenta habitual limitada a novaobra_db sirve para la aplicación, pero no para crear todas las bases de pruebas.

Para UI, iniciar Express y Vite contra una base de desarrollo desechable con semilla. Desde frontend:

```sh
npm ci
npx playwright-core install chromium
npm run test:ui
```

En esta máquina se utilizó el navegador ya instalado:

```sh
CHROMIUM_PATH=/usr/bin/chromium CHROMIUM_NO_SANDBOX=1 npm run test:ui
```

La opción sin sandbox se necesitó exclusivamente para el navegador de pruebas del contenedor. En PowerShell se pueden definir las variables de sesión con `$env:CHROMIUM_PATH`. La descarga opcional de Chromium puede requerir otros destinos de red; no es necesaria para ejecutar la aplicación.

Desde la raíz, con Express conectado a una base de desarrollo desechable:

```sh
npm exec --yes --package=newman@6.2.3 -- newman run postman/NovaObra.verificacion.postman_collection.json --bail
npm exec --yes --package=newman@6.2.3 -- newman run postman/NovaObra.mejoras.postman_collection.json --bail
```

Las colecciones crean sus relaciones y conservan historial comercial conciliado. Se ejecutaron con Newman, no con la aplicación de escritorio Postman.

## Entrega y límites

El ZIP actualizado pasó la comprobación CRC, inspección de contenido y extracción limpia. Desde esa copia se ejecutaron npm ci en backend y frontend, las 6 pruebas unitarias/HTTP, las 12 de integración, la prueba real de respaldo/restauración y la compilación de producción: todas pasaron. Se confirmó que los archivos coinciden con el proyecto y que se excluyen credenciales, node_modules, Git, reportes temporales y carpetas de respaldos. Las 10 pruebas de navegador se ejecutaron contra los servicios del repositorio; los archivos fuente incluidos en el ZIP son idénticos.

No se ha verificado Windows o macOS ni se tiene acceso a la computadora de presentación. No se hizo una prueba de carga ni un despliegue público. Las pruebas son representativas de los flujos solicitados, no cobertura exhaustiva. El margen de los reportes es una estimación a costo actual; los comprobantes son internos y no sustituyen una factura electrónica. Se mantienen exactamente las diez tablas y la ausencia de autenticación solicitada.

## Verificación de la reorganización por entidades

Se separaron los modelos, servicios, controladores y rutas de las diez entidades; la API conserva sus endpoints y la lógica transaccional. El frontend se distribuye en App, páginas, componentes, hooks, servicios y estilos. La revisión de imports confirmó módulos locales conectados y la eliminación de los archivos monolíticos anteriores. El mapa de archivos está en `docs/estructura.md`.

Los pasos iniciales 001/002 reutilizan el SQL canónico y se verificaron en una base aislada: creación de diez tablas, semilla coherente, repetición de esquema sin borrar datos, rechazo de una semilla repetida y rollback ante un fallo provocado a mitad de carga. No se agrega una tabla de historial.

Tras la reorganización, se ejecutaron nuevamente la integración MySQL (12/12), respaldo/restauración (1/1), navegador Chromium (10/10) y ambas colecciones Newman (177 solicitudes, 518 aserciones, cero fallos). Las pruebas unitarias/HTTP permanecen en 6/6 y la integración de migraciones en 1/1. La compilación modular de Vite pasó con 64 módulos. Los logs regenerables de esta revisión se guardan bajo `artifacts/estructura-*`.

Se integraron también los cambios nuevos de GitHub para configuración MySQL e inicio en una sola ventana, sin sustituirlos por el instalador anterior. Tras esa integración volvieron a pasar 13 pruebas de integración, 1 de respaldo/restauración, 10 de navegador y las 177 solicitudes Newman (518 aserciones). Las migraciones y el instalador configurables pasaron 3 pruebas combinadas (2 de migraciones y 1 de setup). El valor predeterminado es NovaObra y DB_NAME conserva las instalaciones existentes con otro nombre válido. Los nuevos logs se encuentran en `artifacts/estructura-integrada-*`.

La entrega integrada se extrajo limpia y se instaló con npm ci. Desde esa copia pasaron las 6 pruebas unitarias/HTTP, 13 de integración, 1 de respaldo, 2 de migraciones y la compilación Vite (64 módulos). El iniciador de la copia creó su .env privado, arrancó API en 3002 e interfaz en 5173 con proxy conectado, conservó los registros y terminó correctamente con SIGINT. La validación efectiva sigue siendo Linux; Windows/macOS requieren su propia ejecución.

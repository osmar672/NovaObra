# Verificación de instalación y arranque

Fecha: 4 de noviembre de 2026. Entorno real: Linux x86_64, Node.js 24.22.1, npm 11.9.0, MySQL 8.0.46 e InnoDB, Chromium del entorno. Las pruebas usaron una instancia temporal propia de MySQL; no accedieron al servidor del usuario.

La aplicación se verificó con usuario `NovaObra`, base `NovaObra` y una cuenta limitada a esa base. La contraseña estuvo únicamente en configuración local. Las integraciones que necesitan crear y eliminar bases temporales usaron la cuenta administrativa de esa instancia aislada, sin ampliar permisos de la cuenta de aplicación.

| Comprobación                                                    | Resultado                                                                                      |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `npm ci --include=dev --no-audit --no-fund`, backend y frontend | Instalación reproducible aprobada                                                              |
| `npm test`, backend                                             | 6 pruebas aprobadas                                                                            |
| `npm run test:integration`, backend                             | 13 pruebas y subpruebas aprobadas                                                              |
| `npm run test:backup`, backend                                  | 1 integración aprobada con clientes MySQL 8 reales                                             |
| `npm run build`, raíz                                           | Compilación React/Vite aprobada                                                                |
| `npm run test:ui`, frontend                                     | 10 escenarios aprobados con Chromium, API y MySQL reales                                       |
| `npm start`, raíz                                               | Dependencias, conservación de datos, API e interfaz iniciadas desde una sola ventana           |
| ZIP extraído en una carpeta con espacios                        | Primer arranque interactivo aprobado; contraseña oculta y `.env` local con permisos privados   |
| Reinicio desde la copia limpia                                  | Reutiliza dependencias y configuración, conserva registros y sirve la interfaz y `/api/health` |
| API en puerto 3002                                              | El proxy de Vite sigue la configuración del backend                                            |
| Ctrl+C interactivo y SIGINT                                     | Ambos servicios terminan y liberan sus puertos                                                 |
| Contraseña errónea y puerto 5173 ocupado                        | Mensajes claros, salida con error y sin anunciar disponibilidad ni dejar una API abierta       |
| `npm test` y `npm run build` desde el ZIP extraído              | 6 pruebas y compilación aprobadas                                                              |

La nueva integración del instalador comprueba una base configurable con mayúsculas, diez tablas, carga inicial, conservación del nombre editado y del stock al reiniciar, ausencia de movimientos duplicados, rechazo de la semilla explícita con registros, rechazo de nombres inválidos y conservación de una base con tablas ajenas. Todas las bases creadas por esa integración se eliminan al terminar.

Los escenarios de navegador comprobaron catálogos, persistencia, compras, ventas, confirmaciones, cancelaciones, ajustes, concurrencia de navegación, reportes, reposición, descargas CSV y PDF de comprobantes. Estos flujos conservaron su historial dentro de la instancia temporal; ese historial no forma parte del ZIP.

## Límites

La ejecución real se verificó en Linux. `INICIAR.bat`, la apertura automática del navegador en Windows/macOS y los permisos de archivos de esos sistemas requieren una prueba en sus propias plataformas. No se comprobó el acceso al MySQL del usuario, que debe estar instalado e iniciado localmente. Una copia nueva solicita la contraseña una sola vez y necesita Internet para instalar sus dependencias. El ZIP y Git excluyen `.env`, dependencias, historial Git, respaldos y artefactos de prueba.

## Reorganización por entidades

El iniciador se conservó al integrar los modelos, servicios, controladores, rutas y frontend modular. Se volvió a probar desde una extracción limpia con DB_NAME temporal configurable: preparación sin repetir semilla, API en puerto 3002, proxy de Vite conectado, configuración .env privada y cierre SIGINT correcto. Las migraciones iniciales mantienen los mensajes y protecciones del instalador. Ver `estructura.md` y el informe actualizado `pruebas.md`.

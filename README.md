# NovaObra Control

Sistema académico local para Ferretería NovaObra, comercializadora de herramientas, materiales de construcción, electricidad y plomería. React + Vite, API Express en JavaScript ES y MySQL 8/InnoDB. Sin autenticación.

## Inicio rápido

Requisitos: **Node.js 24 LTS con npm** (mínimo 22.12), **MySQL 8.0.16 o posterior iniciado** e Internet para descargar las dependencias en el primer arranque. El usuario MySQL debe existir y tener permisos sobre su base. No requiere Docker.

Configuración predeterminada: usuario **`NovaObra`**, base de datos **`NovaObra`**, servidor `127.0.0.1:3306`.

1. Extraer el ZIP completamente. En Windows, abrir **`INICIAR.bat`** con doble clic.
2. Escribir la contraseña de MySQL cuando se solicite la primera vez; no se muestra al escribir. Se guarda únicamente en `backend/.env`, excluido de Git y del ZIP.
3. Esperar el mensaje **`NovaObra lista en http://127.0.0.1:5173`**. El iniciador intenta abrir el navegador; también se puede entrar a esa dirección manualmente.

En Linux/macOS, ejecutar `sh iniciar.sh` desde la carpeta del proyecto. En cualquier sistema también se puede usar:

```sh
npm start
```

Un solo iniciador instala las dependencias bloqueadas, prepara las diez tablas, carga los datos iniciales si todas están vacías e inicia API e interfaz. Los siguientes arranques conservan la configuración y los registros, y reutilizan las dependencias mientras no cambien sus archivos de bloqueo. Mantener la terminal abierta; **Ctrl+C** detiene ambos servicios.

Para preparar el proyecto sin iniciar servidores: `npm run setup`. Para cambiar conexión o contraseña, editar `backend/.env`. La configuración de ejemplo no incluye secretos. Ver [instalación y errores habituales](docs/instalacion.md).

Interfaz: `http://127.0.0.1:5173`. API: `http://127.0.0.1:3001/api`. No se requiere login. El instalador no elimina bases existentes ni repite la semilla sobre datos guardados; no migra estructuras de versiones antiguas.

## Verificaciones

```sh
cd backend
npm test
npm run test:integration
```

La integración exige un usuario de pruebas MySQL con permiso para crear y eliminar bases temporales `novaobra_test_*` y `NovaObra_test_*`. Usa bases independientes, no elimina `NovaObra`. Consultar [verificación del iniciador](docs/verificacion-inicio.md) y el [informe de pruebas anterior](docs/pruebas.md).

```sh
cd frontend
npm run build
```

Con Express, MySQL y Vite iniciados, ejecutar desde `frontend/`:

```sh
npx playwright-core install chromium
npm run test:ui
```

Las pruebas de navegador y la colección automatizada Postman usan una base de desarrollo desechable; sus flujos comerciales conservan el historial. Ver los comandos y resultados en [pruebas](docs/pruebas.md).

## Contenido

- `backend/`: configuración, validación, rutas REST, servicios transaccionales y pruebas.
- `frontend/`: dashboard, CRUD y compras/ventas con detalles y transiciones de estado.
- `database/`: esquema de exactamente diez tablas y datos iniciales.
- `docs/`: análisis, relaciones, diagrama Mermaid, instalación, API, manual y pruebas.
- `postman/`: colección manual y colección automatizada de verificación para las diez entidades.
- `scripts/package.py`: genera el ZIP excluyendo credenciales, dependencias y temporales.
- `iniciar.mjs`, `INICIAR.bat` e `iniciar.sh`: instalación y arranque desde una sola terminal.

## Mejoras de gestión

- Reportes por fechas de compras y ventas confirmadas, productos más vendidos y ganancia estimada según el costo actual del catálogo.
- Comprobantes internos de venta para imprimir o guardar como PDF desde el navegador.
- Alertas de inventario bajo y lista de reposición de productos activos con cantidades y costos sugeridos.
- Nombres relacionados en tablas y detalles, búsqueda, filtros y paginación en el servidor.
- CSV compatible con Excel para catálogos, operaciones, movimientos, reportes y reposición. Exporta todo el resultado filtrado.
- Respaldo SQL consistente y restauración verificada en una base nueva o sin tablas ni vistas, con los clientes oficiales MySQL 8.

Consultar [manual](docs/manual.md), [API](docs/api.md) y [respaldos](docs/respaldos.md). Se mantienen las diez tablas y no se agregan dependencias de aplicación.

## Reglas esenciales

Las operaciones nacen como borradores. Sus detalles se pueden editar hasta confirmar. Confirmar aplica inventario una sola vez; cancelar revierte una operación confirmada una sola vez. Cancelar una compra exige stock suficiente para devolver sus unidades. Un borrador cancelado no altera el stock. Los movimientos son inmutables; los errores se corrigen con entradas o salidas compensatorias.

Los productos se crean con stock cero; las existencias se cambian por compras, ventas o ajustes registrados. El precio y total de una operación quedan preservados en su historial. Se puede desactivar una categoría, producto, proveedor o empleado con su campo `estado`; las relaciones históricas impiden eliminaciones incompatibles.

Enviar `clave_solicitud` única al crear compras, ventas o ajustes impide duplicados por reintentos: una clave repetida responde 409 y no aplica otra operación. La interfaz genera esa clave automáticamente. Confirmar y cancelar son idempotentes respecto al stock.

El proyecto se limita al uso académico local sin login, roles, JWT ni contraseñas de usuarios de aplicación. Las credenciales de MySQL permanecen en `.env`, nunca en el ZIP.

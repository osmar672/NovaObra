# NovaObra Control

Sistema académico local para Ferretería NovaObra, comercializadora de herramientas, materiales de construcción, electricidad y plomería. React + Vite, API Express en JavaScript ES y MySQL 8/InnoDB. Sin autenticación.

## Inicio rápido

Requisitos: Node.js 22.12 o posterior (verificado en Node 24), npm y MySQL 8.0.16 o posterior. No requiere Docker ni servicios externos. Desde la carpeta extraída `NovaObra_Control`:

1. Preparar MySQL y su usuario según [instalación](docs/instalacion.md).
2. En una terminal:

```sh
cd backend
npm ci
```

Copiar `.env.example` a `.env`, completar los datos de MySQL y ejecutar:

```sh
npm run db:setup -- --seed
npm start
```

3. En otra terminal desde la raíz del proyecto:

```sh
cd frontend
npm ci
npm run dev
```

Abrir `http://127.0.0.1:5173`. API en `http://127.0.0.1:3001/api`. La semilla se carga una sola vez sobre tablas vacías. El instalador no elimina bases existentes.

## Verificaciones

```sh
cd backend
npm test
npm run test:integration
```

La integración exige un usuario MySQL con permiso para crear y eliminar bases temporales `novaobra_test_*`. Usa una base independiente, no elimina `novaobra_db`. Consultar [informe de pruebas](docs/pruebas.md) para los resultados efectivamente ejecutados.

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

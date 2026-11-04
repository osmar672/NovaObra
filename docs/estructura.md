# Estructura por entidades

La organización sigue los pasos del documento «Pasos de Realización»: modelos, servicios, controladores, rutas, registro de rutas y migraciones. Se adapta al proyecto existente con JavaScript ES, Express y mysql2/promise. Se conservan las diez tablas, los endpoints y las reglas transaccionales.

El ejemplo de usuario del documento ilustra cómo separar archivos. En NovaObra las entidades reales son categorías, proveedores, productos, clientes, empleados, compras, detalle de compras, ventas, detalle de ventas y movimientos de inventario. Los empleados representan información laboral, no cuentas de acceso.

## Backend

```text
backend/
  migrations/          Pasos iniciales versionados 001 y 002
  scripts/             Instalación y respaldo/restauración
  src/
    config/            Pool y transacciones MySQL
    models/            Modelos de las diez entidades y helpers compartidos
    services/          Servicios de cada entidad y operaciones compartidas
    controllers/       Funciones HTTP de cada entidad
    routes/            Routers de cada entidad y montaje principal
    middlewares/       Manejo central de errores
    validators/        Validación de entradas
    app.js             Express, CORS, JSON y montaje /api
    server.js          Conexión inicial y escucha HTTP
  tests/               Pruebas de API, inventario, consultas y respaldos
```

El recorrido habitual es **ruta → controlador → servicio → modelo → MySQL**. Las operaciones de varias tablas conservan sus transacciones y bloqueos compartidos. Los módulos reutilizables evitan repetir SQL y validaciones en diez archivos distintos, pero cada entidad tiene su punto de entrada identificable y conectado.

- **Modelo:** define su tabla, identificador, campos permitidos y acceso a datos.
- **Servicio:** aplica validaciones y reglas de negocio al operar sobre el modelo.
- **Controlador:** obtiene parámetros/cuerpo y envía la respuesta HTTP.
- **Ruta:** asocia GET, POST, PUT o DELETE con el controlador y se monta en la API.

Las reglas comerciales siguen vigentes: los detalles solo cambian en borradores, confirmar/cancelar mantiene inventario y los movimientos históricos no se editan ni se borran.

## Archivos de las diez entidades

Las siguientes rutas son relativas a `backend/src/`. Cada router está montado en la API; los helpers comunes se ubican en las carpetas `shared/`.

| Entidad                | Modelo                                | Controlador                                     | Servicio                                  | Rutas                                  |
| ---------------------- | ------------------------------------- | ----------------------------------------------- | ----------------------------------------- | -------------------------------------- |
| categorias             | `models/categoriaModel.js`            | `controllers/categoriaController.js`            | `services/categoriaService.js`            | `routes/categoriaRoutes.js`            |
| proveedores            | `models/proveedorModel.js`            | `controllers/proveedorController.js`            | `services/proveedorService.js`            | `routes/proveedorRoutes.js`            |
| productos              | `models/productoModel.js`             | `controllers/productoController.js`             | `services/productoService.js`             | `routes/productoRoutes.js`             |
| clientes               | `models/clienteModel.js`              | `controllers/clienteController.js`              | `services/clienteService.js`              | `routes/clienteRoutes.js`              |
| empleados              | `models/empleadoModel.js`             | `controllers/empleadoController.js`             | `services/empleadoService.js`             | `routes/empleadoRoutes.js`             |
| compras                | `models/compraModel.js`               | `controllers/compraController.js`               | `services/compraService.js`               | `routes/compraRoutes.js`               |
| detalle_compras        | `models/detalleCompraModel.js`        | `controllers/detalleCompraController.js`        | `services/detalleCompraService.js`        | `routes/detalleCompraRoutes.js`        |
| ventas                 | `models/ventaModel.js`                | `controllers/ventaController.js`                | `services/ventaService.js`                | `routes/ventaRoutes.js`                |
| detalle_ventas         | `models/detalleVentaModel.js`         | `controllers/detalleVentaController.js`         | `services/detalleVentaService.js`         | `routes/detalleVentaRoutes.js`         |
| movimientos_inventario | `models/movimientoInventarioModel.js` | `controllers/movimientoInventarioController.js` | `services/movimientoInventarioService.js` | `routes/movimientoInventarioRoutes.js` |

## Migraciones iniciales

`migrations/001_create_schema.js` comprueba la versión MySQL y que no haya objetos ajenos antes de crear o verificar el esquema leyendo `database/schema.sql`. Respeta el nombre indicado en DB_NAME. `002_seed_data.js` carga `database/seed.sql` únicamente si todas las tablas están vacías. `index.js` ordena ambos pasos y `scripts/database.js` conserva la interfaz de comandos:

```sh
cd backend
npm ci
npm run db:setup
```

Para una instalación vacía con datos de ejemplo:

```sh
npm run db:setup -- --seed
```

El iniciador de una sola ventana conserva su opción `--seed-if-empty`: carga datos iniciales solo si la base está vacía y los conserva en los siguientes arranques. `--seed` sigue rechazando una base con registros. La configuración predeterminada remota usa `NovaObra`; una instalación con `DB_NAME=novaobra_db` u otro nombre válido conserva ese nombre y sus datos.

No se agrega una tabla para registrar migraciones, porque el requisito exige exactamente diez. Son pasos iniciales repetibles, no un motor general de cambios ALTER ni un sistema de rollback de versiones. El SQL canónico sigue en `database/`; no se mantienen copias duplicadas del esquema.

Con una cuenta de pruebas MySQL con permisos para bases temporales:

```sh
npm run test:migrations
```

## Frontend

```text
frontend/src/
  main.jsx             Entrada React
  App.jsx              Composición principal
  components/          Layout y controles reutilizables
  hooks/               Estado, peticiones y concurrencia de la administración
  pages/               Páginas organizadas por entidad, inicio y reportes
  services/            Cliente HTTP y servicios de las diez entidades
  styles/              Estilos globales, responsive e impresión
  utils/               Formato de moneda, fechas y utilidades compartidas
```

Las páginas declaran la entidad y reutilizan las tablas, filtros, formularios y paginación. Los detalles de compras y ventas tienen módulos propios y se gestionan dentro de su operación comercial, conservando la integridad de sus cabeceras.

Los servicios de frontend concentran Fetch, JSON, errores y cancelación de lecturas. Los hooks conservan las protecciones contra respuestas atrasadas al navegar, y los comprobantes se invalidan cuando cambia la venta. Los componentes de presentación reciben datos y acciones, en lugar de contener una copia de toda la lógica de la aplicación.

## Módulos del frontend por entidad

Las rutas siguientes son relativas a `frontend/src/`. Cada módulo de entidad utiliza su servicio HTTP correspondiente en `services/`; las páginas comparten controles visuales sin duplicar las reglas de CRUD.

| Entidad                | Página o formulario                                          | Servicio HTTP                               |
| ---------------------- | ------------------------------------------------------------ | ------------------------------------------- |
| categorias             | `pages/categorias/CategoriasPage.jsx`                        | `services/categoriasService.js`             |
| proveedores            | `pages/proveedores/ProveedoresPage.jsx`                      | `services/proveedoresService.js`            |
| productos              | `pages/productos/ProductosPage.jsx`                          | `services/productosService.js`              |
| clientes               | `pages/clientes/ClientesPage.jsx`                            | `services/clientesService.js`               |
| empleados              | `pages/empleados/EmpleadosPage.jsx`                          | `services/empleadosService.js`              |
| compras                | `pages/compras/ComprasPage.jsx`                              | `services/comprasService.js`                |
| detalle_compras        | `pages/detalle_compras/DetalleComprasForm.jsx`               | `services/detalle_comprasService.js`        |
| ventas                 | `pages/ventas/VentasPage.jsx`                                | `services/ventasService.js`                 |
| detalle_ventas         | `pages/detalle_ventas/DetalleVentasForm.jsx`                 | `services/detalle_ventasService.js`         |
| movimientos_inventario | `pages/movimientos_inventario/MovimientosInventarioPage.jsx` | `services/movimientos_inventarioService.js` |

## Adaptaciones del documento

- El contenido JavaScript del ejemplo `app.json` corresponde a un archivo `.js`; NovaObra utiliza `src/app.js` y `src/server.js`.
- Se conserva el package.json y los archivos de bloqueo existentes. No es necesario ejecutar otra vez `npm init -y` ni sustituir las dependencias que funcionan.
- Los ejemplos CommonJS se expresan como import/export, de acuerdo con los módulos ES del proyecto.
- La persistencia sigue siendo MySQL real. El arranque utiliza Express y Vite; no se requiere json-server ni db.json.
- Los modelos utilizan mysql2/promise y las transacciones existentes. No se incorpora otro ORM para una reorganización de carpetas.

## Ejecución

Se conserva `INICIAR.bat` en Windows y `npm start` desde la raíz para preparar y ejecutar los dos servicios. El iniciador no vuelve a solicitar configuración si ya existe `.env`.

Para el arranque manual desde backend, configurar primero `.env` según `.env.example` con una cuenta MySQL válida. Después ejecutar `npm run db:setup` y `npm start`. Desde otra terminal en frontend, ejecutar `npm ci` y `npm run dev`.

La reorganización de carpetas no crea cuentas MySQL ni cambia contraseñas. Si aparece ER_ACCESS_DENIED_ERROR, hay que revisar el usuario y su clave local siguiendo `docs/instalacion.md`.

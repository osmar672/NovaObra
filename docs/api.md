# API del Día 2

Base local: `http://127.0.0.1:3003/api`. Respuestas JSON, salvo DELETE correcto que devuelve 204. Mutaciones POST/PUT/PATCH usan `Content-Type: application/json`; DELETE puede no tener cuerpo.

## Autenticación

| Método | Ruta | Cuerpo o resultado |
| --- | --- | --- |
| POST | /auth/register | nombre, correo, password; 201 usuario sin hash; 400 duplicado o inválido |
| POST | /auth/login | correo, password; 200 {token,usuario}; 401 credenciales incorrectas |
| GET | /auth/me | Bearer; 200 usuario público, 401 {error:"No autorizado"} |
| POST | /auth/refresh (alias /auth/session) | Cookie refresh HttpOnly, Origin configurado y X-NovaObra-Request: 1; rota refresh y devuelve {token,usuario}; 401 al vencer/reutilizar |
| POST | /auth/logout | Bearer y {}; revoca sesiones |
| PUT | /auth/password | Bearer, actual y nueva; revoca sesiones |

`usuario` expone id, nombre, correo, email (compatibilidad), fechaCreacion y rol existente. Nunca expone password_hash. `JWT_SECRET` permanece en backend/.env. Se mantienen los alias anteriores `/auth/registro` y `/auth/yo`.

## Ocho CRUD

Para cada entidad: POST `/entidad` (201), GET `/entidad` (200), GET `/entidad/:id` (200/404), PUT `/entidad/:id` (200/404), DELETE `/entidad/:id` (204/404/409). Sin Bearer válido, las cinco operaciones devuelven exactamente 401 con `{ "error": "No autorizado" }`.

| Entidad | Clave | Campos aceptados en alta |
| --- | --- | --- |
| categorias | id | nombre, descripcion, activo |
| marcas | id | nombre, descripcion, activo |
| productos | id | categoria_id, marca_id, sku, nombre, descripcion, especificaciones, imagen HTTPS opcional, precio, precio_oferta opcional, oferta_inicio/fin UTC opcionales, destacado, activo, minimo |
| clientes | id | usuario_id existente, telefono, direccion |
| inventario | producto_id | producto_id existente, existencia, minimo |
| pedidos | id | cliente_id (operador), clave única, tipo pedido/cotizacion, entrega retiro/domicilio, direccion, telefono, nota, lineas [{producto_id,cantidad}] |
| detalle_pedidos | id | pedido_id, producto_id, cantidad |
| movimientos_inventario | id | producto_id, cantidad con signo y distinta de cero, motivo |

GET productos conserva el formato de catálogo `{items,total,pagina,paginas}` y sus filtros existentes. Los demás listados devuelven arreglos. Los identificadores relacionados se validan con el esquema real antes de escribir. Los precios y el responsable de movimientos proceden del servidor. El producto se crea junto a inventario cero; para probar POST inventario puede eliminarse primero ese inventario vacío y sin historial.

PUT permite cambios parciales en catálogos básicos, clientes, inventario, detalles y movimientos. Producto conserva su contrato completo de edición anterior. En pedidos solo se actualizan entrega, dirección, teléfono y nota, mientras estén pendientes. Las líneas tienen su propio CRUD. No se reasigna una línea a otro pedido.

La autenticación es necesaria en todos los CRUD; se conservan los permisos de gestión previos: administrador/empleado escriben, clientes solo consultan el catálogo y gestionan sus solicitudes propias. GET de un pedido ajeno responde 404. Un cliente no obtiene permisos administrativos por registrarse.

## Dependencias y stock

FK inexistente: 404. Validación: 400. Duplicados y dependencias: 409. Producto o inventario con stock/historial, pedidos con dependencias y movimientos ligados a pedidos no se borran. Los detalles solo se alteran en pedidos pendientes. Crear/editar/eliminar movimientos manuales y detalles compensa stock dentro de la misma transacción. La cancelación de un pedido es idempotente y devuelve únicamente su reserva vigente.

## Rutas conservadas

Se conservan `/admin/dashboard`, productos, categorías, marcas, inventario, clientes, pedidos y usuarios del panel previo, con sus permisos. No se añadió otro CRUD de usuarios. PATCH `/admin/pedidos/:id` recibe `{estado}` y aplica las transiciones comerciales anteriores.

`GET /referencias` devuelve opciones reales para selectores y `GET /entidades` sus campos; ambos exigen JWT y rol de gestión. `/health` y `/config` son técnicos/informativos públicos, sin operaciones de datos empresariales. `/robots.txt` y `/sitemap.xml` siguen siendo recursos SEO.

## Colección y pruebas

`postman/Dia2.postman_collection.json`: 93 solicitudes. `npm run test:postman` la ejecuta con Newman contra una base temporal. `tests/day2.js` comprueba además las cuarenta combinaciones método/ruta con ausencia de token, firma manipulada, expiración real y algoritmo incorrecto.

## Catálogo público

Solo lectura, sin Bearer: `GET /tienda/categorias`, `/tienda/marcas`, `/tienda/productos` y `/tienda/productos/:id`. Los productos conservan los filtros y la paginación del catálogo; muestran únicamente productos, categorías y marcas activos. El DTO incluye identificación, descripción/especificaciones, imagen, precio actual, marca, categoría y existencia. No expone mínimos internos ni programación de ofertas futuras. Las mutaciones y todos los CRUD originales siguen protegidos.

`POST /admin/catalogo-demo` requiere Bearer de administrador y cuerpo `{}`. Añade los SKU de ejemplo ausentes, con inventario e historial transaccionales; devuelve `{added,skipped,total,operatorId}`. Empleados y clientes reciben 403.

## OAuth de Google

- `GET /auth/options`: público; `{googleEnabled}` sin secretos.
- `POST /auth/google/start`: Origin y cabecera CSRF; `{returnTo}` opcional, ruta local. Devuelve `{url}` para navegar a Google y establece una cookie HttpOnly transitoria.
- `GET /auth/google/callback`: recibe código/state de Google, intercambia el código con PKCE y verifica el ID token. Emite la cookie de sesión propia y redirige a `/auth/google/complete`; los errores vuelven al login con un código fijo. No devuelve tokens en la URL.
- `GET /auth/google/status`: Bearer; `{enabled,linked,localPassword}`.
- `POST /auth/google/link`: Bearer, Origin y cabecera CSRF; `{password}` de la cuenta local actual. Devuelve `{url}` para confirmar la identidad con el mismo correo verificado. No vincula automáticamente por coincidencia de correo.

Sin configuración Google, iniciar/vincular responde 503 y el login por contraseña continúa disponible. Las cuentas creadas exclusivamente con Google no admiten cambio de contraseña local. Véase [activación y límites de verificación](google-login.md).

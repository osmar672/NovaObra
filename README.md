# NovaObra Tienda — Mini Proyecto 1, Día 2

Tienda existente de ferretería con Node.js/Express, React/Vite y MySQL 8. Se conservan las diez tablas originales y sus datos; se añaden `sesiones_refresh` para renovar y revocar sesiones e `identidades_google` para el acceso opcional con Google. La revisión añade JWT estándar, los endpoints de autenticación del PDF y los cinco endpoints de las ocho entidades empresariales. No incluye la investigación académica excluida por el usuario.

## Instalación y ejecución

Requisitos: Node.js 24 LTS (mínimo 22.13), npm, MySQL 8.0.16 o posterior iniciado e Internet para instalar dependencias. MariaDB no es compatible.

Desde la carpeta raíz `mini-proyecto-1`:

```sh
npm ci
npm run db:configure
npm run admin:create
npm start
```

`db:configure` pide el usuario administrador de MySQL y su contraseña sin mostrarla. Conserva la base `NovaObraTienda`, prepara sus doce tablas y crea una cuenta MySQL limitada a esa base. Guarda la cuenta de aplicación y una clave JWT aleatoria en **`backend/.env`**, excluido de Git y del ZIP. No guarda la clave administrativa. No borra tablas ni registros; rechaza una base con tablas ajenas. Si ya existe un archivo de configuración local, se conserva su conexión antes de preparar la cuenta.

`admin:create` crea un administrador **web** con nombre, correo y contraseña elegidos localmente. El usuario web es distinto del usuario MySQL. No hay una contraseña web predeterminada. Las cuentas ya existentes siguen funcionando con su hash anterior.

Abrir **http://127.0.0.1:5174**. Mantener la terminal abierta. Ctrl+C detiene API e interfaz; el inicio solo anuncia disponibilidad después de comprobar la API y el proxy. Los próximos arranques requieren solo `npm start` o doble clic en `INICIAR.bat` en Windows. En Linux/macOS también existe `sh iniciar.sh`.

La instalación y las pruebas se ejecutaron en Linux. Windows y macOS requieren validación propia. No se accedió a la base de datos de la computadora del usuario.

### Actualizar desde una versión anterior

En desarrollo, `npm start` prepara las tablas técnicas que faltan y añade `usuarios.password_local` conservando las cuentas y sus contraseñas. También puedes ejecutar `npm run db:setup` explícitamente; en producción ejecútalo antes de arrancar el servidor. No borra registros ni carga ejemplos automáticamente. Si ya tienes un `.env` en la raíz, puedes copiarlo a `backend/.env` y conservarlo fuera de Git. Renombra `SESSION_SECRET` a `JWT_SECRET`, manteniendo su valor si tiene al menos 48 caracteres aleatorios. Se admite temporalmente el nombre anterior para compatibilidad; los ejemplos nuevos usan `JWT_SECRET`.

Las sesiones antiguas con el token HMAC propio dejan de ser válidas: vuelve a iniciar sesión para recibir un JWT estándar. Las cuentas, perfiles, pedidos y contraseñas no se eliminan.

### Configuración manual

Copiar `backend/.env.example` a `backend/.env` y completar la conexión MySQL y `JWT_SECRET`. No usar los valores del ejemplo como credenciales reales. Para generar una clave aleatoria local, ejecutar y copiar el resultado únicamente al archivo privado:

```sh
node -e "process.stdout.write(require('crypto').randomBytes(48).toString('hex'))"
npm run db:setup
npm run admin:create
npm start
```

`PORT` define la API (3003 por defecto), `DB_PORT` MySQL (3306) y `PUBLIC_URL` el origen de la interfaz (`http://127.0.0.1:5174`). El iniciador exige un puerto API fijo y diferente de 5174. `VITE_API_URL` permite configurar el cliente HTTP en `frontend/.env.local` (por defecto `/api`); si se usan orígenes diferentes, configurar `PUBLIC_URL` y CORS de forma coherente.

`BUSINESS_PHONE`, `BUSINESS_WHATSAPP`, `BUSINESS_EMAIL`, `BUSINESS_ADDRESS` y `BUSINESS_ABOUT` son datos reales que debe aportar la tienda. `DELIVERY_FEE` vacío permite solo retiro; un importe fijo habilita domicilio. No se inventan contacto, cobertura, impuestos ni cobros. Se conserva la función existente de pedidos y cotizaciones sin pago en línea.

Los datos de demostración son opcionales y solo para tablas vacías, antes de crear usuarios:

```sh
npm run db:setup -- --demo
```

No ejecutar la semilla sobre registros existentes. El preparador no sustituye migraciones de esquemas ajenos.

### Añadir 48 productos de demostración a una tienda existente

Con la conexión y el administrador web ya configurados, ejecuta una sola vez:

```sh
npm run catalog:demo
npm start
```

Añade 48 productos en ocho departamentos, con descripciones, precios en CRC, inventario de ejemplo y fotografías reales de referencia. Se identifican con SKU `NV-DEMO-*`, marca **Catálogo de demostración** y una etiqueta visible. Son datos ficticios para probar la tienda, no ofertas ni existencias comerciales reales.

El comando no borra ni reemplaza tus productos y puede repetirse: conserva los registros existentes y las ediciones posteriores de precios, nombres y stock. La carga es transaccional y registra un movimiento de inventario por producto, usando como responsable al primer administrador web activo. Si no existe uno, ejecuta `npm run admin:create`. No crea usuarios, pedidos ni tablas nuevas.

También puedes iniciar sesión como administrador y pulsar **Cargar 48 productos de ejemplo** en Inicio o Administración. La interfaz informa cuántos se añadieron y cuántos se conservaron.

El catálogo, las fichas y el inicio consultan productos reales de la base sin exigir sesión. El inicio muestra filtros por departamento, hasta ocho productos con precio y descripción y un enlace al catálogo completo. Si no hay productos, muestra un estado vacío; no sustituye los datos por tarjetas estáticas. La cuenta incluye pedidos, cotizaciones, favoritos, carrito y seguridad. El mapa se carga con **Cargar mapa interactivo** y requiere Internet; San José sigue siendo una ubicación de demostración.


## Inicio de sesión con Google

La integración usa OAuth 2.0 con código de autorización, PKCE, state y nonce, y valida el ID token con `google-auth-library`. Crea una sesión propia de NovaObra con la misma cookie HttpOnly y JWT de acceso del login normal.

**Debes crear tu propio cliente OAuth web en Google Cloud para activarla.** No basta con un botón ni con una API key. Sigue [la guía de Google](docs/google-login.md) y ejecuta `npm run google:configure` desde la raíz. El asistente guarda ID y secreto únicamente en `backend/.env`; reinicia la aplicación. Sin credenciales válidas, el acceso por contraseña sigue disponible y se indica que Google no está habilitado.

Si el acceso sigue rechazando las credenciales, usa `npm run google:import` para importar el JSON del cliente web activo y `npm run google:check` para comprobar el ID efectivo y posibles variables duplicadas o reemplazadas por la terminal. La guía explica cómo descargarlo; nunca compartas el JSON ni el secreto.

Una cuenta nueva de Google recibe rol cliente. Si su correo ya existe, inicia sesión por contraseña y vincúlala desde Cuenta confirmando esa contraseña. No se unen cuentas automáticamente por correo. Google administra la contraseña de las cuentas creadas exclusivamente con Google.

## Autenticación

- `POST /api/auth/register`: `{ nombre, correo, password }`, contraseña de 8 a 128 caracteres. Devuelve 201 con el usuario sin hash; correo duplicado devuelve 400.
- `POST /api/auth/login`: `{ correo, password }`. Devuelve 200 con `{ token, usuario }`, o 401 si las credenciales son incorrectas.
- `GET /api/auth/me`: requiere `Authorization: Bearer <token>`. Devuelve los datos públicos del usuario.
- `POST /api/auth/refresh` (alias `/session`): rota el refresh de la cookie y genera un JWT de acceso nuevo; exige origen y cabecera CSRF.
- `POST /api/auth/logout`: revoca las sesiones del usuario y elimina la cookie.
- `PUT /api/auth/password`: verifica `actual`, guarda `nueva` y revoca las sesiones anteriores.

Se mantienen `/auth/registro` y `/auth/yo` como compatibilidad. Los CRUD y `/auth/me` exigen `Authorization: Bearer <token>`. El JWT se firma y verifica con `jsonwebtoken`, HS256, emisor y audiencia explícitos. Dura 15 minutos (`ACCESS_TOKEN_TTL_SECONDS`); contiene sub, versión, identificador de sesión, tipo, jti y fechas. Su contenido está codificado, no cifrado: nunca incluir contraseñas, claves ni datos privados.

El refresh token es aleatorio y opaco, dura siete días absolutos (`REFRESH_TOKEN_TTL_SECONDS`) y solo viaja en la cookie `novaobra_refresh`: HttpOnly, SameSite=Lax, ruta `/api/auth`, Secure con HTTPS. MySQL guarda únicamente su hash SHA-256. Cada uso consume el token y genera otro; la reutilización revoca toda su familia, incluidos sus JWT. Logout y cambio de contraseña revocan todas las sesiones del usuario. Al actualizar desde la versión anterior hay que iniciar sesión nuevamente.

React guarda el JWT solo en memoria. Al recargar restaura la sesión mediante `/auth/refresh`. Renueva antes del vencimiento y, ante un 401 de la API, intenta una renovación y un reintento. Las llamadas simultáneas comparten una sola renovación; Web Locks serializa entre pestañas compatibles. Si el refresh vence o se revoca, vuelve al login. Sin Web Locks, renovaciones simultáneas entre pestañas pueden disparar la detección de reutilización y requerir login otra vez. Un fallo de red no elimina automáticamente la sesión.

Las cookies de renovación/logout requieren origen exacto y `X-NovaObra-Request: 1`; fetch usa `credentials: include`. Los clientes Bearer como Postman pueden cerrar sesión sin Origin. Se rechazan orígenes ajenos. Mantener frontend y API bajo el mismo origen. HttpOnly impide leer el refresh desde JavaScript, pero un XSS todavía puede realizar acciones desde la página; CSP, validación y HTTPS siguen siendo necesarios. localStorage y sessionStorage exponen tokens a JavaScript y no se usan.

## HTTPS

Para probarlo en tu computadora, instala OpenSSL y ejecuta después de configurar la base:

```sh
npm run https:setup
npm start
```

Abre **https://127.0.0.1:3443**. El iniciador compila React y sirve API e interfaz por HTTPS; http://127.0.0.1:3080 redirige allí. El certificado local es autofirmado y el navegador pedirá confiar en él para desarrollo. No se instala confianza global ni se desactiva la validación TLS de Node. La clave queda privada en `backend/.certs`, excluida de Git y ZIP; el comando conserva certificados existentes. Para volver al modo HTTP local, vacía TLS_CERT_PATH, TLS_KEY_PATH, HTTP_REDIRECT_PORT y restablece PORT=3003 y PUBLIC_URL=http://127.0.0.1:5174 en backend/.env.

En producción usa `NODE_ENV=production`, `PUBLIC_URL=https://TU_DOMINIO`, certificados válidos en `TLS_CERT_PATH` y `TLS_KEY_PATH`, luego `npm run build` y `npm run serve`. Node acepta TLS 1.2 o superior y emite HSTS. Alternativamente usa [deploy/Caddyfile](deploy/Caddyfile): apunta el DNS al servidor, abre 80/443, configura `NOVAOBRA_DOMAIN` para Caddy y la app con HOST=127.0.0.1, PORT=3003, TRUST_PROXY=loopback y los campos TLS/redirect vacíos. Caddy obtiene/renueva el certificado público; el backend solo confía en el proxy local y rechaza HTTP sin la cabecera HTTPS del proxy. Conserva las claves fuera de Git y usa un supervisor de procesos.

No se ha publicado un dominio: falta que el propietario indique dominio y servidor. HTTPS local y el servidor TLS sí se verificaron; la plantilla Caddy requiere validación en el despliegue elegido.

## Entidades y permisos conservados

Entidades empresariales: `categorias`, `marcas`, `productos`, `clientes`, `inventario`, `pedidos`, `detalle_pedidos`, `movimientos_inventario`. Cada una dispone de POST/GET en `/api/entidad` y GET/PUT/DELETE en `/api/entidad/:id`.

`usuarios` ya existía y se gestiona mediante autenticación. `correo` y `fechaCreacion` son los nombres del contrato del PDF para las columnas existentes `email` y `creado`; el hash permanece en `password_hash`. `roles` es una tabla de configuración existente, no un catálogo empresarial nuevo.

**Resolución de requisitos:** el PDF no exige roles, pero el usuario pidió conservar la tienda. Se mantienen sus roles administrador, empleado y cliente, sin crear otros. Todos los CRUD requieren JWT; además, los cambios de gestión siguen limitados a administrador/empleado. Los clientes registrados consultan catálogo y sus propios pedidos y crean solicitudes. No se abren permisos de inventario ni datos de otros clientes para cumplir superficialmente el ejercicio. El administrador web se crea con el comando anterior.

Vistas privadas de gestión: `/gestion/categorias`, `/gestion/marcas`, `/gestion/productos`, `/gestion/clientes`, `/gestion/inventario`, `/gestion/pedidos`, `/gestion/detalle_pedidos`, `/gestion/movimientos_inventario`. Incluyen tabla, consulta, alta, edición, confirmación de eliminación, errores y selectores cargados desde MySQL. Se conservan `/admin`, catálogo, carrito, favoritos y cuenta. El catálogo ahora requiere login según el Día 2; la portada y las páginas informativas siguen disponibles.

### Integridad de pedidos e inventario

- Productos nuevos tienen inventario con cero unidades. Las entradas/salidas se registran y nunca permiten stock negativo.
- Editar inventario registra la diferencia como movimiento; eliminarlo exige stock cero e historial vacío.
- Los pedidos reservan inventario una sola vez. Las cotizaciones no reservan stock.
- Los detalles se crean, editan y eliminan únicamente mientras el pedido está pendiente. El precio procede del servidor; ajustar cantidades compensa las reservas dentro de una transacción.
- PUT de pedido modifica entrega, dirección, teléfono y nota; sus líneas usan el CRUD de detalles. Las transiciones existentes permanecen en `/api/admin/pedidos/:id`.
- Se puede eliminar una cotización vacía y sin dependencias. Un pedido con líneas, reservas históricas o estado incompatible responde 409 y conserva su historia.
- Los movimientos manuales admiten edición y eliminación con corrección transaccional del stock. Los movimientos vinculados a pedidos son inmutables y responden 409; se corrigen con la cancelación del pedido.
- Productos con existencias/historial y entidades referenciadas no se eliminan. Las referencias inexistentes se rechazan con 404 y los valores inválidos con 400.

Estos conflictos son reglas de negocio verificadas, no endpoints simulados.

## Dependencias y auditoría de seguridad

El árbol completo de dependencias, incluidas las de desarrollo, se corrigió de 19 alertas a cero. Ver [análisis y correcciones](docs/vulnerabilidades.md). Newman se conserva, con versiones transitivas corregidas y dos parches de compatibilidad aplicados automáticamente por postinstall. No desactives los scripts al instalar para usar el ejecutor.

```sh
npm ci
npm run audit:deps
```

Node.js 24 LTS es la versión recomendada; el mínimo 22.13 permite utilizar el Faker corregido. Una instalación de producción con `npm ci --omit=dev` también se verificó y no requiere patch-package. Los parches y pruebas residen en archivos técnicos de la entrega, sin modificar la estructura de modelos, controladores, rutas ni middlewares.

## Pruebas reproducibles

```sh
npm test
npm run build
```

Para las pruebas con MySQL, crear **fuera del repositorio** un JSON privado con las claves `user` y `password` de una cuenta de pruebas capaz de crear/eliminar bases temporales. Configurar `NOVAOBRA_TEST_ADMIN_FILE` con su ruta. No guardar ese JSON ni su contenido en Git. Las pruebas crean bases `novaobra_shop_test_*` independientes y las eliminan al terminar; no apuntarlas a producción.

PowerShell:

```powershell
$env:NOVAOBRA_TEST_ADMIN_FILE = 'RUTA_AL_JSON_PRIVADO_DE_PRUEBAS'
npm run test:integration
npm run test:postman
npm run test:ui
npm run test:https
```

Linux/macOS:

```sh
export NOVAOBRA_TEST_ADMIN_FILE='/ruta/al/json-privado-de-pruebas'
npm run test:integration
npm run test:postman
npm run test:ui
npm run test:https
```

Las pruebas de navegador requieren Chromium. Puede definirse `CHROMIUM_PATH` con su ejecutable o instalarlo con `npx playwright-core install chromium`. `CHROMIUM_NO_SANDBOX=1` se usa solo en contenedores de pruebas que lo necesiten. Sin archivo de pruebas, Node marca explícitamente las integraciones como omitidas; eso no significa que estén verificadas en tu equipo.

La colección `postman/Dia2.postman_collection.json` contiene 93 solicitudes. Para ejecutarla manualmente, configurar `base_url`, `manager_email` y `manager_password` de un operador existente **en una base desechable**. No exportar sus valores privados. El caso de JWT vencido necesita `expired_token`; si está vacío, se omite expresamente. El ejecutor `test:postman` genera un JWT vencido real y ejecuta los 93 casos con Newman sin guardar credenciales en la colección.

## Estructura y evidencias

El código de backend reside en `backend/src/{models,controllers,routes,middlewares,services}` y `backend/src/app.js`. `services` conserva la lógica comercial existente. React mantiene sus componentes, contexto y páginas e incorpora `frontend/src/services` como cliente HTTP único. No hay una segunda aplicación.

- [Matriz, cambios, estructura y resultados](docs/entrega-dia2.md).
- [Contrato de API](docs/api.md).
- [JWT, firma, renovación y riesgos de almacenamiento](docs/jwt.md).
- [Diagrama ER real](docs/diagrama_ER.mmd).
- [Limitaciones y pendientes](docs/pendientes.md).

Para generar el ZIP sin secretos ni dependencias: `python scripts/package.py`.

### Catálogo público y pruebas de Google

`GET /api/tienda/categorias`, `/marcas`, `/productos` y `/productos/:id` son lecturas públicas del catálogo activo. No exponen clientes, cuentas, mínimos de inventario ni promociones futuras. Los CRUD originales siguen requiriendo Bearer y sus roles. `POST /api/admin/catalogo-demo` requiere administrador.

`npm run test:google` prueba catálogo público, migración, PKCE, state/nonce, firma, audiencia, expiración y vinculación. `npm run test:google:ui` prueba el recorrido completo en Chromium con el transporte de Google simulado y verificación RSA real de la biblioteca oficial. Estas pruebas no equivalen a un inicio de sesión externo con credenciales reales de Google Cloud.

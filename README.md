# NovaObra Tienda — Mini Proyecto 1, Día 2

Tienda existente de ferretería con Node.js/Express, React/Vite y MySQL 8. Se conservan las diez tablas y los datos del modelo actual. La revisión añade JWT estándar, los endpoints de autenticación del PDF y los cinco endpoints de las ocho entidades empresariales. No incluye la investigación académica excluida por el usuario.

## Instalación y ejecución

Requisitos: Node.js 24 LTS (mínimo 22.13), npm, MySQL 8.0.16 o posterior iniciado e Internet para instalar dependencias. MariaDB no es compatible.

Desde la carpeta raíz `mini-proyecto-1`:

```sh
npm ci
npm run db:configure
npm run admin:create
npm start
```

`db:configure` pide el usuario administrador de MySQL y su contraseña sin mostrarla. Conserva la base `NovaObraTienda`, prepara sus diez tablas y crea una cuenta MySQL limitada a esa base. Guarda la cuenta de aplicación y una clave JWT aleatoria en **`backend/.env`**, excluido de Git y del ZIP. No guarda la clave administrativa. No borra tablas ni registros; rechaza una base con tablas ajenas. Si ya existe un archivo de configuración local, se conserva su conexión antes de preparar la cuenta.

`admin:create` crea un administrador **web** con nombre, correo y contraseña elegidos localmente. El usuario web es distinto del usuario MySQL. No hay una contraseña web predeterminada. Las cuentas ya existentes siguen funcionando con su hash anterior.

Abrir **http://127.0.0.1:5174**. Mantener la terminal abierta. Ctrl+C detiene API e interfaz; el inicio solo anuncia disponibilidad después de comprobar la API y el proxy. Los próximos arranques requieren solo `npm start` o doble clic en `INICIAR.bat` en Windows. En Linux/macOS también existe `sh iniciar.sh`.

La instalación y las pruebas se ejecutaron en Linux. Windows y macOS requieren validación propia. No se accedió a la base de datos de la computadora del usuario.

### Actualizar desde una versión anterior

No se cambia el esquema ni se copian datos a otra base. Si ya tienes un `.env` en la raíz, puedes copiarlo a `backend/.env` y conservarlo fuera de Git. Renombra `SESSION_SECRET` a `JWT_SECRET`, manteniendo su valor si tiene al menos 48 caracteres aleatorios. Se admite temporalmente el nombre anterior para compatibilidad; los ejemplos nuevos usan `JWT_SECRET`.

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

## Autenticación

- `POST /api/auth/register`: `{ nombre, correo, password }`, contraseña de 8 a 128 caracteres. Devuelve 201 con el usuario sin hash; correo duplicado devuelve 400.
- `POST /api/auth/login`: `{ correo, password }`. Devuelve 200 con `{ token, usuario }`, o 401 si las credenciales son incorrectas.
- `GET /api/auth/me`: requiere `Authorization: Bearer <token>`. Devuelve los datos públicos del usuario.
- `POST /api/auth/session`: recupera el JWT vigente desde la cookie HttpOnly, con origen y cabecera CSRF comprobados; conserva su expiración original.
- `POST /api/auth/logout`: revoca las sesiones del usuario y elimina la cookie.
- `PUT /api/auth/password`: verifica `actual`, guarda `nueva` y revoca las sesiones anteriores.

Se mantienen `/auth/registro` y `/auth/yo` como compatibilidad; los CRUD y `/auth/me` exigen Bearer. El JWT usa HS256, firma, emisor, audiencia y expiración de ocho horas. El payload contiene identificador y versión de sesión, sin contraseña ni datos privados. El backend vuelve a comprobar que la cuenta esté activa y no se haya revocado.

La persistencia de sesión usa una cookie `novaobra_session` **HttpOnly**, `SameSite=Lax`, ruta `/` y duración de ocho horas; en producción incorpora **Secure** y requiere HTTPS. El JWT se mantiene únicamente en memoria de React para enviarlo por Bearer. No se guarda en localStorage ni sessionStorage, y se retira la clave de almacenamiento de versiones anteriores.

Al recargar, React llama a `POST /auth/session` con credenciales, origen configurado y `X-NovaObra-Request: 1`. El servidor valida la cookie, firma, expiración, cuenta y revocación antes de devolver el mismo JWT. Esta recuperación no renueva su plazo ni implementa refresh tokens. Las llamadas HTTP usan `credentials: include`; los CRUD siguen exigiendo Bearer para cumplir el PDF. Mantener frontend/API en el mismo sitio, preferiblemente tras el mismo origen, para respetar SameSite.

Una cookie HttpOnly no puede leerse mediante document.cookie. El JWT de memoria sigue siendo accesible a JavaScript; esto reduce la persistencia del secreto pero no hace la aplicación inmune a XSS. El contexto limpia la sesión ante expiración/401 y redirige al login. Logout y cambio de contraseña revocan los tokens y eliminan la cookie con el mismo alcance.

Los orígenes ajenos se rechazan y las mutaciones requieren JSON, salvo DELETE sin cuerpo. Bearer permite usar Postman sin una cabecera personalizada ni un Origin inventado. Para despliegue real, usar HTTPS; no se ha configurado ni publicado un dominio.

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
```

Linux/macOS:

```sh
export NOVAOBRA_TEST_ADMIN_FILE='/ruta/al/json-privado-de-pruebas'
npm run test:integration
npm run test:postman
npm run test:ui
```

Las pruebas de navegador requieren Chromium. Puede definirse `CHROMIUM_PATH` con su ejecutable o instalarlo con `npx playwright-core install chromium`. `CHROMIUM_NO_SANDBOX=1` se usa solo en contenedores de pruebas que lo necesiten. Sin archivo de pruebas, Node marca explícitamente las integraciones como omitidas; eso no significa que estén verificadas en tu equipo.

La colección `postman/Dia2.postman_collection.json` contiene 93 solicitudes. Para ejecutarla manualmente, configurar `base_url`, `manager_email` y `manager_password` de un operador existente **en una base desechable**. No exportar sus valores privados. El caso de JWT vencido necesita `expired_token`; si está vacío, se omite expresamente. El ejecutor `test:postman` genera un JWT vencido real y ejecuta los 93 casos con Newman sin guardar credenciales en la colección.

## Estructura y evidencias

El código de backend reside en `backend/src/{models,controllers,routes,middlewares,services}` y `backend/src/app.js`. `services` conserva la lógica comercial existente. React mantiene sus componentes, contexto y páginas e incorpora `frontend/src/services` como cliente HTTP único. No hay una segunda aplicación.

- [Matriz, cambios, estructura y resultados](docs/entrega-dia2.md).
- [Contrato de API](docs/api.md).
- [Diagrama ER real](docs/diagrama_ER.mmd).
- [Limitaciones y pendientes](docs/pendientes.md).

Para generar el ZIP sin secretos ni dependencias: `python scripts/package.py`.

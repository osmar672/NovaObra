# NovaObra Tienda

Aplicación comercial en React/Vite, Express y MySQL 8. La tienda es la única aplicación del repositorio y utiliza una base de diez tablas. Su código está directamente en la raíz, sin carpeta `tienda/` adicional.

## Instalar en Windows

Requisitos: Node.js 24 LTS (mínimo 22.12), MySQL 8.0.16 o posterior iniciado y la contraseña de un administrador MySQL local. MariaDB no es compatible.

Desde PowerShell, en la raíz del repositorio:

```powershell
git pull origin main
npm ci
npm run db:configure
npm run admin:create
npm start
```

1. `db:configure` pide el usuario MySQL (normalmente `root`) y su contraseña **oculta**, prepara `NovaObraTienda` y crea una cuenta MySQL exclusiva con permisos sobre esa base. Guarda únicamente esa cuenta y una clave de sesión aleatoria en `.env`. No guarda la contraseña de root. Rechaza una base con tablas ajenas. Si falla, corrige el error antes de continuar.
2. `admin:create` pide nombre, correo y una contraseña nueva de al menos 12 caracteres para el **administrador de la página web**. Es diferente del usuario de MySQL. No hay credenciales web predeterminadas. Para crear otro administrador se puede repetir este comando.
3. `npm start` mantiene API y frontend en la misma terminal. Abre **http://127.0.0.1:5174**. Ctrl+C detiene ambos. En los próximos arranques solo ejecuta `npm start` desde la raíz, o abre `INICIAR.bat`.

Las contraseñas no aparecen mientras las escribes. No las pegues en comandos, Git ni capturas. El asistente es para MySQL local; para un servidor remoto prepara una cuenta con permisos equivalentes y completa `.env` manualmente.

La base predeterminada es `NovaObraTienda`. Las bases de versiones anteriores no se borran ni se importan automáticamente. La primera tienda está vacía. Inicia sesión como administrador y crea categorías, marcas y productos. Registra las existencias en **Administración → Inventario**; los productos nuevos empiezan con cero unidades.

### Datos demostrativos opcionales

Para una base **vacía**, después de `db:configure` y **antes** de `admin:create`:

```powershell
npm run db:setup -- --demo
```

Incluye seis categorías, una marca identificada como demostración y siete productos sin imágenes ni existencias inventadas. Los precios son de ejemplo, no precios comerciales reales. No utilizar estos registros como catálogo de producción. Si la base contiene registros, se rechaza la carga; no se borran datos. `npm run db:setup` sin `--demo` conserva los registros y prepara las tablas ausentes; no es un motor de migraciones de esquemas antiguos.

## Configuración e inicio

`.env.example` contiene las variables disponibles. El archivo real `.env` está excluido de Git. Cambia `BUSINESS_PHONE`, `BUSINESS_WHATSAPP` (código de país y número), `BUSINESS_EMAIL`, `BUSINESS_ADDRESS` y `BUSINESS_ABOUT` por información real. Los datos no configurados no se inventan. El formulario de contacto prepara un correo en la aplicación de correo del visitante y lo indica expresamente.

`DELIVERY_FEE` vacío habilita únicamente retiro. Configura un importe fijo en colones, por ejemplo `2500.00`, para ofrecer entrega a domicilio. La dirección y el teléfono quedan registrados en el pedido. No se calcula cobertura geográfica, impuestos ni costos por distancia; los precios cargados deben corresponder al importe final a cobrar y la tienda debe confirmar la entrega.

| Comando desde la raíz | Uso |
| --- | --- |
| `npm start` | API en 3003 y Vite en 5174, una terminal |
| `npm run serve` | Solo API y frontend compilado |
| `npm run dev` | Solo frontend Vite en 5174 |
| `npm run build` | Compilar frontend a `frontend/dist` |
| `npm run db:configure` | Asistente MySQL local |
| `npm run db:setup` | Preparar tablas con la cuenta configurada |
| `npm run admin:create` | Crear administrador web localmente |

El iniciador local requiere `PUBLIC_URL=http://127.0.0.1:5174`. Usa esa dirección exacta; `localhost` y `127.0.0.1` son orígenes diferentes. El backend comprueba las diez tablas antes de anunciarse listo. `ER_ACCESS_DENIED_ERROR` indica credenciales/permisos MySQL; tablas ausentes requieren `db:setup` o revisar `DB_NAME`.

Para servir el compilado localmente, configura `PUBLIC_URL=http://127.0.0.1:3003`, ejecuta `npm run build` y `npm run serve`. Para un despliegue real, configura `NODE_ENV=production` y `PUBLIC_URL=https://tu-dominio`, termina TLS en un proxy y expón **solo la tienda**. En producción las cookies requieren HTTPS. No se ha desplegado un sitio público ni configurado un dominio en esta entrega.

## Funciones disponibles

- Inicio responsive en amarillo, gris y blanco, categorías reales, destacados y productos recientes.
- Catálogo paginado, búsqueda por nombre, SKU, marca, categoría, descripción y especificaciones; filtros por categoría, marca, precio y disponibilidad, ordenación y sugerencias.
- Producto con precio CRC, especificaciones, imagen HTTPS opcional y carga diferida. Si falta una imagen se muestra un marcador identificado, no una fotografía inventada.
- Ofertas individuales con precio reducido y fechas UTC; las promociones vencidas dejan de aplicarse. No se inventan ofertas cuando no hay ninguna activa.
- Favoritos y carrito persistidos en ese navegador; no se sincronizan entre dispositivos. El carrito permite cambiar cantidades y eliminar productos.
- Registro de clientes, inicio/cierre de sesión y cambio de contraseña. Sesiones de ocho horas en cookies HttpOnly, roles administrador/empleado/cliente. Cambio de contraseña, permisos o desactivación invalida sesiones.
- Pedidos y cotizaciones con historial, detalles, teléfono, entrega y estados. La consulta de clientes se limita a sus propios pedidos.
- Panel privado: productos, categorías, marcas, promociones, entradas/salidas, alertas, clientes, pedidos, dashboard y gestión de roles. Los empleados no pueden gestionar usuarios/permisos.
- Stock transaccional: un pedido reserva stock al crearse; cancelarlo lo devuelve una sola vez. Se verifica stock bajo bloqueo y se calcula el precio en servidor. Una cotización no reserva stock. Confirmar una cotización significa atender la propuesta, no convertirla automáticamente en venta.
- Actualización mediante consultas cada 30 segundos para catálogo, producto, pedidos y dashboard. No son notificaciones instantáneas por WebSocket.
- Rutas descriptivas de producto, títulos y meta descripción por página, datos estructurados Product/Offer, `/sitemap.xml` y `/robots.txt` dinámicos. Los metadatos se generan en el navegador: el prerenderizado/SSR y tarjetas sociales por producto quedan pendientes.

## Límites y ampliaciones

Se priorizaron las operaciones esenciales del documento. Las reseñas, calificaciones y moderación necesitan entidades adicionales para autores, contenido y estados de moderación; se proponen como ampliación futura y no se simulan dentro de las diez tablas. Tampoco hay combos, campañas multiproducto, galerías de imágenes, streaming, chat en vivo ni podcasts: la página de guías identifica ese módulo como pendiente. Las marcas se administran en su catálogo, sin publicidad pagada ni banners ficticios.

No hay pasarela de pagos, almacenamiento de tarjetas, facturación fiscal, correos automáticos, recuperación de contraseña por correo ni verificación de direcciones de correo. Los pedidos no generan cobros. Las cancelaciones de pedidos se realizan por el personal, y el contacto se acuerda por los canales publicados. Los catálogos y registros históricos no se eliminan desde la interfaz; se desactivan cuando corresponde.

El panel lista los 200 pedidos, clientes, usuarios o movimientos más recientes; productos sí tienen paginación. Los informes son un resumen acumulado de pedidos entregados y productos vendidos, no un sistema contable. El stock reservado no caduca automáticamente: el personal debe cancelar los pedidos abandonados. El precio del detalle conserva el valor pactado, mientras que nombre/SKU se consultan del catálogo actual.

La limitación de intentos de acceso está en memoria por IP, adecuada para una instancia; múltiples réplicas necesitan un almacén compartido. No está configurado `trust proxy`, de modo que detrás de un proxy el límite puede aplicarse a su dirección compartida. No actives confianza general en cabeceras reenviadas sin definir proxies conocidos. Las cookies, CSRF, permisos y consultas parametrizadas se verificaron; no se afirma una auditoría externa ni preparación operativa completa para producción.

El asistente MySQL conserva las cuentas limitadas creadas en configuraciones anteriores si se ejecuta de nuevo; un administrador puede retirarlas después de verificar que ya no se usan. En POSIX el archivo `.env` se crea con modo 0600; en Windows usa los permisos NTFS del equipo. No hay borrados automáticos de bases existentes.

## Estructura, datos y pruebas

- `backend/routes`: autenticación y operaciones administrativas HTTP.
- `backend/services`: catálogo, precios y transacciones de pedidos.
- `backend/lib`: validación, contraseñas, sesiones y control de acceso.
- `backend/scripts`: instalación local, esquema y administrador.
- `frontend/src/pages`: inicio, catálogo, producto, carrito, cuenta, administración e información.
- `frontend/src/components`, `context`, `hooks`, `lib`: UI reutilizable, estado del navegador, consultas y API.
- `database/schema.sql`, `seed.sql`: esquema canónico y ejemplos opcionales.
- `tests`: unitarias, integración real y navegador.

Consulta [modelo y relaciones](docs/modelo.md), [contrato API](docs/api.md) y [verificación](docs/pruebas.md).

## Backend y frontend por separado

Ejecuta ambos comandos desde la raíz de NovaObra, cada uno en una terminal:

```powershell
# Terminal 1: backend
npm run serve
```

```powershell
# Terminal 2: frontend
npm run dev
```

La configuración y las dependencias son compartidas en la raíz. No ejecutes `npm start` dentro de `backend` o `frontend`; esas carpetas ya no tienen instalaciones separadas. El comando `npm start` en la raíz inicia ambos servicios. API: puerto 3003. Página: http://127.0.0.1:5174.

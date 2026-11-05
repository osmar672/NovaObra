# Entrega técnica — Mini Proyecto 1, Día 2

## Alcance confirmado

Se leyó completo el PDF adjunto: aunque su archivo se llama `Mini_Proyecto_1_Dia_1.pdf`, sus cinco páginas describen el Día 2. El texto pegado del usuario excluye expresamente la investigación académica. Se aplicaron los requisitos técnicos sin investigación ni bibliografía.

El usuario eligió **la tienda actual de GitHub**, no el sistema empresarial histórico de compras/ventas/proveedores. La base de trabajo fue el commit `c539bdb8ad801046bbc18df4cb8ebd3b03fdba8f`. Se conservaron sus diez tablas. No se agregó una segunda tabla de usuarios, ni se reemplazó MySQL, ni se implementó otra aplicación.

## Auditoría inicial y plan mínimo

| Requisito | Responsable inicial real | Estado inicial | Acción necesaria |
| --- | --- | --- | --- |
| Modelo relacional | database/schema.sql; backend/schema.js | VERIFICADO: diez tablas y claves reales | Conservar esquema y filas; actualizar ER y mapear atributos públicos de Usuario |
| CRUD por entidad | backend/routes/admin.js; backend/services/catalog.js y orders.js | PENDIENTE: faltaban endpoints completos de varias entidades | Reutilizar servicios; completar ocho CRUD con modelos/controladores/rutas específicos |
| Relaciones y stock | backend/services/orders.js; backend/routes/admin.js | VERIFICADO en los flujos anteriores, incompleto para nuevos CRUD | Validar referencias explícitamente y compensar reservas en transacciones |
| Registro/login | backend/routes/auth.js; backend/lib/auth.js | PENDIENTE: rutas/contratos distintos y token HMAC propio | Conservar hashes scrypt; incorporar JWT estándar y contratos del PDF |
| Protección Bearer | backend/lib/auth.js; backend/app.js | PENDIENTE: autenticación basada principalmente en cookie y catálogo público | Exigir Bearer en toda API empresarial y respuesta 401 uniforme |
| Variables de entorno | backend/config.js; backend/scripts/configure.js | PENDIENTE: SESSION_SECRET y .env raíz | JWT_SECRET y backend/.env; compatibilidad de transición sin perder conexión |
| React y sesión | frontend/src/context/ShopContext.jsx; pages/Account.jsx | PENDIENTE: sin AuthContext ni RutaProtegida | Separar sesión del carrito y añadir Login/Registro/guardas sin rediseñar la tienda |
| Una vista por entidad | frontend/src/pages/Admin.jsx | PENDIENTE: pestañas, sin las ocho vistas CRUD completas | Reutilizar componentes y crear una página/servicio por entidad |
| Estructura del PDF | backend/*.js y backend/lib; frontend/src/lib | PENDIENTE: ubicación funcional diferente | Mover únicamente los módulos funcionales a src y services; corregir importaciones |
| Postman/ER/entrega | docs/modelo.md, pruebas anteriores y scripts/package.py | PENDIENTE para el contrato del Día 2 | ER del esquema existente, colección ejecutable, pruebas y ZIP limpio |

El orden aplicado fue diagnóstico, ajuste de ubicaciones imprescindible, backend/modelos, JWT, frontend, integración, pruebas, correcciones y entrega.

## Matriz final de cumplimiento y evidencia

| Requisito | Archivo o módulo real | Estado | Prueba y evidencia |
| --- | --- | --- | --- |
| Cuarenta endpoints CRUD | backend/src/routes/*Routes.js; controllers/*Controller.js; models/entidades.js | VERIFICADO, con integridad y permisos heredados | tests/day2.js completa altas, listas, consultas, cambios y bajas en las ocho entidades; Newman repite los recorridos |
| Registro/login/perfil | controllers/authController.js; routes/authRoutes.js; models/usuario.js | VERIFICADO | Registro 201, duplicado 400, ocho caracteres, login {token,usuario}, perfil y ausencia de hash en respuestas |
| JWT y middleware | middlewares/authMiddleware.js | VERIFICADO | Todas las combinaciones de cuarenta rutas/métodos rechazan token ausente, manipulado, vencido y algoritmo incorrecto; revocación y cuenta activa comprobadas |
| Hash seguro | middlewares/authMiddleware.js; models/usuario.js | VERIFICADO | scrypt con sal aleatoria; comparación exacta de contraseñas, incluidas las que contienen espacios; hash persistido distinto del texto |
| Relaciones | models/entidades.js; services/catalog.js y orders.js | VERIFICADO | Referencias inexistentes 404; dependencias 409; no sobreventa; compensación de reservas y rollback |
| Contexto y rutas privadas React | context/AuthContext.jsx; components/RutaProtegida.jsx; services/api.js | VERIFICADO | Navegador: redirect sin sesión, Bearer automático, recarga, JWT de corta duración y logout hacia /login |
| Vistas de ocho entidades | pages/{categorias,marcas,productos,clientes,inventario,pedidos,detalle_pedidos,movimientos_inventario}.jsx; pages/Entidad.jsx | VERIFICADO | Navegación a las ocho vistas; CRUD persistente de categoría, cancelación y aceptación de borrado; selectores reales de producto |
| Tienda conservada | páginas Home/Catalog/Product/Cart/Account/Admin/Information | VERIFICADO | Búsqueda, favoritos, carrito, pedido, producto administrativo, entrada, confirmación y diseño móvil |
| Variables y configuración | backend/.env.example; backend/src/config.js; backend/scripts/configure.js | VERIFICADO en Linux | Asistente interactivo creó una cuenta MySQL limitada y JWT_SECRET en backend/.env; admin web y login desde Vite ejecutados |
| ER y contratos | docs/diagrama_ER.mmd; docs/api.md | VERIFICADO por contraste con esquema y API | Diez tablas reales, PK/FK/UK, cardinalidades y nombres de columnas existentes; correo/fechaCreacion documentados como contrato |
| Colección Postman | postman/Dia2.postman_collection.json; tests/postman.js | VERIFICADO | Newman ejecutó 93 solicitudes y 94 aserciones, incluido JWT vencido real generado en pruebas |
| Compilación e iniciador | package.json; iniciar.mjs; frontend/vite.config.js | VERIFICADO en Linux | Vite compiló; el inicio esperó API/proxy; fallo MySQL detuvo el inicio; SIGINT y Ctrl+C cerraron ambos procesos |
| Windows/macOS | INICIAR.bat; iniciar.sh | IMPLEMENTADO SIN PROBAR en esos sistemas | Se incluyen iniciadores; no se afirma ejecución nativa fuera de Linux |
| MySQL de la computadora del usuario | Configuración local externa | BLOQUEADO por falta de acceso | Se utilizó una instancia de pruebas propia, sin acceder a datos locales del usuario |

No se asigna un porcentaje automático de cumplimiento. El catálogo ahora exige autenticación, como pide el Día 2. Se conservan los roles previos por la orden de preservar la tienda; un cliente no obtiene permisos administrativos por registrarse. Los movimientos de pedidos y las entidades con dependencias mantienen restricciones 409 verificadas. Estas decisiones preservan la seguridad e integridad del modelo en lugar de eliminar controles para aparentar un CRUD irrestricto.

## Resultados de ejecución

Entorno real: Linux x86_64, Node.js 24.22.1, npm 11.9.0, MySQL 8.0.46/InnoDB y Chromium del entorno.

| Comando/recorrido | Resultado |
| --- | --- |
| npm ci | Instalación reproducible mediante archivos de bloqueo |
| npm test | 10 pruebas aprobadas |
| npm run test:integration | 25 pruebas/subpruebas aprobadas |
| npm run test:ui | 6 pruebas/subpruebas aprobadas |
| npm run test:postman | 93 solicitudes y 94 aserciones aprobadas; 1 prueba Node aprobada |
| npm run build | Compilación aprobada |
| db:configure → db:setup → admin:create → npm start | Recorrido interactivo real aprobado, con archivo local privado y cuenta MySQL limitada |
| Login JWT → consulta privada desde Vite → Ctrl+C | Aprobado; sin imprimir tokens ni contraseñas |

Las integraciones se ejecutaron con `NOVAOBRA_TEST_ADMIN_FILE` apuntando a un JSON privado fuera del repositorio. Cada fixture creó y eliminó su propia base temporal. La prueba interactiva utilizó otra base temporal; no se ejecutó sobre la base del usuario. Los avisos de `use client` de React Router durante la compilación y una obsolescencia interna de Newman no produjeron fallos.

## Problemas detectados y resueltos durante la integración

1. Las rutas nuevas se habían registrado inicialmente sin el prefijo `/api`; las pruebas reales lo detectaron. Se montaron en un Router de la API y se repitió el recorrido completo.
2. DELETE sin cuerpo era rechazado por el requisito global de JSON. El navegador lo detectó; se permitió ese método sin cuerpo y se mantuvo la protección Bearer.
3. Los selectores envueltos en etiquetas necesitaban un nombre accesible explícito para ser identificados sin ambigüedad. Se añadieron `aria-label` coherentes y se verificaron sus opciones.
4. Se evitó que respuestas 401 de una sesión anterior limpien un JWT recién iniciado. El cliente comprueba el token utilizado por cada petición antes de invalidar la sesión actual.
5. Tras eliminar un inventario vacío, la gestión debe poder seguir consultando el producto existente. Se conservó el catálogo público filtrado para clientes y se utilizó LEFT JOIN en las lecturas administrativas.
6. La pantalla de pedidos conserva una clave de solicitud por formulario. Chromium simuló una respuesta de red perdida después de guardar en MySQL: el reintento dejó un solo pedido y una sola reserva.
7. Se preservó el inventario al crear, editar y eliminar detalles de pedidos pendientes. Una prueba nueva confirmó reservas, compensaciones, cancelación e inmutabilidad de movimientos ligados a pedidos.
8. Las pruebas de navegador antiguas se adaptaron a la nueva autenticación previa al catálogo y al redirect explícito tras logout; se conservaron sus comprobaciones de stock, pedidos y móvil.

Los fallos anteriores se reprodujeron en pruebas y se corrigieron antes de registrar los resultados finales. No se eliminaron aserciones para aceptar errores funcionales.

## Estructura final

```text
mini-proyecto-1/
├── package.json, package-lock.json, README.md
├── iniciar.mjs, INICIAR.bat, iniciar.sh
├── backend/
│   ├── .env.example
│   ├── .env                 (solo local; excluido de entrega/Git)
│   ├── scripts/             (asistentes existentes)
│   └── src/
│       ├── app.js, config.js, db.js, schema.js, server.js
│       ├── models/          (usuario y ocho entidades)
│       ├── controllers/     (auth y controladores por entidad)
│       ├── routes/          (auth y rutas por entidad; admin previo)
│       ├── middlewares/     (authMiddleware.js y validaciones.js)
│       └── services/        (catálogo y pedidos conservados)
├── frontend/
│   ├── index.html, vite.config.js
│   └── src/
│       ├── components/      (diseño conservado y RutaProtegida)
│       ├── context/         (AuthContext y ShopContext)
│       ├── pages/           (tienda, Login/Registro y ocho vistas)
│       ├── services/        (api.js y servicio por entidad)
│       ├── hooks/           (useData existente)
│       └── main.jsx, styles.css
├── database/                (esquema y semilla existentes)
├── docs/                    (esta matriz, API, ER y pendientes)
├── postman/                 (colección del Día 2)
├── tests/                   (unitarias, integración, navegador y Newman)
└── scripts/package.py       (ZIP sin secretos ni dependencias)
```

`services` y `hooks` ya existían en la tienda y se conservaron. Los movimientos a `backend/src` y `frontend/src/services` fueron necesarios para ajustarse a las ubicaciones funcionales obligatorias del PDF. No se añadieron capas core/domain/repositories/modules ni una segunda aplicación.

## Dependencias e interacciones de los cambios

- JWT: jsonwebtoken y crypto/scrypt existente → modelo Usuario, controlador auth, middleware y AuthContext. Se verifica con pruebas HTTP, firma, expiración, algoritmo y navegador.
- Entidades: modelos/controladores/rutas → pool MySQL y servicios comerciales existentes. Se verifica con ocho recorridos CRUD y restricciones transaccionales.
- Frontend: servicios por entidad → cliente api único → Bearer/AuthContext/RutaProtegida → componentes y páginas. Se verifica en Chromium contra Express/MySQL reales.
- Configuración: asistentes → backend/.env → config, Express e inicialización Vite. Se verificó la instalación interactiva; no se incluyeron los secretos generados.
- Entrega: esquema real → ER y documentación → colección y empaquetador. El listado de archivos creados/modificados/movidos se incluye en el [inventario de cambios](inventario-cambios.md).

## Instalación, inicio y limitaciones

Los comandos exactos están en README y package.json. Desde la raíz: `npm ci`, `npm run db:configure`, `npm run admin:create`, `npm start`. Interfaz en `http://127.0.0.1:5174`. Con configuración existente válida, solo `npm start`.

Consultar `docs/pendientes.md` para los límites de plataforma, acceso a MySQL local y despliegue. No queda implementada una investigación académica, un nuevo sistema de roles, refresh tokens ni un despliegue HTTPS; no forman parte del alcance autorizado.

## Integración de cookies de sesión

La sesión persiste mediante novaobra_session HttpOnly, SameSite=Lax y Secure en producción. React mantiene el JWT únicamente en memoria y lo recupera con POST /api/auth/session, protegido por origen y cabecera personalizada. Se conserva la obligación Bearer de todos los CRUD. La recuperación conserva el mismo JWT y su expiración original. Logout, cambio de contraseña y rechazo de una cookie inválida eliminan la cookie con alcance consistente.

Pruebas: tests/cookies.test.js comprueba cabeceras reales de emisión/borrado y Secure por entorno; tests/cookies.js verifica recuperación, rechazo de CSRF, token vencido, revocación y que una cookie sola no abra los CRUD; tests/day2-ui.js comprueba HttpOnly, ausencia del JWT en sessionStorage/document.cookie, recarga, expiración y eliminación al cerrar sesión.

## Actualización de seguridad de dependencias

Se reprodujeron las 19 alertas (6 moderadas, 12 altas y 1 crítica) del árbol de Newman y se corrigieron las diez dependencias causantes sin retirar el ejecutor ni la colección. Las auditorías completa y de producción devuelven cero. Se añadió una verificación real de los 118 generadores y de iteraciones CSV con caracteres especiales. El detalle, versiones, parches y comandos están en [vulnerabilidades](vulnerabilidades.md).

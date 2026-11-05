# Inventario de cambios del Día 2

Cada archivo siguiente responde al alcance confirmado. Los cambios mínimos se describen por responsabilidad; no se añadió otra aplicación ni se eliminó el esquema relacional. Los módulos funcionales marcados como movidos se conservaron en la estructura obligatoria.

| Tipo | Archivo real | Problema o requisito | Dependencias/interacciones | Verificación |
| --- | --- | --- | --- | --- |
| Modificado | `README.md` | Documentación del contrato, cambios o evidencias | Esquema y código reales | Contraste con archivos y resultados |
| Creado | `backend/.env.example` | Configuración privada en backend/.env | MySQL local y scripts | Asistente interactivo y db:setup |
| Modificado | `backend/scripts/admin.js` | Configuración privada en backend/.env | MySQL local y scripts | Asistente interactivo y db:setup |
| Modificado | `backend/scripts/configure.js` | Configuración privada en backend/.env | MySQL local y scripts | Asistente interactivo y db:setup |
| Modificado | `backend/scripts/setup.js` | Configuración privada en backend/.env | MySQL local y scripts | Asistente interactivo y db:setup |
| Creado | `backend/src/app.js` | Ubicación src exigida y conservación de lógica | Express, MySQL y entorno | Integraciones y arranque |
| Creado | `backend/src/config.js` | Ubicación src exigida y conservación de lógica | Express, MySQL y entorno | Integraciones y arranque |
| Creado | `backend/src/controllers/authController.js` | Contrato HTTP y validaciones del PDF | Modelos, hash y JWT | Integración HTTP y Newman |
| Creado | `backend/src/controllers/categoriasController.js` | Contrato HTTP y validaciones del PDF | Modelos, hash y JWT | Integración HTTP y Newman |
| Creado | `backend/src/controllers/clientesController.js` | Contrato HTTP y validaciones del PDF | Modelos, hash y JWT | Integración HTTP y Newman |
| Creado | `backend/src/controllers/detalle_pedidosController.js` | Contrato HTTP y validaciones del PDF | Modelos, hash y JWT | Integración HTTP y Newman |
| Creado | `backend/src/controllers/entidadController.js` | Contrato HTTP y validaciones del PDF | Modelos, hash y JWT | Integración HTTP y Newman |
| Creado | `backend/src/controllers/inventarioController.js` | Contrato HTTP y validaciones del PDF | Modelos, hash y JWT | Integración HTTP y Newman |
| Creado | `backend/src/controllers/marcasController.js` | Contrato HTTP y validaciones del PDF | Modelos, hash y JWT | Integración HTTP y Newman |
| Creado | `backend/src/controllers/movimientos_inventarioController.js` | Contrato HTTP y validaciones del PDF | Modelos, hash y JWT | Integración HTTP y Newman |
| Creado | `backend/src/controllers/pedidosController.js` | Contrato HTTP y validaciones del PDF | Modelos, hash y JWT | Integración HTTP y Newman |
| Creado | `backend/src/controllers/productosController.js` | Contrato HTTP y validaciones del PDF | Modelos, hash y JWT | Integración HTTP y Newman |
| Creado | `backend/src/db.js` | Ubicación src exigida y conservación de lógica | Express, MySQL y entorno | Integraciones y arranque |
| Creado | `backend/src/middlewares/authMiddleware.js` | JWT Bearer, validación y scrypt | Usuarios, entorno y Express | Pruebas unitarias y JWT inválidos/vencidos |
| Creado | `backend/src/middlewares/validaciones.js` | JWT Bearer, validación y scrypt | Usuarios, entorno y Express | Pruebas unitarias y JWT inválidos/vencidos |
| Creado | `backend/src/models/categorias.js` | Modelo y operaciones de la entidad real | MySQL y servicios comerciales | tests/day2.js y Newman |
| Creado | `backend/src/models/clientes.js` | Modelo y operaciones de la entidad real | MySQL y servicios comerciales | tests/day2.js y Newman |
| Creado | `backend/src/models/detalle_pedidos.js` | Modelo y operaciones de la entidad real | MySQL y servicios comerciales | tests/day2.js y Newman |
| Creado | `backend/src/models/entidades.js` | Modelo y operaciones de la entidad real | MySQL y servicios comerciales | tests/day2.js y Newman |
| Creado | `backend/src/models/inventario.js` | Modelo y operaciones de la entidad real | MySQL y servicios comerciales | tests/day2.js y Newman |
| Creado | `backend/src/models/marcas.js` | Modelo y operaciones de la entidad real | MySQL y servicios comerciales | tests/day2.js y Newman |
| Creado | `backend/src/models/movimientos_inventario.js` | Modelo y operaciones de la entidad real | MySQL y servicios comerciales | tests/day2.js y Newman |
| Creado | `backend/src/models/pedidos.js` | Modelo y operaciones de la entidad real | MySQL y servicios comerciales | tests/day2.js y Newman |
| Creado | `backend/src/models/productos.js` | Modelo y operaciones de la entidad real | MySQL y servicios comerciales | tests/day2.js y Newman |
| Creado | `backend/src/models/usuario.js` | Modelo y operaciones de la entidad real | MySQL y servicios comerciales | tests/day2.js y Newman |
| Creado | `backend/src/routes/admin.js` | Cinco endpoints por entidad o rutas de autenticación | Middleware y controladores | Cuarenta combinaciones protegidas y CRUD |
| Creado | `backend/src/routes/authRoutes.js` | Cinco endpoints por entidad o rutas de autenticación | Middleware y controladores | Cuarenta combinaciones protegidas y CRUD |
| Creado | `backend/src/routes/categoriasRoutes.js` | Cinco endpoints por entidad o rutas de autenticación | Middleware y controladores | Cuarenta combinaciones protegidas y CRUD |
| Creado | `backend/src/routes/clientesRoutes.js` | Cinco endpoints por entidad o rutas de autenticación | Middleware y controladores | Cuarenta combinaciones protegidas y CRUD |
| Creado | `backend/src/routes/detalle_pedidosRoutes.js` | Cinco endpoints por entidad o rutas de autenticación | Middleware y controladores | Cuarenta combinaciones protegidas y CRUD |
| Creado | `backend/src/routes/inventarioRoutes.js` | Cinco endpoints por entidad o rutas de autenticación | Middleware y controladores | Cuarenta combinaciones protegidas y CRUD |
| Creado | `backend/src/routes/marcasRoutes.js` | Cinco endpoints por entidad o rutas de autenticación | Middleware y controladores | Cuarenta combinaciones protegidas y CRUD |
| Creado | `backend/src/routes/movimientos_inventarioRoutes.js` | Cinco endpoints por entidad o rutas de autenticación | Middleware y controladores | Cuarenta combinaciones protegidas y CRUD |
| Creado | `backend/src/routes/pedidosRoutes.js` | Cinco endpoints por entidad o rutas de autenticación | Middleware y controladores | Cuarenta combinaciones protegidas y CRUD |
| Creado | `backend/src/routes/productosRoutes.js` | Cinco endpoints por entidad o rutas de autenticación | Middleware y controladores | Cuarenta combinaciones protegidas y CRUD |
| Creado | `backend/src/schema.js` | Ubicación src exigida y conservación de lógica | Express, MySQL y entorno | Integraciones y arranque |
| Creado | `backend/src/server.js` | Ubicación src exigida y conservación de lógica | Express, MySQL y entorno | Integraciones y arranque |
| Creado | `backend/src/services/catalog.js` | Ubicación src exigida y conservación de lógica | Express, MySQL y entorno | Integraciones y arranque |
| Creado | `backend/src/services/orders.js` | Ubicación src exigida y conservación de lógica | Express, MySQL y entorno | Integraciones y arranque |
| Modificado | `docs/api.md` | Documentación del contrato, cambios o evidencias | Esquema y código reales | Contraste con archivos y resultados |
| Creado | `docs/diagrama_ER.mmd` | Documentación del contrato, cambios o evidencias | Esquema y código reales | Contraste con archivos y resultados |
| Creado | `docs/entrega-dia2.md` | Documentación del contrato, cambios o evidencias | Esquema y código reales | Contraste con archivos y resultados |
| Creado | `docs/pendientes.md` | Documentación del contrato, cambios o evidencias | Esquema y código reales | Contraste con archivos y resultados |
| Modificado | `docs/pruebas.md` | Documentación del contrato, cambios o evidencias | Esquema y código reales | Contraste con archivos y resultados |
| Modificado | `docs/revision-2026-11-05.md` | Documentación del contrato, cambios o evidencias | Esquema y código reales | Contraste con archivos y resultados |
| Modificado | `frontend/src/components/Layout.jsx` | Autenticación, páginas y servicios sin sustituir la tienda | AuthContext, API Bearer y componentes existentes | Compilación y Chromium |
| Creado | `frontend/src/components/RutaProtegida.jsx` | Autenticación, páginas y servicios sin sustituir la tienda | AuthContext, API Bearer y componentes existentes | Compilación y Chromium |
| Modificado | `frontend/src/components/UI.jsx` | Autenticación, páginas y servicios sin sustituir la tienda | AuthContext, API Bearer y componentes existentes | Compilación y Chromium |
| Creado | `frontend/src/context/AuthContext.jsx` | Autenticación, páginas y servicios sin sustituir la tienda | AuthContext, API Bearer y componentes existentes | Compilación y Chromium |
| Modificado | `frontend/src/context/ShopContext.jsx` | Autenticación, páginas y servicios sin sustituir la tienda | AuthContext, API Bearer y componentes existentes | Compilación y Chromium |
| Modificado | `frontend/src/hooks/useData.js` | Autenticación, páginas y servicios sin sustituir la tienda | AuthContext, API Bearer y componentes existentes | Compilación y Chromium |
| Modificado | `frontend/src/main.jsx` | Autenticación, páginas y servicios sin sustituir la tienda | AuthContext, API Bearer y componentes existentes | Compilación y Chromium |
| Modificado | `frontend/src/pages/Account.jsx` | Autenticación, páginas y servicios sin sustituir la tienda | AuthContext, API Bearer y componentes existentes | Compilación y Chromium |
| Modificado | `frontend/src/pages/Admin.jsx` | Autenticación, páginas y servicios sin sustituir la tienda | AuthContext, API Bearer y componentes existentes | Compilación y Chromium |
| Modificado | `frontend/src/pages/Cart.jsx` | Autenticación, páginas y servicios sin sustituir la tienda | AuthContext, API Bearer y componentes existentes | Compilación y Chromium |
| Creado | `frontend/src/pages/Entidad.jsx` | Autenticación, páginas y servicios sin sustituir la tienda | AuthContext, API Bearer y componentes existentes | Compilación y Chromium |
| Modificado | `frontend/src/pages/Home.jsx` | Autenticación, páginas y servicios sin sustituir la tienda | AuthContext, API Bearer y componentes existentes | Compilación y Chromium |
| Modificado | `frontend/src/pages/Information.jsx` | Autenticación, páginas y servicios sin sustituir la tienda | AuthContext, API Bearer y componentes existentes | Compilación y Chromium |
| Creado | `frontend/src/pages/Login.jsx` | Autenticación, páginas y servicios sin sustituir la tienda | AuthContext, API Bearer y componentes existentes | Compilación y Chromium |
| Modificado | `frontend/src/pages/Product.jsx` | Autenticación, páginas y servicios sin sustituir la tienda | AuthContext, API Bearer y componentes existentes | Compilación y Chromium |
| Creado | `frontend/src/pages/Registro.jsx` | Autenticación, páginas y servicios sin sustituir la tienda | AuthContext, API Bearer y componentes existentes | Compilación y Chromium |
| Creado | `frontend/src/pages/categorias.jsx` | Autenticación, páginas y servicios sin sustituir la tienda | AuthContext, API Bearer y componentes existentes | Compilación y Chromium |
| Creado | `frontend/src/pages/clientes.jsx` | Autenticación, páginas y servicios sin sustituir la tienda | AuthContext, API Bearer y componentes existentes | Compilación y Chromium |
| Creado | `frontend/src/pages/detalle_pedidos.jsx` | Autenticación, páginas y servicios sin sustituir la tienda | AuthContext, API Bearer y componentes existentes | Compilación y Chromium |
| Creado | `frontend/src/pages/inventario.jsx` | Autenticación, páginas y servicios sin sustituir la tienda | AuthContext, API Bearer y componentes existentes | Compilación y Chromium |
| Creado | `frontend/src/pages/marcas.jsx` | Autenticación, páginas y servicios sin sustituir la tienda | AuthContext, API Bearer y componentes existentes | Compilación y Chromium |
| Creado | `frontend/src/pages/movimientos_inventario.jsx` | Autenticación, páginas y servicios sin sustituir la tienda | AuthContext, API Bearer y componentes existentes | Compilación y Chromium |
| Creado | `frontend/src/pages/pedidos.jsx` | Autenticación, páginas y servicios sin sustituir la tienda | AuthContext, API Bearer y componentes existentes | Compilación y Chromium |
| Creado | `frontend/src/pages/productos.jsx` | Autenticación, páginas y servicios sin sustituir la tienda | AuthContext, API Bearer y componentes existentes | Compilación y Chromium |
| Creado | `frontend/src/services/api.js` | Autenticación, páginas y servicios sin sustituir la tienda | AuthContext, API Bearer y componentes existentes | Compilación y Chromium |
| Creado | `frontend/src/services/categorias.js` | Autenticación, páginas y servicios sin sustituir la tienda | AuthContext, API Bearer y componentes existentes | Compilación y Chromium |
| Creado | `frontend/src/services/clientes.js` | Autenticación, páginas y servicios sin sustituir la tienda | AuthContext, API Bearer y componentes existentes | Compilación y Chromium |
| Creado | `frontend/src/services/detalle_pedidos.js` | Autenticación, páginas y servicios sin sustituir la tienda | AuthContext, API Bearer y componentes existentes | Compilación y Chromium |
| Creado | `frontend/src/services/inventario.js` | Autenticación, páginas y servicios sin sustituir la tienda | AuthContext, API Bearer y componentes existentes | Compilación y Chromium |
| Creado | `frontend/src/services/marcas.js` | Autenticación, páginas y servicios sin sustituir la tienda | AuthContext, API Bearer y componentes existentes | Compilación y Chromium |
| Creado | `frontend/src/services/movimientos_inventario.js` | Autenticación, páginas y servicios sin sustituir la tienda | AuthContext, API Bearer y componentes existentes | Compilación y Chromium |
| Creado | `frontend/src/services/pedidos.js` | Autenticación, páginas y servicios sin sustituir la tienda | AuthContext, API Bearer y componentes existentes | Compilación y Chromium |
| Creado | `frontend/src/services/productos.js` | Autenticación, páginas y servicios sin sustituir la tienda | AuthContext, API Bearer y componentes existentes | Compilación y Chromium |
| Modificado | `frontend/src/styles.css` | Autenticación, páginas y servicios sin sustituir la tienda | AuthContext, API Bearer y componentes existentes | Compilación y Chromium |
| Modificado | `frontend/vite.config.js` | Ejecución, dependencia necesaria o empaquetado | Node, npm, Vite y ZIP | Instalación, build y revisión de ZIP |
| Modificado | `iniciar.mjs` | Ejecución, dependencia necesaria o empaquetado | Node, npm, Vite y ZIP | Instalación, build y revisión de ZIP |
| Modificado | `package-lock.json` | Ejecución, dependencia necesaria o empaquetado | Node, npm, Vite y ZIP | Instalación, build y revisión de ZIP |
| Modificado | `package.json` | Ejecución, dependencia necesaria o empaquetado | Node, npm, Vite y ZIP | Instalación, build y revisión de ZIP |
| Creado | `postman/Dia2.postman_collection.json` | Colección del Día 2 | JWT y API real | 93 solicitudes / 94 aserciones Newman |
| Modificado | `scripts/package.py` | Ejecución, dependencia necesaria o empaquetado | Node, npm, Vite y ZIP | Instalación, build y revisión de ZIP |
| Modificado | `tests/core.test.js` | Regresiones y evidencias ejecutables | Express, MySQL, Chromium o Newman | Comandos npm documentados |
| Creado | `tests/day2-ui.js` | Regresiones y evidencias ejecutables | Express, MySQL, Chromium o Newman | Comandos npm documentados |
| Creado | `tests/day2.js` | Regresiones y evidencias ejecutables | Express, MySQL, Chromium o Newman | Comandos npm documentados |
| Modificado | `tests/helpers.js` | Regresiones y evidencias ejecutables | Express, MySQL, Chromium o Newman | Comandos npm documentados |
| Modificado | `tests/integration.js` | Regresiones y evidencias ejecutables | Express, MySQL, Chromium o Newman | Comandos npm documentados |
| Creado | `tests/postman.js` | Regresiones y evidencias ejecutables | Express, MySQL, Chromium o Newman | Comandos npm documentados |
| Modificado | `tests/regressions.test.js` | Regresiones y evidencias ejecutables | Express, MySQL, Chromium o Newman | Comandos npm documentados |
| Modificado | `tests/ui.js` | Regresiones y evidencias ejecutables | Express, MySQL, Chromium o Newman | Comandos npm documentados |
| Movido | `.env.example` | Ubicación funcional ajustada al PDF; contenido integrado en src/backend o services/frontend | Importaciones y ejecutores actualizados | Integraciones, build y navegador |
| Movido | `backend/app.js` | Ubicación funcional ajustada al PDF; contenido integrado en src/backend o services/frontend | Importaciones y ejecutores actualizados | Integraciones, build y navegador |
| Movido | `backend/config.js` | Ubicación funcional ajustada al PDF; contenido integrado en src/backend o services/frontend | Importaciones y ejecutores actualizados | Integraciones, build y navegador |
| Movido | `backend/db.js` | Ubicación funcional ajustada al PDF; contenido integrado en src/backend o services/frontend | Importaciones y ejecutores actualizados | Integraciones, build y navegador |
| Movido | `backend/lib/auth.js` | Ubicación funcional ajustada al PDF; contenido integrado en src/backend o services/frontend | Importaciones y ejecutores actualizados | Integraciones, build y navegador |
| Movido | `backend/lib/validation.js` | Ubicación funcional ajustada al PDF; contenido integrado en src/backend o services/frontend | Importaciones y ejecutores actualizados | Integraciones, build y navegador |
| Movido | `backend/routes/admin.js` | Ubicación funcional ajustada al PDF; contenido integrado en src/backend o services/frontend | Importaciones y ejecutores actualizados | Integraciones, build y navegador |
| Movido | `backend/routes/auth.js` | Ubicación funcional ajustada al PDF; contenido integrado en src/backend o services/frontend | Importaciones y ejecutores actualizados | Integraciones, build y navegador |
| Movido | `backend/schema.js` | Ubicación funcional ajustada al PDF; contenido integrado en src/backend o services/frontend | Importaciones y ejecutores actualizados | Integraciones, build y navegador |
| Movido | `backend/server.js` | Ubicación funcional ajustada al PDF; contenido integrado en src/backend o services/frontend | Importaciones y ejecutores actualizados | Integraciones, build y navegador |
| Movido | `backend/services/catalog.js` | Ubicación funcional ajustada al PDF; contenido integrado en src/backend o services/frontend | Importaciones y ejecutores actualizados | Integraciones, build y navegador |
| Movido | `backend/services/orders.js` | Ubicación funcional ajustada al PDF; contenido integrado en src/backend o services/frontend | Importaciones y ejecutores actualizados | Integraciones, build y navegador |
| Movido | `frontend/src/lib/api.js` | Ubicación funcional ajustada al PDF; contenido integrado en src/backend o services/frontend | Importaciones y ejecutores actualizados | Integraciones, build y navegador |

| Creado | `tests/cookies.test.js` | Contrato de emisión y borrado de cookies por entorno | Express y cookie de sesión | Cabeceras HTTP reales |
| Creado | `tests/cookies.js` | Recuperación segura y revocación | MySQL, JWT y CSRF | Integración ejecutable |

| Creado | `patches/newman+6.2.3.patch` | Adaptación al lector CSV corregido | Newman y csv-parse 7 | Iteraciones CSV reales |
| Creado | `patches/postman-collection+4.4.0.patch` | Adaptación al Faker corregido | SDK Postman y Faker 10 | 118 generadores y colección |
| Creado | `tests/apply-security-patches.cjs` | Instalación reproducible de parches | npm postinstall y patch-package | npm ci completo y --omit=dev |
| Creado | `tests/newman-compat.test.js` | Regresiones de dependencias corregidas | SDK, CSV y Newman | Dos pruebas ejecutables |
| Creado | `docs/vulnerabilidades.md` | Análisis de las 19 entradas y solución | Auditorías y archivo de bloqueo | npm run audit:deps |

## Ampliación autorizada: refresh y HTTPS

Se modifica autenticación de backend/React conservando models/controllers/routes/middlewares. Se añade models/sesion.js, tabla sesiones_refresh (once tablas totales), renovación con rotación y detección de reutilización. Se añaden backend/scripts/https.js, TLS nativo, redirección, deploy/Caddyfile, test:https y docs/jwt.md. Se actualizan README, contrato API y diagrama. El iniciador admite HTTPS sirviendo React compilado. Los certificados y claves privadas se excluyen del ZIP/Git. Continúan los ocho CRUD y permisos existentes.

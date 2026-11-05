# JWT y sesiones en NovaObra

Un JSON Web Token de acceso demuestra una identidad mediante una firma verificable. Tiene tres segmentos separados por puntos: `header.payload.firma`.

- Header: algoritmo HS256 y tipo JWT.
- Payload: identificador `sub`, versión `v`, familia de sesión `sid`, tipo `kind=access`, identificador único `jti`, emisor `iss`, audiencia `aud`, emisión `iat` y vencimiento `exp`.
- Firma: HMAC-SHA256 del header y payload codificados en Base64URL, usando JWT_SECRET. Cambiar cualquiera invalida la firma. Base64URL no cifra el contenido.

La implementación real está en backend/src/middlewares/authMiddleware.js: `issueToken` llama a `jwt.sign` con HS256, subject, expiresIn, issuer y audience; `readToken` usa `jwt.verify` con algoritmo permitido, emisor, audiencia y reloj. `jwt.decode` solo lee contenido: no sirve para autorizar.

El middleware requiere `Authorization: Bearer ...`, verifica firma y vencimiento y consulta usuario activo, versión y familia de sesión vigente en MySQL. Un token firmado pero revocado no autoriza. Las rutas de gestión conservan además el control de roles.

React envía el acceso desde memoria con Authorization. Al expirar, un refresh opaco en cookie HttpOnly permite emitir otro acceso. Cada refresh se consume y reemplaza; el vencimiento absoluto no se alarga. Su hash se guarda en sesiones_refresh. Un token usado nuevamente revoca su familia. Si expira o se revoca el refresh, React vuelve al login. Logout y cambio de contraseña revocan todas las sesiones del usuario.

| Almacenamiento | Persistencia | Riesgo y uso aquí |
| --- | --- | --- |
| localStorage | Sobrevive al cierre del navegador | Un XSS puede extraerlo; no utilizado |
| sessionStorage | Pestaña actual | También accesible ante XSS; no utilizado |
| Memoria React | Hasta recargar | Acceso de 15 minutos; XSS todavía puede usarlo mientras la página esté abierta |
| Cookie HttpOnly | Siete días como máximo | Refresh ilegible por JavaScript; envío automático requiere protección CSRF |

La cookie usa HttpOnly, SameSite=Lax, Path=/api/auth y Secure con HTTPS. Las renovaciones y logout mediante cookie exigen Origin exacto y X-NovaObra-Request: 1; fetch incluye credentials. CORS permite únicamente el origen configurado. SameSite no sustituye la validación CSRF; HttpOnly tampoco impide que un XSS ejecute acciones desde una sesión abierta.

JWT_SECRET se genera aleatoriamente, requiere al menos 48 caracteres y queda en backend/.env, fuera de Git/ZIP. No se coloca en React, ni en variables VITE_, ni en registros. No incluir contraseñas, claves, información de pago ni datos sensibles en el payload. La rotación de la clave invalida los accesos y requiere coordinar reinicios.

HTTPS protege credenciales y tokens durante el tránsito. La configuración nativa exige TLS 1.2 o superior; producción requiere HTTPS, cookies Secure y HSTS. El certificado autofirmado local es únicamente para desarrollo. Para acceso público hace falta un dominio y un certificado válido; se incluye la alternativa Caddy con renovación automática de certificados. Consulta README para los comandos y pruebas.

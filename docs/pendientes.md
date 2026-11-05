# Limitaciones y pendientes

- **BLOQUEADO por acceso no disponible:** comprobar la instalación sobre el MySQL de la computadora del usuario. Se verificó una instancia temporal real de MySQL 8 en Linux, no sus datos locales.
- **IMPLEMENTADO SIN PROBAR en esas plataformas:** ejecución nativa de Windows/macOS. Los mismos comandos npm y sus iniciadores se incluyen; no se afirma validación en esos sistemas.
- **PENDIENTE de datos del propietario:** dominio y servidor para publicar HTTPS. Se implementaron HTTPS nativo, configuración Caddy y refresh tokens con rotación; OAuth de Google está implementado; falta que el propietario cree su cliente web y lo configure localmente. No se ha probado contra una cuenta externa real de Google.
- Se conservaron roles y permisos anteriores. Por ello un cliente registrado no administra inventario ni otros clientes: obtiene 403 aunque tenga un JWT válido. Se necesita un operador existente para todos los CRUD de gestión.
- Los registros asociados a pedidos e historial comercial no se borran para satisfacer artificialmente una prueba. Se devuelven conflictos 409 verificables y se usa el flujo de cancelación cuando corresponde.
- Los JWT anteriores a esta revisión deben renovarse iniciando sesión. La configuración anterior SESSION_SECRET se admite como transición a JWT_SECRET; no se modifican las contraseñas almacenadas.
- La persistencia usa cookie HttpOnly (Secure en producción, SameSite=Lax) y el JWT permanece solo en memoria. La renovación exige origen y cabecera CSRF, rota el refresh y genera un JWT nuevo sin extender el vencimiento absoluto de siete días. La memoria JavaScript sigue expuesta ante XSS; las cookies HttpOnly no eliminan por sí solas todos los riesgos de una aplicación.
- El control de intentos sigue siendo el limitador en memoria de la tienda. Varias réplicas necesitarían un almacenamiento compartido, sin añadirlo para este ejercicio.
- La investigación académica del PDF quedó excluida por instrucción expresa. Se aplicaron sus controles técnicos; no se generó bibliografía ni informe de investigación.

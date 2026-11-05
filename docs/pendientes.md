# Limitaciones y pendientes

- **BLOQUEADO por acceso no disponible:** comprobar la instalación sobre el MySQL de la computadora del usuario. Se verificó una instancia temporal real de MySQL 8 en Linux, no sus datos locales.
- **IMPLEMENTADO SIN PROBAR en esas plataformas:** ejecución nativa de Windows/macOS. Los mismos comandos npm y sus iniciadores se incluyen; no se afirma validación en esos sistemas.
- **PENDIENTE, fuera del alcance académico:** dominio, certificado HTTPS y despliegue público. No se añadieron refresh tokens ni OAuth.
- Se conservaron roles y permisos anteriores. Por ello un cliente registrado no administra inventario ni otros clientes: obtiene 403 aunque tenga un JWT válido. Se necesita un operador existente para todos los CRUD de gestión.
- Los registros asociados a pedidos e historial comercial no se borran para satisfacer artificialmente una prueba. Se devuelven conflictos 409 verificables y se usa el flujo de cancelación cuando corresponde.
- Los JWT anteriores a esta revisión deben renovarse iniciando sesión. La configuración anterior SESSION_SECRET se admite como transición a JWT_SECRET; no se modifican las contraseñas almacenadas.
- sessionStorage conserva el token durante esa pestaña, pero es accesible desde JavaScript y no es inmune a XSS. El servidor conserva validación de JWT y sesión y el cliente limpia el token al vencer o recibir 401.
- El control de intentos sigue siendo el limitador en memoria de la tienda. Varias réplicas necesitarían un almacenamiento compartido, sin añadirlo para este ejercicio.
- La investigación académica del PDF quedó excluida por instrucción expresa. Se aplicaron sus controles técnicos; no se generó bibliografía ni informe de investigación.

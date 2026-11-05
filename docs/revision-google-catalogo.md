# Catálogo visible y acceso con Google

La portada anterior mostraba tarjetas estáticas a visitantes porque solicitaba el catálogo con rutas que exigían sesión. El inicio actual consulta una API pública de solo lectura y muestra productos reales con precio, descripción, foto y filtros por departamento. El catálogo y las fichas funcionan antes de entrar a una cuenta. La compra, solicitudes e interfaces de gestión conservan sus permisos.

El administrador puede añadir los 48 productos de demostración desde Inicio o Administración, con un resultado visible y recarga de datos. La operación no sobrescribe registros existentes. Los datos se identifican como ficticios y las fotografías como referencias.

Google está integrado mediante OAuth 2.0, PKCE, state, nonce, biblioteca oficial y sesión propia de NovaObra. La migración añade identidades_google y usuarios.password_local; conserva hashes y cuentas existentes. En desarrollo npm start ejecuta la preparación aditiva. No hay credenciales Google del propietario: es necesario crear su cliente web y ejecutar npm run google:configure. Consultar google-login.md.

Verificación en Linux, MySQL 8 temporal y Chromium: 10 pruebas unitarias, 25 de integración, 6 de interfaz existente, 3 de catálogo de demostración, 5 de Google/catálogo público y una de navegador Google. Newman: 93 solicitudes y 94 aserciones. HTTPS: certificado validado y cookies Secure. Build aprobado. npm audit completo y de producción: cero vulnerabilidades.

La prueba de navegador Google simula el transporte externo y conserva la verificación RSA oficial. No acredita un acceso externo contra una cuenta real de Google. No se accedió al MySQL del usuario ni se validó ejecución nativa de Windows. Las fotos siguen siendo recursos locales con sus créditos; no se generaron imágenes con IA.

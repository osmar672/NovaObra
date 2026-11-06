# Activar el acceso con Google

El código del acceso está implementado. Para usar cuentas reales debes crear un cliente OAuth de tu propio proyecto en Google Cloud. El secreto permanece en el backend; no se comparte por chat ni se añade a Git. La clave JWT de NovaObra y el secreto de Google son distintos.

## 1. Comprueba la dirección de NovaObra

Para desarrollo local, usa el mismo origen en el navegador y en `PUBLIC_URL` de `backend/.env`:

```
PUBLIC_URL=http://127.0.0.1:5174
```

Su URI de redirección exacta es:

```
http://127.0.0.1:5174/api/auth/google/callback
```

No intercambies `localhost` y `127.0.0.1`. El puerto, protocolo y ruta deben coincidir. En producción configura tu dominio HTTPS, por ejemplo `https://tienda.ejemplo.com/api/auth/google/callback`.

## 2. Crea el cliente web

1. Abre https://console.cloud.google.com/ y selecciona o crea un proyecto.
2. En **Google Auth Platform**, configura la marca/pantalla de consentimiento, correo de soporte y contacto. Selecciona la audiencia apropiada; para cuentas personales suele ser Externa.
3. Si la aplicación permanece en pruebas, añade las cuentas que usarás a **Usuarios de prueba** en Audiencia. Completa los requisitos que Google muestre para tu proyecto.
4. En **Clientes**, crea un cliente OAuth de tipo **Aplicación web**.
5. Añade la URI de redirección exacta del apartado anterior en **URIs de redirección autorizados**. Este flujo del servidor no requiere el SDK JavaScript de Google ni una API key.
6. Copia el ID de cliente público y guarda el secreto de forma privada. Los permisos utilizados son solo `openid`, `email` y `profile`.

## 3. Configúralo localmente

Desde la raíz del repositorio, en la terminal de Visual Studio Code:

```powershell
npm ci
npm run google:configure
npm start
```

El asistente muestra la URI que debes registrar y solicita ID y secreto. La entrada del secreto está oculta. Guarda `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` en `backend/.env` conservando la conexión MySQL y JWT_SECRET. Si ya estaba ejecutándose, detén la aplicación con Ctrl+C y reiníciala.

También puedes completar esas dos variables manualmente. Ambas vacías deshabilitan Google; completar solo una produce un error de configuración. Nunca uses prefijos `VITE_` para el secreto. Para desplegar, configura las variables privadas del servidor y ejecuta `npm run db:setup`, `npm run build` y `npm run serve`.

## 4. Prueba con tu cuenta

- Abre Login y pulsa **Continuar con Google**. Debe llevar a la pantalla real de Google y regresar a NovaObra con tu sesión iniciada.
- Una cuenta nueva obtiene el rol cliente y un perfil. Su contraseña se administra en Google.
- Si el correo ya existe en NovaObra, accede primero con la contraseña actual. Desde **Cuenta**, confirma esa contraseña y pulsa **Vincular mi cuenta de Google**. El correo verificado debe coincidir. Tu rol y contraseña local se conservan.
- Cierra sesión y prueba entrar nuevamente con Google. Nunca se concede rol administrador por datos del perfil de Google.

Si Google muestra `redirect_uri_mismatch`, corrige la URI exacta. Si el cliente es inválido, revisa ID y secreto. Si niega acceso en modo pruebas, añade tu correo como usuario de prueba. La cancelación permite volver a iniciar sesión por contraseña. En caso de una transacción vencida o sustituida por otra pestaña, comienza el acceso otra vez.

## Seguridad y alcance de las pruebas

Se usan código de autorización, PKCE S256, state y nonce aleatorios. La transacción se guarda diez minutos en una cookie HttpOnly cifrada y autenticada. El backend intercambia el código y verifica firma, emisor, audiencia, expiración, nonce y correo verificado. La identidad se vincula por el `sub` estable de Google; no se guardan access tokens ni refresh tokens de Google. NovaObra emite su propia sesión con refresh HttpOnly y JWT en memoria.

Las pruebas automáticas incluyen firma RSA válida e inválida, CSRF, estado vencido/alterado, replay del código, usuario desactivado y vinculación con contraseña. La prueba de Chromium recorre las redirecciones y cookies con el transporte del proveedor simulado. No se dispone de un cliente OAuth real del propietario en este entorno, por lo que la activación y la prueba externa con Google quedan pendientes de su configuración.

## Si falla después de elegir tu cuenta

El login muestra ahora el tipo de fallo. La terminal donde ejecutas npm start imprime una línea como `[NovaObra Google] etapa=exchange motivo=credentials`, sin secretos, códigos, tokens ni datos de la cuenta. Comparte únicamente esa línea para diagnosticar el acceso; no publiques el archivo .env ni la URL completa de regreso de Google.

| Motivo | Qué revisar |
| --- | --- |
| credentials | ID y secreto deben pertenecer al mismo cliente de tipo Aplicación web. Vuelve a ejecutar npm run google:configure y reinicia. |
| redirect | La URI autorizada debe ser exactamente PUBLIC_URL + /api/auth/google/callback. |
| code_expired | Inicia un intento nuevo con el botón; no recargues ni reutilices la dirección de callback. Si persiste, revisa cliente, redirección y que no haya otra instancia de NovaObra. |
| network | La computadora que ejecuta el backend necesita alcanzar oauth2.googleapis.com y www.googleapis.com por HTTPS. Revisa conexión/proxy/firewall. |
| tls | Revisa fecha, hora y confianza de certificados del equipo; no desactives la verificación TLS. |
| clock | Activa fecha y hora automáticas en el equipo del backend y comienza un nuevo intento. |
| database_schema | Ejecuta npm run db:setup desde la raíz y reinicia. |
| session_error | Revisa MySQL y los permisos de la cuenta de aplicación. |
| verification | La identidad no pasó los controles del token. Reintenta; si persiste, revisa el cliente configurado. |
| provider_unavailable | Google devolvió un límite o error temporal; espera y vuelve a iniciar el acceso. |

Estas categorías permiten distinguir el fallo, pero no certifican su causa exacta en una computadora ajena. La integración conserva todos los controles de firma, audiencia, emisor, nonce y estado.

## Importar el JSON para evitar mezclar clientes

Si Google muestra `deleted_client`, el ID usado corresponde a un cliente eliminado. Si devuelve credenciales rechazadas, comprueba que el ID y el secreto pertenezcan al mismo cliente web activo. El nombre NovaObra y el ID de proyecto no sustituyen al ID OAuth.

1. En Google Auth Platform → Clientes, abre el cliente web activo que vas a usar.
2. Comprueba la URI autorizada: `http://127.0.0.1:5174/api/auth/google/callback` para el desarrollo local predeterminado.
3. Descarga su JSON con las credenciales. Guárdalo en Descargas, fuera del repositorio. Si el secreto anterior ya no está disponible, genera uno nuevo y guarda las credenciales cuando Google las muestre. No compartas el JSON por chat.
4. Detén NovaObra con Ctrl+C, actualiza el código y ejecuta:

```powershell
git pull --ff-only origin main
npm ci
npm run google:import
```

El asistente pide la ruta del JSON. En el Explorador de archivos de Windows, haz clic derecho sobre el archivo y elige **Copiar como ruta**; pega esa ruta en la terminal y pulsa Enter. Acepta rutas entre comillas y con espacios. También puedes pasarla como argumento:

```powershell
npm run google:import -- "C:\Users\TuUsuario\Downloads\client_secret_descargado.json"
```

El importador acepta únicamente el JSON de un cliente de Aplicación web con ID, secreto y redirección exacta. Guarda la pareja junta en backend/.env y elimina asignaciones Google duplicadas; conserva el resto de la configuración. No cambia el cliente en Google Cloud ni determina si está activo: el intento de acceso confirma su aceptación.

Comprueba y reinicia:

```powershell
npm run google:check
npm start
```

El diagnóstico imprime el ID público efectivo, redirección, presencia del secreto y nombres de variables duplicadas o reemplazadas por la terminal. Nunca muestra el secreto. Si la terminal tiene variables Google distintas, la importación se detiene sin cambiar .env: elimina esas variables de su configuración de origen. En PowerShell, para quitarlas solo de la terminal actual:

```powershell
Remove-Item Env:GOOGLE_CLIENT_ID -ErrorAction SilentlyContinue
Remove-Item Env:GOOGLE_CLIENT_SECRET -ErrorAction SilentlyContinue
```

Repite la importación y reinicia. Si proceden de variables persistentes de Windows, actualízalas o elimínalas desde su configuración para que una terminal nueva no vuelva a cargarlas. Mantén los secretos fuera de Git. Se ignoran los nombres de descarga habituales `client_secret*.json`, pero un archivo renombrado también debe guardarse fuera del repositorio.

Se corrigió el asistente manual: antes solo sustituía la primera asignación Google y dotenv podía terminar usando una repetida más abajo. Los asistentes ahora sustituyen todas las asignaciones de estas dos variables. Esto resuelve ese caso local; no demuestra que fuera la causa en la computadora del usuario.

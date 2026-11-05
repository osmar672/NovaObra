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

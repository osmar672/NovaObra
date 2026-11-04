# Configurar MySQL desde tu computadora

Esta herramienta corrige la configuración local cuando el proyecto informa ER_ACCESS_DENIED_ERROR. Se ejecuta en el equipo donde está instalado MySQL; la sesión de desarrollo en la nube no puede acceder al MySQL de tu computadora.

## Windows

1. Iniciar el servicio MySQL y actualizar el proyecto o extraer el ZIP actualizado.
2. Abrir `CONFIGURAR_MYSQL.bat` desde la carpeta principal.
3. Si la conexión actual no es válida, indicar una cuenta administradora que sí pueda entrar a MySQL Workbench, normalmente `root`, y escribir su contraseña en esa ventana. La contraseña permanece oculta.
4. Esperar la confirmación de configuración y abrir `INICIAR.bat`.

También puede ejecutarse desde la terminal:

```sh
# Desde la raíz del proyecto:
npm run configurar:mysql
```

Si las dependencias ya están instaladas, desde backend:

```sh
npm run db:configure
```

El asistente utiliza el servidor, puerto y nombre de base de `backend/.env`, o los valores de `.env.example` si todavía no existe configuración. El usuario de aplicación no tiene que coincidir con el nombre guardado de la conexión de Workbench.

## Qué realiza

- Comprueba la conexión y conserva una cuenta de aplicación existente cuando sea válida y adecuada.
- Utiliza la cuenta administradora solo para preparar la base y una nueva cuenta dedicada al proyecto.
- Genera automáticamente una contraseña para la cuenta de aplicación, con permisos limitados a esa base; no modifica root ni contraseñas de otras cuentas.
- Prepara las diez tablas y carga la semilla solo cuando todas están vacías. Conserva los registros existentes y rechaza objetos ajenos.
- Comprueba la conexión de la nueva cuenta y guarda la configuración en `backend/.env`, conservando las demás opciones del proyecto.

La contraseña administradora no se guarda ni se incorpora a comandos, Git o ZIP. La contraseña generada del proyecto se mantiene únicamente en el archivo local .env, excluido de las entregas.

Si la cuenta administradora no entra, faltan permisos o MySQL no está iniciado, el asistente se detiene con un mensaje. No desactiva la autenticación ni cambia la política de contraseñas del servidor. Las verificaciones realizadas y los límites de plataforma se registran en `docs/pruebas.md`.

# Instalación y ejecución

## Requisitos

- Node.js 22.12+ o 24 LTS y npm.
- MySQL 8.0.16+ (las restricciones CHECK deben estar activas), motor InnoDB.
- Un servidor MySQL iniciado localmente, normalmente en el puerto 3306.
- Terminal Bash en Linux/macOS o PowerShell en Windows. Los comandos npm son los mismos.

## Preparar MySQL

En una sesión administrativa de MySQL ejecutar lo siguiente, sustituyendo la contraseña de ejemplo por una propia:

```sql
CREATE DATABASE IF NOT EXISTS novaobra_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'novaobra'@'127.0.0.1' IDENTIFIED BY 'CAMBIAR_POR_UNA_CLAVE_LOCAL';
GRANT ALL PRIVILEGES ON novaobra_db.* TO 'novaobra'@'127.0.0.1';
```

El usuario debe coincidir con la cuenta que MySQL resuelva para conexiones TCP locales. Si tu instalación utiliza `localhost` en sus cuentas, crea esa cuenta en su lugar. No utilices una cuenta administrativa para ejecutar la aplicación habitualmente.

Desde `backend/`, instalar con `npm ci`. Copiar `.env.example` a `.env`:

Linux/macOS:

```sh
cp .env.example .env
```

PowerShell:

```powershell
Copy-Item .env.example .env
```

Editar `.env` con DB_HOST, DB_PORT, DB_USER, DB_PASSWORD y DB_NAME=novaobra_db. El ejemplo no contiene credenciales reales. Iniciar esquema y datos:

```sh
npm run db:setup -- --seed
npm start
```

Para refrescar solo el esquema inicial sin semilla: `npm run db:setup`. El script usa `CREATE TABLE IF NOT EXISTS`; no es un sistema de migraciones y no actualiza estructuras de versiones antiguas. No ejecutar la semilla sobre una base con registros. No borrar datos para resolver errores de instalación.

Alternativamente, desde el cliente interactivo MySQL y la raíz del proyecto, usar `SOURCE database/schema.sql;` y después `SOURCE database/seed.sql;`. Este método carga la semilla una sola vez.

Desde `frontend/`, en otra terminal:

```sh
npm ci
npm run dev
```

Abrir `http://127.0.0.1:5173`. Vite redirige `/api` a Express en 3001. Si cambias el puerto de Express, actualiza el destino en `frontend/vite.config.js`. CORS_ORIGIN corresponde al origen autorizado del navegador. Usa 127.0.0.1 de manera consistente.

## Desarrollo y compilación

Backend: `npm run dev` reinicia al cambiar archivos; `npm start` ejecuta sin observador. Frontend: `npm run build` genera `dist`. El modo `npm run preview` permite inspeccionar la compilación. Para la demostración local conectada a la API usa `npm run dev`.

## Pruebas de integración

El ejecutor crea una base `novaobra_test_<timestamp>` y la elimina al terminar. Configura temporalmente un usuario de pruebas con permisos CREATE, DROP y operaciones sobre esas bases. No cambies las credenciales del usuario de aplicación por las administrativas en archivos versionados. Ejecuta desde backend:

```sh
npm test
npm run test:integration
```

Para usar credenciales distintas en Bash, establece las variables DB_USER y DB_PASSWORD solo en esa terminal sin guardarlas en el historial; en PowerShell utiliza variables de entorno de sesión. Nunca pegues contraseñas en chats ni las incluyas en el ZIP.

## Solución de problemas

- ECONNREFUSED: iniciar MySQL y revisar host/puerto; no indica una contraseña incorrecta.
- ER_ACCESS_DENIED_ERROR: revisar cuenta MySQL y contraseña local.
- 409 al eliminar: hay dependencias; desactivar el registro si tiene estado o conservar su historial.
- 409 al confirmar: revisar cantidades, stock y estado de productos.
- 409 al repetir clave: consultar el registro ya creado y no reenviar con otra clave sin revisar.
- Error de conexión en pantalla: iniciar Express y revisar su conexión a MySQL.
- Puerto ocupado: detener la instancia propia anterior o configurar otro puerto y su proxy.

Los binarios MySQL utilizados para verificar en la nube no se distribuyen en el ZIP. Instala MySQL para tu sistema. Windows y macOS requieren validación en su propio entorno.

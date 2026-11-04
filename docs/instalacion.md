# Instalación y ejecución

## Inicio en una sola ventana

Instalar Node.js 24 LTS con npm (mínimo 22.12) y MySQL 8.0.16 o posterior. Iniciar el servidor MySQL antes de abrir el proyecto. MariaDB no sustituye MySQL en esta entrega.

La configuración de ejemplo usa **usuario `NovaObra`**, **base `NovaObra`** y **servidor `127.0.0.1:3306`**. El nombre de una conexión guardada en Workbench no siempre coincide con el usuario MySQL: revisar el campo Username de esa conexión si el acceso falla.

Extraer todo el ZIP antes de iniciar:

- Windows: doble clic en `INICIAR.bat`.
- Linux/macOS: desde la carpeta extraída, ejecutar `sh iniciar.sh`.
- Cualquier sistema: desde la carpeta que contiene el `package.json` raíz, ejecutar `npm start`.

En una copia nueva se solicita una sola vez la contraseña de MySQL, sin mostrarla mientras se escribe. Se crea `backend/.env` local, excluido de Git y del ZIP. Si ese archivo ya existe, se conserva. Para modificar usuario, contraseña, base o puerto, editarlo antes del siguiente inicio.

El iniciador instala dependencias mediante `npm ci` la primera vez o cuando cambia un archivo de bloqueo. Después crea las diez tablas si faltan y carga la semilla únicamente si todas están vacías. Una base con registros conserva sus datos; una base con tablas o vistas ajenas se rechaza sin modificar sus objetos. No borra bases ni migra estructuras antiguas.

Al ver `NovaObra lista en http://127.0.0.1:5173`, abrir esa dirección si el navegador no se abrió automáticamente. Mantener la terminal abierta. Ctrl+C detiene API e interfaz. No se requiere login.

Para instalar y preparar sin iniciar los servidores: `npm run setup`. La primera instalación necesita Internet; las siguientes reutilizan las dependencias instaladas.

## Permisos de MySQL

El usuario indicado debe existir y tener permisos sobre `NovaObra`. Si ya puedes acceder con ese usuario y crear sus tablas, no necesitas crear otra cuenta.

Si aún no existe, un administrador puede ejecutar lo siguiente en MySQL Workbench, reemplazando la contraseña de ejemplo por la local:

```sql
CREATE DATABASE IF NOT EXISTS NovaObra
CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'NovaObra'@'127.0.0.1'
IDENTIFIED BY 'TU_CLAVE_LOCAL';
GRANT ALL PRIVILEGES ON NovaObra.* TO 'NovaObra'@'127.0.0.1';
```

Si MySQL resuelve la conexión local como `localhost`, usar esa cuenta en lugar de la de `127.0.0.1`. No ejecutar `CREATE USER` si la cuenta ya existe. Los permisos se limitan a la base del proyecto.

## Configuración manual opcional

Desde `backend/`, instalar con `npm ci` y copiar `.env.example` a `.env`:

```sh
# Linux/macOS
cp .env.example .env
```

```powershell
# PowerShell
Copy-Item .env.example .env
```

Completar `DB_PASSWORD` con la contraseña local. Los valores restantes del ejemplo son:

```env
HOST=127.0.0.1
PORT=3001
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=NovaObra
DB_PASSWORD=
DB_NAME=NovaObra
CORS_ORIGIN=http://127.0.0.1:5173
```

Desde `backend/`:

```sh
npm run db:setup -- --seed-if-empty
npm start
```

En otra terminal desde `frontend/`:

```sh
npm ci
npm run dev
```

`--seed-if-empty` permite repetir la preparación sin duplicar datos. `--seed` exige todas las tablas vacías y falla si hay registros. Sin opción de semilla, `npm run db:setup` prepara solo las tablas. `DB_NAME` puede cambiarse por otro nombre válido; se respetará en el instalador, la API y los respaldos. Los archivos SQL para importación manual usan `NovaObra`.

Vite escucha en `127.0.0.1:5173` y toma el destino de la API de `HOST` y `PORT` en `backend/.env`, sin enviar las credenciales al navegador. Si 5173 está ocupado, falla con un mensaje en lugar de cambiar silenciosamente de puerto. `CORS_ORIGIN` debe coincidir con el origen de la interfaz.

## Compilación y pruebas

Desde la raíz, `npm test` ejecuta las pruebas unitarias del backend y `npm run build` genera `frontend/dist`. Desde backend, `npm run dev` reinicia la API al cambiar archivos.

Las integraciones se ejecutan desde backend con `npm run test:integration`. Requieren una cuenta de pruebas separada capaz de crear y eliminar bases temporales `novaobra_test_*` y `NovaObra_test_*`. No amplíes los permisos de la cuenta habitual para ejecutarlas. Para respaldos y pruebas adicionales, consultar [respaldos](respaldos.md) y [verificación del iniciador](verificacion-inicio.md).

## Solución de problemas

- Node o npm no se reconocen: instalar Node.js 24 LTS con npm y volver a abrir la terminal.
- `ECONNREFUSED`: iniciar el servicio MySQL y comprobar `DB_HOST` y `DB_PORT`.
- Acceso denegado: comprobar que `DB_USER` sea el usuario MySQL real y que `DB_PASSWORD` corresponda a esa cuenta. Editar `backend/.env`; no hace falta reinstalar.
- Permisos de base denegados: revisar que la cuenta pueda crear y utilizar las tablas de `NovaObra`.
- Puerto ocupado: cerrar la otra instancia propia de NovaObra y volver a iniciar.
- Error al descargar dependencias: revisar Internet y volver a abrir el iniciador.
- Una base existente usa otro esquema: conservar sus datos y revisar compatibilidad; el instalador no sustituye una migración.
- El navegador no se abre: entrar manualmente a `http://127.0.0.1:5173`.

## Funciones adicionales y respaldo

La interfaz incluye Reportes y comprobantes imprimibles de venta, alertas y lista de reposición, filtros paginados y exportaciones CSV. No requieren otras dependencias de aplicación. Ver `docs/manual.md`.

Para respaldar y restaurar, instalar también los clientes oficiales MySQL 8 `mysql` y `mysqldump`. Las rutas pueden configurarse con MYSQL_PATH y MYSQLDUMP_PATH. Consultar `docs/respaldos.md`: la restauración exige un destino sin tablas ni vistas y no borra bases ocupadas. Ejecutar `npm run test:backup` con una cuenta de pruebas permite verificar el recorrido completo sobre bases temporales.

## Migraciones y organización por entidad

El comando `db:setup` ejecuta los pasos de `backend/migrations/` y mantiene `database/schema.sql` y `database/seed.sql` como fuente única. No se agrega una tabla de historial de migraciones. La verificación aislada se ejecuta con `npm run test:migrations`; ver `docs/estructura.md` para el recorrido de modelos, servicios, controladores, rutas y frontend.

Las comprobaciones efectivas se ejecutaron en Linux. Los iniciadores de Windows y macOS se incluyen, pero requieren validación en esos sistemas. Los binarios de MySQL, Node.js y Chromium no se distribuyen en el ZIP.

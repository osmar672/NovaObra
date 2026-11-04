# Respaldo y restauración

Estas herramientas requieren Node.js, las dependencias del backend y los clientes oficiales `mysql` y `mysqldump` de MySQL 8 accesibles en PATH. También necesitan una cuenta con permisos suficientes sobre la base configurada en `backend/.env`. La aplicación habitual sigue usando novaobra_db.

## Crear una copia

Desde `backend/`, crear una carpeta privada de respaldos y ejecutar:

```sh
node -e "require('fs').mkdirSync('../backups',{recursive:true})"
npm run db:backup -- ../backups/novaobra-respaldo.sql
```

El archivo debe ser nuevo: no se sobrescriben copias existentes. Elegir un nombre diferente para cada respaldo. Se usa una instantánea consistente de las diez tablas InnoDB, sin bloquear las escrituras habituales; evitar cambios de estructura durante el respaldo.

El SQL conserva esquema, datos y contadores AUTO_INCREMENT (incluidos huecos de identificadores eliminados), con una comprobación de integridad SHA-256; no contiene la contraseña de MySQL. Los datos comerciales y de contacto sí son privados. Las carpetas `backups/` y `respaldos/` se excluyen de Git y del ZIP. Conservar una copia en otro almacenamiento privado cuando corresponda.

## Restaurar

Preparar un destino nuevo o sin tablas ni vistas y configurar sus datos de conexión en una sesión de mantenimiento. Detener la aplicación durante la restauración y conservar la configuración de conexión habitual antes de cambiarla. Para un ensayo, usar otra instancia MySQL o una base temporal separada.

Desde `backend/`, con DB_HOST, DB_PORT, DB_USER, DB_PASSWORD y DB_NAME apuntando al destino elegido:

```sh
npm run db:restore -- ../backups/novaobra-respaldo.sql
```

La cuenta necesita crear la base si no existe y crear/insertar en sus tablas. Si el destino contiene cualquier tabla o vista, incluso vacía y con nombres de NovaObra, el proceso se detiene sin modificarla. Esto impide reutilizar estructuras o disparadores preexistentes. No incluye un comando para borrar una base ocupada. Después de restaurar verifica que estén las diez tablas e informa el número de filas de cada una. Reanudar la aplicación únicamente tras revisar el resultado y su conexión.

La restauración admite el formato controlado v1 producido por `db:backup` de esta versión del proyecto. No acepta SQL arbitrario, instrucciones para cambiar de base ni tablas adicionales. Valida la integridad del archivo y los INSERT; ejecuta el esquema incluido en el proyecto y restaura los datos con transacción y claves foráneas activas. Los errores al insertar provocan rollback de los datos; el esquema vacío ya creado puede permanecer para investigar; para otro intento se necesita un destino nuevo sin tablas ni vistas.

## Clientes instalados en otra ubicación

Definir `MYSQL_PATH` y `MYSQLDUMP_PATH` con la ruta de los ejecutables, sin incluir argumentos. En PowerShell pueden configurarse como variables de sesión; en Linux/macOS, mediante export. No es necesario escribir la contraseña en la línea de comandos: las herramientas leen la configuración y crean un archivo de opciones temporal privado, que eliminan al terminar.

Si falta un cliente, no es MySQL 8, faltan permisos, el archivo ya existe, el destino contiene tablas o vistas o el archivo está dañado, el programa devuelve un error y termina con código distinto de cero. El límite de esta herramienta académica es 256 MiB por respaldo. No se verificó su ejecución en Windows o macOS; las pruebas efectivas se realizaron en Linux.

## Pruebas

Desde backend, con un usuario de pruebas que pueda crear bases temporales y con los clientes MySQL disponibles:

```sh
npm test
npm run test:backup
```

La integración usa destinos aislados y verifica tablas, filas, relaciones, stock, textos especiales y las protecciones de respaldo/restauración. No necesita alterar novaobra_db.

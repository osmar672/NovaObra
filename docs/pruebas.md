> Evidencia histórica anterior al Día 2. Los contratos y resultados actuales están en [entrega del Día 2](entrega-dia2.md).

# Verificación de la tienda

Verificación de la estructura única ejecutada el 4 de noviembre de 2026 en Linux, con MySQL **8.0.46**, Node.js y Chromium reales. Las pruebas usan bases temporales `novaobra_shop_test_*`, creadas y eliminadas por cada ejecución; no utilizan la base del usuario ni bases anteriores. No se probó físicamente el equipo Windows del usuario.

| Verificación | Resultado |
| --- | --- |
| Unitarias de tienda: scrypt, sesiones, importes, imágenes, líneas y estados | 4/4 |
| Integración MySQL/API: esquema, relaciones, acceso, CSRF/CORS, catálogo, inventario, pedidos y concurrencia | 16/16, incluyendo el contenedor de pruebas |
| Chromium: catálogo/favoritos, registro/carrito/pedido, administración, móvil | 5/5, incluyendo el contenedor de pruebas |
| Asistente local ejecutado en una terminal PTY y copia temporal | Correcto: contraseña oculta, cuenta limitada, 10 tablas y preparación repetible |
| Instalación limpia `npm ci`, unitarias y compilación | Correcta |

Las pruebas de concurrencia verifican que dos compradores compitiendo por una unidad no produzcan sobreventa. Los reintentos con la misma clave crean un solo pedido; cancelar dos veces devuelve el stock una sola vez. Los precios manipulados por el cliente no cambian el total del servidor, y las cotizaciones no reservan existencias. También se verifican la exclusión de cotizaciones/cancelaciones en ventas, la revocación de sesiones y el límite de intentos de acceso.

La prueba de navegador recorre las páginas con datos de MySQL, agrega productos al carrito, recarga para verificar su persistencia, registra una cuenta y crea un pedido. Como administrador crea un producto, registra una entrada y confirma el pedido. Comprueba seis páginas a 390×844 sin desbordamiento horizontal, captura escritorio a 1440 px y verifica que no haya excepciones JavaScript. Los ejemplos con stock que aparecen en capturas son datos temporales de esas pruebas; la semilla distribuida no agrega stock.

El asistente local se probó en una copia aislada: una cuenta administradora exclusiva del entorno de pruebas proporcionó sus credenciales mediante terminal, y se comprobó que la cuenta generada no puede leer `mysql.user` ni tablas de otras bases. El archivo `.env` y la salida no contienen la contraseña administradora. La cuenta limitada puede ejecutar `db:setup` nuevamente. Se retiraron la cuenta y la base de esa prueba.

## Ejecutar las pruebas

Desde la raíz del proyecto:

```sh
npm ci
npm test
npm run build
```

Integración requiere una instancia MySQL de pruebas y un archivo JSON **privado fuera del repositorio** con `user` y `password` de una cuenta con permisos para crear y eliminar bases temporales. La variable lleva solamente la ruta del archivo, nunca la contraseña. En PowerShell:

```powershell
$env:NOVAOBRA_TEST_ADMIN_FILE = 'C:\ruta-privada\mysql-pruebas.json'
npm run test:integration
$env:CHROMIUM_PATH = 'C:\ruta\al\chrome.exe'
npm run test:ui
```

Opcionalmente `TEST_DB_HOST` y `TEST_DB_PORT` eligen la instancia MySQL. La prueba de navegador inicia y detiene su propia API y Vite; necesita libre el puerto 5174. `CHROMIUM_PATH` debe apuntar a un navegador Chromium/Chrome instalado. `CHROMIUM_NO_SANDBOX=1` se utilizó exclusivamente para Chromium en el contenedor Linux de pruebas.

Si falta `NOVAOBRA_TEST_ADMIN_FILE`, integración y navegador se marcan como **omitidos**, no como verificados. En esta entrega ambas suites se ejecutaron con MySQL real y sin omisiones. Las capturas se generan localmente en `artifacts/tienda-escritorio.png` y `artifacts/tienda-movil.png`, excluidas de Git.

No se han probado pagos, reseñas, streaming ni envío de correo automático porque no están implementados. Las limitaciones y los requisitos previos a un despliegue están en el README. El comportamiento del asistente en Windows requiere comprobarse en el equipo destino; el `.bat` está preparado con saltos CRLF.

## Ampliación: renovación y HTTPS

Verificado en Linux con MySQL 8 real, Node y Chromium:

- 10 pruebas unitarias/compatibilidad; 25 de integración con migración conservadora, hashes de refresh, rotación, vencimiento, reutilización concurrente, desactivación, cambio de contraseña y logout.
- 6 pruebas de navegador para tienda y gestión: restauración sin almacenamiento web, HttpOnly, CRUD y una sola renovación ante varios 401 simultáneos.
- `npm run test:https`: certificado TLS autofirmado verificado explícitamente por Node, redirección 308, HSTS, cookie Secure/HttpOnly y login/gestión de React bajo HTTPS. Solo el contexto Chromium de esta prueba admite el certificado de prueba; Node no desactiva la validación.
- Postman/Newman: 93 solicitudes, 94 aserciones.
- Auditorías completas y de producción: cero vulnerabilidades conocidas al ejecutar npm audit.

Requiere OpenSSL y Chromium para test:https, además del archivo privado de credenciales de pruebas. Windows/macOS y el despliegue público requieren verificación en sus entornos.

# Presentación de NovaObra

Interfaz de tienda con fondo blanco, encabezados azul oscuro, acentos naranjas y fotografías reales guardadas en el proyecto. Se rediseñan inicio, catálogo, producto, acceso, contacto, cuenta y administración conservando las operaciones y los permisos existentes.

## Productos

- El precio aparece inmediatamente después del nombre, con etiqueta Precio / CRC, tamaño destacado y formato de colones.
- Se usa precio_actual de la API; si falta, precio. Un valor ausente o inválido muestra Consultar precio, sin convertirlo silenciosamente en cero.
- Las descripciones guardadas se muestran completas, con saltos de línea, sin line-clamp, recortes de altura ni texto oculto. Si no existe descripción, se indica que la tienda aún no la ha añadido.
- Cada tarjeta tiene un enlace explícito a la ficha y descripción completa. La ficha incluye un bloque de precio, descripción, existencias y especificaciones separados.
- Se mantienen carrito, favoritos, ofertas, filtros y controles de inventario.

## Fotografías

Se sustituyen las ilustraciones de taller, herramientas y productos por fotografías. Las fotografías propias configuradas en los productos conservan prioridad. Si faltan o fallan, se muestra una fotografía de referencia según herramienta/categoría y se identifica como tal: no garantiza la marca ni el modelo exactos.

Las fotografías son recursos locales AVIF/WebP; no requieren conexiones externas al navegar. Se incluyen originales y autores en frontend/public/photos/CREDITOS.txt, accesible desde el pie de página. Se eliminan siete SVG de ilustraciones que ya no se utilizan. El mapa de ejemplo conserva su representación esquemática y su enlace a Google Maps.

## Usuarios y administración

Login/registro comparten una presentación con fotografía de herramientas y formularios legibles. El acceso restringido mantiene Esta zona necesita otro casco con una fotografía de protección y enlaces a catálogo/cuenta. No se cambian roles ni guards. El panel conserva sus datos reales y operaciones con navegación lateral oscura, tablas y métricas más claras.

La tienda sigue requiriendo iniciar sesión para consultar el catálogo, conforme a su configuración anterior. El inicio explica que la cuenta permite consultar precios, descripciones y existencias; no se publican precios inventados para visitantes.

## Verificación

Build de producción y seis pruebas existentes de navegador con MySQL real aprobados, incluidos registro/login, pedidos, administración, ocho CRUD y móvil. Las expectativas de tests/ui.js solo cambian por el nuevo titular del inicio.

Revisión de 21 vistas a 1440, 390 y 320 px, sin errores JavaScript ni desbordamiento horizontal. Se comprueba la carga y decodificación de todas las fotografías de cada vista. Se verifica una descripción larga contra la API, ausencia de recorte, legibilidad y precio mostrado idéntico al de MySQL/API en tarjeta y ficha. Los textos de prueba existen únicamente en una base temporal desechable.

No se modifican backend, esquema SQL, datos de la tienda, permisos, autenticación ni dependencias. Para aplicar basta actualizar el código y ejecutar npm start. No hay que configurar otra base ni crear cuentas. En producción: npm run build antes de npm run serve.

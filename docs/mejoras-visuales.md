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

Las fotografías son recursos locales AVIF/WebP; no requieren conexiones externas al navegar. Se incluyen originales y autores en frontend/public/photos/CREDITOS.txt, accesible desde el pie de página. Se eliminaron ocho SVG de ilustraciones que ya no se utilizan. El mapa de ejemplo ahora usa Google Maps, cargado al pulsar Cargar mapa interactivo, con enlace externo alternativo. CSP permite únicamente www.google.com para frames; las demás restricciones se conservan.

## Usuarios y administración

Login/registro comparten una presentación con fotografía de herramientas y formularios legibles. El acceso restringido mantiene Esta zona necesita otro casco con una fotografía de protección y enlaces a catálogo/cuenta. No se cambian roles ni guards. El panel conserva sus datos reales y operaciones con navegación lateral oscura, tablas y métricas más claras.

La tienda sigue requiriendo iniciar sesión para consultar el catálogo, conforme a su configuración anterior. El inicio explica que la cuenta permite consultar precios, descripciones y existencias; no se publican precios inventados para visitantes.

## Verificación

Build de producción y seis pruebas existentes de navegador con MySQL real aprobados, incluidos registro/login, pedidos, administración, ocho CRUD y móvil. Las expectativas de tests/ui.js solo cambian por el nuevo titular del inicio.

Revisión de 21 vistas a 1440, 390 y 320 px, sin errores JavaScript ni desbordamiento horizontal. Se comprueba la carga y decodificación de todas las fotografías de cada vista. Se verifica una descripción larga contra la API, ausencia de recorte, legibilidad y precio mostrado idéntico al de MySQL/API en tarjeta y ficha. Los textos de prueba existen únicamente en una base temporal desechable.

Los permisos, la autenticación, el esquema SQL y las dependencias se conservan. El backend añade el permiso CSP específico para el mapa y el servicio de carga opcional del catálogo. Para aplicar basta actualizar el código y ejecutar npm start. No hay que configurar otra base ni crear cuentas. En producción: npm run build antes de npm run serve.


## Catálogo ampliado y cuenta

- 48 productos de demostración en ocho departamentos. Los importes y las existencias son ficticios; la marca, el SKU y las etiquetas de interfaz lo indican.
- `npm run catalog:demo` añade únicamente los SKU que no existen. No restablece nombres, precios, estado activo ni inventario de registros anteriores.
- Una transacción engloba categorías, marca, productos, inventario y movimientos iniciales. Un bloqueo por base serializa ejecuciones concurrentes. El responsable de los movimientos es el primer administrador web activo, indicado en la salida del comando. Sin administrador activo la carga no realiza cambios.
- Cinco fotografías reales adicionales de lijadora, gafas, fijaciones, cinturón y armario, con créditos. Las fotos de referencia no garantizan el modelo vendido.
- Navegación con selector de departamentos, categorías compactas y ocho destacados/ocho recientes. La cuenta muestra datos reales de perfil, pedidos, cotizaciones, favoritos y carrito, con accesos directos y seguridad.
- Las guías incorporan contenido estático sobre preparación de proyectos. No se inventan historia de la empresa, horarios ni datos de contacto.

Verificación adicional: tres pruebas de carga con MySQL real (idempotencia/concurrencia y conservación de datos; administrador ausente; rollback de toda la carga). El comando CLI se ejecutó contra la base temporal de pruebas. Se revisaron 28 vistas a 1440, 390 y 320 px, incluida cuenta vacía y cuenta con pedido/cotización reales de prueba. Los contadores se contrastaron con esos registros. Se verificaron carga de fotos, navegación, descripciones y precios, y la apertura del iframe y CSP del mapa.

Las teselas y el servicio externo de Google Maps requieren Internet y no se validaron externamente en este entorno de red restringida. La referencia de San José se identifica como demostración; no se presenta como una sucursal real.

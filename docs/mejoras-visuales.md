# Presentación visual de NovaObra

Rediseño de la tienda existente con tonos arena, verde oscuro y naranja, ilustraciones SVG propias y recursos locales. Se mejoraron inicio, catálogo, ficha de producto, login/registro, contacto, panel administrativo y las ocho pantallas de gestión. La navegación, los formularios y los botones conservan sus operaciones.

El acceso restringido utiliza «Esta zona necesita otro casco» para clientes sin permiso de gestión. El mismo guard de rutas sigue comprobando la sesión y los roles; no se cambian las autorizaciones del servidor.

Las tarjetas muestran la descripción guardada del producto. Si está vacía, se presenta texto general de la categoría, sin escribir en MySQL ni inventar especificaciones. Las imágenes reales cargadas siguen teniendo prioridad. En ausencia de imagen o ante un error se muestra una ilustración de categoría rotulada «Imagen ilustrativa».

El mapa local ilustrativo usa el sector del Parque Central, San José, como ubicación de ejemplo, con un enlace a Google Maps. Se indica que no es una sucursal real. No requiere clave API, iframes ni cambios de CSP. La dirección comercial configurada continúa mostrándose por separado en contacto.

Verificación: build de producción, seis pruebas existentes de navegador con MySQL real (tienda, registro, login, pedidos, administración, ocho CRUD y móvil) y revisión de 21 vistas a 1440, 390 y 320 px. Sin errores JavaScript, imágenes rotas ni desbordamiento horizontal en las vistas revisadas. Las expectativas de texto de tests/ui.js se actualizan únicamente por el nuevo titular y mensaje de acceso restringido.

No se modifican backend, esquema SQL, datos, autenticación, contratos HTTP, dependencias ni precios. No hace falta volver a configurar la base ni crear cuentas para aplicar este rediseño. Después de actualizar el código: npm ci y npm start. En producción, recompilar con npm run build antes de npm run serve.

# Manual de uso

1. **Inicio:** revisar los seis indicadores y el resumen de entradas y salidas. Actualizar vuelve a consultar MySQL.
2. **Categorías:** crear las clasificaciones antes de registrar productos.
3. **Productos:** elegir categoría, código único, nombre, precios y stock mínimo. El inventario inicial es cero. Editar no altera existencias; para ello usa compras o inventario.
4. **Proveedores, clientes y empleados:** registrar los datos de contacto o laborales. Correo es opcional, pero debe ser válido cuando se informa. Los empleados no son cuentas de acceso.
5. **Compras:** crear un registro, elegir proveedor y empleado, agregar productos, cantidades y costos. Guardar crea un borrador. Editar permite cambiarlo; Detalles permite consultarlo. Confirmar aumenta el stock y genera entradas.
6. **Ventas:** elegir cliente y empleado, agregar productos, cantidades y precios; guardar y confirmar. No se permite vender más de lo disponible. El precio sugerido puede editarse antes de confirmar.
7. **Cancelaciones:** usar Cancelar y confirmar el aviso. Una venta devuelve unidades; una compra retira sus unidades y exige stock suficiente. Una operación cancelada conserva sus líneas y no se modifica.
8. **Inventario:** consultar el historial o registrar un ajuste de entrada/salida con descripción del motivo. Un error se corrige creando un movimiento inverso, nunca borrando el historial.
9. **Consulta:** utilizar el buscador y los filtros. En productos, el filtro Bajo muestra existencias menores o iguales al mínimo. En operaciones se puede filtrar por estado.
10. **Eliminar:** solicita confirmación y está permitido solo cuando no destruye dependencias ni historial confirmado. Un borrador puede eliminarse junto con sus detalles. Los registros con estado se pueden desactivar editándolos.

Los formularios muestran validaciones del navegador y del servidor. Un aviso de error no confirma que se guardó el registro: consultar la tabla antes de reintentar. La interfaz conserva la clave de solicitud al reintentar un alta comercial para impedir duplicados.

## Reportes

Abrir **Reportes** en el menú. Elegir Desde y Hasta para consultar ventas y compras confirmadas, ganancia estimada y productos más vendidos. Las operaciones canceladas y los borradores no se suman. La ganancia usa el costo de compra actual del catálogo: si se edita ese costo, la estimación de períodos anteriores también cambia. **Descargar CSV** exporta el período seleccionado para abrirlo en Excel.

## Comprobantes de venta

En **Ventas**, seleccionar **Comprobante** en la fila de la operación. Revisar cliente, empleado, estado, productos, cantidades, precios y total. **Imprimir / Guardar PDF** abre la impresión del navegador; elegir una impresora o Guardar como PDF. Solo se imprime el comprobante. El documento identifica borradores y cancelaciones y es interno, no una factura electrónica.

## Reposición

En **Inicio**, la lista de reposición muestra únicamente productos activos con stock menor o igual al mínimo. **Ver productos por reponer** abre su listado filtrado. La sugerencia lleva las existencias al mínimo más una unidad. El costo es una estimación basada en el precio de compra del catálogo. **Exportar reposición CSV** descarga esa lista. Para reponer de verdad, registrar y confirmar una compra.

## Consultas y exportaciones

Las tablas muestran nombres de las relaciones y conservan el identificador principal del registro. Usar búsqueda por nombre/código, categoría y estado cuando corresponde. Compras, ventas e inventario permiten fechas; movimientos también tipo de entrada/salida. La búsqueda consulta el servidor. La paginación permite recorrer el conjunto y seleccionar el tamaño de página. Al cambiar filtros se vuelve a la primera página.

**Descargar CSV** exporta todos los resultados de los filtros actuales, no solo la página visible. El archivo contiene UTF-8 y se abre en Excel; también puede importarse seleccionando coma como separador. Las cadenas que parecen fórmulas se protegen como texto para no ejecutarlas al abrirlas. Los precios negativos de un reporte pueden representar un margen estimado negativo y siguen siendo números.

## Respaldo

Las copias se administran desde la terminal, fuera de los formularios. Seguir `docs/respaldos.md`; no subir archivos de respaldo con contactos o movimientos reales a GitHub ni al ZIP.

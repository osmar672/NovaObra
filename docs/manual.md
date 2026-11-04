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

const referenceTables = {
  id_categoria: "categorias",
  id_producto: "productos",
  id_proveedor: "proveedores",
  id_cliente: "clientes",
  id_empleado: "empleados",
};

export const referenceTable = (field) => referenceTables[field];

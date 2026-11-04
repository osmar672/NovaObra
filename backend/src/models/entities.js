export const entities = {
  categorias: {
    pk: "id_categoria",
    fields: {
      nombre: "text",
      descripcion: "optional",
      estado: "active",
    },
  },
  proveedores: {
    pk: "id_proveedor",
    fields: {
      nombre: "text",
      telefono: "optional",
      correo: "email",
      direccion: "optional",
      estado: "active",
    },
  },
  productos: {
    pk: "id_producto",
    fields: {
      id_categoria: "id",
      codigo: "text",
      nombre: "text",
      descripcion: "optional",
      precio_compra: "money",
      precio_venta: "money",
      stock_minimo: "quantity",
      estado: "active",
    },
  },
  clientes: {
    pk: "id_cliente",
    fields: {
      nombre: "text",
      telefono: "optional",
      correo: "email",
      direccion: "optional",
    },
  },
  empleados: {
    pk: "id_empleado",
    fields: {
      nombre: "text",
      apellido: "text",
      puesto: "text",
      telefono: "optional",
      correo: "email",
      fecha_ingreso: "date",
      estado: "active",
    },
  },
};

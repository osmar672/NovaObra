import { createModel } from "./shared/createModel.js";

export const proveedorModel = createModel({
  table: "proveedores",
  pk: "id_proveedor",
  fields: {
    nombre: "text",
    telefono: "optional",
    correo: "email",
    direccion: "optional",
    estado: "active",
  },
});

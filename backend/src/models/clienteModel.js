import { createModel } from "./shared/createModel.js";

export const clienteModel = createModel({
  table: "clientes",
  pk: "id_cliente",
  fields: {
    nombre: "text",
    telefono: "optional",
    correo: "email",
    direccion: "optional",
  },
});

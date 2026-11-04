import { createModel } from "./shared/createModel.js";

export const categoriaModel = createModel({
  table: "categorias",
  pk: "id_categoria",
  fields: {
    nombre: "text",
    descripcion: "optional",
    estado: "active",
  },
});

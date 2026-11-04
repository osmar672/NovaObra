import { categoriasService } from "../../services/categoriasService.js";
import { defineEntityPage } from "../defineEntityPage.jsx";

export default defineEntityPage({
  resource: "categorias",
  label: "Categorías",
  pk: "id_categoria",
  kind: "catalog",
  fields: {
    nombre: "text",
    descripcion: "optional",
    estado: "active",
  },
  columns: ["id_categoria", "nombre", "descripcion", "estado"],
  service: categoriasService,
});

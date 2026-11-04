import { clientesService } from "../../services/clientesService.js";
import { defineEntityPage } from "../defineEntityPage.jsx";

export default defineEntityPage({
  resource: "clientes",
  label: "Clientes",
  pk: "id_cliente",
  kind: "catalog",
  fields: {
    nombre: "text",
    telefono: "optional",
    correo: "email",
    direccion: "optional",
  },
  columns: ["id_cliente", "nombre", "telefono", "correo", "direccion"],
  service: clientesService,
});

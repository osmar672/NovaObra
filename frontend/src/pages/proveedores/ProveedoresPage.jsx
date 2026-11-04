import { proveedoresService } from "../../services/proveedoresService.js";
import { defineEntityPage } from "../defineEntityPage.jsx";

export default defineEntityPage({
  resource: "proveedores",
  label: "Proveedores",
  pk: "id_proveedor",
  kind: "catalog",
  fields: {
    nombre: "text",
    telefono: "optional",
    correo: "email",
    direccion: "optional",
    estado: "active",
  },
  columns: [
    "id_proveedor",
    "nombre",
    "telefono",
    "correo",
    "direccion",
    "estado",
  ],
  service: proveedoresService,
});

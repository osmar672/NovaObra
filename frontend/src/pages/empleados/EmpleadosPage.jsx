import { empleadosService } from "../../services/empleadosService.js";
import { defineEntityPage } from "../defineEntityPage.jsx";

export default defineEntityPage({
  resource: "empleados",
  label: "Empleados",
  pk: "id_empleado",
  kind: "catalog",
  fields: {
    nombre: "text",
    apellido: "text",
    puesto: "text",
    telefono: "optional",
    correo: "email",
    fecha_ingreso: "date",
    estado: "active",
  },
  columns: [
    "id_empleado",
    "nombre",
    "apellido",
    "puesto",
    "telefono",
    "correo",
    "fecha_ingreso",
    "estado",
  ],
  service: empleadosService,
});

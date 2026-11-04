import { createModel } from "./shared/createModel.js";

export const empleadoModel = createModel({
  table: "empleados",
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
});

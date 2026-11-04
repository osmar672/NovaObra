import { Router } from "express";
import {
  obtenerEmpleados,
  obtenerEmpleadoPorId,
  agregarEmpleado,
  actualizarEmpleado,
  eliminarEmpleado,
  exportarEmpleados,
} from "../controllers/empleadoController.js";

export const empleadoRoutes = Router();
empleadoRoutes.get("/", obtenerEmpleados);
empleadoRoutes.get(["/exportar", "/exportar.csv"], exportarEmpleados);
empleadoRoutes.get("/:id", obtenerEmpleadoPorId);
empleadoRoutes.post("/", agregarEmpleado);
empleadoRoutes.put("/:id", actualizarEmpleado);
empleadoRoutes.delete("/:id", eliminarEmpleado);

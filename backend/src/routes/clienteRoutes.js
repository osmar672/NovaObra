import { Router } from "express";
import {
  obtenerClientes,
  obtenerClientePorId,
  agregarCliente,
  actualizarCliente,
  eliminarCliente,
  exportarClientes,
} from "../controllers/clienteController.js";

export const clienteRoutes = Router();
clienteRoutes.get("/", obtenerClientes);
clienteRoutes.get(["/exportar", "/exportar.csv"], exportarClientes);
clienteRoutes.get("/:id", obtenerClientePorId);
clienteRoutes.post("/", agregarCliente);
clienteRoutes.put("/:id", actualizarCliente);
clienteRoutes.delete("/:id", eliminarCliente);

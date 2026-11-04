import { Router } from "express";
import {
  obtenerProveedores,
  obtenerProveedorPorId,
  agregarProveedor,
  actualizarProveedor,
  eliminarProveedor,
  exportarProveedores,
} from "../controllers/proveedorController.js";

export const proveedorRoutes = Router();
proveedorRoutes.get("/", obtenerProveedores);
proveedorRoutes.get(["/exportar", "/exportar.csv"], exportarProveedores);
proveedorRoutes.get("/:id", obtenerProveedorPorId);
proveedorRoutes.post("/", agregarProveedor);
proveedorRoutes.put("/:id", actualizarProveedor);
proveedorRoutes.delete("/:id", eliminarProveedor);

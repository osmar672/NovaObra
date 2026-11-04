import { Router } from "express";
import {
  obtenerDetallesVenta,
  obtenerDetalleVentaPorId,
  agregarDetalleVenta,
  actualizarDetalleVenta,
  eliminarDetalleVenta,
  exportarDetallesVenta,
} from "../controllers/detalleVentaController.js";

export const detalleVentaRoutes = Router();
detalleVentaRoutes.get("/", obtenerDetallesVenta);
detalleVentaRoutes.get(["/exportar", "/exportar.csv"], exportarDetallesVenta);
detalleVentaRoutes.get("/:id", obtenerDetalleVentaPorId);
detalleVentaRoutes.post("/", agregarDetalleVenta);
detalleVentaRoutes.put("/:id", actualizarDetalleVenta);
detalleVentaRoutes.delete("/:id", eliminarDetalleVenta);

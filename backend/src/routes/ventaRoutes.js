import { Router } from "express";
import {
  obtenerVentas,
  obtenerVentaPorId,
  agregarVenta,
  actualizarVenta,
  eliminarVenta,
  exportarVentas,
  confirmarVenta,
  cancelarVenta,
  obtenerComprobanteVenta,
} from "../controllers/ventaController.js";

export const ventaRoutes = Router();
ventaRoutes.get("/", obtenerVentas);
ventaRoutes.get(["/exportar", "/exportar.csv"], exportarVentas);
ventaRoutes.get("/:id/comprobante", obtenerComprobanteVenta);
ventaRoutes.get("/:id", obtenerVentaPorId);
ventaRoutes.post("/", agregarVenta);
ventaRoutes.put("/:id", actualizarVenta);
ventaRoutes.delete("/:id", eliminarVenta);
ventaRoutes.post("/:id/confirmar", confirmarVenta);
ventaRoutes.post("/:id/cancelar", cancelarVenta);

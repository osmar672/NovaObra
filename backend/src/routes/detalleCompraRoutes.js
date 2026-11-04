import { Router } from "express";
import {
  obtenerDetallesCompra,
  obtenerDetalleCompraPorId,
  agregarDetalleCompra,
  actualizarDetalleCompra,
  eliminarDetalleCompra,
  exportarDetallesCompra,
} from "../controllers/detalleCompraController.js";

export const detalleCompraRoutes = Router();
detalleCompraRoutes.get("/", obtenerDetallesCompra);
detalleCompraRoutes.get(["/exportar", "/exportar.csv"], exportarDetallesCompra);
detalleCompraRoutes.get("/:id", obtenerDetalleCompraPorId);
detalleCompraRoutes.post("/", agregarDetalleCompra);
detalleCompraRoutes.put("/:id", actualizarDetalleCompra);
detalleCompraRoutes.delete("/:id", eliminarDetalleCompra);

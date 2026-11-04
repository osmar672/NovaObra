import { Router } from "express";
import {
  obtenerCompras,
  obtenerCompraPorId,
  agregarCompra,
  actualizarCompra,
  eliminarCompra,
  exportarCompras,
  confirmarCompra,
  cancelarCompra,
} from "../controllers/compraController.js";

export const compraRoutes = Router();
compraRoutes.get("/", obtenerCompras);
compraRoutes.get(["/exportar", "/exportar.csv"], exportarCompras);
compraRoutes.get("/:id", obtenerCompraPorId);
compraRoutes.post("/", agregarCompra);
compraRoutes.put("/:id", actualizarCompra);
compraRoutes.delete("/:id", eliminarCompra);
compraRoutes.post("/:id/confirmar", confirmarCompra);
compraRoutes.post("/:id/cancelar", cancelarCompra);

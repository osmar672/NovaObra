import { Router } from "express";
import {
  obtenerMovimientosInventario,
  obtenerMovimientoInventarioPorId,
  agregarMovimientoInventario,
  actualizarMovimientoInventario,
  eliminarMovimientoInventario,
  exportarMovimientosInventario,
} from "../controllers/movimientoInventarioController.js";

export const movimientoInventarioRoutes = Router();
movimientoInventarioRoutes.get("/", obtenerMovimientosInventario);
movimientoInventarioRoutes.get(
  ["/exportar", "/exportar.csv"],
  exportarMovimientosInventario,
);
movimientoInventarioRoutes.get("/:id", obtenerMovimientoInventarioPorId);
movimientoInventarioRoutes.post("/", agregarMovimientoInventario);
movimientoInventarioRoutes.put("/:id", actualizarMovimientoInventario);
movimientoInventarioRoutes.delete("/:id", eliminarMovimientoInventario);

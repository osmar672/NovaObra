import { Router } from "express";
import {
  obtenerProductos,
  obtenerProductoPorId,
  agregarProducto,
  actualizarProducto,
  eliminarProducto,
  exportarProductos,
} from "../controllers/productoController.js";

export const productoRoutes = Router();
productoRoutes.get("/", obtenerProductos);
productoRoutes.get(["/exportar", "/exportar.csv"], exportarProductos);
productoRoutes.get("/:id", obtenerProductoPorId);
productoRoutes.post("/", agregarProducto);
productoRoutes.put("/:id", actualizarProducto);
productoRoutes.delete("/:id", eliminarProducto);

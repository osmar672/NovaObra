import { Router } from "express";
import {
  obtenerCategorias,
  obtenerCategoriaPorId,
  agregarCategoria,
  actualizarCategoria,
  eliminarCategoria,
  exportarCategorias,
} from "../controllers/categoriaController.js";

export const categoriaRoutes = Router();
categoriaRoutes.get("/", obtenerCategorias);
categoriaRoutes.get(["/exportar", "/exportar.csv"], exportarCategorias);
categoriaRoutes.get("/:id", obtenerCategoriaPorId);
categoriaRoutes.post("/", agregarCategoria);
categoriaRoutes.put("/:id", actualizarCategoria);
categoriaRoutes.delete("/:id", eliminarCategoria);

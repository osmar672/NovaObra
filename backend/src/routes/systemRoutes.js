import { Router } from "express";
import {
  obtenerEstado,
  obtenerMetadata,
  obtenerDashboard,
} from "../controllers/systemController.js";

export const systemRoutes = Router();
systemRoutes.get("/health", obtenerEstado);
systemRoutes.get("/metadata", obtenerMetadata);
systemRoutes.get("/dashboard", obtenerDashboard);

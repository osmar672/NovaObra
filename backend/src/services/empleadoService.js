import { empleadoModel } from "../models/empleadoModel.js";
import { createCatalogService } from "./shared/createCatalogService.js";

export const empleadoService = createCatalogService(empleadoModel);

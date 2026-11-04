import { productoModel } from "../models/productoModel.js";
import { createCatalogService } from "./shared/createCatalogService.js";

export const productoService = createCatalogService(productoModel);

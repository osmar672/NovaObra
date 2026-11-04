import { categoriaModel } from "../models/categoriaModel.js";
import { createCatalogService } from "./shared/createCatalogService.js";

export const categoriaService = createCatalogService(categoriaModel);

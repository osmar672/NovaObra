import { proveedorModel } from "../models/proveedorModel.js";
import { createCatalogService } from "./shared/createCatalogService.js";

export const proveedorService = createCatalogService(proveedorModel);

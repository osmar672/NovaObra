import { clienteModel } from "../models/clienteModel.js";
import { createCatalogService } from "./shared/createCatalogService.js";

export const clienteService = createCatalogService(clienteModel);

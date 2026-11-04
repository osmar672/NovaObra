import { ventaModel } from "../models/ventaModel.js";
import { detalleVentaModel } from "../models/detalleVentaModel.js";
import { createTradeService } from "./shared/createTradeService.js";

export const ventaService = createTradeService(ventaModel, detalleVentaModel);

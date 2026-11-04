import { compraModel } from "../models/compraModel.js";
import { detalleCompraModel } from "../models/detalleCompraModel.js";
import { createTradeService } from "./shared/createTradeService.js";

export const compraService = createTradeService(
  compraModel,
  detalleCompraModel,
);

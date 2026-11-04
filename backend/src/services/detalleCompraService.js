import { detalleCompraModel } from "../models/detalleCompraModel.js";
import { compraModel } from "../models/compraModel.js";
import { createDetailService } from "./shared/createDetailService.js";

export const detalleCompraService = createDetailService(
  detalleCompraModel,
  compraModel,
);

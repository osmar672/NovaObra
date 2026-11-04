import { detalleVentaModel } from "../models/detalleVentaModel.js";
import { ventaModel } from "../models/ventaModel.js";
import { createDetailService } from "./shared/createDetailService.js";

export const detalleVentaService = createDetailService(
  detalleVentaModel,
  ventaModel,
);

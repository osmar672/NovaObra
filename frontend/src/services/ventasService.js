import { detalle_ventasService } from "./detalle_ventasService.js";
import { createEntityService, request } from "./apiClient.js";

export const ventasService = {
  ...createEntityService("ventas"),
  details: detalle_ventasService,
  confirmar: (id) => request(`ventas/${id}/confirmar`, "POST"),
  cancelar: (id) => request(`ventas/${id}/cancelar`, "POST"),
  receipt: (id, signal) =>
    request(`ventas/${id}/comprobante`, "GET", undefined, signal),
};

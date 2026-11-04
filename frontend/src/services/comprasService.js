import { detalle_comprasService } from "./detalle_comprasService.js";
import { createEntityService, request } from "./apiClient.js";

export const comprasService = {
  ...createEntityService("compras"),
  details: detalle_comprasService,
  confirmar: (id) => request(`compras/${id}/confirmar`, "POST"),
  cancelar: (id) => request(`compras/${id}/cancelar`, "POST"),
};

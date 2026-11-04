import { createEntityService, request } from "./apiClient.js";

export const productosService = {
  ...createEntityService("productos"),
  lowStock: (signal) => request("inventario-bajo", "GET", undefined, signal),
};

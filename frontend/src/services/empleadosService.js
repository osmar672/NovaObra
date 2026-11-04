import { createEntityService } from "./apiClient.js";

export const empleadosService = {
  ...createEntityService("empleados"),
};

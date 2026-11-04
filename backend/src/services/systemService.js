import { systemModel } from "../models/systemModel.js";
import { entities } from "../models/entities.js";

export const systemService = {
  async health() {
    await systemModel.checkConnection();
    return { status: "ok", database: "connected" };
  },
  metadata: () => entities,
  dashboard: () => systemModel.dashboard(),
};

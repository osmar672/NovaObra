import { systemModel } from "../models/systemModel.js";
import { entities } from "../models/entities.js";
import { identity } from "../runtime.js";
import { databaseSettings } from "../config/settings.js";

export const systemService = {
  async health() {
    await systemModel.checkConnection();
    return { status: "ok", database: "connected", application: "novaobra-control", instance: identity(databaseSettings()) };
  },
  metadata: () => entities,
  dashboard: () => systemModel.dashboard(),
};

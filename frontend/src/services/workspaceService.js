import { request } from "./apiClient.js";

export const workspaceService = {
  metadata: (signal) => request("metadata", "GET", undefined, signal),
  dashboard: (signal) => request("dashboard", "GET", undefined, signal),
  report: (query, signal) =>
    request(`reportes?${query}`, "GET", undefined, signal),
};

import { systemService } from "../services/systemService.js";

export async function obtenerEstado(req, res) {
  res.json(await systemService.health());
}
export function obtenerMetadata(req, res) {
  res.json(systemService.metadata());
}
export async function obtenerDashboard(req, res) {
  res.json(await systemService.dashboard());
}

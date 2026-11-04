import { empleadoService as service } from "../services/empleadoService.js";
import { sendCSV } from "../services/queries.js";

export async function obtenerEmpleados(req, res) {
  res.json(await service.list(req.query));
}
export async function obtenerEmpleadoPorId(req, res) {
  res.json(await service.get(req.params.id));
}
export async function agregarEmpleado(req, res) {
  res.status(201).json(await service.create(req.body));
}
export async function actualizarEmpleado(req, res) {
  res.json(await service.update(req.params.id, req.body));
}
export async function eliminarEmpleado(req, res) {
  await service.remove(req.params.id);
  res.status(204).end();
}
export async function exportarEmpleados(req, res) {
  sendCSV(res, "empleados", await service.export(req.query), service.columns());
}

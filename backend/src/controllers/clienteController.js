import { clienteService as service } from "../services/clienteService.js";
import { sendCSV } from "../services/queries.js";

export async function obtenerClientes(req, res) {
  res.json(await service.list(req.query));
}
export async function obtenerClientePorId(req, res) {
  res.json(await service.get(req.params.id));
}
export async function agregarCliente(req, res) {
  res.status(201).json(await service.create(req.body));
}
export async function actualizarCliente(req, res) {
  res.json(await service.update(req.params.id, req.body));
}
export async function eliminarCliente(req, res) {
  await service.remove(req.params.id);
  res.status(204).end();
}
export async function exportarClientes(req, res) {
  sendCSV(res, "clientes", await service.export(req.query), service.columns());
}

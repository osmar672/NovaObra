import { compraService as service } from "../services/compraService.js";
import { sendCSV } from "../services/queries.js";

export async function obtenerCompras(req, res) {
  res.json(await service.list(req.query));
}
export async function obtenerCompraPorId(req, res) {
  res.json(await service.get(req.params.id));
}
export async function agregarCompra(req, res) {
  res.status(201).json(await service.create(req.body));
}
export async function actualizarCompra(req, res) {
  res.json(await service.update(req.params.id, req.body));
}
export async function eliminarCompra(req, res) {
  await service.remove(req.params.id);
  res.status(204).end();
}
export async function exportarCompras(req, res) {
  sendCSV(res, "compras", await service.export(req.query), service.columns());
}
export async function confirmarCompra(req, res) {
  res.json(await service.confirm(req.params.id));
}
export async function cancelarCompra(req, res) {
  res.json(await service.cancel(req.params.id));
}

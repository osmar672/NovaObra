import { detalleCompraService as service } from "../services/detalleCompraService.js";
import { sendCSV } from "../services/queries.js";

export async function obtenerDetallesCompra(req, res) {
  res.json(await service.list(req.query));
}
export async function obtenerDetalleCompraPorId(req, res) {
  res.json(await service.get(req.params.id));
}
export async function agregarDetalleCompra(req, res) {
  res.status(201).json(await service.create(req.body));
}
export async function actualizarDetalleCompra(req, res) {
  res.json(await service.update(req.params.id, req.body));
}
export async function eliminarDetalleCompra(req, res) {
  await service.remove(req.params.id);
  res.status(204).end();
}
export async function exportarDetallesCompra(req, res) {
  sendCSV(
    res,
    "detalle_compras",
    await service.export(req.query),
    service.columns(),
  );
}

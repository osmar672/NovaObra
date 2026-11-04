import { detalleVentaService as service } from "../services/detalleVentaService.js";
import { sendCSV } from "../services/queries.js";

export async function obtenerDetallesVenta(req, res) {
  res.json(await service.list(req.query));
}
export async function obtenerDetalleVentaPorId(req, res) {
  res.json(await service.get(req.params.id));
}
export async function agregarDetalleVenta(req, res) {
  res.status(201).json(await service.create(req.body));
}
export async function actualizarDetalleVenta(req, res) {
  res.json(await service.update(req.params.id, req.body));
}
export async function eliminarDetalleVenta(req, res) {
  await service.remove(req.params.id);
  res.status(204).end();
}
export async function exportarDetallesVenta(req, res) {
  sendCSV(
    res,
    "detalle_ventas",
    await service.export(req.query),
    service.columns(),
  );
}

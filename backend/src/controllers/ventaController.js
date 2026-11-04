import { ventaService as service } from "../services/ventaService.js";
import { sendCSV } from "../services/queries.js";

export async function obtenerVentas(req, res) {
  res.json(await service.list(req.query));
}
export async function obtenerVentaPorId(req, res) {
  res.json(await service.get(req.params.id));
}
export async function agregarVenta(req, res) {
  res.status(201).json(await service.create(req.body));
}
export async function actualizarVenta(req, res) {
  res.json(await service.update(req.params.id, req.body));
}
export async function eliminarVenta(req, res) {
  await service.remove(req.params.id);
  res.status(204).end();
}
export async function exportarVentas(req, res) {
  sendCSV(res, "ventas", await service.export(req.query), service.columns());
}
export async function confirmarVenta(req, res) {
  res.json(await service.confirm(req.params.id));
}
export async function cancelarVenta(req, res) {
  res.json(await service.cancel(req.params.id));
}
export async function obtenerComprobanteVenta(req, res) {
  res.json({
    ...(await service.get(req.params.id)),
    leyenda:
      "Comprobante interno académico. No es una factura electrónica ni un comprobante fiscal.",
  });
}

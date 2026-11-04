import { movimientoInventarioService as service } from "../services/movimientoInventarioService.js";
import { sendCSV } from "../services/queries.js";

export async function obtenerMovimientosInventario(req, res) {
  res.json(await service.list(req.query));
}
export async function obtenerMovimientoInventarioPorId(req, res) {
  res.json(await service.get(req.params.id));
}
export async function agregarMovimientoInventario(req, res) {
  res.status(201).json(await service.create(req.body));
}
export async function actualizarMovimientoInventario(req, res) {
  res.json(await service.update(req.params.id, req.body));
}
export async function eliminarMovimientoInventario(req, res) {
  await service.remove(req.params.id);
  res.status(204).end();
}
export async function exportarMovimientosInventario(req, res) {
  sendCSV(
    res,
    "movimientos_inventario",
    await service.export(req.query),
    service.columns(),
  );
}

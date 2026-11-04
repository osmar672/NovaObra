import { productoService as service } from "../services/productoService.js";
import { sendCSV } from "../services/queries.js";

export async function obtenerProductos(req, res) {
  res.json(await service.list(req.query));
}
export async function obtenerProductoPorId(req, res) {
  res.json(await service.get(req.params.id));
}
export async function agregarProducto(req, res) {
  res.status(201).json(await service.create(req.body));
}
export async function actualizarProducto(req, res) {
  res.json(await service.update(req.params.id, req.body));
}
export async function eliminarProducto(req, res) {
  await service.remove(req.params.id);
  res.status(204).end();
}
export async function exportarProductos(req, res) {
  sendCSV(res, "productos", await service.export(req.query), service.columns());
}

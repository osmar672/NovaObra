import { proveedorService as service } from "../services/proveedorService.js";
import { sendCSV } from "../services/queries.js";

export async function obtenerProveedores(req, res) {
  res.json(await service.list(req.query));
}
export async function obtenerProveedorPorId(req, res) {
  res.json(await service.get(req.params.id));
}
export async function agregarProveedor(req, res) {
  res.status(201).json(await service.create(req.body));
}
export async function actualizarProveedor(req, res) {
  res.json(await service.update(req.params.id, req.body));
}
export async function eliminarProveedor(req, res) {
  await service.remove(req.params.id);
  res.status(204).end();
}
export async function exportarProveedores(req, res) {
  sendCSV(
    res,
    "proveedores",
    await service.export(req.query),
    service.columns(),
  );
}

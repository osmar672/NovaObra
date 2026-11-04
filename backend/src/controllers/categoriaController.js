import { categoriaService as service } from "../services/categoriaService.js";
import { sendCSV } from "../services/queries.js";

export async function obtenerCategorias(req, res) {
  res.json(await service.list(req.query));
}
export async function obtenerCategoriaPorId(req, res) {
  res.json(await service.get(req.params.id));
}
export async function agregarCategoria(req, res) {
  res.status(201).json(await service.create(req.body));
}
export async function actualizarCategoria(req, res) {
  res.json(await service.update(req.params.id, req.body));
}
export async function eliminarCategoria(req, res) {
  await service.remove(req.params.id);
  res.status(204).end();
}
export async function exportarCategorias(req, res) {
  sendCSV(
    res,
    "categorias",
    await service.export(req.query),
    service.columns(),
  );
}

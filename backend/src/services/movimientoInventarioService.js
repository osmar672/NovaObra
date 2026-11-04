import { transaction } from "../config/db.js";
import { movimientoInventarioModel as model } from "../models/movimientoInventarioModel.js";
import { productoModel } from "../models/productoModel.js";
import { listRecords, exportColumns } from "../models/shared/queries.js";
import { id, quantity, text, check } from "../validators/input.js";
import { HttpError } from "../middlewares/errors.js";

async function rejectChange(value) {
  await model.findById(id(value));
  throw new HttpError(
    409,
    "Historial inmutable. Registre un movimiento compensatorio para corregirlo.",
  );
}
export const movimientoInventarioService = {
  list: (query) => listRecords(model.table, query),
  export: (query) => listRecords(model.table, query, { all: true }),
  columns: () => exportColumns(model.table),
  get: (n) => model.findById(id(n)),
  async create(body) {
    check(
      body &&
        Object.keys(body).every((key) => Object.hasOwn(model.fields, key)),
      "Campos no permitidos.",
    );
    const product = id(body.id_producto),
      count = quantity(body.cantidad, true),
      description = text(body.descripcion, 255, true);
    check(
      ["entrada", "salida"].includes(body.tipo_movimiento),
      "Tipo inválido.",
    );
    const key =
      body.clave_solicitud == null
        ? null
        : text(body.clave_solicitud, 80, true);
    const n = await transaction(async (connection) => {
      const row = await productoModel.lock(product, connection, true);
      const delta = body.tipo_movimiento === "entrada" ? count : -count;
      if (row.stock + delta < 0 || row.stock + delta > 2147483647)
        throw new HttpError(409, "Inventario insuficiente o fuera de rango.");
      await productoModel.adjustStock(product, delta, connection);
      return model.recordMovement(
        {
          id_producto: product,
          tipo_movimiento: body.tipo_movimiento,
          cantidad: count,
          descripcion: description,
          clave_solicitud: key,
        },
        connection,
      );
    });
    return model.findById(n);
  },
  update: rejectChange,
  remove: rejectChange,
};

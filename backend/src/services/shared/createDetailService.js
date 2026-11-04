import { transaction } from "../../config/db.js";
import { id, check } from "../../validators/input.js";
import { listRecords, exportColumns } from "../../models/shared/queries.js";
import { line, draft } from "../trade.js";

// Header locking serializes line changes with confirmation and cancellation.
export function createDetailService(model, headerModel) {
  const { table, headerPk, price } = model;
  const kind = headerModel.table;
  async function change(value, body, remove) {
    const n = id(value),
      current = await model.findById(n);
    const data = remove ? null : line(body, kind);
    await transaction(async (connection) => {
      draft(await headerModel.lock(current[headerPk], connection));
      await model.lock(n, connection);
      if (remove) await model.remove(n, connection);
      else await model.update(n, data, connection);
      await headerModel.recalculateTotal(current[headerPk], connection);
    });
    if (!remove) return model.findById(n);
  }
  return {
    list: (query) => listRecords(table, query),
    export: (query) => listRecords(table, query, { all: true }),
    columns: () => exportColumns(table),
    get: (n) => model.findById(id(n)),
    async create(body) {
      check(
        body &&
          Object.keys(body).every((key) =>
            [headerPk, "id_producto", "cantidad", price].includes(key),
          ),
        "Campos no permitidos.",
      );
      const parent = id(body[headerPk]);
      const data = line(
        {
          id_producto: body.id_producto,
          cantidad: body.cantidad,
          [price]: body[price],
        },
        kind,
      );
      const n = await transaction(async (connection) => {
        draft(await headerModel.lock(parent, connection));
        check(
          (await model.countForHeader(parent, connection)) < 100,
          "Máximo 100 detalles.",
        );
        const inserted = await model.insertLine(parent, data, connection);
        await headerModel.recalculateTotal(parent, connection);
        return inserted;
      });
      return model.findById(n);
    },
    update: (n, body) => change(n, body, false),
    remove: (n) => change(n, null, true),
  };
}

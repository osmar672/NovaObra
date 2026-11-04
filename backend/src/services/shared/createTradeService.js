import { transaction } from "../../config/db.js";
import { id } from "../../validators/input.js";
import { listRecords, exportColumns } from "../../models/shared/queries.js";
import { readTrade, saveTrade, transition, draft } from "../trade.js";

// A trade can be edited or deleted only while it is a draft.
export function createTradeService(model, detailModel) {
  const kind = model.table;
  return {
    list: (query) => listRecords(kind, query),
    export: (query) => listRecords(kind, query, { all: true }),
    columns: () => exportColumns(kind),
    get: (n) => readTrade(kind, id(n)),
    async create(body) {
      return model.findById(await saveTrade(kind, null, body));
    },
    async update(value, body) {
      const n = id(value);
      await saveTrade(kind, n, body);
      return model.findById(n);
    },
    async remove(value) {
      const n = id(value);
      await transaction(async (connection) => {
        draft(await model.lock(n, connection));
        await detailModel.removeForHeader(n, connection);
        await model.remove(n, connection);
      });
    },
    confirm: (n) => transition(kind, id(n), "confirmar"),
    cancel: (n) => transition(kind, id(n), "cancelar"),
  };
}

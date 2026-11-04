import { record, id } from "../../validators/input.js";
import { listRecords, exportColumns } from "../../models/shared/queries.js";

// All catalogs share validation and CRUD rules; their fields live in each model.
export function createCatalogService(model) {
  return {
    list: (query) => listRecords(model.table, query),
    export: (query) => listRecords(model.table, query, { all: true }),
    columns: () => exportColumns(model.table),
    get: (n) => model.findById(id(n)),
    async create(body) {
      const data = record(body, model.fields);
      return model.findById(await model.insert(data));
    },
    async update(value, body) {
      const n = id(value),
        data = record(body, model.fields);
      await model.findById(n);
      await model.update(n, data);
      return model.findById(n);
    },
    remove: (n) => model.remove(id(n)),
  };
}

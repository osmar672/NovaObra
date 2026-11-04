import { createModel } from "./shared/createModel.js";
import { HttpError } from "../middlewares/errors.js";

export const productoModel = {
  ...createModel({
    table: "productos",
    pk: "id_producto",
    fields: {
      id_categoria: "id",
      codigo: "text",
      nombre: "text",
      descripcion: "optional",
      precio_compra: "money",
      precio_venta: "money",
      stock_minimo: "quantity",
      estado: "active",
    },
  }),
  // Stock changes require an explicit transaction and a locked product.
  async lock(n, connection, stockOnly = false) {
    const [[row]] = await connection.query(
      `SELECT ${stockOnly ? "stock" : "*"} FROM productos WHERE id_producto=? FOR UPDATE`,
      [n],
    );
    if (!row) throw new HttpError(404, "Producto inexistente.");
    return row;
  },
  async adjustStock(n, delta, connection) {
    await connection.query(
      "UPDATE productos SET stock=stock+? WHERE id_producto=?",
      [delta, n],
    );
  },
};

import { createModel } from "./createModel.js";
import { HttpError } from "../../middlewares/errors.js";

export function createDetailModel(config) {
  const { table, pk, headerPk, price } = config;
  return {
    ...createModel(config),
    headerPk,
    price,
    async findForHeader(n, connection) {
      const [rows] = await connection.query(
        `SELECT * FROM ${table} WHERE ${headerPk}=? ORDER BY id_producto`,
        [n],
      );
      return rows;
    },
    async countForHeader(n, connection) {
      const [[{ n: count }]] = await connection.query(
        `SELECT COUNT(*) n FROM ${table} WHERE ${headerPk}=?`,
        [n],
      );
      return count;
    },
    async lock(n, connection) {
      const [[row]] = await connection.query(
        `SELECT ${pk} FROM ${table} WHERE ${pk}=? FOR UPDATE`,
        [n],
      );
      if (!row) throw new HttpError(404, "Detalle inexistente.");
      return row;
    },
    async insertLine(parent, line, connection) {
      const [result] = await connection.query(
        `INSERT INTO ${table} (${headerPk},id_producto,cantidad,${price}) VALUES (?,?,?,?)`,
        [parent, line.id_producto, line.cantidad, line[price]],
      );
      return result.insertId;
    },
    async removeForHeader(n, connection) {
      await connection.query(`DELETE FROM ${table} WHERE ${headerPk}=?`, [n]);
    },
  };
}

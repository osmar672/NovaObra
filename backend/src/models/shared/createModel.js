import { pool } from "../../config/db.js";
import { HttpError } from "../../middlewares/errors.js";

// Identifiers are defined in application models, never received from clients.
export function createModel({ table, pk, fields }) {
  return {
    table,
    pk,
    fields,
    async findById(n, connection = pool) {
      const [[row]] = await connection.query(
        `SELECT * FROM ${table} WHERE ${pk}=?`,
        [n],
      );
      if (!row) throw new HttpError(404, "Registro inexistente.");
      return row;
    },
    async insert(data, connection = pool) {
      const [result] = await connection.query(`INSERT INTO ${table} SET ?`, [
        data,
      ]);
      return result.insertId;
    },
    async update(n, data, connection = pool) {
      await connection.query(`UPDATE ${table} SET ? WHERE ${pk}=?`, [data, n]);
    },
    async remove(n, connection = pool) {
      const [result] = await connection.query(
        `DELETE FROM ${table} WHERE ${pk}=?`,
        [n],
      );
      if (!result.affectedRows)
        throw new HttpError(404, "Registro inexistente.");
    },
  };
}

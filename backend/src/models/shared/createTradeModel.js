import { pool } from "../../config/db.js";
import { HttpError } from "../../middlewares/errors.js";
import { createModel } from "./createModel.js";

export function createTradeModel(config) {
  const { table, pk, party, partyName, people, price, detailPk } = config;
  return {
    ...createModel(config),
    party,
    price,
    // One SELECT reads the header and all details from the same InnoDB snapshot.
    async readWithDetails(n) {
      const [rows] = await pool.query(
        `SELECT h.*, a.nombre AS ${partyName}_nombre,a.telefono AS ${partyName}_telefono,a.correo AS ${partyName}_correo,a.direccion AS ${partyName}_direccion,CONCAT(e.nombre,' ',e.apellido) AS empleado_nombre, d.${detailPk} AS line_id, d.id_producto AS line_product,
            d.cantidad AS line_quantity, d.${price} AS line_price,
            d.subtotal AS line_subtotal,p.nombre AS line_name,p.codigo AS line_code
       FROM ${table} h
       JOIN ${people} a ON a.${party}=h.${party}
       JOIN empleados e ON e.id_empleado=h.id_empleado
       LEFT JOIN detalle_${table} d ON d.${pk}=h.${pk}
       LEFT JOIN productos p ON p.id_producto=d.id_producto
      WHERE h.${pk}=? ORDER BY d.id_producto`,
        [n],
      );
      if (!rows.length) throw new HttpError(404, "Operación inexistente.");
      const {
        line_id,
        line_product,
        line_quantity,
        line_price,
        line_subtotal,
        line_name,
        line_code,
        ...header
      } = rows[0];
      const detalles = rows
        .filter((row) => row.line_id !== null)
        .map((row) => ({
          [detailPk]: row.line_id,
          [pk]: row[pk],
          id_producto: row.line_product,
          cantidad: row.line_quantity,
          [price]: row.line_price,
          subtotal: row.line_subtotal,
          producto_nombre: row.line_name,
          producto_codigo: row.line_code,
        }));
      return { ...header, detalles };
    },
    async lock(n, connection) {
      const [[row]] = await connection.query(
        `SELECT * FROM ${table} WHERE ${pk}=? FOR UPDATE`,
        [n],
      );
      if (!row) throw new HttpError(404, "Operación inexistente.");
      return row;
    },
    async insertDraft(partyId, employee, key, connection) {
      const [result] = await connection.query(
        `INSERT INTO ${table} (${party},id_empleado,clave_solicitud) VALUES (?,?,?)`,
        [partyId, employee, key],
      );
      return result.insertId;
    },
    async updateParty(n, partyId, employee, connection) {
      await connection.query(
        `UPDATE ${table} SET ${party}=?,id_empleado=? WHERE ${pk}=?`,
        [partyId, employee, n],
      );
    },
    async recalculateTotal(n, connection) {
      await connection.query(
        `UPDATE ${table} SET total=(SELECT COALESCE(SUM(subtotal),0) FROM detalle_${table} WHERE ${pk}=?) WHERE ${pk}=?`,
        [n, n],
      );
    },
    async updateState(n, state, connection) {
      await connection.query(`UPDATE ${table} SET estado=? WHERE ${pk}=?`, [
        state,
        n,
      ]);
    },
  };
}

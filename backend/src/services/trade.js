import { pool, transaction } from "../config/db.js";
import { HttpError } from "../middlewares/errors.js";
import { id, quantity, money, check, text } from "../validators/input.js";
export const tradeInfo = (k) => ({
  pk: k === "compras" ? "id_compra" : "id_venta",
  party: k === "compras" ? "id_proveedor" : "id_cliente",
  price: k === "compras" ? "costo_unitario" : "precio_unitario",
});
// A single statement reads the header and its lines from the same InnoDB snapshot.
export async function readTrade(k, n) {
  const { pk, price } = tradeInfo(k);
  const detailPk = k === "compras" ? "id_detalle_compra" : "id_detalle_venta";
  const party = k === "compras" ? "proveedor" : "cliente";
  const people = k === "compras" ? "proveedores" : "clientes";
  const [rows] = await pool.query(
    `SELECT h.*, a.nombre AS ${party}_nombre,a.telefono AS ${party}_telefono,a.correo AS ${party}_correo,a.direccion AS ${party}_direccion,CONCAT(e.nombre,' ',e.apellido) AS empleado_nombre, d.${detailPk} AS line_id, d.id_producto AS line_product,
            d.cantidad AS line_quantity, d.${price} AS line_price,
            d.subtotal AS line_subtotal,p.nombre AS line_name,p.codigo AS line_code
       FROM ${k} h
       JOIN ${people} a ON a.id_${party}=h.id_${party}
       JOIN empleados e ON e.id_empleado=h.id_empleado
       LEFT JOIN detalle_${k} d ON d.${pk}=h.${pk}
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
}
export async function locked(c, k, n) {
  const { pk } = tradeInfo(k);
  const [rows] = await c.query(`SELECT * FROM ${k} WHERE ${pk}=? FOR UPDATE`, [
    n,
  ]);
  if (!rows.length) throw new HttpError(404, "Operación inexistente.");
  return rows[0];
}
export function draft(row) {
  if (row.estado !== "borrador")
    throw new HttpError(409, "Solo se puede editar un borrador.");
}
export async function total(c, k, n) {
  const { pk } = tradeInfo(k);
  await c.query(
    `UPDATE ${k} SET total=(SELECT COALESCE(SUM(subtotal),0) FROM detalle_${k} WHERE ${pk}=?) WHERE ${pk}=?`,
    [n, n],
  );
}
export function line(body, k) {
  const { price } = tradeInfo(k);
  check(
    body &&
      Object.keys(body).every((x) =>
        ["id_producto", "cantidad", price].includes(x),
      ),
    "Campos de detalle inválidos.",
  );
  return {
    id_producto: id(body.id_producto),
    cantidad: quantity(body.cantidad, true),
    [price]: money(body[price]),
  };
}
export async function saveTrade(k, n, body) {
  const { pk, party, price } = tradeInfo(k);
  check(
    body &&
      Object.keys(body).every((x) =>
        [party, "id_empleado", "detalles", "clave_solicitud"].includes(x),
      ),
    "Campos de operación inválidos.",
  );
  const partyId = id(body[party]),
    employee = id(body.id_empleado);
  check(
    Array.isArray(body.detalles) && body.detalles.length <= 100,
    "Se requiere una lista de hasta 100 detalles.",
  );
  const lines = body.detalles.map((x) => line(x, k));
  check(
    new Set(lines.map((x) => x.id_producto)).size === lines.length,
    "Producto repetido.",
  );
  const key =
    body.clave_solicitud == null ? null : text(body.clave_solicitud, 80, true);
  return transaction(async (c) => {
    if (n) {
      const row = await locked(c, k, n);
      draft(row);
      check(
        !key || key === row.clave_solicitud,
        "No puede cambiar la clave de solicitud.",
      );
      await c.query(`UPDATE ${k} SET ${party}=?,id_empleado=? WHERE ${pk}=?`, [
        partyId,
        employee,
        n,
      ]);
      await c.query(`DELETE FROM detalle_${k} WHERE ${pk}=?`, [n]);
    } else {
      const [r] = await c.query(
        `INSERT INTO ${k} (${party},id_empleado,clave_solicitud) VALUES (?,?,?)`,
        [partyId, employee, key],
      );
      n = r.insertId;
    }
    for (const l of lines)
      await c.query(
        `INSERT INTO detalle_${k} (${pk},id_producto,cantidad,${price}) VALUES (?,?,?,?)`,
        [n, l.id_producto, l.cantidad, l[price]],
      );
    await total(c, k, n);
    return n;
  });
}
export async function transition(k, n, action) {
  const { pk, price } = tradeInfo(k);
  return transaction(async (c) => {
    const row = await locked(c, k, n),
      target = action === "confirmar" ? "confirmada" : "cancelada";
    if (row.estado === target) return row;
    if (row.estado === "cancelada")
      throw new HttpError(409, "La operación está cancelada.");
    const [lines] = await c.query(
      `SELECT * FROM detalle_${k} WHERE ${pk}=? ORDER BY id_producto`,
      [n],
    );
    if (target === "confirmada" && !lines.length)
      throw new HttpError(409, "Agregue productos antes de confirmar.");
    const affect = target === "confirmada" || row.estado === "confirmada";
    if (affect) {
      const sign =
        (k === "compras" ? 1 : -1) * (target === "cancelada" ? -1 : 1);
      // All stock mutations lock products in the same order to limit deadlocks.
      for (const l of lines) {
        const [[p]] = await c.query(
          "SELECT * FROM productos WHERE id_producto=? FOR UPDATE",
          [l.id_producto],
        );
        if (target === "confirmada" && p.estado !== "activo")
          throw new HttpError(409, "Producto inactivo.");
        if (
          p.stock + sign * l.cantidad < 0 ||
          p.stock + sign * l.cantidad > 2147483647
        )
          throw new HttpError(409, "Inventario insuficiente o fuera de rango.");
        await c.query(
          "UPDATE productos SET stock=stock+? WHERE id_producto=?",
          [sign * l.cantidad, l.id_producto],
        );
        await c.query(
          "INSERT INTO movimientos_inventario (id_producto,tipo_movimiento,cantidad,descripcion) VALUES (?,?,?,?)",
          [
            l.id_producto,
            sign > 0 ? "entrada" : "salida",
            l.cantidad,
            `${action} ${k} #${n}`,
          ],
        );
      }
    }
    await c.query(`UPDATE ${k} SET estado=? WHERE ${pk}=?`, [target, n]);
    return { ...row, estado: target };
  });
}

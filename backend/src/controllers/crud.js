import { pool, transaction } from "../config/db.js";
import { entities } from "../models/entities.js";
import { record, id, check, quantity, text } from "../validators/input.js";
import { HttpError } from "../middlewares/errors.js";
export async function one(table, pk, n) {
  const [[row]] = await pool.query(`SELECT * FROM ${table} WHERE ${pk}=?`, [n]);
  if (!row) throw new HttpError(404, "Registro inexistente.");
  return row;
}
export function crud(router) {
  for (const [table, { pk, fields }] of Object.entries(entities)) {
    router.get("/" + table, async (req, res) => {
      const [rows] = await pool.query(
        `SELECT * FROM ${table} ORDER BY ${pk} DESC`,
      );
      res.json(rows);
    });
    router.get("/" + table + "/:id", async (req, res) =>
      res.json(await one(table, pk, id(req.params.id))),
    );
    router.post("/" + table, async (req, res) => {
      const data = record(req.body, fields);
      const [r] = await pool.query(`INSERT INTO ${table} SET ?`, [data]);
      res.status(201).json(await one(table, pk, r.insertId));
    });
    router.put("/" + table + "/:id", async (req, res) => {
      const n = id(req.params.id),
        data = record(req.body, fields);
      await one(table, pk, n);
      await pool.query(`UPDATE ${table} SET ? WHERE ${pk}=?`, [data, n]);
      res.json(await one(table, pk, n));
    });
    router.delete("/" + table + "/:id", async (req, res) => {
      const n = id(req.params.id);
      const [r] = await pool.query(`DELETE FROM ${table} WHERE ${pk}=?`, [n]);
      if (!r.affectedRows) throw new HttpError(404, "Registro inexistente.");
      res.status(204).end();
    });
  }
  router.get("/movimientos_inventario", async (req, res) => {
    const [rows] = await pool.query(
      "SELECT * FROM movimientos_inventario ORDER BY id_movimiento DESC",
    );
    res.json(rows);
  });
  router.get("/movimientos_inventario/:id", async (req, res) =>
    res.json(
      await one("movimientos_inventario", "id_movimiento", id(req.params.id)),
    ),
  );
  router.post("/movimientos_inventario", async (req, res) => {
    const b = req.body;
    check(
      b &&
        Object.keys(b).every((k) =>
          [
            "id_producto",
            "cantidad",
            "tipo_movimiento",
            "descripcion",
            "clave_solicitud",
          ].includes(k),
        ),
      "Campos no permitidos.",
    );
    const p = id(b.id_producto),
      q = quantity(b.cantidad, true),
      description = text(b.descripcion, 255, true);
    check(["entrada", "salida"].includes(b.tipo_movimiento), "Tipo inválido.");
    const key =
      b.clave_solicitud == null ? null : text(b.clave_solicitud, 80, true);
    const n = await transaction(async (c) => {
      const [[row]] = await c.query(
        "SELECT stock FROM productos WHERE id_producto=? FOR UPDATE",
        [p],
      );
      if (!row) throw new HttpError(404, "Producto inexistente.");
      const delta = b.tipo_movimiento === "entrada" ? q : -q;
      if (row.stock + delta < 0 || row.stock + delta > 2147483647)
        throw new HttpError(409, "Inventario insuficiente o fuera de rango.");
      await c.query("UPDATE productos SET stock=stock+? WHERE id_producto=?", [
        delta,
        p,
      ]);
      const [r] = await c.query(
        "INSERT INTO movimientos_inventario (id_producto,tipo_movimiento,cantidad,descripcion,clave_solicitud) VALUES (?,?,?,?,?)",
        [p, b.tipo_movimiento, q, description, key],
      );
      return r.insertId;
    });
    res
      .status(201)
      .json(await one("movimientos_inventario", "id_movimiento", n));
  });
  for (const method of ["put", "delete"])
    router[method]("/movimientos_inventario/:id", async (req, res) => {
      await one("movimientos_inventario", "id_movimiento", id(req.params.id));
      throw new HttpError(
        409,
        "Historial inmutable. Registre un movimiento compensatorio para corregirlo.",
      );
    });
}

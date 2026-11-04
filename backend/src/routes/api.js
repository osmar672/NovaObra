import { Router } from "express";
import { pool, transaction } from "../config/db.js";
import { entities } from "../models/entities.js";
import { crud, one } from "../controllers/crud.js";
import { id, check } from "../validators/input.js";
import { HttpError } from "../middlewares/errors.js";
import {
  tradeInfo,
  readTrade,
  saveTrade,
  transition,
  locked,
  draft,
  line,
  total,
} from "../services/trade.js";
import { registerList } from "../services/queries.js";
import { reports } from "./reports.js";
export const api = Router();
api.use(reports);
api.get("/health", async (req, res) => {
  await pool.query("SELECT 1");
  res.json({ status: "ok", database: "connected" });
});
api.get("/metadata", (req, res) => res.json(entities));
api.get("/dashboard", async (req, res) => {
  const [[counts]] = await pool.query(
    `SELECT (SELECT COUNT(*) FROM productos) productos,(SELECT COUNT(*) FROM productos WHERE estado='activo' AND stock<=stock_minimo) inventario_bajo,(SELECT COUNT(*) FROM clientes) clientes,(SELECT COUNT(*) FROM proveedores) proveedores,(SELECT COUNT(*) FROM compras) compras,(SELECT COUNT(*) FROM ventas) ventas`,
  );
  const [movimientos] = await pool.query(
    "SELECT tipo_movimiento,COUNT(*) operaciones,SUM(cantidad) cantidad FROM movimientos_inventario GROUP BY tipo_movimiento",
  );
  res.json({ ...counts, movimientos });
});
crud(api);
for (const k of ["compras", "ventas"]) {
  const { pk, party, price } = tradeInfo(k),
    detail = "detalle_" + k,
    detailPk = "id_detalle_" + (k === "compras" ? "compra" : "venta");
  registerList(api, k);
  if (k === "ventas")
    api.get("/ventas/:id/comprobante", async (req, res) =>
      res.json({
        ...(await readTrade(k, id(req.params.id))),
        leyenda:
          "Comprobante interno académico. No es una factura electrónica ni un comprobante fiscal.",
      }),
    );
  api.get("/" + k + "/:id", async (req, res) => {
    res.json(await readTrade(k, id(req.params.id)));
  });
  api.post("/" + k, async (req, res) => {
    const n = await saveTrade(k, null, req.body);
    res.status(201).json(await one(k, pk, n));
  });
  api.put("/" + k + "/:id", async (req, res) => {
    const n = id(req.params.id);
    await saveTrade(k, n, req.body);
    res.json(await one(k, pk, n));
  });
  api.delete("/" + k + "/:id", async (req, res) => {
    const n = id(req.params.id);
    await transaction(async (c) => {
      draft(await locked(c, k, n));
      await c.query(`DELETE FROM ${detail} WHERE ${pk}=?`, [n]);
      await c.query(`DELETE FROM ${k} WHERE ${pk}=?`, [n]);
    });
    res.status(204).end();
  });
  for (const action of ["confirmar", "cancelar"])
    api.post(`/${k}/:id/${action}`, async (req, res) =>
      res.json(await transition(k, id(req.params.id), action)),
    );
  registerList(api, detail);
  api.get("/" + detail + "/:id", async (req, res) =>
    res.json(await one(detail, detailPk, id(req.params.id))),
  );
  api.post("/" + detail, async (req, res) => {
    const b = req.body;
    check(
      b &&
        Object.keys(b).every((x) =>
          [pk, "id_producto", "cantidad", price].includes(x),
        ),
      "Campos no permitidos.",
    );
    const parent = id(b[pk]);
    const l = line(
      { id_producto: b.id_producto, cantidad: b.cantidad, [price]: b[price] },
      k,
    );
    const n = await transaction(async (c) => {
      draft(await locked(c, k, parent));
      const [[{ n: count }]] = await c.query(
        `SELECT COUNT(*) n FROM ${detail} WHERE ${pk}=?`,
        [parent],
      );
      check(count < 100, "Máximo 100 detalles.");
      const [r] = await c.query(
        `INSERT INTO ${detail} (${pk},id_producto,cantidad,${price}) VALUES (?,?,?,?)`,
        [parent, l.id_producto, l.cantidad, l[price]],
      );
      await total(c, k, parent);
      return r.insertId;
    });
    res.status(201).json(await one(detail, detailPk, n));
  });
  for (const method of ["put", "delete"])
    api[method]("/" + detail + "/:id", async (req, res) => {
      const n = id(req.params.id),
        current = await one(detail, detailPk, n),
        l = method === "put" ? line(req.body, k) : null;
      await transaction(async (c) => {
        draft(await locked(c, k, current[pk]));
        const [[exists]] = await c.query(
          `SELECT ${detailPk} FROM ${detail} WHERE ${detailPk}=? FOR UPDATE`,
          [n],
        );
        if (!exists) throw new HttpError(404, "Detalle inexistente.");
        if (l)
          await c.query(`UPDATE ${detail} SET ? WHERE ${detailPk}=?`, [l, n]);
        else await c.query(`DELETE FROM ${detail} WHERE ${detailPk}=?`, [n]);
        await total(c, k, current[pk]);
      });
      if (l) res.json(await one(detail, detailPk, n));
      else res.status(204).end();
    });
}

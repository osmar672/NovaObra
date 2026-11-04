import { Router } from "express";
import { pool } from "../config/db.js";
import { check } from "../validators/input.js";
import { dates, readSnapshot, sendCSV } from "../services/queries.js";
export const reports = Router();

function reportRange(query) {
  check(
    Object.keys(query).every((key) => ["desde", "hasta"].includes(key)),
    "Filtro de reporte no permitido.",
  );
  const parsed = dates(query);
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Costa_Rica",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(new Date())
      .map((p) => [p.type, p.value]),
  );
  const today = `${parts.year}-${parts.month}-${parts.day}`;
  const hasta = parsed.hasta || today;
  const begin = new Date(hasta + "T12:00:00Z");
  begin.setUTCDate(begin.getUTCDate() - 29);
  const desde = parsed.desde || begin.toISOString().slice(0, 10);
  check(
    desde <= hasta,
    "La fecha inicial debe ser anterior o igual a la final.",
  );
  return { desde, hasta };
}
function dateWhere(field) {
  return `${field}>=? AND ${field}<=CONCAT(?,' 23:59:59')`;
}
export async function buildReport(query) {
  const { desde, hasta } = reportRange(query);
  return readSnapshot(async (c) => {
    const [[sales]] = await c.query(
      `SELECT COUNT(*) cantidad_ventas,COALESCE(SUM(total),0) ventas FROM ventas WHERE estado='confirmada' AND ${dateWhere("fecha_venta")}`,
      [desde, hasta],
    );
    const [[purchases]] = await c.query(
      `SELECT COUNT(*) cantidad_compras,COALESCE(SUM(total),0) compras FROM compras WHERE estado='confirmada' AND ${dateWhere("fecha_compra")}`,
      [desde, hasta],
    );
    const [[cost]] = await c.query(
      `SELECT COALESCE(SUM(d.cantidad*p.precio_compra),0) costo_estimado,COALESCE(SUM(d.subtotal-d.cantidad*p.precio_compra),0) ganancia_estimada FROM detalle_ventas d JOIN ventas v ON v.id_venta=d.id_venta JOIN productos p ON p.id_producto=d.id_producto WHERE v.estado='confirmada' AND ${dateWhere("v.fecha_venta")}`,
      [desde, hasta],
    );
    const [mas_vendidos] = await c.query(
      `SELECT p.id_producto,p.codigo,p.nombre AS producto_nombre,SUM(d.cantidad) cantidad,SUM(d.subtotal) ingresos,SUM(d.cantidad*p.precio_compra) costo_estimado,SUM(d.subtotal-d.cantidad*p.precio_compra) ganancia_estimada FROM detalle_ventas d JOIN ventas v ON v.id_venta=d.id_venta JOIN productos p ON p.id_producto=d.id_producto WHERE v.estado='confirmada' AND ${dateWhere("v.fecha_venta")} GROUP BY p.id_producto,p.codigo,p.nombre ORDER BY cantidad DESC,ingresos DESC,p.id_producto`,
      [desde, hasta],
    );
    return {
      desde,
      hasta,
      resumen: { ...sales, ...purchases, ...cost },
      mas_vendidos,
      criterio_ganancia:
        "Estimación de las ventas confirmadas menos las unidades vendidas multiplicadas por el precio_compra actual del catálogo. No representa costo histórico ni utilidad contable. Fechas inclusivas según fecha almacenada en MySQL.",
    };
  });
}
export async function lowStock(query = {}) {
  check(
    Object.keys(query).every((key) => ["q", "categoria"].includes(key)),
    "Filtro de reposición no permitido.",
  );
  const where = ["p.estado='activo'", "p.stock<=p.stock_minimo"],
    values = [];
  if (query.q !== undefined && query.q !== "") {
    check(
      typeof query.q === "string" && query.q.length <= 120,
      "Búsqueda inválida.",
    );
    const q = "%" + query.q.replace(/[=%_]/g, (ch) => "=" + ch) + "%";
    where.push(
      "(p.nombre LIKE ? ESCAPE '=' OR p.codigo LIKE ? ESCAPE '=' OR c.nombre LIKE ? ESCAPE '=')",
    );
    values.push(q, q, q);
  }
  if (query.categoria !== undefined && query.categoria !== "") {
    check(
      typeof query.categoria === "string" &&
        /^[1-9]\d*$/.test(query.categoria) &&
        Number(query.categoria) <= 4294967295,
      "Categoría inválida.",
    );
    where.push("p.id_categoria=?");
    values.push(Number(query.categoria));
  }
  const [rows] = await pool.query(
    `SELECT p.id_producto,p.codigo,p.nombre,c.nombre categoria_nombre,p.stock,p.stock_minimo,p.precio_compra,p.stock_minimo+1 objetivo,p.stock_minimo+1-p.stock faltante,(p.stock_minimo+1-p.stock)*p.precio_compra costo_reposicion FROM productos p JOIN categorias c ON c.id_categoria=p.id_categoria WHERE ${where.join(" AND ")} ORDER BY p.stock ASC,p.nombre,p.id_producto`,
    values,
  );
  return rows;
}
reports.get("/reportes", async (req, res) =>
  res.json(await buildReport(req.query)),
);
for (const suffix of ["exportar", "exportar.csv"])
  reports.get(`/reportes/${suffix}`, async (req, res) => {
    const r = await buildReport(req.query);
    const rows = [
      {
        tipo: "Resumen",
        desde: r.desde,
        hasta: r.hasta,
        ventas: r.resumen.ventas,
        cantidad_ventas: r.resumen.cantidad_ventas,
        compras: r.resumen.compras,
        cantidad_compras: r.resumen.cantidad_compras,
        costo_estimado: r.resumen.costo_estimado,
        ganancia_estimada: r.resumen.ganancia_estimada,
        criterio_ganancia: r.criterio_ganancia,
      },
      ...r.mas_vendidos.map((p) => ({
        tipo: "Producto",
        desde: r.desde,
        hasta: r.hasta,
        ...p,
      })),
    ];
    sendCSV(res, "reporte-novaobra", rows, [
      "tipo",
      "desde",
      "hasta",
      "ventas",
      "cantidad_ventas",
      "compras",
      "cantidad_compras",
      "costo_estimado",
      "ganancia_estimada",
      "id_producto",
      "codigo",
      "producto_nombre",
      "cantidad",
      "ingresos",
      "criterio_ganancia",
    ]);
  });
for (const path of ["/inventario-bajo", "/inventario/bajo"]) {
  reports.get(path, async (req, res) => res.json(await lowStock(req.query)));
  for (const suffix of ["exportar", "exportar.csv"])
    reports.get(`${path}/${suffix}`, async (req, res) =>
      sendCSV(res, "reposicion-novaobra", await lowStock(req.query), [
        "id_producto",
        "codigo",
        "nombre",
        "categoria_nombre",
        "stock",
        "stock_minimo",
        "objetivo",
        "faltante",
        "precio_compra",
        "costo_reposicion",
      ]),
    );
}

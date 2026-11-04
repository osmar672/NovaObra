import { pool } from "../config/db.js";
import { entities } from "../models/entities.js";
import { check, id } from "../validators/input.js";

const resources = Object.fromEntries(
  Object.entries(entities).map(([table, entity]) => [
    table,
    {
      pk: entity.pk,
      select: "t.*",
      from: `${table} t`,
      search: Object.keys(entity.fields)
        .filter((field) =>
          ["text", "optional", "email"].includes(entity.fields[field]),
        )
        .map((field) => `t.${field}`),
      states: entity.fields.estado ? ["activo", "inactivo"] : null,
      date: table === "empleados" ? "t.fecha_ingreso" : null,
    },
  ]),
);
resources.productos.select += ", c.nombre AS categoria_nombre";
resources.productos.from +=
  " JOIN categorias c ON c.id_categoria=t.id_categoria";
resources.productos.search.push("c.nombre");
for (const kind of ["compras", "ventas"]) {
  const purchase = kind === "compras",
    singular = purchase ? "compra" : "venta";
  const party = purchase ? "proveedor" : "cliente",
    people = purchase ? "proveedores" : "clientes";
  resources[kind] = {
    pk: `id_${singular}`,
    select: `t.*, a.nombre AS ${party}_nombre, CONCAT(e.nombre,' ',e.apellido) AS empleado_nombre`,
    from: `${kind} t JOIN ${people} a ON a.id_${party}=t.id_${party} JOIN empleados e ON e.id_empleado=t.id_empleado`,
    search: [
      "a.nombre",
      "a.telefono",
      "a.correo",
      "a.direccion",
      "e.nombre",
      "e.apellido",
      "e.correo",
      "t.clave_solicitud",
    ],
    relatedSearch: `EXISTS (SELECT 1 FROM detalle_${kind} search_line JOIN productos search_product ON search_product.id_producto=search_line.id_producto WHERE search_line.id_${singular}=t.id_${singular} AND (search_product.codigo LIKE ? ESCAPE '=' OR search_product.nombre LIKE ? ESCAPE '='))`,
    states: ["borrador", "confirmada", "cancelada"],
    date: `t.fecha_${singular}`,
  };
  resources[`detalle_${kind}`] = {
    pk: `id_detalle_${singular}`,
    select: "t.*, p.nombre AS producto_nombre, p.codigo AS producto_codigo",
    from: `detalle_${kind} t JOIN productos p ON p.id_producto=t.id_producto JOIN ${kind} h ON h.id_${singular}=t.id_${singular}`,
    search: ["p.nombre", "p.codigo"],
    date: `h.fecha_${singular}`,
  };
}
resources.movimientos_inventario = {
  pk: "id_movimiento",
  select: "t.*, p.nombre AS producto_nombre, p.codigo AS producto_codigo",
  from: "movimientos_inventario t JOIN productos p ON p.id_producto=t.id_producto",
  search: ["t.descripcion", "p.nombre", "p.codigo"],
  date: "t.fecha_movimiento",
};

export function validDate(value, name) {
  check(
    typeof value === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(value) &&
      value >= "1000-01-01",
    `${name}: fecha inválida.`,
  );
  const parsed = new Date(`${value}T12:00:00Z`);
  check(
    !Number.isNaN(parsed.valueOf()) &&
      parsed.toISOString().slice(0, 10) === value,
    `${name}: fecha inválida.`,
  );
  return value;
}
export function dates(query) {
  const desde =
    query.desde === undefined || query.desde === ""
      ? null
      : validDate(query.desde, "desde");
  const hasta =
    query.hasta === undefined || query.hasta === ""
      ? null
      : validDate(query.hasta, "hasta");
  check(
    !desde || !hasta || desde <= hasta,
    "La fecha inicial debe ser anterior o igual a la final.",
  );
  return { desde, hasta };
}
function positive(value, fallback, max, name) {
  if (value === undefined) return fallback;
  check(
    typeof value === "string" && /^[1-9]\d*$/.test(value),
    `${name}: entero positivo requerido.`,
  );
  const n = Number(value);
  check(Number.isSafeInteger(n) && n <= max, `${name}: valor fuera de rango.`);
  return n;
}
function scalar(value, name) {
  check(typeof value === "string", `${name}: valor inválido.`);
  return value;
}
export async function readSnapshot(fn) {
  const c = await pool.getConnection();
  try {
    await c.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ");
    await c.query("START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY");
    const result = await fn(c);
    await c.commit();
    return result;
  } catch (error) {
    await c.rollback();
    throw error;
  } finally {
    c.release();
  }
}

export async function listRecords(table, query = {}, { all = false } = {}) {
  const resource = resources[table];
  check(Boolean(resource), "Recurso de consulta inválido.");
  const allowed = [
    "q",
    "estado",
    "categoria",
    "desde",
    "hasta",
    "pagina",
    "limite",
    "stock",
    "inventario",
    "tipo_movimiento",
  ];
  check(
    Object.keys(query).every((key) => allowed.includes(key)),
    "Filtro no permitido.",
  );
  const where = [],
    values = [];
  if (query.q !== undefined && query.q !== "") {
    const q = scalar(query.q, "q").trim();
    check(q.length <= 120, "Búsqueda demasiado larga.");
    const escaped = q.replace(/[=%_]/g, (ch) => "=" + ch);
    const fields = [...resource.search, `CAST(t.${resource.pk} AS CHAR)`];
    const search = fields.map((field) => `${field} LIKE ? ESCAPE '='`);
    values.push(...fields.map(() => `%${escaped}%`));
    if (resource.relatedSearch) {
      search.push(resource.relatedSearch);
      values.push(`%${escaped}%`, `%${escaped}%`);
    }
    where.push("(" + search.join(" OR ") + ")");
  }
  if (
    query.estado !== undefined &&
    query.estado !== "" &&
    query.estado !== "todos"
  ) {
    check(
      resource.states?.includes(query.estado),
      "Estado inválido para este recurso.",
    );
    where.push("t.estado=?");
    values.push(query.estado);
  }
  if (query.categoria !== undefined && query.categoria !== "") {
    check(
      table === "productos",
      "El filtro de categoría solo aplica a productos.",
    );
    where.push("t.id_categoria=?");
    values.push(id(query.categoria));
  }
  const stock = query.stock ?? query.inventario;
  if (stock !== undefined && stock !== "" && stock !== "todos") {
    check(
      table === "productos" && stock === "bajo",
      "Filtro de inventario inválido.",
    );
    where.push("t.stock<=t.stock_minimo");
  }
  if (
    query.tipo_movimiento !== undefined &&
    query.tipo_movimiento !== "" &&
    query.tipo_movimiento !== "todos"
  ) {
    check(
      table === "movimientos_inventario" &&
        ["entrada", "salida"].includes(query.tipo_movimiento),
      "Tipo de movimiento inválido.",
    );
    where.push("t.tipo_movimiento=?");
    values.push(query.tipo_movimiento);
  }
  const { desde, hasta } = dates(query);
  if (desde || hasta)
    check(Boolean(resource.date), "Este recurso no tiene filtro por fecha.");
  if (desde) {
    where.push(`${resource.date}>=?`);
    values.push(desde);
  }
  if (hasta) {
    where.push(`${resource.date}<=CONCAT(?,' 23:59:59')`);
    values.push(hasta);
  }
  const pagina = positive(query.pagina, 1, 1000000, "pagina"),
    limite = positive(query.limite, 10, 100, "limite");
  const paginated =
    !all && (query.pagina !== undefined || query.limite !== undefined);
  const condition = where.length ? " WHERE " + where.join(" AND ") : "";
  const sql = `SELECT ${resource.select} FROM ${resource.from}${condition} ORDER BY t.${resource.pk} DESC`;
  if (!paginated) {
    const [rows] = await pool.query(sql, values);
    return rows;
  }
  return readSnapshot(async (c) => {
    const [[count]] = await c.query(
      `SELECT COUNT(*) total FROM ${resource.from}${condition}`,
      values,
    );
    const [datos] = await c.query(`${sql} LIMIT ? OFFSET ?`, [
      ...values,
      limite,
      (pagina - 1) * limite,
    ]);
    return {
      datos,
      total: count.total,
      pagina,
      limite,
      paginas: Math.max(1, Math.ceil(count.total / limite)),
    };
  });
}

export function csvContent(rows, columns = Object.keys(rows[0] || {})) {
  const cell = (value) => {
    let string = value == null ? "" : String(value);
    if (
      typeof value === "string" &&
      (/^[\s]*[=+\-@]/.test(string) || /^[\t\r\n]/.test(string))
    )
      string = "'" + string;
    return '"' + string.replaceAll('"', '""') + '"';
  };
  return (
    "\uFEFF" +
    [
      columns.map(cell).join(","),
      ...rows.map((row) =>
        columns.map((column) => cell(row[column])).join(","),
      ),
    ].join("\r\n") +
    "\r\n"
  );
}
export function sendCSV(res, filename, rows, columns) {
  res.set("Content-Type", "text/csv; charset=utf-8");
  res.set("Content-Disposition", `attachment; filename="${filename}.csv"`);
  res.send(csvContent(rows, columns));
}
export function exportColumns(table) {
  const info = resources[table];
  const fields = entities[table]?.fields;
  if (fields)
    return [
      info.pk,
      ...Object.keys(fields),
      ...(table === "productos" ? ["stock", "categoria_nombre"] : []),
    ];
  if (table === "movimientos_inventario")
    return [
      "id_movimiento",
      "id_producto",
      "producto_nombre",
      "producto_codigo",
      "tipo_movimiento",
      "cantidad",
      "fecha_movimiento",
      "descripcion",
    ];
  if (table === "compras" || table === "ventas")
    return [
      info.pk,
      table === "compras" ? "proveedor_nombre" : "cliente_nombre",
      "empleado_nombre",
      table === "compras" ? "fecha_compra" : "fecha_venta",
      "total",
      "estado",
    ];
  const purchase = table === "detalle_compras";
  return [
    info.pk,
    purchase ? "id_compra" : "id_venta",
    "id_producto",
    "producto_nombre",
    "producto_codigo",
    "cantidad",
    purchase ? "costo_unitario" : "precio_unitario",
    "subtotal",
  ];
}
export function registerList(router, table) {
  router.get("/" + table, async (req, res) =>
    res.json(await listRecords(table, req.query)),
  );
  for (const suffix of ["exportar", "exportar.csv"])
    router.get(`/${table}/${suffix}`, async (req, res) =>
      sendCSV(
        res,
        table,
        await listRecords(table, req.query, { all: true }),
        exportColumns(table),
      ),
    );
}

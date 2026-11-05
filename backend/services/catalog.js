import {
  check,
  text,
  id,
  integer,
  cents,
  imageUrl,
  flag,
  transaction,
} from "../lib/validation.js";
export const priceSQL =
  "CASE WHEN p.precio_oferta IS NOT NULL AND UTC_TIMESTAMP() BETWEEN p.oferta_inicio AND p.oferta_fin THEN p.precio_oferta ELSE p.precio END";
export const productSelect = `SELECT p.*,c.nombre AS categoria,m.nombre AS marca,i.existencia,i.minimo,${priceSQL} AS precio_actual FROM productos p JOIN categorias c ON c.id=p.categoria_id JOIN marcas m ON m.id=p.marca_id JOIN inventario i ON i.producto_id=p.id`;
export const visibleSQL = "p.activo=1 AND c.activo=1 AND m.activo=1";
export async function catalog(pool, query, admin = false) {
  const clauses = [admin ? "1=1" : visibleSQL],
    values = [];
  if (query.q) {
    const q = `%${text(query.q, "Búsqueda", 100).replace(/[!%_]/g, "!$&")}%`;
    clauses.push(
      "(p.nombre LIKE ? ESCAPE '!' OR p.sku LIKE ? ESCAPE '!' OR m.nombre LIKE ? ESCAPE '!' OR c.nombre LIKE ? ESCAPE '!' OR p.descripcion LIKE ? ESCAPE '!' OR p.especificaciones LIKE ? ESCAPE '!')",
    );
    values.push(q, q, q, q, q, q);
  }
  for (const [key, column] of [
    ["categoria", "p.categoria_id"],
    ["marca", "p.marca_id"],
  ])
    if (query[key]) {
      clauses.push(`${column}=?`);
      values.push(id(query[key]));
    }
  for (const [key, operator] of [
    ["min", ">="],
    ["max", "<="],
  ])
    if (query[key] !== undefined && query[key] !== "") {
      clauses.push(`${priceSQL}${operator}?`);
      values.push(cents(query[key]) / 100);
    }
  if (query.disponible === "1") clauses.push("i.existencia>0");
  if (query.ofertas === "1") clauses.push(`${priceSQL}<p.precio`);
  if (query.destacado === "1") clauses.push("p.destacado=1");
  const page = integer(query.pagina || "1", "Página", 1, 10000),
    limit = 12;
  const order =
    {
      precio_asc: "precio_actual ASC,p.id DESC",
      precio_desc: "precio_actual DESC,p.id DESC",
      nuevos: "p.id DESC",
      nombre: "p.nombre,p.id",
    }[query.orden] || "p.destacado DESC,p.id DESC";
  const where = ` WHERE ${clauses.join(" AND ")}`;
  const [[count]] = await pool.execute(
    `SELECT COUNT(*) AS total FROM productos p JOIN categorias c ON c.id=p.categoria_id JOIN marcas m ON m.id=p.marca_id JOIN inventario i ON i.producto_id=p.id${where}`,
    values,
  );
  const [rows] = await pool.execute(
    `${productSelect}${where} ORDER BY ${order} LIMIT ${limit} OFFSET ${(page - 1) * limit}`,
    values,
  );
  return {
    items: rows,
    total: count.total,
    pagina: page,
    paginas: Math.ceil(count.total / limit),
  };
}
export function promotionDate(value) {
  check(
    typeof value === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{3})?)?Z$/.test(value) &&
      value >= "1000-01-01" &&
      Number.isFinite(Date.parse(value)),
    "Las fechas de promoción deben ser UTC válidas.",
  );
  const normalized = new Date(value).toISOString();
  check(normalized.slice(0, 16) === value.slice(0, 16), "La fecha de promoción no existe.");
  return normalized.slice(0, 19).replace("T", " ");
}
export async function saveProduct(pool, body, productId) {
  const price = cents(body.precio);
  check(price > 0, "El precio debe ser mayor que cero.");
  const offer =
    body.precio_oferta === null ||
    body.precio_oferta === "" ||
    body.precio_oferta === undefined
      ? null
      : cents(body.precio_oferta);
  let start = null,
    end = null;
  if (offer !== null) {
    check(
      offer > 0 && offer < price,
      "La oferta debe ser menor al precio normal.",
    );
    start = promotionDate(body.oferta_inicio);
    end = promotionDate(body.oferta_fin);
    check(end > start, "El fin de la oferta debe ser posterior al inicio.");
  }
  const values = [
    id(body.categoria_id),
    id(body.marca_id),
    text(body.sku, "SKU", 60),
    text(body.nombre, "Nombre", 160),
    text(body.descripcion || "", "Descripción", 10000, false),
    text(body.especificaciones || "", "Especificaciones", 10000, false),
    imageUrl(body.imagen),
    price / 100,
    offer === null ? null : offer / 100,
    start,
    end,
    flag(body.destacado),
    flag(body.activo, true),
  ];
  return transaction(pool, async (c) => {
    let resultId = productId;
    if (productId) {
      const [[existing]] = await c.execute(
        "SELECT id FROM productos WHERE id=? FOR UPDATE",
        [productId],
      );
      check(existing, "Producto no encontrado.", 404);
      await c.execute(
        "UPDATE productos SET categoria_id=?,marca_id=?,sku=?,nombre=?,descripcion=?,especificaciones=?,imagen=?,precio=?,precio_oferta=?,oferta_inicio=?,oferta_fin=?,destacado=?,activo=? WHERE id=?",
        [...values, productId],
      );
    } else {
      const [result] = await c.execute(
        "INSERT INTO productos (categoria_id,marca_id,sku,nombre,descripcion,especificaciones,imagen,precio,precio_oferta,oferta_inicio,oferta_fin,destacado,activo) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
        values,
      );
      resultId = result.insertId;
      await c.execute("INSERT INTO inventario (producto_id) VALUES (?)", [
        resultId,
      ]);
    }
    await c.execute("UPDATE inventario SET minimo=? WHERE producto_id=?", [
      integer(body.minimo ?? 5, "Mínimo", 0),
      resultId,
    ]);
    return { id: resultId };
  });
}

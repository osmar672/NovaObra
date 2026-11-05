import { check, text, integer, id, transaction } from "../middlewares/validaciones.js";
import { productSelect, visibleSQL } from "./catalog.js";
export function orderLines(input) {
  check(
    Array.isArray(input) && input.length > 0 && input.length <= 50,
    "El pedido debe tener entre 1 y 50 productos.",
  );
  const lines = input
    .map((line) => {
      check(line && typeof line === "object", "Línea no válida.");
      return {
        id: id(line.producto_id),
        cantidad: integer(line.cantidad, "Cantidad", 1, 10000),
      };
    })
    .sort((a, b) => a.id - b.id);
  check(
    new Set(lines.map((l) => l.id)).size === lines.length,
    "No repitas productos en el pedido.",
  );
  return lines;
}
export async function createOrder(pool, config, user, body, actor = user) {
  const lines = orderLines(body.lineas),
    key = text(body.clave, "Clave de solicitud", 64);
  check(/^[A-Za-z0-9_-]{16,64}$/.test(key), "Clave de solicitud no válida.");
  const type = body.tipo || "pedido",
    delivery = body.entrega;
  check(["pedido", "cotizacion"].includes(type), "Tipo de pedido no válido.");
  check(
    ["retiro", "domicilio"].includes(delivery),
    "Selecciona retiro o domicilio.",
  );
  check(
    delivery !== "domicilio" || config.business.deliveryFee !== null,
    "La entrega a domicilio no está habilitada.",
  );
  const address = text(
      body.direccion || "",
      "Dirección",
      500,
      delivery === "domicilio",
    ),
    phone = text(body.telefono, "Teléfono", 30),
    note = text(body.nota || "", "Nota", 1000, false);
  return transaction(pool, async (c) => {
    // Serializes retries from this customer before checking the idempotency key.
    const [[client]] = await c.execute(
      "SELECT id FROM clientes WHERE usuario_id=? FOR UPDATE",
      [user.id],
    );
    check(client, "Esta cuenta no tiene perfil de cliente.", 403);
    const [[existing]] = await c.execute(
      "SELECT id FROM pedidos WHERE cliente_id=? AND clave=?",
      [client.id, key],
    );
    if (existing) return { id: existing.id, repetido: true };
    const products = [];
    for (const line of lines) {
      const [[product]] = await c.execute(
        `${productSelect} WHERE p.id=? AND ${visibleSQL} FOR UPDATE`,
        [line.id],
      );
      check(product, "Uno de los productos ya no está disponible.", 404);
      if (type === "pedido")
        check(
          product.existencia >= line.cantidad,
          `Existencias insuficientes para ${product.nombre}.`,
          409,
        );
      products.push({ ...product, cantidad: line.cantidad });
    }
    const [created] = await c.execute(
      "INSERT INTO pedidos (cliente_id,clave,tipo,entrega,direccion,telefono,nota,costo_entrega) VALUES (?,?,?,?,?,?,?,?)",
      [
        client.id,
        key,
        type,
        delivery,
        address,
        phone,
        note,
        delivery === "domicilio" ? config.business.deliveryFee : 0,
      ],
    );
    for (const product of products) {
      await c.execute(
        "INSERT INTO detalle_pedidos (pedido_id,producto_id,cantidad,precio_unitario) VALUES (?,?,?,?)",
        [created.insertId, product.id, product.cantidad, product.precio_actual],
      );
      if (type === "pedido") {
        await c.execute(
          "UPDATE inventario SET existencia=existencia-? WHERE producto_id=?",
          [product.cantidad, product.id],
        );
        await c.execute(
          "INSERT INTO movimientos_inventario (producto_id,usuario_id,pedido_id,cantidad,motivo) VALUES (?,?,?,?,?)",
          [
            product.id,
            actor.id,
            created.insertId,
            -product.cantidad,
            "Reserva de pedido",
          ],
        );
      }
    }
    await c.execute("UPDATE clientes SET telefono=?,direccion=? WHERE id=?", [
      phone,
      address,
      client.id,
    ]);
    return { id: created.insertId, repetido: false };
  });
}
export async function orders(pool, user, admin = false) {
  const [rows] = await pool.execute(
    `SELECT p.*,u.nombre AS cliente,u.email,COALESCE(SUM(d.cantidad*d.precio_unitario),0)+p.costo_entrega AS total FROM pedidos p JOIN clientes c ON c.id=p.cliente_id JOIN usuarios u ON u.id=c.usuario_id LEFT JOIN detalle_pedidos d ON d.pedido_id=p.id ${admin ? "" : "WHERE c.usuario_id=?"} GROUP BY p.id ORDER BY p.id DESC LIMIT 200`,
    admin ? [] : [user.id],
  );
  if (!rows.length) return [];
  const [details] = await pool.execute(
    `SELECT d.*,pr.nombre,pr.sku FROM detalle_pedidos d JOIN productos pr ON pr.id=d.producto_id WHERE d.pedido_id IN (${rows.map(() => "?").join(",")})`,
    rows.map((r) => r.id),
  );
  return rows.map((row) => ({
    ...row,
    lineas: details.filter((d) => d.pedido_id === row.id),
  }));
}
export function allowedNext(order) {
  if (order.tipo === "cotizacion")
    return order.estado === "pendiente" ? ["confirmado", "cancelado"] : [];
  return (
    {
      pendiente: ["confirmado", "cancelado"],
      confirmado: ["preparando", "cancelado"],
      preparando: [
        order.entrega === "retiro" ? "listo" : "enviado",
        "cancelado",
      ],
      listo: ["entregado", "cancelado"],
      enviado: ["entregado"],
      entregado: [],
      cancelado: [],
    }[order.estado] || []
  );
}
export async function transition(pool, user, orderId, next) {
  return transaction(pool, async (c) => {
    const [[order]] = await c.execute(
      "SELECT * FROM pedidos WHERE id=? FOR UPDATE",
      [orderId],
    );
    check(order, "Pedido no encontrado.", 404);
    if (order.estado === next) return { id: orderId, estado: next };
    check(
      allowedNext(order).includes(next),
      "Cambio de estado no permitido.",
      409,
    );
    if (next === "cancelado" && order.tipo === "pedido") {
      const [lines] = await c.execute(
        "SELECT * FROM detalle_pedidos WHERE pedido_id=? ORDER BY producto_id",
        [orderId],
      );
      for (const line of lines) {
        await c.execute(
          "UPDATE inventario SET existencia=existencia+? WHERE producto_id=?",
          [line.cantidad, line.producto_id],
        );
        await c.execute(
          "INSERT INTO movimientos_inventario (producto_id,usuario_id,pedido_id,cantidad,motivo) VALUES (?,?,?,?,?)",
          [
            line.producto_id,
            user.id,
            orderId,
            line.cantidad,
            "Cancelación de pedido",
          ],
        );
      }
    }
    await c.execute("UPDATE pedidos SET estado=? WHERE id=?", [next, orderId]);
    return { id: orderId, estado: next };
  });
}

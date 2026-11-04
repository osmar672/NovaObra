import { transaction } from "../config/db.js";
import { HttpError } from "../middlewares/errors.js";
import { id, quantity, money, check, text } from "../validators/input.js";
import { compraModel } from "../models/compraModel.js";
import { ventaModel } from "../models/ventaModel.js";
import { detalleCompraModel } from "../models/detalleCompraModel.js";
import { detalleVentaModel } from "../models/detalleVentaModel.js";
import { productoModel } from "../models/productoModel.js";
import { movimientoInventarioModel } from "../models/movimientoInventarioModel.js";

const headers = { compras: compraModel, ventas: ventaModel };
const details = { compras: detalleCompraModel, ventas: detalleVentaModel };
export const tradeInfo = (k) => {
  const { pk, party, price } = headers[k];
  return { pk, party, price };
};
export function readTrade(k, n) {
  return headers[k].readWithDetails(n);
}
export function locked(c, k, n) {
  return headers[k].lock(n, c);
}
export function draft(row) {
  if (row.estado !== "borrador")
    throw new HttpError(409, "Solo se puede editar un borrador.");
}
export function total(c, k, n) {
  return headers[k].recalculateTotal(n, c);
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
  const { party } = tradeInfo(k);
  const header = headers[k],
    detail = details[k];
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
      await header.updateParty(n, partyId, employee, c);
      await detail.removeForHeader(n, c);
    } else {
      n = await header.insertDraft(partyId, employee, key, c);
    }
    for (const l of lines) await detail.insertLine(n, l, c);
    await total(c, k, n);
    return n;
  });
}
export async function transition(k, n, action) {
  const header = headers[k],
    detail = details[k];
  return transaction(async (c) => {
    const row = await locked(c, k, n),
      target = action === "confirmar" ? "confirmada" : "cancelada";
    if (row.estado === target) return row;
    if (row.estado === "cancelada")
      throw new HttpError(409, "La operación está cancelada.");
    const lines = await detail.findForHeader(n, c);
    if (target === "confirmada" && !lines.length)
      throw new HttpError(409, "Agregue productos antes de confirmar.");
    const affect = target === "confirmada" || row.estado === "confirmada";
    if (affect) {
      const sign =
        (k === "compras" ? 1 : -1) * (target === "cancelada" ? -1 : 1);
      // Every stock mutation locks products in ascending order to limit deadlocks.
      for (const l of lines) {
        const p = await productoModel.lock(l.id_producto, c);
        if (target === "confirmada" && p.estado !== "activo")
          throw new HttpError(409, "Producto inactivo.");
        if (
          p.stock + sign * l.cantidad < 0 ||
          p.stock + sign * l.cantidad > 2147483647
        )
          throw new HttpError(409, "Inventario insuficiente o fuera de rango.");
        await productoModel.adjustStock(l.id_producto, sign * l.cantidad, c);
        await movimientoInventarioModel.recordMovement(
          {
            id_producto: l.id_producto,
            tipo_movimiento: sign > 0 ? "entrada" : "salida",
            cantidad: l.cantidad,
            descripcion: `${action} ${k} #${n}`,
          },
          c,
        );
      }
    }
    await header.updateState(n, target, c);
    return { ...row, estado: target };
  });
}

import { createEntityService } from "./apiClient.js";

export const detalle_comprasService = {
  ...createEntityService("detalle_compras"),
  priceField: "costo_unitario",
  productPriceField: "precio_compra",
  fromRecord: (record) =>
    (record.detalles || []).map((line) => ({
      id_producto: line.id_producto,
      cantidad: line.cantidad,
      costo_unitario: line.costo_unitario,
    })),
  serialize: (lines) =>
    lines.map((line) =>
      Object.fromEntries(
        Object.entries(line).map(([key, value]) => [key, Number(value)]),
      ),
    ),
};

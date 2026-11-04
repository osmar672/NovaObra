import { createEntityService } from "./apiClient.js";

export const detalle_ventasService = {
  ...createEntityService("detalle_ventas"),
  priceField: "precio_unitario",
  productPriceField: "precio_venta",
  fromRecord: (record) =>
    (record.detalles || []).map((line) => ({
      id_producto: line.id_producto,
      cantidad: line.cantidad,
      precio_unitario: line.precio_unitario,
    })),
  serialize: (lines) =>
    lines.map((line) =>
      Object.fromEntries(
        Object.entries(line).map(([key, value]) => [key, Number(value)]),
      ),
    ),
};

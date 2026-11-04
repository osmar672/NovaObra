import { createDetailModel } from "./shared/createDetailModel.js";

export const detalleVentaModel = createDetailModel({
  table: "detalle_ventas",
  pk: "id_detalle_venta",
  headerPk: "id_venta",
  price: "precio_unitario",
  fields: {
    id_venta: "id",
    id_producto: "id",
    cantidad: "quantity",
    precio_unitario: "money",
  },
});

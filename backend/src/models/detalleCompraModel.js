import { createDetailModel } from "./shared/createDetailModel.js";

export const detalleCompraModel = createDetailModel({
  table: "detalle_compras",
  pk: "id_detalle_compra",
  headerPk: "id_compra",
  price: "costo_unitario",
  fields: {
    id_compra: "id",
    id_producto: "id",
    cantidad: "quantity",
    costo_unitario: "money",
  },
});

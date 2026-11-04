import { createTradeModel } from "./shared/createTradeModel.js";

export const ventaModel = createTradeModel({
  table: "ventas",
  pk: "id_venta",
  party: "id_cliente",
  partyName: "cliente",
  people: "clientes",
  price: "precio_unitario",
  detailPk: "id_detalle_venta",
  fields: {
    id_cliente: "id",
    id_empleado: "id",
    clave_solicitud: "optional",
  },
});

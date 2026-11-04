import { createTradeModel } from "./shared/createTradeModel.js";

export const compraModel = createTradeModel({
  table: "compras",
  pk: "id_compra",
  party: "id_proveedor",
  partyName: "proveedor",
  people: "proveedores",
  price: "costo_unitario",
  detailPk: "id_detalle_compra",
  fields: {
    id_proveedor: "id",
    id_empleado: "id",
    clave_solicitud: "optional",
  },
});

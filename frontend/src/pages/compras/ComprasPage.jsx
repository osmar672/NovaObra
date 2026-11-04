import { comprasService } from "../../services/comprasService.js";
import { defineEntityPage } from "../defineEntityPage.jsx";
import DetailForm from "../detalle_compras/DetalleComprasForm.jsx";

export default defineEntityPage({
  resource: "compras",
  label: "Compras",
  pk: "id_compra",
  kind: "trade",
  fields: {
    id_proveedor: "id",
    id_empleado: "id",
  },
  columns: [
    "id_compra",
    "id_proveedor",
    "id_empleado",
    "fecha_compra",
    "total",
    "estado",
  ],
  service: comprasService,
  DetailForm,
});

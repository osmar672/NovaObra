import { ventasService } from "../../services/ventasService.js";
import { defineEntityPage } from "../defineEntityPage.jsx";
import DetailForm from "../detalle_ventas/DetalleVentasForm.jsx";

export default defineEntityPage({
  resource: "ventas",
  label: "Ventas",
  pk: "id_venta",
  kind: "trade",
  fields: {
    id_cliente: "id",
    id_empleado: "id",
  },
  columns: [
    "id_venta",
    "id_cliente",
    "id_empleado",
    "fecha_venta",
    "total",
    "estado",
  ],
  service: ventasService,
  DetailForm,
});

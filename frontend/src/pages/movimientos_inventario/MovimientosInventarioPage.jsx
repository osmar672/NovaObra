import { movimientos_inventarioService } from "../../services/movimientos_inventarioService.js";
import { defineEntityPage } from "../defineEntityPage.jsx";

export default defineEntityPage({
  resource: "movimientos_inventario",
  label: "Inventario",
  pk: "id_movimiento",
  kind: "movement",
  fields: {
    id_producto: "id",
    tipo_movimiento: "movement",
    cantidad: "quantity",
    descripcion: "text",
  },
  columns: [
    "id_movimiento",
    "id_producto",
    "tipo_movimiento",
    "cantidad",
    "fecha_movimiento",
    "descripcion",
  ],
  service: movimientos_inventarioService,
});

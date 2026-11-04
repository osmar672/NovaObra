import { productosService } from "../../services/productosService.js";
import { defineEntityPage } from "../defineEntityPage.jsx";

export default defineEntityPage({
  resource: "productos",
  label: "Productos",
  pk: "id_producto",
  kind: "catalog",
  fields: {
    id_categoria: "id",
    codigo: "text",
    nombre: "text",
    descripcion: "optional",
    precio_compra: "money",
    precio_venta: "money",
    stock_minimo: "quantity",
    estado: "active",
  },
  columns: [
    "id_producto",
    "id_categoria",
    "codigo",
    "nombre",
    "descripcion",
    "precio_compra",
    "precio_venta",
    "stock_minimo",
    "estado",
    "stock",
  ],
  service: productosService,
});

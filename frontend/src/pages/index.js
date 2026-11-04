import productos from "./productos/ProductosPage.jsx";
import categorias from "./categorias/CategoriasPage.jsx";
import proveedores from "./proveedores/ProveedoresPage.jsx";
import clientes from "./clientes/ClientesPage.jsx";
import empleados from "./empleados/EmpleadosPage.jsx";
import compras from "./compras/ComprasPage.jsx";
import ventas from "./ventas/VentasPage.jsx";
import movimientos_inventario from "./movimientos_inventario/MovimientosInventarioPage.jsx";

export const entityPages = {
  productos,
  categorias,
  proveedores,
  clientes,
  empleados,
  compras,
  ventas,
  movimientos_inventario,
};

export const labels = {
  dashboard: "Inicio",
  ...Object.fromEntries(
    Object.entries(entityPages).map(([key, page]) => [key, page.label]),
  ),
  reportes: "Reportes",
};

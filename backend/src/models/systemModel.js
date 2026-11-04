import { pool } from "../config/db.js";

export const systemModel = {
  async checkConnection() {
    await pool.query("SELECT 1");
  },
  async dashboard() {
    const [[counts]] = await pool.query(
      `SELECT (SELECT COUNT(*) FROM productos) productos,(SELECT COUNT(*) FROM productos WHERE estado='activo' AND stock<=stock_minimo) inventario_bajo,(SELECT COUNT(*) FROM clientes) clientes,(SELECT COUNT(*) FROM proveedores) proveedores,(SELECT COUNT(*) FROM compras) compras,(SELECT COUNT(*) FROM ventas) ventas`,
    );
    const [movimientos] = await pool.query(
      "SELECT tipo_movimiento,COUNT(*) operaciones,SUM(cantidad) cantidad FROM movimientos_inventario GROUP BY tipo_movimiento",
    );
    return { ...counts, movimientos };
  },
};

import { createModel } from "./shared/createModel.js";

// Inventory history is append-only; the service rejects changes and deletions.
export const movimientoInventarioModel = {
  ...createModel({
    table: "movimientos_inventario",
    pk: "id_movimiento",
    fields: {
      id_producto: "id",
      tipo_movimiento: "movement",
      cantidad: "quantity",
      descripcion: "text",
      clave_solicitud: "optional",
    },
  }),
  async recordMovement(data, connection) {
    const {
      id_producto,
      tipo_movimiento,
      cantidad,
      descripcion,
      clave_solicitud,
    } = data;
    const withKey = Object.hasOwn(data, "clave_solicitud");
    const [result] = await connection.query(
      withKey
        ? "INSERT INTO movimientos_inventario (id_producto,tipo_movimiento,cantidad,descripcion,clave_solicitud) VALUES (?,?,?,?,?)"
        : "INSERT INTO movimientos_inventario (id_producto,tipo_movimiento,cantidad,descripcion) VALUES (?,?,?,?)",
      [
        id_producto,
        tipo_movimiento,
        cantidad,
        descripcion,
        ...(withKey ? [clave_solicitud] : []),
      ],
    );
    return result.insertId;
  },
};

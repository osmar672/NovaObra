import { hashPassword } from "../middlewares/authMiddleware.js";
import { transaction } from "../middlewares/validaciones.js";
export const publicUser = user => ({ id: user.id, nombre: user.nombre, correo: user.email, email: user.email, fechaCreacion: user.fechaCreacion || user.creado, rol: user.rol });
export async function createUser(pool, nombre, correo, password) {
  const hash = await hashPassword(password);
  return transaction(pool, async c => {
    const [result] = await c.execute("INSERT INTO usuarios (rol_id,nombre,email,password_hash) VALUES (3,?,?,?)", [nombre, correo, hash]);
    await c.execute("INSERT INTO clientes (usuario_id) VALUES (?)", [result.insertId]);
    const [[user]] = await c.execute("SELECT id,nombre,email,creado AS fechaCreacion,version_sesion FROM usuarios WHERE id=?", [result.insertId]);
    return { ...user, rol: "cliente" };
  });
}

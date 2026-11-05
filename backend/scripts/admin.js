import mysql from "mysql2/promise";
import { configuration } from "../src/config.js";
import { ask } from "./prompt.js";
import { email, text, password } from "../src/middlewares/validaciones.js";
import { hashPassword } from "../src/middlewares/authMiddleware.js";
let connection;
try {
  const config = configuration();
  connection = await mysql.createConnection(config.db);
  const name = text(await ask("Nombre del administrador: "), "Nombre", 120),
    mail = email(await ask("Correo: "));
  const pass = password(
    await ask("Contraseña nueva (mínimo 12 caracteres, oculta): ", {
      secret: true,
    }),
  );
  const confirmation = await ask("Repite la contraseña: ", { secret: true });
  if (pass !== confirmation) throw new Error("Las contraseñas no coinciden.");
  await connection.execute(
    "INSERT INTO usuarios (rol_id,nombre,email,password_hash) VALUES (1,?,?,?)",
    [name, mail, await hashPassword(pass)],
  );
  console.log("Administrador creado. Ya puedes iniciar sesión en la tienda.");
} catch (error) {
  console.error(
    "No se pudo crear el administrador:",
    error.code || error.message,
  );
  process.exitCode = 1;
} finally {
  if (connection) await connection.end();
}

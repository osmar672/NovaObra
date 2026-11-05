import mysql from "mysql2/promise";
import { configuration } from "../src/config.js";
import { setup } from "../src/schema.js";
let connection;
try {
  const config = configuration();
  connection = await mysql.createConnection({
    ...config.db,
    database: undefined,
  });
  await setup(connection, config.database, {
    seed: process.argv.includes("--demo"),
  });
  console.log(
    "Tienda preparada: 12 tablas. Los ejemplos solo se cargan al usar --demo.",
  );
} catch (error) {
  console.error("No se pudo preparar la tienda:", error.code || error.message);
  process.exitCode = 1;
} finally {
  if (connection) await connection.end();
}

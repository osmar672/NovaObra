import mysql from "mysql2/promise";
import { databaseSettings } from "../src/config/settings.js";
import { runMigrations } from "../migrations/index.js";

let connection;
try {
  const config = databaseSettings();
  connection = await mysql.createConnection({
    ...config,
    database: undefined,
    multipleStatements: true,
  });
  const seed = process.argv.includes("--seed");
  const seedIfEmpty = process.argv.includes("--seed-if-empty");
  const result = await runMigrations(connection, {
    database: config.database,
    seed,
    seedIfEmpty,
  });
  if (result.steps.includes("002_seed_data")) {
    console.log("Datos iniciales cargados.");
  } else if (seedIfEmpty) {
    console.log(
      "Se conservaron los datos existentes; no se volvió a cargar la semilla.",
    );
  }
  console.log(`${config.database} preparada: ${result.tables} tablas.`);
} catch (error) {
  if (connection) await connection.rollback().catch(() => {});
  const hints = {
    ECONNREFUSED:
      "Inicia el servidor MySQL y revisa DB_HOST y DB_PORT en backend/.env.",
    ER_ACCESS_DENIED_ERROR:
      "Revisa DB_USER y DB_PASSWORD en backend/.env. El usuario MySQL debe existir.",
    ER_DBACCESS_DENIED_ERROR:
      "El usuario necesita permisos sobre la base indicada en DB_NAME.",
    ETIMEDOUT:
      "MySQL no respondió. Revisa el servidor y el puerto configurados.",
  };
  console.error(
    "No se pudo preparar la base:",
    hints[error.code] ||
      (error.code
        ? `Error MySQL ${error.code}. Revisa permisos y configuración.`
        : error.message),
  );
  process.exitCode = 1;
} finally {
  if (connection) await connection.end();
}

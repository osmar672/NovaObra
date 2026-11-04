import mysql from "mysql2/promise";
import { readFile } from "node:fs/promises";
import { databaseSettings } from "../src/config/settings.js";
import { expectedSchema, tables, verifyTables } from "./backup-common.js";

let c;
try {
  const config = databaseSettings();
  c = await mysql.createConnection({
    ...config,
    database: undefined,
    multipleStatements: true,
  });
  const [[{ version }]] = await c.query("SELECT VERSION() version");
  const numbers = /^(\d+)\.(\d+)\.(\d+)/.exec(version);
  const [major, minor, patch] = numbers ? numbers.slice(1).map(Number) : [0, 0, 0];
  if (/MariaDB/i.test(version) || major < 8 || (major === 8 && minor === 0 && patch < 16))
    throw new Error("Se requiere MySQL 8.0.16 o posterior; MariaDB no es compatible con esta entrega.");

  await c.query(
    "CREATE DATABASE IF NOT EXISTS ?? CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci",
    [config.database],
  );
  await c.query("USE ??", [config.database]);
  const [existing] = await c.query("SHOW FULL TABLES");
  if (existing.some((row) => !tables.includes(Object.values(row)[0]) || Object.values(row)[1] !== "BASE TABLE"))
    throw new Error("La base contiene objetos ajenos a NovaObra. No se modificaron sus tablas ni datos.");

  await c.query(await expectedSchema());
  const counts = await verifyTables(c);
  const empty = Object.values(counts).every((count) => count === 0);
  const seed = process.argv.includes("--seed");
  const seedIfEmpty = process.argv.includes("--seed-if-empty");
  if (seed && !empty)
    throw new Error("La semilla requiere todas las tablas vacías; no se modificaron los datos existentes.");
  if (seed || (seedIfEmpty && empty)) {
    const sql = (await readFile(new URL("../../database/seed.sql", import.meta.url), "utf8"))
      .replace(/^USE\s+NovaObra;\s*/i, "");
    await c.query(sql);
    console.log("Datos iniciales cargados.");
  } else if (seedIfEmpty) {
    console.log("Se conservaron los datos existentes; no se volvió a cargar la semilla.");
  }
  console.log(`${config.database} preparada: 10 tablas.`);
} catch (error) {
  if (c) await c.rollback().catch(() => {});
  const hints = {
    ECONNREFUSED: "Inicia el servidor MySQL y revisa DB_HOST y DB_PORT en backend/.env.",
    ER_ACCESS_DENIED_ERROR: "Revisa DB_USER y DB_PASSWORD en backend/.env. El usuario MySQL debe existir.",
    ER_DBACCESS_DENIED_ERROR: "El usuario necesita permisos sobre la base indicada en DB_NAME.",
    ETIMEDOUT: "MySQL no respondió. Revisa el servidor y el puerto configurados.",
  };
  console.error("No se pudo preparar la base:", hints[error.code] || (error.code ? `Error MySQL ${error.code}. Revisa permisos y configuración.` : error.message));
  process.exitCode = 1;
} finally {
  if (c) await c.end();
}

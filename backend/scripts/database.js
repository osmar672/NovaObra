import "dotenv/config";
import mysql from "mysql2/promise";
import { runMigrations } from "../migrations/index.js";
const db = process.env.DB_NAME || "novaobra_db";
if (db !== "novaobra_db")
  throw new Error("Este instalador prepara únicamente novaobra_db.");
const c = await mysql.createConnection({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "novaobra",
  password: process.env.DB_PASSWORD || "",
  multipleStatements: true,
});
try {
  const seed = process.argv.includes("--seed");
  const result = await runMigrations(c, { database: db, seed });
  console.log(
    `${db} preparada: ${result.tables} tablas.${seed ? " Datos de ejemplo cargados." : ""}`,
  );
} finally {
  await c.end();
}

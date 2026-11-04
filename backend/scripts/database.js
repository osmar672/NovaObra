import "dotenv/config";
import mysql from "mysql2/promise";
import { readFile } from "node:fs/promises";
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
  await c.query(
    await readFile(
      new URL("../../database/schema.sql", import.meta.url),
      "utf8",
    ),
  );
  if (process.argv.includes("--seed")) {
    const [tables] = await c.query(
      "SELECT table_name AS name FROM information_schema.tables WHERE table_schema='novaobra_db'",
    );
    for (const table of tables) {
      const [[r]] = await c.query("SELECT COUNT(*) n FROM novaobra_db.??", [
        table.name,
      ]);
      if (r.n)
        throw new Error(
          "La semilla requiere todas las tablas vacías; no se modificaron los datos existentes.",
        );
    }
    await c.query(
      await readFile(
        new URL("../../database/seed.sql", import.meta.url),
        "utf8",
      ),
    );
  }
  const [[r]] = await c.query(
    "SELECT COUNT(*) n FROM information_schema.tables WHERE table_schema='novaobra_db'",
  );
  if (r.n !== 10) throw new Error("Se esperaban exactamente diez tablas.");
  console.log("novaobra_db preparada: 10 tablas.");
} finally {
  await c.end();
}

import { readFile } from "node:fs/promises";
import { check } from "./middlewares/validaciones.js";
export const tables = [
  "categorias",
  "clientes",
  "detalle_pedidos",
  "identidades_google",
  "inventario",
  "marcas",
  "movimientos_inventario",
  "pedidos",
  "productos",
  "roles",
  "sesiones_refresh",
  "usuarios",
];
export async function verifySchema(pool, database) {
  const [rows] = await pool.execute(
    "SELECT TABLE_NAME AS name,TABLE_TYPE AS type FROM information_schema.tables WHERE table_schema=? ORDER BY TABLE_NAME",
    [database],
  );
  check(
    rows.length === 12 &&
      rows.every((r, i) => r.name === tables[i] && r.type === "BASE TABLE"),
    "Faltan tablas de la tienda o de sesiones. Ejecuta npm run db:setup desde la raíz del proyecto y comprueba DB_NAME.",
    503,
  );
  const [[column]]=await pool.execute("SELECT COUNT(*) AS n FROM information_schema.columns WHERE table_schema=? AND table_name='usuarios' AND column_name='password_local'",[database]);
  check(column.n===1,'Actualiza el esquema con npm run db:setup.',503);
}
export async function setup(connection, database, { seed = false } = {}) {
  check(
    /^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(database),
    "Nombre de base no válido.",
  );
  const [[{ version }]] = await connection.query("SELECT VERSION() AS version");
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(version);
  const [major, minor, patch] = match ? match.slice(1).map(Number) : [0, 0, 0];
  check(
    !version.includes("MariaDB") &&
      (major > 8 || (major === 8 && (minor > 0 || patch >= 16))),
    "Se requiere MySQL 8.0.16 o posterior.",
  );
  const [existing] = await connection.execute(
    "SELECT TABLE_NAME AS name,TABLE_TYPE AS type FROM information_schema.tables WHERE table_schema=?",
    [database],
  );
  check(
    existing.every((r) => tables.includes(r.name) && r.type === "BASE TABLE"),
    "La base contiene tablas ajenas a la tienda. Elige una base separada; no se modificaron sus tablas.",
  );
  await connection.query(
    `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`,
  );
  await connection.query(`USE \`${database}\``);
  const sql = await readFile(
    new URL("../../database/schema.sql", import.meta.url),
    "utf8",
  );
  for (const statement of sql
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean))
    await connection.query(statement);
  const [[localPassword]]=await connection.execute("SELECT COUNT(*) AS n FROM information_schema.columns WHERE table_schema=? AND table_name='usuarios' AND column_name='password_local'",[database]);
  if(!localPassword.n)await connection.query('ALTER TABLE usuarios ADD COLUMN password_local BOOLEAN NOT NULL DEFAULT TRUE');
  await connection.query(
    "INSERT IGNORE INTO roles (id,nombre) VALUES (1,'administrador'),(2,'empleado'),(3,'cliente')",
  );
  if (seed) {
    for (const table of tables.filter((t) => t !== "roles")) {
      const [[r]] = await connection.query(
        `SELECT COUNT(*) AS n FROM ${table}`,
      );
      check(
        r.n === 0,
        "Los ejemplos solo se cargan en una tienda vacía. No se borraron datos.",
      );
    }
    await connection.beginTransaction();
    try {
      const data = await readFile(
        new URL("../../database/seed.sql", import.meta.url),
        "utf8",
      );
      for (const statement of data
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean))
        await connection.query(statement);
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  }
  await verifySchema(connection, database);
}

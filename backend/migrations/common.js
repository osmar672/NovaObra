import { readFile } from "node:fs/promises";

export function validateDatabase(database) {
  if (
    typeof database !== "string" ||
    !/^[a-zA-Z][a-zA-Z0-9_]{0,63}$/.test(database)
  )
    throw new Error("El nombre de la base de datos no es válido.");
  return database;
}

// The SQL files remain the only definition of the initial schema and seed.
// Rewrite only database directives so every configured DB_NAME uses that SQL.
export async function readSql(step, database) {
  validateDatabase(database);
  if (step !== "schema" && step !== "seed")
    throw new Error("Paso de preparación desconocido.");
  const sql = await readFile(
    new URL(`../../database/${step}.sql`, import.meta.url),
    "utf8",
  );
  return sql
    .replace(
      /^(\s*CREATE\s+DATABASE\s+IF\s+NOT\s+EXISTS\s+)(?:`[^`]+`|[a-zA-Z][a-zA-Z0-9_]*)(?=\s)/im,
      (_match, prefix) => `${prefix}\`${database}\``,
    )
    .replace(
      /^(\s*USE\s+)(?:`[^`]+`|[a-zA-Z][a-zA-Z0-9_]*)(?=\s*;)/im,
      (_match, prefix) => `${prefix}\`${database}\``,
    );
}

export function assertMysqlVersion(version) {
  const numbers = /^(\d+)\.(\d+)\.(\d+)/.exec(version);
  const [major, minor, patch] = numbers ? numbers.slice(1).map(Number) : [0, 0, 0];
  if (
    /MariaDB/i.test(version) ||
    major < 8 ||
    (major === 8 && minor === 0 && patch < 16)
  )
    throw new Error(
      "Se requiere MySQL 8.0.16 o posterior; MariaDB no es compatible con esta entrega.",
    );
}

export async function verifyMysql(connection) {
  const [[{ version }]] = await connection.query("SELECT VERSION() AS version");
  assertMysqlVersion(version);
}

export async function expectedTables(database) {
  const sql = await readSql("schema", database);
  const tables = Array.from(
    sql.matchAll(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+([a-zA-Z0-9_]+)/gi),
    (match) => match[1],
  ).sort();
  if (tables.length !== 10 || new Set(tables).size !== 10)
    throw new Error("El esquema inicial debe definir exactamente diez tablas.");
  return tables;
}

export async function verifyTables(connection, database) {
  const expected = await expectedTables(database);
  const [rows] = await connection.query(
    "SELECT TABLE_NAME AS name, TABLE_TYPE AS type FROM information_schema.tables WHERE table_schema=? ORDER BY TABLE_NAME",
    [database],
  );
  if (
    rows.length !== expected.length ||
    rows.some(
      (row, index) => row.name !== expected[index] || row.type !== "BASE TABLE",
    )
  )
    throw new Error("Se esperaban exactamente las diez tablas de NovaObra.");
  return expected;
}

export async function rejectForeignObjects(connection, database) {
  const expected = await expectedTables(database);
  const [rows] = await connection.query(
    "SELECT TABLE_NAME AS name, TABLE_TYPE AS type FROM information_schema.tables WHERE table_schema=?",
    [database],
  );
  if (rows.some((row) => !expected.includes(row.name) || row.type !== "BASE TABLE"))
    throw new Error(
      "La base contiene objetos ajenos a NovaObra. No se modificaron sus tablas ni datos.",
    );
}

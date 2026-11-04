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
// A database argument allows integration tests to use an isolated schema.
export async function readSql(step, database) {
  validateDatabase(database);
  if (step !== "schema" && step !== "seed")
    throw new Error("Paso de preparación desconocido.");
  const sql = await readFile(
    new URL(`../../database/${step}.sql`, import.meta.url),
    "utf8",
  );
  return sql.replaceAll(/\bnovaobra_db\b/g, `\`${database}\``);
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

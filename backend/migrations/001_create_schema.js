import { readSql, verifyTables } from "./common.js";

export const id = "001_create_schema";

// Repeatable initial setup: CREATE IF NOT EXISTS preserves existing records.
export async function up(connection, { database = "novaobra_db" } = {}) {
  await connection.query(await readSql("schema", database));
  const tables = await verifyTables(connection, database);
  return { id, tables: tables.length };
}

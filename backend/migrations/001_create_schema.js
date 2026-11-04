import {
  readSql,
  rejectForeignObjects,
  verifyMysql,
  verifyTables,
} from "./common.js";

export const id = "001_create_schema";

// Repeatable initial setup: CREATE IF NOT EXISTS preserves existing records.
export async function up(connection, { database = "NovaObra" } = {}) {
  const sql = await readSql("schema", database);
  await verifyMysql(connection);
  // Inspect an existing database before creating any NovaObra tables in it.
  await rejectForeignObjects(connection, database);
  await connection.query(sql);
  const tables = await verifyTables(connection, database);
  return { id, tables: tables.length };
}

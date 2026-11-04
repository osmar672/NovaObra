import { readSql, verifyTables } from "./common.js";

export const id = "002_seed_data";

export async function up(
  connection,
  { database = "NovaObra", ifEmpty = false } = {},
) {
  const tables = await verifyTables(connection, database);
  for (const table of tables) {
    const [[row]] = await connection.query("SELECT COUNT(*) AS n FROM ??.??", [
      database,
      table,
    ]);
    if (row.n) {
      if (ifEmpty) return { id, applied: false };
      throw new Error(
        "La semilla requiere todas las tablas vacías; no se modificaron los datos existentes.",
      );
    }
  }
  try {
    // seed.sql owns its transaction, including COMMIT.
    await connection.query(await readSql("seed", database));
  } catch (error) {
    await connection.rollback();
    throw error;
  }
  return { id, applied: true };
}

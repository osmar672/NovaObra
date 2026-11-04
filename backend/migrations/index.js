import { up as createSchema } from "./001_create_schema.js";
import { up as seedData } from "./002_seed_data.js";

export { createSchema, seedData };

// These are ordered initial setup steps, not an ALTER/rollback migration engine.
// No bookkeeping table is added: NovaObra keeps its ten application tables.
export async function runMigrations(
  connection,
  { database = "novaobra_db", seed = false } = {},
) {
  const schema = await createSchema(connection, { database });
  const steps = [schema.id];
  if (seed) steps.push((await seedData(connection, { database })).id);
  return { database, tables: schema.tables, steps };
}

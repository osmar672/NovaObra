import { readFile } from "node:fs/promises";
import {
  settings,
  connection,
  verifyTables,
  expectedSchema,
  decodeBackup,
  assertClient,
  withDefaults,
  runClient,
  counterStatements,
} from "./backup-common.js";

async function main() {
  const [source, ...extra] = process.argv.slice(2);
  if (!source || extra.length)
    throw new Error(
      "Uso: npm run db:restore -- ruta/novaobra.sql (base destino nueva o sin tablas). ",
    );
  const config = settings(),
    executable = process.env.MYSQL_PATH || "mysql";
  const schema = await expectedSchema();
  const { inserts, counters } = decodeBackup(
    await readFile(source, "utf8"),
    schema,
  );
  await assertClient(executable);
  const c = await connection(config, false);
  try {
    await c.query(
      "CREATE DATABASE IF NOT EXISTS ?? CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci",
      [config.database],
    );
    await c.changeUser({ database: config.database });
    await verifyTables(c, true);
    // Only the trusted local schema is executed. Incoming data can contain literals,
    // never DDL, database selectors, expressions, overwrite clauses or arbitrary SQL.
    const sql =
      "SET NAMES utf8mb4;\nSET SESSION sql_mode='STRICT_TRANS_TABLES,NO_AUTO_VALUE_ON_ZERO,NO_ENGINE_SUBSTITUTION';\n" +
      schema +
      "\n" +
      counterStatements(counters) +
      "\nSTART TRANSACTION;\n" +
      inserts.join("\n") +
      "\nCOMMIT;\n";
    await withDefaults(config, (file) =>
      runClient(
        executable,
        [
          `--defaults-extra-file=${file}`,
          "--binary-mode",
          "--batch",
          `--database=${config.database}`,
        ],
        sql,
      ),
    );
    const counts = await verifyTables(c);
    console.log(
      "Restauración verificada: diez tablas. Filas:",
      JSON.stringify(counts),
    );
  } finally {
    await c.end();
  }
}
main().catch((error) => {
  console.error(
    error.code
      ? `No se pudo restaurar el respaldo (${error.code}).`
      : error.message,
  );
  process.exitCode = 1;
});

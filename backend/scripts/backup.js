import { resolve } from "node:path";
import { open, unlink } from "node:fs/promises";
import {
  settings,
  connection,
  verifyTables,
  expectedSchema,
  assertClient,
  withDefaults,
  runClient,
  dataStatements,
  encodeBackup,
  tables,
} from "./backup-common.js";

async function main() {
  const [destination, ...extra] = process.argv.slice(2);
  if (
    !destination ||
    extra.length ||
    !destination.toLowerCase().endsWith(".sql")
  )
    throw new Error(
      "Uso: npm run db:backup -- ruta/novaobra.sql (archivo nuevo). ",
    );
  const config = settings(),
    executable = process.env.MYSQLDUMP_PATH || "mysqldump";
  await assertClient(executable);
  const c = await connection(config);
  try {
    const [[version]] = await c.query("SELECT VERSION() version");
    if (!/^8\./.test(version.version))
      throw new Error("Se requiere un servidor MySQL 8.");
    await verifyTables(c);
  } finally {
    await c.end();
  }
  const schema = await expectedSchema();
  const dump = await withDefaults(config, (file) =>
    runClient(executable, [
      `--defaults-extra-file=${file}`,
      "--single-transaction",
      "--quick",
      "--skip-lock-tables",
      "--no-tablespaces",
      "--set-gtid-purged=OFF",
      "--column-statistics=0",
      "--no-create-info",
      "--skip-triggers",
      "--compact",
      "--skip-add-locks",
      "--skip-disable-keys",
      "--complete-insert",
      "--skip-extended-insert",
      "--hex-blob",
      "--default-character-set=utf8mb4",
      config.database,
    ]),
  );
  const metadata = await connection(config);
  let counters;
  try {
    const [rows] = await metadata.query(
      "SELECT TABLE_NAME name, AUTO_INCREMENT next FROM information_schema.tables WHERE table_schema=?",
      [config.database],
    );
    counters = tables.map((table) =>
      Number(rows.find((row) => row.name === table)?.next || 1),
    );
  } finally {
    await metadata.end();
  }
  const sql = encodeBackup(schema, dataStatements(dump, schema), counters);
  let file;
  try {
    file = await open(resolve(destination), "wx", 0o600);
    await file.writeFile(sql);
  } catch (error) {
    if (file) {
      await file.close().catch(() => {});
      file = null;
      await unlink(resolve(destination)).catch(() => {});
    }
    if (error.code === "EEXIST")
      throw new Error(
        "El archivo de destino ya existe; el respaldo no lo sobrescribió.",
      );
    throw error;
  } finally {
    if (file) await file.close();
  }
  console.log(
    "Respaldo SQL creado y validado: diez tablas, sin credenciales. Conserve el archivo en un lugar privado.",
  );
}
main().catch((error) => {
  console.error(
    error.code
      ? `No se pudo crear el respaldo (${error.code}).`
      : error.message,
  );
  process.exitCode = 1;
});

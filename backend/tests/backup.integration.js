// MySQL 8 and official mysql/mysqldump clients are required. No production data is changed.
import "dotenv/config";
import test from "node:test";
import assert from "node:assert/strict";
import mysql from "mysql2/promise";
import { spawn } from "node:child_process";
import {
  readFile,
  writeFile,
  mkdtemp,
  rm,
  readdir,
  stat,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  tables,
  expectedSchema,
  encodeBackup,
} from "../scripts/backup-common.js";

function run(script, file, database, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, file], {
      cwd: new URL("../", import.meta.url),
      env: { ...process.env, ...env, DB_NAME: database },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "",
      stderr = "";
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}
const primary = {
  categorias: "id_categoria",
  proveedores: "id_proveedor",
  clientes: "id_cliente",
  empleados: "id_empleado",
  productos: "id_producto",
  compras: "id_compra",
  ventas: "id_venta",
  detalle_compras: "id_detalle_compra",
  detalle_ventas: "id_detalle_venta",
  movimientos_inventario: "id_movimiento",
};

test(
  "respaldo/restauración real: diez tablas, textos, protección de datos y rollback",
  { timeout: 60000 },
  async () => {
    const config = {
      host: process.env.DB_HOST || "127.0.0.1",
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || "novaobra",
      password: process.env.DB_PASSWORD || "",
      multipleStatements: true,
      dateStrings: true,
    };
    const c = await mysql.createConnection(config);
    const suffix = Date.now(),
      source = `novaobra_test_backup_${suffix}`,
      target = `novaobra_test_restore_${suffix}`,
      failure = `novaobra_test_restore_fail_${suffix}`,
      wrongSchema = `novaobra_test_restore_wrong_${suffix}`,
      emptySchema = `novaobra_test_restore_empty_${suffix}`;
    const directory = await mkdtemp(join(tmpdir(), "novaobra-backup-test-")),
      file = join(directory, "backup.sql");
    const beforeTemp = (await readdir(tmpdir())).filter((name) =>
      name.startsWith("novaobra-mysql-"),
    );
    const childEnv = {
      DB_HOST: config.host,
      DB_PORT: String(config.port),
      DB_USER: config.user,
      DB_PASSWORD: config.password,
    };
    try {
      const [[version]] = await c.query("SELECT VERSION() version");
      assert.match(version.version, /^8\./);
      await c.query(
        (
          await readFile(
            new URL("../../database/schema.sql", import.meta.url),
            "utf8",
          )
        ).replaceAll("novaobra_db", source),
      );
      await c.query(
        (
          await readFile(
            new URL("../../database/seed.sql", import.meta.url),
            "utf8",
          )
        ).replaceAll("novaobra_db", source),
      );
      const special = "Árbol 'café';\n=SUM(1,2) -- fin /*texto*/ \\ ruta";
      await c.query(
        "INSERT INTO clientes (nombre,telefono,correo,direccion) VALUES (?,?,?,?)",
        [
          special,
          "+506 8888",
          "backup@example.com",
          "Primera\nlínea; 'segunda' \\ fin",
        ],
      );
      await c.query(
        "INSERT INTO categorias (nombre,descripcion) VALUES (?,?)",
        ["=SUM(1;2)", special],
      );
      await c.query(
        "INSERT INTO categorias (id_categoria,nombre) VALUES (100,'Borrada antes del respaldo')",
      );
      await c.query("DELETE FROM categorias WHERE id_categoria=100");
      const [originalCounters] = await c.query(
        "SELECT TABLE_NAME name,AUTO_INCREMENT next FROM information_schema.tables WHERE table_schema=? ORDER BY TABLE_NAME",
        [source],
      );
      const original = {};
      for (const name of tables)
        original[name] = (
          await c.query("SELECT * FROM ?? ORDER BY ??", [name, primary[name]])
        )[0];
      const result = await run("scripts/backup.js", file, source, childEnv);
      assert.equal(result.code, 0, result.stderr);
      const backup = await readFile(file, "utf8");
      assert.ok(
        !config.password || !backup.includes(config.password),
        "El respaldo nunca debe contener la contraseña de conexión.",
      );
      assert.ok(
        !config.password ||
          !(result.stdout + result.stderr).includes(config.password),
        "No deben imprimirse credenciales.",
      );
      if (process.platform !== "win32")
        assert.equal((await stat(file)).mode & 0o777, 0o600);
      const overwrite = await run("scripts/backup.js", file, source, childEnv);
      assert.equal(overwrite.code, 1);
      assert.match(overwrite.stderr, /ya existe/);
      assert.equal(await readFile(file, "utf8"), backup);
      const restored = await run("scripts/restore.js", file, target, childEnv);
      assert.equal(restored.code, 0, restored.stderr);
      await c.query("USE ??", [target]);
      assert.equal((await c.query("SHOW TABLES"))[0].length, 10);
      for (const name of tables)
        assert.deepEqual(
          (
            await c.query("SELECT * FROM ?? ORDER BY ??", [name, primary[name]])
          )[0],
          original[name],
          name,
        );
      const [restoredCounters] = await c.query(
        "SELECT TABLE_NAME name,AUTO_INCREMENT next FROM information_schema.tables WHERE table_schema=? ORDER BY TABLE_NAME",
        [target],
      );
      assert.deepEqual(
        restoredCounters,
        originalCounters,
        "Los contadores deben conservar huecos de IDs ya eliminados.",
      );
      const [[p]] = await c.query(
        "SELECT stock FROM productos WHERE id_producto=1",
      );
      assert.equal(p.stock, 18);
      const [[fks]] = await c.query(
        "SELECT COUNT(*) n FROM information_schema.referential_constraints WHERE constraint_schema=?",
        [target],
      );
      assert.equal(fks.n, 10);
      const preserve = await run("scripts/restore.js", file, target, childEnv);
      assert.equal(preserve.code, 1);
      assert.match(preserve.stderr, /destino contiene tablas o vistas/);
      assert.deepEqual(
        (await c.query("SELECT * FROM clientes ORDER BY id_cliente"))[0],
        original.clientes,
      );
      // Existing empty tables are unsafe too: IF NOT EXISTS would preserve an
      // incompatible structure, and existing triggers could execute on INSERT.
      await c.query("CREATE DATABASE ??", [wrongSchema]);
      await c.query(
        "CREATE TABLE ??.categorias (id_categoria INT PRIMARY KEY) ENGINE=InnoDB",
        [wrongSchema],
      );
      const incompatible = await run(
        "scripts/restore.js",
        file,
        wrongSchema,
        childEnv,
      );
      assert.equal(incompatible.code, 1);
      assert.match(incompatible.stderr, /destino contiene tablas o vistas/);
      const [wrongTables] = await c.query("SHOW TABLES FROM ??", [wrongSchema]);
      assert.equal(
        wrongTables.length,
        1,
        "No deben crearse otras tablas en el esquema incompatible.",
      );
      const [wrongColumns] = await c.query("SHOW COLUMNS FROM ??.categorias", [
        wrongSchema,
      ]);
      assert.equal(wrongColumns.length, 1);
      await c.query(
        (
          await readFile(
            new URL("../../database/schema.sql", import.meta.url),
            "utf8",
          )
        ).replaceAll("novaobra_db", emptySchema),
      );
      await c.query(
        "CREATE TRIGGER ??.no_activar AFTER INSERT ON ??.categorias FOR EACH ROW INSERT INTO ??.clientes (nombre) VALUES ('TRIGGER NO EJECUTAR')",
        [emptySchema, emptySchema, source],
      );
      const withTrigger = await run(
        "scripts/restore.js",
        file,
        emptySchema,
        childEnv,
      );
      assert.equal(withTrigger.code, 1);
      assert.match(withTrigger.stderr, /destino contiene tablas o vistas/);
      const [[stillEmpty]] = await c.query(
        "SELECT COUNT(*) n FROM ??.categorias",
        [emptySchema],
      );
      assert.equal(stillEmpty.n, 0);
      const [triggers] = await c.query("SHOW TRIGGERS FROM ??", [emptySchema]);
      assert.equal(
        triggers.length,
        1,
        "La restauración rechazada no debe modificar triggers existentes.",
      );
      assert.deepEqual(
        (
          await c.query("SELECT * FROM ??.clientes ORDER BY id_cliente", [
            source,
          ])
        )[0],
        original.clientes,
        "El trigger existente nunca debe ejecutarse.",
      );
      const schema = await expectedSchema();
      const attack = join(directory, "attack.sql");
      await writeFile(
        attack,
        encodeBackup(schema, [
          "INSERT INTO `clientes` (`id_cliente`,`nombre`) VALUES (900,'válido');",
          "DROP DATABASE otra;",
        ]),
      );
      const attacked = await run(
        "scripts/restore.js",
        attack,
        failure,
        childEnv,
      );
      assert.equal(attacked.code, 1);
      const [[absent]] = await c.query(
        "SELECT COUNT(*) n FROM information_schema.schemata WHERE schema_name=?",
        [failure],
      );
      assert.equal(absent.n, 0);
      const invalid = join(directory, "rollback.sql");
      await writeFile(
        invalid,
        encodeBackup(schema, [
          "INSERT INTO `categorias` (`id_categoria`,`nombre`,`estado`) VALUES (1,'Primera','activo');",
          "INSERT INTO `productos` (`id_producto`,`id_categoria`,`codigo`,`nombre`,`precio_compra`,`precio_venta`,`stock_minimo`,`stock`,`estado`) VALUES (1,999,'INVALID','No válido',1,2,0,0,'activo');",
        ]),
      );
      const rollback = await run(
        "scripts/restore.js",
        invalid,
        failure,
        childEnv,
      );
      assert.equal(rollback.code, 1);
      await c.query("USE ??", [failure]);
      const [[empty]] = await c.query("SELECT COUNT(*) n FROM categorias");
      assert.equal(
        empty.n,
        0,
        "El INSERT previo debe revertirse al fallar una relación.",
      );
      assert.deepEqual(
        (await readdir(tmpdir()))
          .filter((name) => name.startsWith("novaobra-mysql-"))
          .sort(),
        beforeTemp.sort(),
        "Los archivos de credenciales temporales deben eliminarse.",
      );
      console.log(
        "MySQL 8: respaldo y restauración exactos, diez tablas/FK, textos especiales, protección contra sobrescritura, SQL arbitrario y rollback verificados.",
      );
    } finally {
      for (const db of [wrongSchema, emptySchema, source, target, failure])
        await c.query("DROP DATABASE IF EXISTS ??", [db]);
      await c.end();
      await rm(directory, { recursive: true, force: true });
    }
  },
);

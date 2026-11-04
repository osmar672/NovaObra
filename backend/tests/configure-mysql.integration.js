// Opt-in: NOVAOBRA_TEST_ADMIN_FILE points to a private JSON {user,password}.
// Credentials stay in this process. Only generated fixture databases/accounts
// are removed; the application's real .env and database are never modified.
import test from "node:test";
import assert from "node:assert/strict";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import { randomBytes } from "node:crypto";
import {
  appendFile,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { configureMysql } from "../scripts/configure-mysql.js";
import { runMigrations } from "../migrations/index.js";

const adminFile = process.env.NOVAOBRA_TEST_ADMIN_FILE;

test(
  "Asistente MySQL: configura cuentas locales sin alterar credenciales ni datos anteriores",
  {
    skip: adminFile
      ? false
      : "Define NOVAOBRA_TEST_ADMIN_FILE con la ruta de credenciales privadas para MySQL 8.",
    timeout: 60000,
  },
  async (t) => {
    const admin = JSON.parse(await readFile(adminFile, "utf8"));
    const server = {
      host: admin.host || "127.0.0.1",
      port: admin.port || 3306,
    };
    const controller = await mysql.createConnection({
      ...server,
      user: admin.user,
      password: admin.password,
      multipleStatements: true,
    });
    const suffix = randomBytes(7).toString("hex");
    const prefix = `NovaObra_config_test_${suffix}`;
    const directory = await mkdtemp(
      join(tmpdir(), "novaobra-mysql-integration-"),
    );
    const databases = [],
      users = [];

    async function fixture(label, { existing = true } = {}) {
      const database = `${prefix}_${label}`;
      databases.push(database);
      if (existing) await controller.query("CREATE DATABASE ??", [database]);
      const examplePath = join(directory, `${label}.example`),
        envPath = join(directory, `${label}.env`);
      const text = `# local fixture\nHOST=127.0.0.1\nPORT=3001\nDB_HOST=${server.host}\nDB_PORT=${server.port}\nDB_NAME=${database}\nDB_USER=root\nDB_PASSWORD=obsolete-fixture-password\nCUSTOM='preserve this setting'\n`;
      await writeFile(examplePath, text);
      await writeFile(envPath, text);
      return { database, envPath, examplePath, text };
    }

    async function dedicatedUsers() {
      const [rows] = await controller.query(
        "SELECT User AS user, Host AS host FROM mysql.user WHERE LEFT(User, 12)='novaobra_app' ORDER BY User, Host",
      );
      return rows;
    }

    try {
      await t.test(
        "Contraseña administrativa incorrecta conserva .env y registros",
        async () => {
          const f = await fixture("denied");
          await controller.query(
            "CREATE TABLE ??.canary (id INT PRIMARY KEY)",
            [f.database],
          );
          await controller.query("INSERT INTO ??.canary VALUES (42)", [
            f.database,
          ]);
          const before = await dedicatedUsers();
          await assert.rejects(
            configureMysql({
              ...f,
              admin: {
                user: admin.user,
                password: randomBytes(30).toString("hex"),
              },
            }),
            { code: "ADMIN_ACCESS_DENIED" },
          );
          assert.equal(await readFile(f.envPath, "utf8"), f.text);
          const [[{ id }]] = await controller.query(
            "SELECT id FROM ??.canary",
            [f.database],
          );
          assert.equal(id, 42);
          assert.deepEqual(await dedicatedUsers(), before);
        },
      );

      await t.test(
        "Base ajena es rechazada antes de crear tablas o cuentas",
        async () => {
          const f = await fixture("foreign");
          await controller.query(
            "CREATE TABLE ??.canary (id INT PRIMARY KEY)",
            [f.database],
          );
          await controller.query("INSERT INTO ??.canary VALUES (91)", [
            f.database,
          ]);
          const before = await dedicatedUsers();
          await assert.rejects(configureMysql({ ...f, admin }), {
            code: "FOREIGN_OBJECTS",
          });
          assert.equal(await readFile(f.envPath, "utf8"), f.text);
          const [tables] = await controller.query("SHOW TABLES FROM ??", [
            f.database,
          ]);
          assert.equal(tables.length, 1);
          const [[{ id }]] = await controller.query(
            "SELECT id FROM ??.canary",
            [f.database],
          );
          assert.equal(id, 91);
          assert.deepEqual(await dedicatedUsers(), before);
        },
      );

      await t.test(
        "Crea base, diez tablas y semilla; cuenta limitada, .env privado y repetición sin cuentas extra",
        async () => {
          const f = await fixture("success", { existing: false });
          const progress = [];
          const result = await configureMysql({
            ...f,
            admin,
            onProgress: (message) => progress.push(message),
          });
          const text = await readFile(f.envPath, "utf8"),
            values = dotenv.parse(text);
          users.push({ user: result.user, host: "localhost" });
          const [accountRows] = await controller.query(
            "SELECT Host AS host FROM mysql.user WHERE User=?",
            [result.user],
          );
          users[users.length - 1].host = accountRows[0].host;
          assert.equal(result.reused, false);
          assert.equal(result.seeded, true);
          assert.equal(result.tables, 10);
          assert.match(result.user, /^novaobra_app_[a-f0-9]{12}$/);
          assert.notEqual(values.DB_USER, "root");
          assert.ok(values.DB_PASSWORD.length >= 40);
          assert.ok(text.includes("CUSTOM='preserve this setting'"));
          assert.ok(text.startsWith("# local fixture\n"));
          assert.equal(
            Boolean(admin.password && text.includes(admin.password)),
            false,
            "El .env no debe contener la contraseña administrativa.",
          );
          assert.equal(
            Boolean(
              admin.password && progress.join("\n").includes(admin.password),
            ),
            false,
          );
          if (process.platform !== "win32")
            assert.equal((await stat(f.envPath)).mode & 0o777, 0o600);
          const app = await mysql.createConnection({
            ...server,
            user: values.DB_USER,
            password: values.DB_PASSWORD,
            database: f.database,
            multipleStatements: true,
          });
          try {
            const [tables] = await app.query("SHOW TABLES");
            assert.equal(tables.length, 10);
            const [[{ products }]] = await app.query(
              "SELECT COUNT(*) AS products FROM productos",
            );
            assert.equal(products, 4);
            await assert.rejects(app.query("SELECT User FROM mysql.user"));
            await assert.rejects(
              app.query("CREATE DATABASE ??", [`${prefix}_forbidden`]),
            );
            // DB names contain underscores. A similar name must not match GRANT's
            // wildcard syntax and accidentally receive application permissions.
            const similar = f.database.replace("_", "X");
            databases.push(similar);
            await controller.query("CREATE DATABASE ??", [similar]);
            await controller.query("CREATE TABLE ??.canary (id INT)", [
              similar,
            ]);
            await assert.rejects(
              app.query("SELECT * FROM ??.canary", [similar]),
            );
            const migration = await runMigrations(app, {
              database: f.database,
              seedIfEmpty: true,
            });
            assert.equal(migration.steps.includes("002_seed_data"), false);
            await app.query(
              "UPDATE productos SET nombre='Registro conservado' WHERE id_producto=1",
            );
          } finally {
            await app.end();
          }
          const before = await dedicatedUsers();
          const repeated = await configureMysql({
            ...f,
            admin: () => {
              throw new Error("No debe solicitar administrador otra vez.");
            },
          });
          assert.equal(repeated.reused, true);
          assert.equal(repeated.user, result.user);
          assert.equal(await readFile(f.envPath, "utf8"), text);
          assert.deepEqual(await dedicatedUsers(), before);
          const [[{ name }]] = await controller.query(
            "SELECT nombre AS name FROM ??.productos WHERE id_producto=1",
            [f.database],
          );
          assert.equal(name, "Registro conservado");
        },
      );

      await t.test(
        "Sin CREATE USER conserva .env y datos, sin degradar permisos",
        async () => {
          const f = await fixture("privileges");
          const limited = {
            user: `no_admin_${suffix}`,
            password: `T3st!${randomBytes(24).toString("hex")}`,
            host: "localhost",
          };
          await controller.query("CREATE USER ?@? IDENTIFIED BY ?", [
            limited.user,
            limited.host,
            limited.password,
          ]);
          users.push(limited);
          await controller.query("GRANT SELECT ON ??.* TO ?@?", [
            f.database.replace(/_/g, "\\_"),
            limited.user,
            limited.host,
          ]);
          const before = await dedicatedUsers();
          await assert.rejects(configureMysql({ ...f, admin: limited }), {
            code: "ADMIN_PRIVILEGES",
          });
          assert.equal(await readFile(f.envPath, "utf8"), f.text);
          assert.deepEqual(await dedicatedUsers(), before);
          const [tables] = await controller.query("SHOW TABLES FROM ??", [
            f.database,
          ]);
          assert.equal(tables.length, 0);
        },
      );

      await t.test(
        "Cambio concurrente conserva .env externo y retira solo la cuenta nueva",
        async () => {
          const f = await fixture("concurrent");
          const before = await dedicatedUsers();
          await assert.rejects(
            configureMysql({
              ...f,
              admin,
              onProgress: async (message) => {
                if (message.startsWith("Cuenta de aplicación verificada"))
                  await appendFile(f.envPath, "EXTERNAL_CHANGE=keep\n");
              },
            }),
            { code: "ENV_CHANGED" },
          );
          assert.equal(
            await readFile(f.envPath, "utf8"),
            f.text + "EXTERNAL_CHANGE=keep\n",
          );
          assert.deepEqual(await dedicatedUsers(), before);
          const [[{ count }]] = await controller.query(
            "SELECT COUNT(*) AS count FROM ??.productos",
            [f.database],
          );
          assert.equal(
            count,
            4,
            "El fallo de guardado no debe eliminar registros.",
          );
          assert.equal(
            (await readdir(directory)).some(
              (name) => name.includes(".tmp") || name.endsWith(".lock"),
            ),
            false,
          );
        },
      );
    } finally {
      for (const { user, host } of users)
        await controller.query("DROP USER IF EXISTS ?@?", [user, host]);
      for (const database of databases) {
        // Every database in this list was generated above, including the explicit
        // wildcard-check sibling. Never derive cleanup targets from application env.
        assert.ok(database.includes(suffix));
        await controller.query("DROP DATABASE IF EXISTS ??", [database]);
      }
      await controller.end();
      await rm(directory, { recursive: true, force: true });
    }
  },
);

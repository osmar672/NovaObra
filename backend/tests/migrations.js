// MySQL 8 integration test. DB_USER must be able to create/drop test schemas.
import test from "node:test";
import assert from "node:assert/strict";
import mysql from "mysql2/promise";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { databaseSettings } from "../src/config/settings.js";
import { runMigrations, seedData } from "../migrations/index.js";
import { assertMysqlVersion } from "../migrations/common.js";

test("versión mínima de MySQL: CHECK disponible y MariaDB rechazada", () => {
  for (const version of ["8.0.16", "8.0.45", "8.4.8", "9.0.1"])
    assert.doesNotThrow(() => assertMysqlVersion(version));
  for (const version of ["5.7.44", "8.0.15", "10.11.6-MariaDB", "desconocida"])
    assert.throws(() => assertMysqlVersion(version), /MySQL 8.0.16.*MariaDB/);
});

async function snapshot(connection, database) {
  const [tables] = await connection.query(
    "SELECT TABLE_NAME AS name FROM information_schema.tables WHERE table_schema=? ORDER BY TABLE_NAME",
    [database],
  );
  const data = {};
  for (const { name } of tables)
    data[name] = (
      await connection.query("SELECT * FROM ??.?? ORDER BY 1", [database, name])
    )[0];
  return data;
}

test(
  "pasos iniciales: diez tablas, semilla, reintentos y conservación de registros",
  { timeout: 60000 },
  async () => {
    const connection = await mysql.createConnection({
      ...databaseSettings(),
      database: undefined,
      multipleStatements: true,
      dateStrings: true,
    });
    const database = `novaobra_test_migrations_${randomUUID().replaceAll("-", "")}`;
    const foreignDatabase = database + "_other";
    try {
      const [[version]] = await connection.query("SELECT VERSION() AS version");
      assert.doesNotThrow(() => assertMysqlVersion(version.version));
      const initial = await runMigrations(connection, { database });
      assert.deepEqual(initial, {
        database,
        tables: 10,
        steps: ["001_create_schema"],
      });
      const empty = await snapshot(connection, database);
      assert.equal(Object.keys(empty).length, 10);
      assert.ok(Object.values(empty).every((rows) => rows.length === 0));

      // Even a record in a later seed table must prevent every seed INSERT.
      await connection.query("INSERT INTO ??.clientes (nombre) VALUES (?)", [
        database,
        "Cliente existente antes de sembrar",
      ]);
      const beforeSeed = await snapshot(connection, database);
      await assert.rejects(
        seedData(connection, { database }),
        /todas las tablas vacías.*no se modificaron los datos existentes/,
      );
      assert.deepEqual(await snapshot(connection, database), beforeSeed);
      await connection.query("DELETE FROM ??.clientes", [database]);

      // A failure after several seed INSERTs must roll the transaction back.
      await connection.query(
        "CREATE TRIGGER ??.reject_test_seed BEFORE INSERT ON ??.productos FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Fallo controlado de semilla'",
        [database, database],
      );
      await assert.rejects(
        seedData(connection, { database }),
        /Fallo controlado de semilla/,
      );
      assert.deepEqual(await snapshot(connection, database), empty);
      await connection.query("DROP TRIGGER ??.reject_test_seed", [database]);

      const seeded = await runMigrations(connection, { database, seed: true });
      assert.deepEqual(seeded.steps, ["001_create_schema", "002_seed_data"]);
      const [[product]] = await connection.query(
        "SELECT stock FROM ??.productos WHERE id_producto=1",
        [database],
      );
      assert.equal(product.stock, 18);
      const [[totals]] = await connection.query(
        "SELECT (SELECT total FROM ??.compras WHERE id_compra=1) AS compra, (SELECT total FROM ??.ventas WHERE id_venta=1) AS venta",
        [database, database],
      );
      assert.equal(totals.compra, "50000.00");
      assert.equal(totals.venta, "8000.00");
      const [[foreignKeys]] = await connection.query(
        "SELECT COUNT(*) AS n FROM information_schema.referential_constraints WHERE constraint_schema=?",
        [database],
      );
      assert.equal(foreignKeys.n, 10);

      await connection.query(
        "INSERT INTO ??.clientes (nombre,direccion) VALUES (?,?)",
        [
          database,
          "Cliente real de prueba",
          "Dirección conservada, áéñ 'texto'",
        ],
      );
      const populated = await snapshot(connection, database);
      await runMigrations(connection, { database });
      assert.deepEqual(await snapshot(connection, database), populated);
      await assert.rejects(
        runMigrations(connection, { database, seed: true }),
        /todas las tablas vacías.*no se modificaron los datos existentes/,
      );
      assert.deepEqual(await snapshot(connection, database), populated);

      const skipped = await runMigrations(connection, {
        database,
        seedIfEmpty: true,
      });
      assert.deepEqual(skipped.steps, ["001_create_schema"]);
      assert.deepEqual(await snapshot(connection, database), populated);

      // The same custom DB_NAME is respected by the idempotent startup CLI.
      const cli = spawnSync(
        process.execPath,
        ["scripts/database.js", "--seed-if-empty"],
        {
          cwd: new URL("../", import.meta.url),
          env: { ...process.env, DB_NAME: database },
          encoding: "utf8",
        },
      );
      assert.equal(cli.status, 0, cli.stderr);
      assert.match(cli.stdout, /Se conservaron los datos existentes/);
      assert.ok(cli.stdout.includes(`${database} preparada: 10 tablas.`));
      assert.deepEqual(await snapshot(connection, database), populated);

      await connection.query("CREATE DATABASE ??", [foreignDatabase]);
      await connection.query(
        "CREATE TABLE ??.datos_propios (id INT PRIMARY KEY)",
        [foreignDatabase],
      );
      await connection.query("INSERT INTO ??.datos_propios VALUES (42)", [
        foreignDatabase,
      ]);
      await assert.rejects(
        runMigrations(connection, { database: foreignDatabase, seedIfEmpty: true }),
        /objetos ajenos/,
      );
      const [foreignTables] = await connection.query("SHOW TABLES FROM ??", [
        foreignDatabase,
      ]);
      assert.equal(foreignTables.length, 1);
      const [[foreignRecord]] = await connection.query(
        "SELECT id FROM ??.datos_propios",
        [foreignDatabase],
      );
      assert.equal(foreignRecord.id, 42);
      await connection.query("DROP TABLE ??.datos_propios", [foreignDatabase]);
      await connection.query(
        "CREATE VIEW ??.categorias AS SELECT 42 AS id_categoria",
        [foreignDatabase],
      );
      await assert.rejects(
        runMigrations(connection, { database: foreignDatabase }),
        /objetos ajenos/,
      );
      const [foreignViews] = await connection.query("SHOW FULL TABLES FROM ??", [
        foreignDatabase,
      ]);
      assert.equal(foreignViews.length, 1);
      assert.equal(Object.values(foreignViews[0])[1], "VIEW");
      await assert.rejects(
        runMigrations(connection, { database: "nombre; DROP DATABASE otra" }),
        /nombre de la base de datos no es válido/,
      );
    } finally {
      await connection.query("DROP DATABASE IF EXISTS ??", [foreignDatabase]);
      await connection.query("DROP DATABASE IF EXISTS ??", [database]);
      await connection.end();
    }
  },
);

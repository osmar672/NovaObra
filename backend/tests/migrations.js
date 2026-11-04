// MySQL 8 integration test. DB_USER must be able to create/drop test schemas.
import "dotenv/config";
import test from "node:test";
import assert from "node:assert/strict";
import mysql from "mysql2/promise";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { runMigrations, seedData } from "../migrations/index.js";

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
      host: process.env.DB_HOST || "127.0.0.1",
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || "novaobra",
      password: process.env.DB_PASSWORD || "",
      multipleStatements: true,
      dateStrings: true,
    });
    const database = `novaobra_test_migrations_${randomUUID().replaceAll("-", "")}`;
    try {
      const [[version]] = await connection.query("SELECT VERSION() AS version");
      assert.match(version.version, /^8\./);
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

      // The injectable library configuration never broadens the production CLI.
      const cli = spawnSync(
        process.execPath,
        ["scripts/database.js", "--seed"],
        {
          cwd: new URL("../", import.meta.url),
          env: { ...process.env, DB_NAME: database },
          encoding: "utf8",
        },
      );
      assert.equal(cli.status, 1);
      assert.match(cli.stderr, /prepara únicamente novaobra_db/);
      assert.deepEqual(await snapshot(connection, database), populated);
      await assert.rejects(
        runMigrations(connection, { database: "nombre; DROP DATABASE otra" }),
        /nombre de la base de datos no es válido/,
      );
    } finally {
      await connection.query("DROP DATABASE IF EXISTS ??", [database]);
      await connection.end();
    }
  },
);

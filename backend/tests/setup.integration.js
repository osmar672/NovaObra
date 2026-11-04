// Solo crea y elimina bases temporales con nombres generados para esta prueba.
import test from "node:test";
import assert from "node:assert/strict";
import mysql from "mysql2/promise";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { databaseSettings } from "../src/config/settings.js";

function setup(database, ...args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["scripts/database.js", ...args], {
      cwd: new URL("../", import.meta.url),
      env: { ...process.env, DB_NAME: database },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    for (const stream of [child.stdout, child.stderr])
      stream.on("data", (chunk) => { output += chunk; });
    child.once("error", reject);
    child.once("close", (code) => resolve({ code, output }));
  });
}

test("Instalador: respeta DB_NAME, conserva datos al reiniciar y rechaza bases ajenas", { timeout: 30000 }, async () => {
  const c = await mysql.createConnection({ ...databaseSettings(), database: undefined });
  const db = "NovaObra_test_setup_" + randomUUID().replaceAll("-", "");
  const other = db + "_x";
  try {
    const first = await setup(db, "--seed-if-empty");
    assert.equal(first.code, 0, first.output);
    assert.match(first.output, /Datos iniciales cargados/);
    await c.query("USE ??", [db]);
    const [tables] = await c.query("SHOW TABLES");
    assert.equal(tables.length, 10);
    const [[{ database }]] = await c.query("SELECT DATABASE() AS `database`");
    // MySQL en Windows puede normalizar los nombres a minúsculas.
    assert.equal(database.toLowerCase(), db.toLowerCase());
    await c.query("UPDATE productos SET nombre='Nombre conservado' WHERE id_producto=1");
    const [[original]] = await c.query("SELECT stock FROM productos WHERE id_producto=1");
    const [[before]] = await c.query("SELECT COUNT(*) n FROM movimientos_inventario");

    const again = await setup(db, "--seed-if-empty");
    assert.equal(again.code, 0, again.output);
    assert.match(again.output, /Se conservaron los datos existentes/);
    const [[product]] = await c.query("SELECT nombre, stock FROM productos WHERE id_producto=1");
    assert.deepEqual(product, { nombre: "Nombre conservado", stock: original.stock });
    const [[after]] = await c.query("SELECT COUNT(*) n FROM movimientos_inventario");
    assert.equal(after.n, before.n, "Reiniciar no debe duplicar movimientos ni stock.");
    const forced = await setup(db, "--seed");
    assert.equal(forced.code, 1);
    assert.match(forced.output, /tablas vacías/);

    await c.query("CREATE DATABASE ??", [other]);
    await c.query("CREATE TABLE ??.datos_propios (id INT PRIMARY KEY)", [other]);
    await c.query("INSERT INTO ??.datos_propios VALUES (42)", [other]);
    const foreign = await setup(other, "--seed-if-empty");
    assert.equal(foreign.code, 1);
    assert.match(foreign.output, /objetos ajenos/);
    const [objects] = await c.query("SHOW TABLES FROM ??", [other]);
    assert.equal(objects.length, 1, "No debe crear tablas NovaObra en una base ajena.");
    const [[kept]] = await c.query("SELECT id FROM ??.datos_propios", [other]);
    assert.equal(kept.id, 42);
    const invalid = await setup(db + ";DROP", "--seed-if-empty");
    assert.equal(invalid.code, 1);
    assert.match(invalid.output, /DB_NAME/);
    const [[unchanged]] = await c.query("SELECT COUNT(*) n FROM ??.productos", [db]);
    assert.equal(unchanged.n, 4);
  } finally {
    await c.query("DROP DATABASE IF EXISTS ??", [db]);
    await c.query("DROP DATABASE IF EXISTS ??", [other]);
    await c.end();
  }
});

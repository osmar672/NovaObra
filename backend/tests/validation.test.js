import test from "node:test";
import assert from "node:assert/strict";
import { id, quantity, money, record } from "../src/validators/input.js";
import { line, draft } from "../src/services/trade.js";
import { pool } from "../src/config/db.js";
import { app } from "../src/app.js";
test("identificadores y cantidades rechazan negativos, fracciones y desbordamientos", () => {
  for (const v of [0, -1, "x", 1.5, Infinity, 4294967296, true, [1]])
    assert.throws(() => id(v));
  assert.equal(id("12"), 12);
  for (const v of [-1, 1.2, "2", Infinity, 1000001])
    assert.throws(() => quantity(v));
  assert.equal(quantity(0), 0);
  assert.throws(() => quantity(0, true));
});
test("importes válidos y rechazo de decimales ambiguos", () => {
  for (const v of [
    -1,
    NaN,
    Infinity,
    "2",
    2.001,
    12.340001,
    0.000001,
    1.0000000000000002,
    9999999999.991,
  ])
    assert.throws(() => money(v));
  for (const value of [0, 0.01, 0.29, 1.1, 12.34, 100, 9999999999.99])
    assert.equal(money(value), value);
});
test("registros rechazan campos extra, vacíos, correos y fechas inválidas", () => {
  const fields = {
    nombre: "text",
    correo: "email",
    fecha_ingreso: "date",
    estado: "active",
  };
  const valid = {
    nombre: "Ana",
    correo: "ana@example.com",
    fecha_ingreso: "2026-01-01",
  };
  assert.equal(record(valid, fields).estado, "activo");
  for (const body of [
    { ...valid, stock: 4 },
    { ...valid, nombre: " " },
    { ...valid, correo: "bad" },
    { ...valid, fecha_ingreso: "2026-02-30" },
    { ...valid, estado: "otro" },
  ])
    assert.throws(() => record(body, fields));
});
test("detalles y estados protegen las operaciones confirmadas", () => {
  assert.deepEqual(
    line({ id_producto: 1, cantidad: 2, precio_unitario: 3.5 }, "ventas"),
    { id_producto: 1, cantidad: 2, precio_unitario: 3.5 },
  );
  assert.throws(() =>
    line({ id_producto: 1, cantidad: 0, precio_unitario: 1 }, "ventas"),
  );
  assert.throws(() => draft({ estado: "confirmada" }), { status: 409 });
  draft({ estado: "borrador" });
});
test("HTTP devuelve JSON y valida antes de consultar MySQL", async () => {
  const server = app.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  const url = `http://127.0.0.1:${server.address().port}/api`;
  try {
    let r = await fetch(url + "/no-existe");
    assert.equal(r.status, 404);
    assert.equal((await r.json()).error, "Ruta inexistente.");
    r = await fetch(url + "/productos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stock: -1 }),
    });
    assert.equal(r.status, 400);
    r = await fetch(url + "/productos/no-valido");
    assert.equal(r.status, 400);
    r = await fetch(url + "/productos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{",
    });
    assert.equal(r.status, 400);
    r = await fetch(url + "/metadata");
    assert.equal(r.status, 200);
    assert.equal(Object.keys(await r.json()).length, 5);
  } finally {
    await new Promise((r) => server.close(r));
    await pool.end();
  }
});

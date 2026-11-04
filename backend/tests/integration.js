// Creates and removes ONLY an isolated, randomly named test database.
import "dotenv/config";
import test from "node:test";
import assert from "node:assert/strict";
import mysql from "mysql2/promise";
import { readFile } from "node:fs/promises";
test("API completa e inventario contra MySQL real", async (t) => {
  const db = "novaobra_test_" + Date.now();
  const admin = await mysql.createConnection({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "novaobra",
    password: process.env.DB_PASSWORD || "",
    multipleStatements: true,
  });
  let server, pool;
  try {
    const [[version]] = await admin.query("SELECT VERSION() version");
    assert.match(version.version, /^8\./, "Se requiere MySQL 8 real.");
    const schema = (
      await readFile(
        new URL("../../database/schema.sql", import.meta.url),
        "utf8",
      )
    ).replaceAll("novaobra_db", db);
    await admin.query(schema);
    process.env.DB_NAME = db;
    ({ pool } = await import("../src/config/db.js"));
    const { app } = await import("../src/app.js");
    server = app.listen(0, "127.0.0.1");
    await new Promise((r) => server.once("listening", r));
    const base = `http://127.0.0.1:${server.address().port}/api`;
    async function call(path, method = "GET", body, status = 200) {
      const r = await fetch(base + "/" + path, {
        method,
        headers: { "Content-Type": "application/json" },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const d = r.status === 204 ? null : await r.json();
      assert.equal(r.status, status, JSON.stringify(d));
      return d;
    }
    const [[count]] = await admin.query(
      "SELECT COUNT(*) n FROM information_schema.tables WHERE table_schema=?",
      [db],
    );
    assert.equal(count.n, 10);
    const [fks] = await admin.query(
      "SELECT * FROM information_schema.referential_constraints WHERE constraint_schema=?",
      [db],
    );
    assert.equal(fks.length, 10);
    const c = await call(
      "categorias",
      "POST",
      { nombre: "Pruebas", descripcion: "Integración" },
      201,
    );
    const provider = await call(
      "proveedores",
      "POST",
      { nombre: "Proveedor" },
      201,
    );
    const client = await call("clientes", "POST", { nombre: "Cliente" }, 201);
    const employee = await call(
      "empleados",
      "POST",
      {
        nombre: "Ana",
        apellido: "Mora",
        puesto: "Ventas",
        fecha_ingreso: "2026-01-01",
      },
      201,
    );
    const body = {
      id_categoria: c.id_categoria,
      codigo: "TEST-1",
      nombre: "Martillo",
      precio_compra: 2,
      precio_venta: 3,
      stock_minimo: 2,
    };
    await assert.rejects(
      () =>
        admin.query(
          "INSERT INTO productos (id_categoria,codigo,nombre,precio_compra,precio_venta,stock_minimo) VALUES (?, ?, ?, -1, 2, 0)",
          [c.id_categoria, "NEGATIVE", "Inválido"],
        ),
      { code: "ER_CHECK_CONSTRAINT_VIOLATED" },
    );
    const p = await call("productos", "POST", body, 201);
    const p2 = await call(
      "productos",
      "POST",
      { ...body, codigo: "TEST-2" },
      201,
    );
    await t.test(
      "API rechaza precios con precisión extra sin guardar ni alterar registros",
      async () => {
        const before = (await call("productos")).length;
        for (const value of [12.340001, 0.000001, 1.0000000000000002]) {
          await call(
            "productos",
            "POST",
            { ...body, codigo: "PRECISION", precio_compra: value },
            400,
          );
          await call(
            "productos/" + p.id_producto,
            "PUT",
            { ...body, precio_venta: value },
            400,
          );
          await call(
            "compras",
            "POST",
            {
              id_proveedor: provider.id_proveedor,
              id_empleado: employee.id_empleado,
              detalles: [
                {
                  id_producto: p.id_producto,
                  cantidad: 1,
                  costo_unitario: value,
                },
              ],
            },
            400,
          );
          await call(
            "ventas",
            "POST",
            {
              id_cliente: client.id_cliente,
              id_empleado: employee.id_empleado,
              detalles: [
                {
                  id_producto: p.id_producto,
                  cantidad: 1,
                  precio_unitario: value,
                },
              ],
            },
            400,
          );
        }
        assert.equal((await call("productos")).length, before);
        assert.equal(
          (await call("productos/" + p.id_producto)).precio_venta,
          3,
        );
        assert.equal((await call("compras")).length, 0);
        assert.equal((await call("ventas")).length, 0);
      },
    );
    await call("productos", "POST", body, 409);
    await call(
      "productos",
      "POST",
      { ...body, codigo: "TEST-X", id_categoria: 999999 },
      409,
    );
    await call("productos/" + p.id_producto, "PUT", {
      ...body,
      nombre: "Martillo editado",
    });
    assert.equal(
      (await call("productos/" + p.id_producto)).nombre,
      "Martillo editado",
    );
    await call("productos/999999", "GET", null, 404);
    await call("categorias/" + c.id_categoria, "DELETE", null, 409);
    for (const table of [
      "categorias",
      "proveedores",
      "clientes",
      "empleados",
    ]) {
      const pk = {
        categorias: "id_categoria",
        proveedores: "id_proveedor",
        clientes: "id_cliente",
        empleados: "id_empleado",
      }[table];
      const source = {
        categorias: c,
        proveedores: provider,
        clientes: client,
        empleados: employee,
      }[table];
      const { entities } = await import("../src/models/entities.js");
      const value = Object.fromEntries(
        Object.keys(entities[table].fields).map((k) => [k, source[k]]),
      );
      await call(`${table}/${source[pk]}`, "PUT", value);
      await call(`${table}/${source[pk]}`);
      await call(`${table}/999999`, "GET", null, 404);
    }
    const buy = {
      id_proveedor: provider.id_proveedor,
      id_empleado: employee.id_empleado,
      clave_solicitud: "request-1",
      detalles: [
        { id_producto: p.id_producto, cantidad: 10, costo_unitario: 2 },
      ],
    };
    const purchase = await call("compras", "POST", buy, 201);
    await call("compras", "POST", buy, 409);
    await call("compras/" + purchase.id_compra, "PUT", buy);
    await call(`compras/${purchase.id_compra}/confirmar`, "POST");
    await call(`compras/${purchase.id_compra}/confirmar`, "POST");
    assert.equal((await call("productos/" + p.id_producto)).stock, 10);
    assert.equal((await call("movimientos_inventario")).length, 1);
    const sell = {
      id_cliente: client.id_cliente,
      id_empleado: employee.id_empleado,
      detalles: [
        { id_producto: p.id_producto, cantidad: 3, precio_unitario: 3 },
      ],
    };
    const sale = await call("ventas", "POST", sell, 201);
    await call(`ventas/${sale.id_venta}/confirmar`, "POST");
    assert.equal((await call("productos/" + p.id_producto)).stock, 7);
    const tooMuch = await call(
      "ventas",
      "POST",
      {
        ...sell,
        detalles: [
          { id_producto: p.id_producto, cantidad: 2, precio_unitario: 3 },
          { id_producto: p2.id_producto, cantidad: 1, precio_unitario: 3 },
        ],
      },
      201,
    );
    await call(`ventas/${tooMuch.id_venta}/confirmar`, "POST", null, 409);
    assert.equal((await call("productos/" + p.id_producto)).stock, 7);
    assert.equal((await call("ventas/" + tooMuch.id_venta)).estado, "borrador");
    assert.equal((await call("movimientos_inventario")).length, 2);
    await call(`compras/${purchase.id_compra}/cancelar`, "POST", null, 409);
    await call(`ventas/${sale.id_venta}/cancelar`, "POST");
    await call(`ventas/${sale.id_venta}/cancelar`, "POST");
    assert.equal((await call("productos/" + p.id_producto)).stock, 10);
    await call(`compras/${purchase.id_compra}/cancelar`, "POST");
    assert.equal((await call("productos/" + p.id_producto)).stock, 0);
    const d = await call("ventas/" + sale.id_venta);
    await call(
      `detalle_ventas/${d.detalles[0].id_detalle_venta}`,
      "DELETE",
      null,
      409,
    );
    const adjustment = {
      id_producto: p.id_producto,
      tipo_movimiento: "entrada",
      cantidad: 5,
      descripcion: "Ajuste físico",
      clave_solicitud: "ajuste-1",
    };
    await call("movimientos_inventario", "POST", adjustment, 201);
    await call("movimientos_inventario", "POST", adjustment, 409);
    assert.equal((await call("productos/" + p.id_producto)).stock, 5);
    // Concurrent sales: only one can consume the available stock.
    const a = await call(
      "ventas",
      "POST",
      {
        ...sell,
        detalles: [
          { id_producto: p.id_producto, cantidad: 4, precio_unitario: 3 },
        ],
      },
      201,
    );
    const b = await call(
      "ventas",
      "POST",
      {
        ...sell,
        detalles: [
          { id_producto: p.id_producto, cantidad: 4, precio_unitario: 3 },
        ],
      },
      201,
    );
    const replies = await Promise.all(
      [a, b].map((x) =>
        fetch(base + `/ventas/${x.id_venta}/confirmar`, { method: "POST" }),
      ),
    );
    assert.deepEqual(replies.map((r) => r.status).sort(), [200, 409]);
    assert.equal((await call("productos/" + p.id_producto)).stock, 1);
    // Standalone detail endpoints edit only drafts and recalculate totals.
    for (const k of ["compras", "ventas"]) {
      const pk = k === "compras" ? "id_compra" : "id_venta",
        dp = k === "compras" ? "id_detalle_compra" : "id_detalle_venta",
        price = k === "compras" ? "costo_unitario" : "precio_unitario";
      const header =
        k === "compras"
          ? {
              id_proveedor: provider.id_proveedor,
              id_empleado: employee.id_empleado,
              detalles: [],
            }
          : {
              id_cliente: client.id_cliente,
              id_empleado: employee.id_empleado,
              detalles: [],
            };
      const h = await call(k, "POST", header, 201),
        line = { id_producto: p.id_producto, cantidad: 2, [price]: 2 };
      const l = await call(
        "detalle_" + k,
        "POST",
        { ...line, [pk]: h[pk] },
        201,
      );
      await call(`detalle_${k}/${l[dp]}`);
      await call(`detalle_${k}/${l[dp]}`, "PUT", { ...line, cantidad: 3 });
      assert.equal((await call(k + "/" + h[pk])).total, 6);
      await call(`detalle_${k}/${l[dp]}`, "DELETE", null, 204);
      await call(k + "/" + h[pk], "DELETE", null, 204);
    }
    for (const kind of ["compras", "ventas"]) {
      await t.test(
        `Consulta de ${kind} coherente durante edición concurrente`,
        { timeout: 10000 },
        async () => {
          const pk = kind === "compras" ? "id_compra" : "id_venta";
          const price =
            kind === "compras" ? "costo_unitario" : "precio_unitario";
          const header =
            kind === "compras"
              ? {
                  id_proveedor: provider.id_proveedor,
                  id_empleado: employee.id_empleado,
                }
              : {
                  id_cliente: client.id_cliente,
                  id_empleado: employee.id_empleado,
                };
          const oldBody = {
            ...header,
            detalles: [
              { id_producto: p.id_producto, cantidad: 2, [price]: 3.5 },
            ],
          };
          const nextBody = {
            ...header,
            detalles: [
              { id_producto: p.id_producto, cantidad: 7, [price]: 4.25 },
            ],
          };
          const h = await call(kind, "POST", oldBody, 201);
          const path = kind + "/" + h[pk];
          let reached,
            release,
            captureTimeout,
            intercepted = false;
          const captured = new Promise((resolve, reject) => {
            reached = resolve;
            captureTimeout = setTimeout(
              () =>
                reject(new Error("No se interceptó la consulta comercial.")),
              5000,
            );
          });
          const resume = new Promise((resolve) => {
            release = resolve;
          });
          const originalQuery = pool.query;
          // Delay delivery of the real SELECT result, then commit an actual PUT.
          // This exposes a header/lines split deterministically without faking rows.
          pool.query = async function (sql, values, ...rest) {
            const result = await originalQuery.call(this, sql, values, ...rest);
            if (
              !intercepted &&
              typeof sql === "string" &&
              /^SELECT\b/.test(sql) &&
              sql.includes(`FROM ${kind}`) &&
              values?.[0] === h[pk]
            ) {
              intercepted = true;
              reached();
              await resume;
            }
            return result;
          };
          const pending = call(path);
          try {
            await captured;
            await call(path, "PUT", nextBody);
            release();
            const snapshot = await pending;
            assert.equal(
              snapshot.total,
              snapshot.detalles.reduce((sum, row) => sum + row.subtotal, 0),
            );
            assert.equal(snapshot.total, 7);
            assert.equal(snapshot.detalles[0].cantidad, 2);
          } finally {
            clearTimeout(captureTimeout);
            release();
            pool.query = originalQuery;
            await pending.catch(() => {});
          }
          const latest = await call(path);
          assert.equal(latest.total, 29.75);
          assert.equal(latest.detalles[0].cantidad, 7);
          await call(path, "DELETE", null, 204);
          await call(path, "GET", null, 404);
          const empty = await call(
            kind,
            "POST",
            { ...header, detalles: [] },
            201,
          );
          assert.deepEqual((await call(kind + "/" + empty[pk])).detalles, []);
          await call(kind + "/" + empty[pk], "DELETE", null, 204);
        },
      );
    }
    const movement = (await call("movimientos_inventario"))[0];
    await call("movimientos_inventario/" + movement.id_movimiento);
    await call(
      "movimientos_inventario/" + movement.id_movimiento,
      "PUT",
      {},
      409,
    );
    await call(
      "movimientos_inventario/" + movement.id_movimiento,
      "DELETE",
      null,
      409,
    );
    for (const table of [
      "categorias",
      "proveedores",
      "clientes",
      "empleados",
      "productos",
      "compras",
      "ventas",
      "detalle_compras",
      "detalle_ventas",
      "movimientos_inventario",
    ])
      await call(table);
    // Deletion of records with no dependencies.
    for (const [table, value] of [
      ["categorias", { nombre: "Eliminar" }],
      ["proveedores", { nombre: "Eliminar" }],
      ["clientes", { nombre: "Eliminar" }],
      [
        "empleados",
        {
          nombre: "Eliminar",
          apellido: "Prueba",
          puesto: "QA",
          fecha_ingreso: "2026-01-01",
        },
      ],
      ["productos", { ...body, codigo: "DELETE" }],
    ]) {
      const valueCreated = await call(table, "POST", value, 201);
      const { entities } = await import("../src/models/entities.js");
      await call(
        table + "/" + valueCreated[entities[table].pk],
        "DELETE",
        null,
        204,
      );
    }
    await call("dashboard");
    await call("health");
    console.log(
      "Validado MySQL real:",
      version.version,
      "; 10 tablas, CRUD, rollback, cancelaciones y concurrencia.",
    );
  } finally {
    if (server) await new Promise((r) => server.close(r));
    if (pool) await pool.end();
    await admin.query(`DROP DATABASE IF EXISTS \`${db}\``);
    await admin.end();
  }
});

test("semilla SQL mantiene saldos y totales coherentes en MySQL 8", async () => {
  const db = "novaobra_test_seed_" + Date.now();
  const c = await mysql.createConnection({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "novaobra",
    password: process.env.DB_PASSWORD || "",
    multipleStatements: true,
  });
  try {
    await c.query(
      (
        await readFile(
          new URL("../../database/schema.sql", import.meta.url),
          "utf8",
        )
      ).replaceAll("novaobra_db", db),
    );
    const seed = (
      await readFile(
        new URL("../../database/seed.sql", import.meta.url),
        "utf8",
      )
    ).replaceAll("novaobra_db", db);
    await c.query(seed);
    const [[p]] = await c.query(
      "SELECT stock FROM productos WHERE id_producto=1",
    );
    assert.equal(p.stock, 18);
    const [[m]] = await c.query(
      "SELECT SUM(CASE WHEN tipo_movimiento='entrada' THEN cantidad ELSE -cantidad END) stock FROM movimientos_inventario WHERE id_producto=1",
    );
    assert.equal(Number(m.stock), 18);
    for (const [table, pk] of [
      ["compras", "id_compra"],
      ["ventas", "id_venta"],
    ]) {
      const [[r]] = await c.query(
        `SELECT total=(SELECT SUM(subtotal) FROM detalle_${table} WHERE ${pk}=1) coherente FROM ${table} WHERE ${pk}=1`,
      );
      assert.equal(r.coherente, 1);
    }
    await assert.rejects(() => c.query(seed), { code: "ER_DUP_ENTRY" });
    await c.rollback();
    const [[count]] = await c.query("SELECT COUNT(*) n FROM productos");
    assert.equal(count.n, 4);
  } finally {
    await c.query(`DROP DATABASE IF EXISTS \`${db}\``);
    await c.end();
  }
});

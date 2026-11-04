// Integration checks run against a new disposable MySQL 8 database, never NovaObra.
import "dotenv/config";
import test from "node:test";
import assert from "node:assert/strict";
import mysql from "mysql2/promise";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";

function csvRows(source) {
  const rows = [];
  let row = [],
    cell = "",
    quoted = false;
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (c === '"') {
      if (quoted && source[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && source[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  assert.equal(quoted, false, "El CSV debe cerrar sus campos entrecomillados.");
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

test("Reportes, comprobantes, inventario y consultas exportables sobre MySQL real", async (t) => {
  const db = "novaobra_test_features_" + randomUUID().replaceAll("-", "");
  const admin = await mysql.createConnection({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "NovaObra",
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
    ).replaceAll("NovaObra", db);
    await admin.query(schema);
    process.env.DB_NAME = db;
    ({ pool } = await import("../src/config/db.js"));
    const { app } = await import("../src/app.js");
    server = app.listen(0, "127.0.0.1");
    await new Promise((r) => server.once("listening", r));
    const base = `http://127.0.0.1:${server.address().port}/api`;
    async function call(path, method = "GET", body, status = 200) {
      const response = await fetch(`${base}/${path}`, {
        method,
        headers: { "Content-Type": "application/json" },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      const data = response.status === 204 ? null : await response.json();
      assert.equal(response.status, status, JSON.stringify(data));
      return data;
    }
    async function csv(path) {
      const response = await fetch(`${base}/${path}`);
      assert.equal(response.status, 200);
      assert.match(response.headers.get("content-type"), /text\/csv/i);
      assert.match(response.headers.get("content-disposition"), /attachment/i);
      const bytes = Buffer.from(await response.arrayBuffer());
      assert.deepEqual(
        [...bytes.subarray(0, 3)],
        [239, 187, 191],
        "CSV debe incluir BOM UTF-8 para Excel.",
      );
      return csvRows(bytes.toString("utf8").replace(/^\uFEFF/, ""));
    }
    const category = await call(
      "categorias",
      "POST",
      { nombre: "Herramientas" },
      201,
    );
    const otherCategory = await call(
      "categorias",
      "POST",
      { nombre: "Electricidad" },
      201,
    );
    const provider = await call(
      "proveedores",
      "POST",
      { nombre: "Proveedor Central" },
      201,
    );
    const clientName = 'Cliente, "Prueba"\nSegunda línea';
    const client = await call(
      "clientes",
      "POST",
      {
        nombre: clientName,
        correo: "prueba@example.com",
        telefono: "88887777",
        direccion: "San José",
      },
      201,
    );
    const employee = await call(
      "empleados",
      "POST",
      {
        nombre: "Ana",
        apellido: "Mora",
        puesto: "Administración",
        fecha_ingreso: "2026-01-02",
      },
      201,
    );
    const productBody = {
      id_categoria: category.id_categoria,
      codigo: "HER-01",
      nombre: "Martillo",
      precio_compra: 4,
      precio_venta: 10,
      stock_minimo: 3,
    };
    const product = await call("productos", "POST", productBody, 201);
    const cable = await call(
      "productos",
      "POST",
      {
        ...productBody,
        id_categoria: otherCategory.id_categoria,
        codigo: "ELE-01",
        nombre: "Cable",
        precio_compra: 2,
        precio_venta: 5,
        stock_minimo: 2,
      },
      201,
    );
    const literal = await call(
      "productos",
      "POST",
      {
        ...productBody,
        codigo: "LIT%_01",
        nombre: "Llave 100%_real",
        precio_compra: 1,
        precio_venta: 2,
        stock_minimo: 0,
      },
      201,
    );
    const inactive = await call(
      "productos",
      "POST",
      {
        ...productBody,
        codigo: "OFF-01",
        nombre: "Producto inactivo",
        estado: "inactivo",
        stock_minimo: 9,
      },
      201,
    );
    const purchaseBody = {
      id_proveedor: provider.id_proveedor,
      id_empleado: employee.id_empleado,
      detalles: [
        { id_producto: product.id_producto, cantidad: 10, costo_unitario: 3 },
        { id_producto: cable.id_producto, cantidad: 20, costo_unitario: 1.5 },
      ],
    };
    const purchase = await call("compras", "POST", purchaseBody, 201);
    await call(`compras/${purchase.id_compra}/confirmar`, "POST");
    await admin.query(
      "UPDATE compras SET fecha_compra='2026-05-01 00:00:00' WHERE id_compra=?",
      [purchase.id_compra],
    );
    const saleBody = {
      id_cliente: client.id_cliente,
      id_empleado: employee.id_empleado,
      detalles: [
        { id_producto: product.id_producto, cantidad: 3, precio_unitario: 10 },
        { id_producto: cable.id_producto, cantidad: 2, precio_unitario: 5 },
      ],
    };
    const sale = await call("ventas", "POST", saleBody, 201);
    await call(`ventas/${sale.id_venta}/confirmar`, "POST");
    await admin.query(
      "UPDATE ventas SET fecha_venta='2026-05-01 23:59:59' WHERE id_venta=?",
      [sale.id_venta],
    );
    const followingSale = await call(
      "ventas",
      "POST",
      {
        ...saleBody,
        detalles: [
          {
            id_producto: product.id_producto,
            cantidad: 1,
            precio_unitario: 10,
          },
        ],
      },
      201,
    );
    await call(`ventas/${followingSale.id_venta}/confirmar`, "POST");
    await admin.query(
      "UPDATE ventas SET fecha_venta='2026-05-02 00:00:00' WHERE id_venta=?",
      [followingSale.id_venta],
    );
    const cancelledSale = await call(
      "ventas",
      "POST",
      {
        ...saleBody,
        detalles: [
          {
            id_producto: product.id_producto,
            cantidad: 2,
            precio_unitario: 10,
          },
        ],
      },
      201,
    );
    await call(`ventas/${cancelledSale.id_venta}/confirmar`, "POST");
    await call(`ventas/${cancelledSale.id_venta}/cancelar`, "POST");
    await admin.query(
      "UPDATE ventas SET fecha_venta='2026-05-01 12:00:00' WHERE id_venta=?",
      [cancelledSale.id_venta],
    );
    const cancelledPurchase = await call(
      "compras",
      "POST",
      {
        ...purchaseBody,
        detalles: [
          { id_producto: cable.id_producto, cantidad: 3, costo_unitario: 2 },
        ],
      },
      201,
    );
    await call(`compras/${cancelledPurchase.id_compra}/confirmar`, "POST");
    await call(`compras/${cancelledPurchase.id_compra}/cancelar`, "POST");
    await admin.query(
      "UPDATE compras SET fecha_compra='2026-05-01 12:00:00' WHERE id_compra=?",
      [cancelledPurchase.id_compra],
    );
    const draft = await call(
      "ventas",
      "POST",
      {
        ...saleBody,
        detalles: [
          {
            id_producto: product.id_producto,
            cantidad: 100,
            precio_unitario: 100,
          },
        ],
      },
      201,
    );
    await admin.query(
      "UPDATE ventas SET fecha_venta='2026-05-01 12:00:00' WHERE id_venta=?",
      [draft.id_venta],
    );

    await t.test(
      "Reportes incluyen ambos extremos de fecha y excluyen borradores y canceladas",
      async () => {
        const report = await call("reportes?desde=2026-05-01&hasta=2026-05-01");
        assert.equal(report.desde, "2026-05-01");
        assert.equal(report.hasta, "2026-05-01");
        assert.deepEqual(report.resumen, {
          ventas: 40,
          cantidad_ventas: 1,
          compras: 60,
          cantidad_compras: 1,
          costo_estimado: 16,
          ganancia_estimada: 24,
        });
        assert.match(report.criterio_ganancia, /actual/i);
        assert.equal(report.mas_vendidos.length, 2);
        assert.equal(report.mas_vendidos[0].id_producto, product.id_producto);
        assert.equal(report.mas_vendidos[0].cantidad, 3);
        assert.equal(report.mas_vendidos[0].producto_nombre, "Martillo");
        assert.equal(report.mas_vendidos[0].ingresos, 30);
        assert.equal(report.mas_vendidos[0].ganancia_estimada, 18);
        const next = await call("reportes?desde=2026-05-02&hasta=2026-05-02");
        assert.equal(next.resumen.ventas, 10);
        assert.equal(next.resumen.compras, 0);
        const both = await call("reportes?desde=2026-05-01&hasta=2026-05-02");
        assert.equal(both.resumen.ventas, 50);
        assert.equal(both.resumen.cantidad_ventas, 2);
        const empty = await call("reportes?desde=2020-01-01&hasta=2020-01-02");
        assert.equal(empty.resumen.ventas, 0);
        assert.equal(empty.resumen.ganancia_estimada, 0);
        assert.deepEqual(empty.mas_vendidos, []);
        // The label is an estimate of current catalogue cost, not stored historical profit.
        await call(`productos/${product.id_producto}`, "PUT", {
          ...productBody,
          precio_compra: 6,
        });
        const repriced = await call(
          "reportes?desde=2026-05-01&hasta=2026-05-01",
        );
        assert.equal(repriced.resumen.costo_estimado, 22);
        assert.equal(repriced.resumen.ganancia_estimada, 18);
      },
    );

    await t.test(
      "Listas paginadas conservan compatibilidad, nombres y búsqueda literal",
      async () => {
        const all = await call("productos");
        assert.ok(Array.isArray(all));
        assert.equal(all.length, 4);
        const page = await call("productos?pagina=1&limite=2");
        assert.equal(page.total, 4);
        assert.equal(page.pagina, 1);
        assert.equal(page.limite, 2);
        assert.equal(page.paginas, 2);
        assert.equal(page.datos.length, 2);
        const second = await call("productos?pagina=2&limite=2");
        assert.equal(second.datos.length, 2);
        assert.equal(
          new Set([...page.datos, ...second.datos].map((p) => p.id_producto))
            .size,
          4,
        );
        const found = await call("productos?q=HER-01&pagina=1&limite=10");
        assert.equal(found.total, 1);
        assert.equal(found.datos[0].categoria_nombre, "Herramientas");
        const categoryRows = await call(
          `productos?categoria=${otherCategory.id_categoria}`,
        );
        assert.deepEqual(
          categoryRows.map((p) => p.id_producto),
          [cable.id_producto],
        );
        assert.deepEqual(
          (await call("productos?q=100%25_")).map((p) => p.id_producto),
          [literal.id_producto],
        );
        const injection = await call(
          "productos?q=" + encodeURIComponent("%' OR 1=1 --"),
        );
        assert.deepEqual(injection, []);
        assert.deepEqual(
          (await call("productos?estado=inactivo")).map((p) => p.id_producto),
          [inactive.id_producto],
        );
        const zero = await call("productos?q=NO-EXISTE&pagina=1&limite=10");
        assert.equal(zero.total, 0);
        assert.equal(zero.paginas, 1);
        assert.deepEqual(zero.datos, []);
        const buys = await call(
          "compras?desde=2026-05-01&hasta=2026-05-01&estado=confirmada",
        );
        assert.equal(buys.length, 1);
        assert.equal(buys[0].proveedor_nombre, provider.nombre);
        assert.equal(buys[0].empleado_nombre, "Ana Mora");
        const sells = await call(
          "ventas?desde=2026-05-01&hasta=2026-05-01&estado=confirmada",
        );
        assert.equal(sells.length, 1);
        assert.equal(sells[0].cliente_nombre, clientName);
        const stockHistory = await call(
          "movimientos_inventario?tipo_movimiento=salida",
        );
        assert.ok(stockHistory.length > 0);
        assert.ok(stockHistory.every((m) => m.tipo_movimiento === "salida"));
        assert.ok(
          stockHistory.some(
            (m) =>
              m.producto_nombre === "Martillo" &&
              m.producto_codigo === "HER-01",
          ),
        );
      },
    );

    await t.test(
      "Comprobante usa nombres reales, líneas y total de la venta",
      async () => {
        const receipt = await call(`ventas/${sale.id_venta}/comprobante`);
        assert.equal(receipt.cliente_nombre, clientName);
        assert.equal(receipt.empleado_nombre, "Ana Mora");
        assert.equal(receipt.total, 40);
        assert.equal(receipt.detalles.length, 2);
        const line = receipt.detalles.find(
          (l) => l.id_producto === product.id_producto,
        );
        assert.equal(line.producto_nombre, "Martillo");
        assert.equal(line.producto_codigo, "HER-01");
        assert.equal(line.cantidad, 3);
        assert.equal(line.precio_unitario, 10);
        assert.equal(line.subtotal, 30);
        assert.equal(
          receipt.detalles.reduce((s, l) => s + l.subtotal, 0),
          receipt.total,
        );
        const cancelled = await call(
          `ventas/${cancelledSale.id_venta}/comprobante`,
        );
        assert.equal(cancelled.estado, "cancelada");
        await call("ventas/4294967295/comprobante", "GET", undefined, 404);
      },
    );

    await t.test(
      "Inventario bajo excluye inactivos y calcula reposición al superar el mínimo",
      async () => {
        await call(
          "movimientos_inventario",
          "POST",
          {
            id_producto: product.id_producto,
            tipo_movimiento: "salida",
            cantidad: 4,
            descripcion: "Ajustar fixture de reposición",
          },
          201,
        );
        const rows = await call("inventario-bajo");
        const low = rows.find((p) => p.id_producto === product.id_producto);
        assert.ok(low);
        assert.equal(low.stock, 2);
        assert.equal(low.stock_minimo, 3);
        assert.equal(low.objetivo, 4);
        assert.equal(low.faltante, 2);
        assert.equal(low.costo_reposicion, 12);
        assert.equal(low.categoria_nombre, "Herramientas");
        assert.ok(!rows.some((p) => p.id_producto === inactive.id_producto));
        assert.ok(!rows.some((p) => p.id_producto === cable.id_producto));
        assert.deepEqual(
          (await call("productos?stock=bajo&estado=activo"))
            .map((p) => p.id_producto)
            .sort((a, b) => a - b),
          rows.map((p) => p.id_producto).sort((a, b) => a - b),
        );
      },
    );

    await t.test(
      "CSV exporta filtros completos, textos especiales y fórmulas neutralizadas",
      async () => {
        const categories = await csv(
          "productos/exportar.csv?categoria=" +
            category.id_categoria +
            "&estado=activo&pagina=1&limite=1",
        );
        assert.equal(
          categories.length,
          3,
          "Dos productos activos y su encabezado, sin limitar la exportación a una página.",
        );
        const contacts = await csv("clientes/exportar.csv");
        const nameColumn = contacts[0].findIndex(
          (h) => h.toLowerCase() === "nombre",
        );
        assert.ok(nameColumn >= 0);
        assert.equal(contacts[1][nameColumn], clientName);
        for (const name of [
          "=SUM(1,1)",
          "+1234",
          "-1234",
          "@SUM(1,1)",
          "\t=SUM(1,1)",
        ])
          await call("clientes", "POST", { nombre: name }, 201);
        const safe = await csv("clientes/exportar.csv");
        for (const name of [
          "=SUM(1,1)",
          "+1234",
          "-1234",
          "@SUM(1,1)",
          "=SUM(1,1)",
        ])
          assert.ok(
            safe.some((row) => row[nameColumn] === "'" + name),
            `Fórmula debe neutralizarse: ${name}`,
          );
        const reports = await csv(
          "reportes/exportar.csv?desde=2026-05-01&hasta=2026-05-01",
        );
        assert.ok(reports.length > 1);
        assert.ok(reports.some((row) => row.includes("Martillo")));
        const replacement = await csv("inventario-bajo/exportar.csv");
        assert.ok(replacement.some((row) => row.includes("HER-01")));
        const history = await csv(
          "movimientos_inventario/exportar.csv?tipo_movimiento=salida",
        );
        assert.ok(history.length > 1);
      },
    );

    await t.test(
      "Filtros inválidos se rechazan sin alterar las diez tablas",
      async () => {
        for (const path of [
          "productos?pagina=0",
          "productos?limite=101",
          "productos?limite=1.5",
          "productos?categoria=1%20OR%201=1",
          "productos?estado=borrador",
          "productos?q=a&q=b",
          "ventas?desde=2026-02-30",
          "ventas?desde=2026-05-02&hasta=2026-05-01",
          "movimientos_inventario?tipo_movimiento=ajuste",
          "reportes?desde=2026-02-30",
          "reportes?desde=2026-05-02&hasta=2026-05-01",
        ])
          await call(path, "GET", undefined, 400);
        const [[count]] = await admin.query(
          "SELECT COUNT(*) n FROM information_schema.tables WHERE table_schema=?",
          [db],
        );
        assert.equal(count.n, 10);
        assert.equal((await call("productos")).length, 4);
      },
    );
  } finally {
    if (server) await new Promise((r) => server.close(r));
    if (pool) await pool.end();
    await admin.query(`DROP DATABASE IF EXISTS \`${db}\``);
    await admin.end();
  }
});

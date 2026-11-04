// Requires the real API, MySQL and Vite running. Creates disposable catalog rows.
import test from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright-core";
const base = process.env.UI_URL || "http://127.0.0.1:5173";
const api = process.env.API_URL || "http://127.0.0.1:3001/api";
async function get(path) {
  const r = await fetch(api + "/" + path);
  assert.equal(r.status, 200);
  return r.json();
}
test("React: CRUD persistente, navegación y diseño móvil con API y MySQL reales", async () => {
  await get("health");
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH }
      : {}),
    args: process.env.CHROMIUM_NO_SANDBOX === "1" ? ["--no-sandbox"] : [],
  });
  const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    }),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const name = "Categoría UI " + Date.now(),
    updated = name + " editada",
    code = "UI-" + Date.now();
  let category, product;
  const navigate = async (label) => {
    await page.locator("nav button").filter({ hasText: label }).click();
    await page
      .getByRole("button", { name: "Actualizar", exact: true })
      .waitFor();
    await page.waitForFunction(
      () => !document.body.innerText.includes("Cargando información…"),
    );
  };
  try {
    await page.goto(base);
    await page.getByText("Actividad de inventario", { exact: true }).waitFor();
    await navigate("Categorías");
    await page
      .getByRole("button", { name: "+ Crear registro", exact: true })
      .click();
    await page.getByLabel("Nombre", { exact: true }).fill(name);
    await page
      .getByLabel("Descripcion", { exact: true })
      .fill("Creada desde Chromium");
    await page.getByRole("button", { name: "Guardar", exact: true }).click();
    await page
      .getByRole("status")
      .filter({ hasText: "Registro guardado." })
      .waitFor();
    category = (await get("categorias")).find((c) => c.nombre === name);
    assert.ok(category);
    await page
      .getByRole("row")
      .filter({ hasText: name })
      .getByRole("button", { name: "Editar", exact: true })
      .click();
    await page.getByLabel("Nombre", { exact: true }).fill(updated);
    await page.getByRole("button", { name: "Guardar", exact: true }).click();
    await page.getByRole("cell", { name: updated, exact: true }).waitFor();
    assert.equal(
      (await get("categorias/" + category.id_categoria)).nombre,
      updated,
    );
    await navigate("Productos");
    await page
      .getByRole("button", { name: "+ Crear registro", exact: true })
      .click();
    await page
      .getByLabel("Id categoria", { exact: true })
      .selectOption(String(category.id_categoria));
    await page.getByLabel("Codigo", { exact: true }).fill(code);
    await page
      .getByLabel("Nombre", { exact: true })
      .fill("Producto de prueba UI");
    await page.getByLabel("Precio compra", { exact: true }).fill("12.50");
    await page.getByLabel("Precio venta", { exact: true }).fill("20");
    await page.getByLabel("Stock minimo", { exact: true }).fill("3");
    await page.getByRole("button", { name: "Guardar", exact: true }).click();
    await page.getByRole("cell", { name: code, exact: true }).waitFor();
    product = (await get("productos")).find((p) => p.codigo === code);
    assert.ok(product);
    assert.equal(product.stock, 0);
    await page.getByRole("textbox", { name: "Buscar registros" }).fill(code);
    assert.equal(await page.locator("tbody tr").count(), 1);
    page.once("dialog", (d) => d.accept());
    await page
      .getByRole("row")
      .filter({ hasText: code })
      .getByRole("button", { name: "Eliminar", exact: true })
      .click();
    await page.getByText("Registro eliminado.", { exact: true }).waitFor();
    assert.ok(
      !(await get("productos")).some(
        (p) => p.id_producto === product.id_producto,
      ),
    );
    product = null;
    await navigate("Categorías");
    page.once("dialog", (d) => d.accept());
    await page
      .getByRole("row")
      .filter({ hasText: updated })
      .getByRole("button", { name: "Eliminar", exact: true })
      .click();
    await page.getByText("Registro eliminado.", { exact: true }).waitFor();
    assert.ok(
      !(await get("categorias")).some(
        (c) => c.id_categoria === category.id_categoria,
      ),
    );
    category = null;
    for (const label of [
      "Proveedores",
      "Clientes",
      "Empleados",
      "Compras",
      "Ventas",
      "Inventario",
    ]) {
      await navigate(label);
      assert.equal(await page.locator("h1").innerText(), label);
      assert.equal(await page.getByRole("alert").count(), 0);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await navigate("Inicio");
    await page.getByText("Actividad de inventario", { exact: true }).waitFor();
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      true,
    );
    assert.deepEqual(errors, []);
    console.log(
      "Chromium: CRUD categoría/producto, persistencia real, nueve módulos y viewport 390 px verificados.",
    );
  } finally {
    // Cleanup only the disposable records created by this test.
    if (product)
      await fetch(api + "/productos/" + product.id_producto, {
        method: "DELETE",
      });
    if (category)
      await fetch(api + "/categorias/" + category.id_categoria, {
        method: "DELETE",
      });
    await browser.close();
  }
});

test("React: compra, venta y cancelaciones actualizan MySQL y su historial", async () => {
  const r = await fetch(api + "/productos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id_categoria: 1,
      codigo: "UI-TRADE-" + Date.now(),
      nombre: "Producto UI transaccional",
      precio_compra: 2,
      precio_venta: 3,
      stock_minimo: 1,
    }),
  });
  assert.equal(r.status, 201);
  const p = await r.json();
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH }
      : {}),
    args: process.env.CHROMIUM_NO_SANDBOX === "1" ? ["--no-sandbox"] : [],
  });
  const page = await browser.newPage();
  const nav = async (label) => {
    await page.locator("nav button").filter({ hasText: label }).click();
    await page.waitForFunction(
      () => !document.body.innerText.includes("Cargando información…"),
    );
  };
  const row = (id) =>
    page
      .locator("tbody tr")
      .filter({
        has: page.locator("td:first-child", {
          hasText: new RegExp("^" + id + "$"),
        }),
      });
  async function create(k, label, qty) {
    const before = new Set(
      (await get(k)).map((x) => x[k === "compras" ? "id_compra" : "id_venta"]),
    );
    await nav(label);
    await page
      .getByRole("button", { name: "+ Crear registro", exact: true })
      .click();
    await page
      .getByLabel(k === "compras" ? "Id proveedor" : "Id cliente", {
        exact: true,
      })
      .selectOption("1");
    await page.getByLabel("Id empleado", { exact: true }).selectOption("1");
    await page
      .getByRole("button", { name: "Agregar producto", exact: true })
      .click();
    await page
      .getByLabel("Producto", { exact: true })
      .selectOption(String(p.id_producto));
    await page.getByLabel("Cantidad", { exact: true }).fill(String(qty));
    await page
      .getByRole("button", { name: "Guardar borrador", exact: true })
      .click();
    await page.getByText("Registro guardado.", { exact: true }).waitFor();
    const h = (await get(k)).find(
      (x) => !before.has(x[k === "compras" ? "id_compra" : "id_venta"]),
    );
    assert.ok(h);
    return h[k === "compras" ? "id_compra" : "id_venta"];
  }
  async function action(id, name, notice) {
    page.once("dialog", (d) => d.accept());
    await row(id).getByRole("button", { name, exact: true }).click();
    await page.getByText(notice, { exact: true }).waitFor();
  }
  try {
    await page.goto(base);
    await page.getByText("Actividad de inventario", { exact: true }).waitFor();
    const purchase = await create("compras", "Compras", 5);
    await action(purchase, "Confirmar", "Operación confirmada.");
    assert.equal((await get("productos/" + p.id_producto)).stock, 5);
    const sale = await create("ventas", "Ventas", 2);
    await action(sale, "Confirmar", "Operación confirmada.");
    assert.equal((await get("productos/" + p.id_producto)).stock, 3);
    await row(sale)
      .getByRole("button", { name: "Detalles", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Registro #" + sale, exact: true })
      .waitFor();
    assert.equal(
      await page.getByLabel("Cantidad", { exact: true }).inputValue(),
      "2",
    );
    assert.ok(
      await page
        .getByRole("button", { name: "Guardar borrador", exact: true })
        .isDisabled(),
    );
    await page.getByRole("button", { name: "Cerrar", exact: true }).click();
    await action(sale, "Cancelar", "Operación cancelada.");
    assert.equal((await get("productos/" + p.id_producto)).stock, 5);
    await nav("Compras");
    await action(purchase, "Cancelar", "Operación cancelada.");
    assert.equal((await get("productos/" + p.id_producto)).stock, 0);
    const movements = (await get("movimientos_inventario")).filter(
      (m) => m.id_producto === p.id_producto,
    );
    assert.equal(movements.length, 4);
    console.log(
      "Chromium: compra/venta, consulta de detalles inmutables y sus cancelaciones verificadas en MySQL. Se conserva el historial de prueba.",
    );
  } finally {
    await browser.close();
  }
});

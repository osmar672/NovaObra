// These browser tests use the running API and MySQL; delayed responses retain
// their real contents. Run against a disposable, seeded development database.
import test from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const base = process.env.UI_URL || "http://127.0.0.1:5173";
const api = process.env.API_URL || "http://127.0.0.1:3001/api";

async function call(path, method = "GET", body, expected = 200) {
  const response = await fetch(`${api}/${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = response.status === 204 ? null : await response.json();
  assert.equal(response.status, expected, JSON.stringify(data));
  return data;
}

async function openBrowser() {
  await call("health");
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH }
      : {}),
    args: process.env.CHROMIUM_NO_SANDBOX === "1" ? ["--no-sandbox"] : [],
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  page.setDefaultTimeout(10000);
  await page.goto(base);
  await page.getByText("Actividad de inventario", { exact: true }).waitFor();
  return { browser, page };
}

async function navigate(page, label, firstColumn) {
  await page.locator("nav button").filter({ hasText: label }).click();
  await page
    .getByRole("heading", { level: 1, name: label, exact: true })
    .waitFor();
  await page
    .getByRole("columnheader", { name: firstColumn, exact: true })
    .waitFor();
  await page.waitForFunction(
    () => !document.body.innerText.includes("Cargando información…"),
  );
}

const rowNamed = (page, name) =>
  page.getByRole("row").filter({
    has: page.getByRole("cell", { name, exact: true }),
  });

function deferred() {
  let resolve;
  const promise = new Promise((r) => (resolve = r));
  return { promise, resolve };
}

// Holds precisely one real server response; it never substitutes fixture JSON.
async function holdResponse(page, pattern) {
  const captured = deferred();
  const release = deferred();
  const finished = deferred();
  let held = false;
  await page.route(pattern, async (route) => {
    if (held) return route.continue();
    held = true;
    try {
      const response = await route.fetch();
      captured.resolve();
      await release.promise;
      await route.fulfill({ response });
    } finally {
      finished.resolve();
    }
  });
  return { captured, release, finished };
}

test(
  "React: una lista atrasada no sustituye los datos de la pantalla actual",
  { timeout: 30000 },
  async () => {
    const suffix = Date.now();
    const category = await call(
      "categorias",
      "POST",
      { nombre: `Categoría retrasada ${suffix}` },
      201,
    );
    const provider = await call(
      "proveedores",
      "POST",
      { nombre: `Proveedor vigente ${suffix}` },
      201,
    );
    const { browser, page } = await openBrowser();
    let held;
    try {
      held = await holdResponse(page, "**/api/categorias");
      await page
        .locator("nav button")
        .filter({ hasText: "Categorías" })
        .click();
      await held.captured.promise;
      await navigate(page, "Proveedores", "Id proveedor");
      await rowNamed(page, provider.nombre).waitFor();
      held.release.resolve();
      await held.finished.promise;
      await page.waitForLoadState("networkidle");
      assert.equal(
        await page.getByRole("heading", { level: 1 }).innerText(),
        "Proveedores",
      );
      assert.equal(
        await page.getByRole("columnheader").first().innerText(),
        "Id proveedor",
      );
      assert.equal(await rowNamed(page, provider.nombre).count(), 1);
      assert.equal(await rowNamed(page, category.nombre).count(), 0);
    } finally {
      held?.release.resolve();
      await browser.close();
      await call(
        `proveedores/${provider.id_proveedor}`,
        "DELETE",
        undefined,
        204,
      );
      await call(
        `categorias/${category.id_categoria}`,
        "DELETE",
        undefined,
        204,
      );
    }
  },
);

test(
  "React: un detalle comercial atrasado no abre un formulario en otra pantalla",
  { timeout: 30000 },
  async () => {
    const header = await call(
      "compras",
      "POST",
      {
        id_proveedor: 1,
        id_empleado: 1,
        detalles: [],
        clave_solicitud: `ui-detalle-tardio-${Date.now()}`,
      },
      201,
    );
    const { browser, page } = await openBrowser();
    let held;
    try {
      await navigate(page, "Compras", "Id compra");
      held = await holdResponse(page, `**/api/compras/${header.id_compra}`);
      const row = page.locator("tbody tr").filter({
        has: page.locator("td:first-child", {
          hasText: new RegExp(`^${header.id_compra}$`),
        }),
      });
      await row.getByRole("button", { name: "Detalles", exact: true }).click();
      await held.captured.promise;
      await navigate(page, "Proveedores", "Id proveedor");
      held.release.resolve();
      await held.finished.promise;
      await page.waitForLoadState("networkidle");
      assert.equal(
        await page.getByRole("heading", { level: 1 }).innerText(),
        "Proveedores",
      );
      assert.equal(await page.locator(".editor").count(), 0);
      assert.equal(await page.getByRole("alert").count(), 0);
    } finally {
      held?.release.resolve();
      await browser.close();
      await call(`compras/${header.id_compra}`, "DELETE", undefined, 204);
    }
  },
);

for (const entity of [
  {
    table: "proveedores",
    label: "Proveedores",
    pk: "id_proveedor",
    firstColumn: "Id proveedor",
  },
  {
    table: "clientes",
    label: "Clientes",
    pk: "id_cliente",
    firstColumn: "Id cliente",
  },
  {
    table: "empleados",
    label: "Empleados",
    pk: "id_empleado",
    firstColumn: "Id empleado",
  },
]) {
  test(
    `React: crear, consultar, editar y eliminar ${entity.table} persiste en MySQL`,
    { timeout: 30000 },
    async () => {
      const { browser, page } = await openBrowser();
      const name = `UI ${entity.table} ${Date.now()}`;
      const updated = `${name} actualizado`;
      let saved;
      try {
        // The seeded database guarantees rows, so the current column is visible.
        await navigate(page, entity.label, entity.firstColumn);
        await page
          .getByRole("button", { name: "+ Crear registro", exact: true })
          .click();
        await page.getByLabel("Nombre", { exact: true }).fill(name);
        await page.getByLabel("Telefono", { exact: true }).fill("88881111");
        await page
          .getByLabel("Correo", { exact: true })
          .fill("correo-invalido");
        if (entity.table === "empleados") {
          await page.getByLabel("Apellido", { exact: true }).fill("Prueba");
          await page
            .getByLabel("Puesto", { exact: true })
            .fill("Administración");
          await page
            .getByLabel("Fecha ingreso", { exact: true })
            .fill("2026-01-02");
        } else {
          await page
            .getByLabel("Direccion", { exact: true })
            .fill("Dirección de prueba UI");
        }
        await page
          .getByRole("button", { name: "Guardar", exact: true })
          .click();
        assert.equal(
          await page
            .getByLabel("Correo", { exact: true })
            .evaluate((e) => e.validity.typeMismatch),
          true,
        );
        assert.ok(!(await call(entity.table)).some((r) => r.nombre === name));
        await page
          .getByLabel("Correo", { exact: true })
          .fill("prueba-ui@example.com");
        await page
          .getByRole("button", { name: "Guardar", exact: true })
          .click();
        await rowNamed(page, name).waitFor();
        saved = (await call(entity.table)).find((r) => r.nombre === name);
        assert.ok(saved);
        assert.equal(saved.correo, "prueba-ui@example.com");
        assert.equal(
          (await call(`${entity.table}/${saved[entity.pk]}`)).telefono,
          "88881111",
        );
        await rowNamed(page, name)
          .getByRole("button", { name: "Editar", exact: true })
          .click();
        await page.getByLabel("Nombre", { exact: true }).fill(updated);
        await page.getByLabel("Telefono", { exact: true }).fill("88882222");
        if (entity.table !== "clientes")
          await page
            .getByLabel("Estado", { exact: true })
            .selectOption("inactivo");
        await page
          .getByRole("button", { name: "Guardar", exact: true })
          .click();
        await rowNamed(page, updated).waitFor();
        const persisted = await call(`${entity.table}/${saved[entity.pk]}`);
        assert.equal(persisted.nombre, updated);
        assert.equal(persisted.telefono, "88882222");
        if (entity.table !== "clientes")
          assert.equal(persisted.estado, "inactivo");
        await page
          .getByRole("textbox", { name: "Buscar registros", exact: true })
          .fill(updated);
        assert.equal(await page.locator("tbody tr").count(), 1);
        // Dismissing the confirmation must preserve the record.
        page.once("dialog", (dialog) => dialog.dismiss());
        await rowNamed(page, updated)
          .getByRole("button", { name: "Eliminar", exact: true })
          .click();
        assert.equal(
          (await call(`${entity.table}/${saved[entity.pk]}`)).nombre,
          updated,
        );
        page.once("dialog", (dialog) => dialog.accept());
        await rowNamed(page, updated)
          .getByRole("button", { name: "Eliminar", exact: true })
          .click();
        await page.getByText("Registro eliminado.", { exact: true }).waitFor();
        assert.ok(
          !(await call(entity.table)).some(
            (r) => r[entity.pk] === saved[entity.pk],
          ),
        );
        saved = null;
      } finally {
        await browser.close();
        if (saved)
          await call(
            `${entity.table}/${saved[entity.pk]}`,
            "DELETE",
            undefined,
            204,
          );
      }
    },
  );
}

test(
  "React: ajustes, stock insuficiente, compensación y reintento mantienen el inventario",
  { timeout: 30000 },
  async () => {
    const product = await call(
      "productos",
      "POST",
      {
        id_categoria: 1,
        codigo: `UI-AJUSTE-${Date.now()}`,
        nombre: "Producto de ajustes UI",
        precio_compra: 1,
        precio_venta: 2,
        stock_minimo: 1,
      },
      201,
    );
    const { browser, page } = await openBrowser();
    const movements = async () =>
      (await call("movimientos_inventario")).filter(
        (m) => m.id_producto === product.id_producto,
      );
    const stock = async () =>
      (await call(`productos/${product.id_producto}`)).stock;
    async function newAdjustment(type, amount, description) {
      await page
        .getByRole("button", { name: "+ Registrar ajuste", exact: true })
        .click();
      await page
        .getByLabel("Id producto", { exact: true })
        .selectOption(String(product.id_producto));
      await page
        .getByLabel("Tipo movimiento", { exact: true })
        .selectOption(type);
      await page.getByLabel("Cantidad", { exact: true }).fill(String(amount));
      await page.getByLabel("Descripcion", { exact: true }).fill(description);
    }
    async function save() {
      await page.getByRole("button", { name: "Guardar", exact: true }).click();
      await page.getByText("Registro guardado.", { exact: true }).waitFor();
      await page.locator(".editor").waitFor({ state: "detached" });
    }
    try {
      await navigate(page, "Inventario", "Id movimiento");
      await newAdjustment("entrada", 5, "Entrada UI comprobada");
      const sent = page.waitForRequest(
        (request) =>
          request.method() === "POST" &&
          new URL(request.url()).pathname === "/api/movimientos_inventario",
      );
      await save();
      const originalBody = (await sent).postDataJSON();
      assert.ok(originalBody.clave_solicitud);
      assert.equal(await stock(), 5);
      assert.equal((await movements()).length, 1);
      // Retry exactly the request sent by React; its real key prevents another entry.
      await call("movimientos_inventario", "POST", originalBody, 409);
      assert.equal(await stock(), 5);
      assert.equal((await movements()).length, 1);
      await newAdjustment("salida", -1, "Cantidad inválida UI");
      await page.getByRole("button", { name: "Guardar", exact: true }).click();
      assert.equal(
        await page
          .getByLabel("Cantidad", { exact: true })
          .evaluate((e) => e.validity.rangeUnderflow),
        true,
      );
      assert.equal(await stock(), 5);
      await page.getByLabel("Cantidad", { exact: true }).fill("6");
      await page.getByRole("button", { name: "Guardar", exact: true }).click();
      await page
        .getByRole("alert")
        .filter({ hasText: "Inventario insuficiente" })
        .waitFor();
      assert.equal(await stock(), 5);
      assert.equal((await movements()).length, 1);
      // Correct the failed form. Its request key was rolled back with the failure.
      await page.getByLabel("Cantidad", { exact: true }).fill("2");
      await page
        .getByLabel("Descripcion", { exact: true })
        .fill("Salida UI comprobada");
      await save();
      assert.equal(await stock(), 3);
      await newAdjustment("entrada", 2, "Compensación de salida UI");
      await save();
      assert.equal(await stock(), 5);
      await newAdjustment("salida", 5, "Conciliación final UI");
      await save();
      assert.equal(await stock(), 0);
      const history = await movements();
      assert.equal(history.length, 4);
      assert.equal(
        history.reduce(
          (sum, m) =>
            sum + (m.tipo_movimiento === "entrada" ? m.cantidad : -m.cantidad),
          0,
        ),
        0,
      );
      assert.equal(
        await page
          .getByRole("columnheader", { name: "Acciones", exact: true })
          .count(),
        0,
      );
      console.log(
        "Chromium: ajustes reales, validación, insuficiencia, reintento y compensación; historial preservado con saldo cero.",
      );
    } finally {
      await browser.close();
    }
  },
);

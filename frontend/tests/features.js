// Feature checks consume the live React -> Express -> MySQL workflow.
import test from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const base = process.env.UI_URL || "http://127.0.0.1:5173";
const api = process.env.API_URL || "http://127.0.0.1:3001/api";
const money = (value) =>
  new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC" }).format(
    value,
  );
const normalize = (value) => value.replace(/\s/g, "");

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
async function open() {
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
    acceptDownloads: true,
  });
  page.setDefaultTimeout(12000);
  await page.goto(base);
  await page.getByText("Actividad de inventario", { exact: true }).waitFor();
  return { browser, page };
}
async function settle(page) {
  await page.waitForFunction(
    () =>
      !document.body.innerText.includes("Cargando información…") &&
      !document.body.innerText.includes("Consultando registros…"),
  );
}
async function nav(page, label) {
  await page.locator("nav button").filter({ hasText: label }).click();
  await page
    .getByRole("heading", { level: 1, name: label, exact: true })
    .waitFor();
  await settle(page);
}
async function filter(page, resource, predicate, action) {
  const result = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return (
      url.pathname === `/api/${resource}` &&
      url.searchParams.has("pagina") &&
      predicate(url.searchParams)
    );
  });
  await action();
  await result;
  await settle(page);
}
async function csv(page, button) {
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: button, exact: true }).click();
  const download = await pending;
  assert.match(download.suggestedFilename(), /\.csv$/i);
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const bytes = Buffer.concat(chunks);
  assert.deepEqual(
    [...bytes.subarray(0, 3)],
    [0xef, 0xbb, 0xbf],
    "CSV con BOM UTF-8 para hojas de cálculo",
  );
  return bytes.toString("utf8");
}
const rowWith = (page, name) =>
  page
    .getByRole("row")
    .filter({ has: page.getByRole("cell", { name, exact: true }) });
const rowId = (page, id) =>
  page.locator("tbody tr").filter({
    has: page.locator("td:first-child", { hasText: new RegExp(`^${id}$`) }),
  });
const productBody = (category, code, name, state = "activo") => ({
  id_categoria: category,
  codigo: code,
  nombre: name,
  precio_compra: 1.25,
  precio_venta: 5,
  stock_minimo: 2,
  estado: state,
});

// All created products in this scenario have no history and can be removed.
test(
  "React: filtros reales, nombres, paginación y exportación CSV completa y segura",
  { timeout: 60000 },
  async () => {
    const suffix = Date.now();
    const prefix = `UI-PAG-${suffix}`;
    const category = await call(
      "categorias",
      "POST",
      { nombre: `Categoría visible ${suffix}` },
      201,
    );
    const otherCategory = await call(
      "categorias",
      "POST",
      { nombre: `Otra categoría ${suffix}` },
      201,
    );
    const products = [];
    let browser;
    try {
      for (let i = 0; i < 12; i++)
        products.push(
          await call(
            "productos",
            "POST",
            productBody(
              category.id_categoria,
              `${prefix}-${String(i).padStart(2, "0")}`,
              i === 0 ? "=1+1" : `Producto paginado ${i}`,
              i === 0 ? "inactivo" : "activo",
            ),
            201,
          ),
        );
      products.push(
        await call(
          "productos",
          "POST",
          productBody(
            otherCategory.id_categoria,
            `${prefix}-OTRA`,
            "Producto de otra categoría",
          ),
          201,
        ),
      );
      const opened = await open();
      browser = opened.browser;
      const { page } = opened;
      await nav(page, "Productos");
      await filter(
        page,
        "productos",
        (params) => params.get("q") === prefix,
        () =>
          page
            .getByRole("textbox", { name: "Buscar registros", exact: true })
            .fill(prefix),
      );
      await filter(
        page,
        "productos",
        (params) => params.get("categoria") === String(category.id_categoria),
        () =>
          page
            .getByLabel("Categoría", { exact: true })
            .selectOption(String(category.id_categoria)),
      );
      assert.equal(await page.locator("tbody tr").count(), 10);
      assert.equal(
        await page
          .getByRole("columnheader", { name: "Categoría", exact: true })
          .count(),
        1,
      );
      assert.equal(
        await page
          .getByRole("columnheader", { name: "Id categoria", exact: true })
          .count(),
        0,
      );
      for (const cell of await page.locator("tbody tr").all())
        assert.equal(
          await cell
            .getByRole("cell", { name: category.nombre, exact: true })
            .count(),
          1,
        );
      const firstIds = await page
        .locator("tbody tr td:first-child")
        .allTextContents();
      const completeCsv = await csv(page, "Descargar CSV");
      for (const product of products.slice(0, 12))
        assert.ok(
          completeCsv.includes(product.codigo),
          `Exportación incluye ${product.codigo} aunque no esté en la página visible`,
        );
      assert.ok(!completeCsv.includes(products[12].codigo));
      assert.match(
        completeCsv,
        /'=1\+1/,
        "Neutralizar fórmula al exportar el nombre real de un producto",
      );
      await filter(
        page,
        "productos",
        (params) => params.get("pagina") === "2",
        () =>
          page.getByRole("button", { name: "Siguiente", exact: true }).click(),
      );
      assert.equal(await page.locator("tbody tr").count(), 2);
      const secondIds = await page
        .locator("tbody tr td:first-child")
        .allTextContents();
      assert.ok(secondIds.every((id) => !firstIds.includes(id)));
      assert.equal(
        await page
          .getByRole("button", { name: "Siguiente", exact: true })
          .isDisabled(),
        true,
      );
      await filter(
        page,
        "productos",
        (params) =>
          params.get("estado") === "inactivo" && params.get("pagina") === "1",
        () =>
          page
            .getByLabel("Filtrar registros", { exact: true })
            .selectOption("inactivo"),
      );
      assert.equal(await page.locator("tbody tr").count(), 1);
      await rowWith(page, "=1+1").waitFor();
      const filteredCsv = await csv(page, "Descargar CSV");
      assert.ok(filteredCsv.includes(products[0].codigo));
      assert.ok(!filteredCsv.includes(products[1].codigo));
    } finally {
      if (browser) await browser.close();
      for (const product of products)
        await call(
          `productos/${product.id_producto}`,
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
      await call(
        `categorias/${otherCategory.id_categoria}`,
        "DELETE",
        undefined,
        204,
      );
    }
  },
);

// Sales, purchases and movements intentionally remain in the disposable DB.
test(
  "React: reportes excluyen canceladas, reposición real y comprobante imprimible con nombres",
  { timeout: 60000 },
  async () => {
    const suffix = Date.now();
    const product = await call(
      "productos",
      "POST",
      productBody(1, `UI-REPORT-${suffix}`, `Martillo reportes ${suffix}`),
      201,
    );
    const client = await call(
      "clientes",
      "POST",
      {
        nombre: `Cliente comprobante ${suffix}`,
        correo: "comprobante@example.com",
      },
      201,
    );
    const provider = await call(
      "proveedores",
      "POST",
      { nombre: `Proveedor reportes ${suffix}` },
      201,
    );
    const employee = await call(
      "empleados",
      "POST",
      {
        nombre: "Ana",
        apellido: `Reportes ${suffix}`,
        puesto: "Ventas",
        fecha_ingreso: "2026-01-01",
      },
      201,
    );
    const purchase = await call(
      "compras",
      "POST",
      {
        id_proveedor: provider.id_proveedor,
        id_empleado: employee.id_empleado,
        detalles: [
          {
            id_producto: product.id_producto,
            cantidad: 10,
            costo_unitario: 1.25,
          },
        ],
      },
      201,
    );
    await call(`compras/${purchase.id_compra}/confirmar`, "POST");
    async function sale(quantity, state) {
      const header = await call(
        "ventas",
        "POST",
        {
          id_cliente: client.id_cliente,
          id_empleado: employee.id_empleado,
          detalles: [
            {
              id_producto: product.id_producto,
              cantidad: quantity,
              precio_unitario: 5,
            },
          ],
        },
        201,
      );
      if (state !== "borrador")
        await call(`ventas/${header.id_venta}/confirmar`, "POST");
      if (state === "cancelada")
        await call(`ventas/${header.id_venta}/cancelar`, "POST");
      return header;
    }
    const confirmed = await sale(3, "confirmada");
    await sale(2, "cancelada");
    await sale(1, "borrador");
    // An active zero-stock product requires minimum+1 units; inactive ones are excluded.
    const low = await call(
      "productos",
      "POST",
      productBody(1, `UI-LOW-${suffix}`, `Reposición comprobada ${suffix}`),
      201,
    );
    const inactive = await call(
      "productos",
      "POST",
      productBody(1, `UI-OFF-${suffix}`, `No reponer ${suffix}`, "inactivo"),
      201,
    );
    const { browser, page } = await open();
    try {
      await page
        .getByRole("heading", { name: "Lista de reposición", exact: true })
        .waitFor();
      await rowWith(page, low.nombre).waitFor();
      assert.equal(await rowWith(page, inactive.nombre).count(), 0);
      const lowRow = rowWith(page, low.nombre);
      assert.equal(await lowRow.getByRole("cell").nth(3).innerText(), "0");
      assert.equal(await lowRow.getByRole("cell").nth(4).innerText(), "2");
      assert.equal(
        await lowRow.getByRole("cell").nth(5).innerText(),
        "3",
        "Reponer stock_minimo+1 unidades con stock cero",
      );
      const replenishmentCsv = await csv(page, "Exportar reposición CSV");
      assert.ok(replenishmentCsv.includes(low.codigo));
      assert.ok(!replenishmentCsv.includes(inactive.codigo));
      await page
        .getByRole("button", { name: "Ver productos por reponer", exact: true })
        .click();
      await page
        .getByRole("heading", { level: 1, name: "Productos", exact: true })
        .waitFor();
      await settle(page);
      assert.ok(
        !(await page.locator("tbody").innerText()).includes(inactive.nombre),
      );
      // Search on the low-stock list proves the action selected a real server filter.
      await filter(
        page,
        "productos",
        (params) =>
          params.get("q") === low.codigo &&
          (params.get("stock") === "bajo" ||
            params.get("inventario") === "bajo"),
        () =>
          page
            .getByRole("textbox", { name: "Buscar registros", exact: true })
            .fill(low.codigo),
      );
      assert.equal(await page.locator("tbody tr").count(), 1);
      await rowWith(page, low.nombre).waitFor();
      await nav(page, "Reportes");
      await page
        .getByRole("heading", { name: "Productos más vendidos", exact: true })
        .waitFor();
      // Default range is shown by the form and sent explicitly to the real API.
      const from = await page.getByLabel("Desde", { exact: true }).inputValue();
      const to = await page.getByLabel("Hasta", { exact: true }).inputValue();
      const report = await call(`reportes?desde=${from}&hasta=${to}`);
      const best = report.mas_vendidos.find(
        (item) => item.id_producto === product.id_producto,
      );
      assert.ok(best);
      assert.equal(Number(best.cantidad), 3);
      assert.equal(Number(best.ingresos), 15);
      assert.equal(Number(best.ganancia_estimada), 11.25);
      const reportRow = rowWith(page, product.nombre);
      await reportRow.waitFor();
      assert.ok(
        normalize(await reportRow.innerText()).includes(normalize(money(15))),
      );
      const salesCard = page
        .locator(".card")
        .filter({ has: page.getByText("Ventas confirmadas", { exact: true }) });
      assert.equal(
        normalize(await salesCard.locator("strong").innerText()),
        normalize(money(report.resumen.ventas)),
      );
      assert.match(
        await page.locator("main").innerText(),
        /costo.*actual|actual.*costo/i,
      );
      const reportCsv = await csv(page, "Descargar CSV");
      assert.ok(reportCsv.includes(product.codigo));
      assert.ok(reportCsv.includes(product.nombre));
      // A date range in the future contains no fixture operation.
      const rangeLoad = page.waitForResponse((response) => {
        const url = new URL(response.url());
        return (
          url.pathname === "/api/reportes" &&
          url.searchParams.get("desde") === "2099-01-01" &&
          url.searchParams.get("hasta") === "2099-01-31"
        );
      });
      await page.getByLabel("Hasta", { exact: true }).fill("2099-01-31");
      await page.getByLabel("Desde", { exact: true }).fill("2099-01-01");
      const apply = page.getByRole("button", {
        name: /Aplicar|Consultar|Actualizar reporte|Generar reporte/,
      });
      if (await apply.count()) await apply.click();
      await rangeLoad;
      await settle(page);
      assert.equal(await rowWith(page, product.nombre).count(), 0);
      assert.equal(
        normalize(await salesCard.locator("strong").innerText()),
        normalize(money(0)),
      );
      await nav(page, "Ventas");
      await filter(
        page,
        "ventas",
        (params) => params.get("q") === client.nombre,
        () =>
          page
            .getByRole("textbox", { name: "Buscar registros", exact: true })
            .fill(client.nombre),
      );
      await filter(
        page,
        "ventas",
        (params) => params.get("estado") === "confirmada",
        () =>
          page
            .getByLabel("Filtrar registros", { exact: true })
            .selectOption("confirmada"),
      );
      assert.equal(
        await page.locator("tbody tr").count(),
        1,
        "Estado confirmado excluye cancelada y borrador de este cliente",
      );
      await filter(
        page,
        "ventas",
        (params) => params.get("desde") === "2099-01-01",
        () => page.getByLabel("Desde", { exact: true }).fill("2099-01-01"),
      );
      assert.equal(await page.locator("tbody tr").count(), 0);
      await filter(
        page,
        "ventas",
        (params) => !params.has("desde"),
        () => page.getByLabel("Desde", { exact: true }).fill(""),
      );
      assert.equal(await page.locator("tbody tr").count(), 1);
      await filter(
        page,
        "ventas",
        (params) => params.get("hasta") === "2000-01-01",
        () => page.getByLabel("Hasta", { exact: true }).fill("2000-01-01"),
      );
      assert.equal(await page.locator("tbody tr").count(), 0);
      await filter(
        page,
        "ventas",
        (params) => !params.has("hasta"),
        () => page.getByLabel("Hasta", { exact: true }).fill(""),
      );
      assert.equal(await page.locator("tbody tr").count(), 1);
      const confirmedRow = rowId(page, confirmed.id_venta);
      await confirmedRow.waitFor();
      assert.equal(
        await confirmedRow
          .getByRole("cell", { name: client.nombre, exact: true })
          .count(),
        1,
      );
      assert.equal(
        await confirmedRow
          .getByRole("cell", {
            name: `${employee.nombre} ${employee.apellido}`,
            exact: true,
          })
          .count(),
        1,
      );
      // Keep a real receipt response pending: normal UI mutations must remain
      // disabled until it completes, so a cancellation cannot race that read.
      let capturedResolve, releaseResolve;
      const capturedReceipt = new Promise((resolve) => {
        capturedResolve = resolve;
      });
      const releaseReceipt = new Promise((resolve) => {
        releaseResolve = resolve;
      });
      const receiptPattern = `**/api/ventas/${confirmed.id_venta}/comprobante`;
      await page.route(receiptPattern, async (route) => {
        const response = await route.fetch();
        capturedResolve();
        await releaseReceipt;
        await route.fulfill({ response });
      });
      await confirmedRow
        .getByRole("button", { name: "Comprobante", exact: true })
        .click();
      await capturedReceipt;
      assert.equal(
        await confirmedRow
          .getByRole("button", { name: "Cancelar", exact: true })
          .isDisabled(),
        true,
      );
      releaseResolve();
      const receipt = page.locator(".receipt-preview");
      await receipt
        .getByRole("heading", {
          name: `Comprobante de venta #${confirmed.id_venta}`,
          exact: true,
        })
        .waitFor();
      await page.unroute(receiptPattern);
      const receiptText = await receipt.innerText();
      assert.ok(receiptText.includes(client.nombre));
      assert.ok(receiptText.includes(product.nombre));
      assert.ok(receiptText.includes(product.codigo));
      assert.match(receiptText, /no.*factura|comprobante interno/i);
      assert.ok(normalize(receiptText).includes(normalize(money(15))));
      await page.evaluate(() => {
        window.__printCalls = 0;
        window.print = () => {
          window.__printCalls++;
        };
      });
      await receipt
        .getByRole("button", { name: "Imprimir / Guardar PDF", exact: true })
        .click();
      assert.equal(await page.evaluate(() => window.__printCalls), 1);
      await page.emulateMedia({ media: "print" });
      assert.ok(await receipt.isVisible());
      assert.equal(await page.locator("aside").isVisible(), false);
      const pdf = await page.pdf({ format: "A4", printBackground: true });
      assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
      assert.ok(pdf.length > 1000);
      await page.emulateMedia({ media: "screen" });
      // A receipt already on screen must not remain printable as confirmed
      // after this same interface cancels its underlying sale.
      page.once("dialog", (dialog) => dialog.accept());
      await confirmedRow
        .getByRole("button", { name: "Cancelar", exact: true })
        .click();
      await page.getByText("Operación cancelada.", { exact: true }).waitFor();
      await receipt.waitFor({ state: "detached" });
      assert.equal(
        (await call(`ventas/${confirmed.id_venta}`)).estado,
        "cancelada",
      );
      await filter(
        page,
        "ventas",
        (params) => params.get("estado") === "cancelada",
        () =>
          page
            .getByLabel("Filtrar registros", { exact: true })
            .selectOption("cancelada"),
      );
      await rowId(page, confirmed.id_venta)
        .getByRole("button", { name: "Comprobante", exact: true })
        .click();
      await receipt
        .getByRole("heading", {
          name: `Comprobante de venta #${confirmed.id_venta}`,
          exact: true,
        })
        .waitFor();
      assert.equal(
        await receipt.getByText("cancelada", { exact: true }).count(),
        1,
      );
      assert.equal(
        await receipt.getByText("confirmada", { exact: true }).count(),
        0,
      );
      assert.match(
        await receipt.locator(".receipt-cancelled").innerText(),
        /operación cancelada/i,
      );
      await receipt
        .getByRole("button", { name: "Imprimir / Guardar PDF", exact: true })
        .click();
      assert.equal(await page.evaluate(() => window.__printCalls), 2);
      await receipt
        .getByRole("button", { name: "Cerrar comprobante", exact: true })
        .click();
      await receipt.waitFor({ state: "detached" });
      console.log(
        "Chromium: filtros/paginación/nombres, CSV seguro, reportes reales, reposición y comprobante PDF verificados.",
      );
    } finally {
      await browser.close();
    }
  },
);

import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { fixture, available } from "./helpers.js";
test(
  "Navegador: catálogo, carrito, registro, pedidos, administración y móvil",
  { skip: !available, timeout: 90000 },
  async (t) => {
    const f = await fixture(),
      cwd = fileURLToPath(new URL("..", import.meta.url));
    let browser, vite;
    const errors = [];
    async function step(name, action) {
      let failure;
      await t.test(name, async () => {
        try {
          await action();
        } catch (error) {
          failure = error;
          throw error;
        }
      });
      if (failure) throw failure;
    }
    try {
      await f.pool.query("UPDATE inventario SET existencia=10");
      vite = spawn(
        process.execPath,
        [
          "node_modules/vite/bin/vite.js",
          "--config",
          "frontend/vite.config.js",
        ],
        {
          cwd,
          env: {
            ...process.env,
            HOST: "127.0.0.1",
            PORT: new URL(f.base).port,
            PUBLIC_URL: f.config.publicUrl,
            NODE_ENV: "development",
          },
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
      let output = "";
      vite.stdout.on("data", (v) => (output += v));
      vite.stderr.on("data", (v) => (output += v));
      const deadline = Date.now() + 15000;
      while (Date.now() < deadline) {
        if (vite.exitCode !== null) throw new Error(output);
        try {
          const res = await fetch(f.config.publicUrl + "/api/health");
          if (res.ok) break;
        } catch {}
        await new Promise((r) => setTimeout(r, 100));
      }
      browser = await chromium.launch({
        executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
        headless: true,
        args: process.env.CHROMIUM_NO_SANDBOX === "1" ? ["--no-sandbox"] : [],
      });
      const page = await browser.newPage({
        viewport: { width: 1440, height: 1000 },
      });
      page.setDefaultTimeout(8000);
      page.on("pageerror", (e) => errors.push(e.message));
      await step("Inicio, navegación, búsquedas y favoritos", async () => {
        await page.goto(f.config.publicUrl);
        await page
          .getByRole("heading", {
            name: "Grandes proyectos. Buenas herramientas.",
          })
          .waitFor();
        await page
          .getByRole("heading", { name: "Taladro percutor 650 W" })
          .first()
          .waitFor();
        await mkdir(
          fileURLToPath(new URL("../artifacts", import.meta.url)),
          { recursive: true },
        );
        await page.screenshot({
          path: fileURLToPath(
            new URL("../artifacts/tienda-escritorio.png", import.meta.url),
          ),
          fullPage: true,
        });
        await page
          .getByLabel("Buscar productos", { exact: true })
          .fill("DEMO-TALADRO");
        await page.getByRole("button", { name: "Buscar", exact: true }).click();
        await page.getByRole("heading", { name: "Nuestro catálogo" }).waitFor();
        await page.locator(".product-card").first().waitFor();
        await page
          .getByRole("heading", { name: "Taladro percutor 650 W" })
          .waitFor();
        assert.equal(await page.locator(".product-card").count(), 1);
        await page
          .getByRole("button", {
            name: "Guardar en favoritos: Taladro percutor 650 W",
          })
          .click();
        await page
          .getByRole("link", { name: "Mis favoritos", exact: true })
          .click();
        await page
          .getByRole("heading", { name: "Taladro percutor 650 W" })
          .waitFor();
        await page
          .getByRole("heading", { name: "Taladro percutor 650 W" })
          .getByRole("link")
          .click();
        await page
          .getByRole("heading", { level: 1, name: "Taladro percutor 650 W" })
          .waitFor();
        assert.match(await page.title(), /Taladro/);
        const structured = JSON.parse(
          await page
            .locator('script[type="application/ld+json"]')
            .textContent(),
        );
        assert.equal(structured.offers.priceCurrency, "CRC");
      });
      await step("Carrito persistente, registro y pedido real", async () => {
        await page
          .getByRole("button", { name: "Agregar al carrito +", exact: true })
          .click();
        await page.getByRole("link", { name: "Carrito 1" }).click();
        await page
          .getByRole("heading", { name: "Taladro percutor 650 W" })
          .waitFor();
        await page.reload();
        await page.getByLabel("Cantidad de Taladro percutor 650 W").fill("2");
        await page.getByLabel("Teléfono de contacto").fill("8888-8888");
        await page
          .getByRole("button", { name: "Iniciar sesión para continuar" })
          .click();
        await page
          .getByRole("button", { name: "Crear una cuenta nueva" })
          .click();
        await page.getByLabel("Nombre completo").fill("Cliente navegador");
        await page.getByLabel("Correo electrónico").fill("ui@example.test");
        await page.getByLabel("Contraseña", { exact: true }).fill(f.password);
        await page
          .getByRole("button", { name: "Crear cuenta", exact: true })
          .click();
        await page.getByRole("heading", { name: "Mi carrito" }).waitFor();
        await page.getByLabel("Teléfono de contacto").fill("8888-8888");
        await page.getByRole("button", { name: "Enviar solicitud" }).click();
        await page
          .getByRole("heading", { name: /Solicitud #\d+ registrada/ })
          .waitFor();
        await page.getByRole("link", { name: "Consultar mis pedidos" }).click();
        await page.getByRole("heading", { name: "Pedido #1" }).waitFor();
        const [[stock]] = await f.pool.query(
          "SELECT existencia FROM inventario WHERE producto_id=1",
        );
        assert.equal(stock.existencia, 8);
        await page.goto(f.config.publicUrl + "/admin");
        await page
          .getByRole("heading", { name: "Acceso restringido" })
          .waitFor();
      });
      await step(
        "Administrador: producto nuevo, entrada y gestión de pedido",
        async () => {
          await page.goto(f.config.publicUrl + "/cuenta");
          await page.getByRole("button", { name: "Cerrar sesión" }).click();
          await page
            .getByLabel("Correo electrónico")
            .fill("admin@example.test");
          await page.getByLabel("Contraseña", { exact: true }).fill(f.password);
          await page
            .getByRole("button", { name: "Iniciar sesión", exact: true })
            .click();
          await page
            .getByRole("heading", { name: "Administración", exact: true })
            .waitFor();
          await page
            .getByRole("button", { name: "Productos", exact: true })
            .click();
          await page.getByRole("button", { name: "Nuevo producto" }).click();
          await page
            .getByLabel("Nombre", { exact: true })
            .fill("Brocha de prueba UI");
          await page.getByLabel("SKU", { exact: true }).fill("UI-BROCHA");
          await page.getByLabel("Categoría", { exact: true }).selectOption("5");
          await page.getByLabel("Marca", { exact: true }).selectOption("1");
          await page.getByLabel("Precio en colones").fill("2500");
          await page.getByRole("button", { name: "Guardar producto" }).click();
          await page.getByText("Cambios guardados.", { exact: true }).waitFor();
          await page
            .getByRole("button", { name: "Inventario", exact: true })
            .click();
          await page
            .getByLabel("Producto", { exact: true })
            .selectOption({
              label: "UI-BROCHA · Brocha de prueba UI · Stock: 0",
            });
          await page.getByLabel("Cantidad (+ entrada / − salida)").fill("6");
          await page
            .getByLabel("Motivo", { exact: true })
            .fill("Entrada de prueba UI");
          await page
            .getByRole("button", { name: "Registrar movimiento" })
            .click();
          await page.getByText("Cambios guardados.", { exact: true }).waitFor();
          await page
            .getByRole("button", { name: "Pedidos", exact: true })
            .click();
          page.once("dialog", (dialog) => dialog.accept());
          await page
            .getByRole("button", { name: "confirmado", exact: true })
            .click();
          await page
            .locator(".status")
            .filter({ hasText: "confirmado" })
            .waitFor();
          await page
            .getByRole("button", { name: "Usuarios", exact: true })
            .click();
          await page
            .getByRole("heading", { name: "Usuarios y permisos" })
            .waitFor();
        },
      );
      await step(
        "Móvil: menú, filtros y páginas sin desbordamiento",
        async () => {
          await page.setViewportSize({ width: 390, height: 844 });
          await page.goto(f.config.publicUrl);
          await page.getByRole("button", { name: "Menú", exact: true }).click();
          await page
            .getByRole("navigation", { name: "Principal" })
            .getByRole("link", { name: "Catálogo", exact: true })
            .click();
          await page
            .getByRole("heading", { name: "Nuestro catálogo" })
            .waitFor();
          await page
            .getByRole("complementary")
            .getByLabel("Buscar", { exact: true })
            .fill("UI-BROCHA");
          await page
            .getByRole("heading", { name: "Brocha de prueba UI" })
            .waitFor();
          for (const route of [
            "/",
            "/catalogo",
            "/carrito",
            "/cuenta",
            "/contacto",
            "/admin",
          ]) {
            await page.goto(f.config.publicUrl + route);
            await page.locator("h1").first().waitFor();
            assert.equal(
              await page.evaluate(
                () => document.documentElement.scrollWidth <= window.innerWidth,
              ),
              true,
              `Desbordamiento en ${route}`,
            );
          }
          await page.goto(f.config.publicUrl);
          await page
            .getByRole("heading", {
              name: "Grandes proyectos. Buenas herramientas.",
            })
            .waitFor();
          await page.screenshot({
            path: fileURLToPath(
              new URL("../artifacts/tienda-movil.png", import.meta.url),
            ),
            fullPage: true,
          });
        },
      );
      assert.deepEqual(errors, []);
    } finally {
      if (browser) await browser.close();
      if (vite && vite.exitCode === null) {
        const exited = once(vite, "exit");
        vite.kill("SIGTERM");
        await exited;
      }
      await f.close();
    }
  },
);

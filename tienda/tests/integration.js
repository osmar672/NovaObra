import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { fixture, available } from "./helpers.js";
import { setup, verifySchema } from "../backend/schema.js";
test(
  "Tienda con MySQL real: seguridad, catálogo, inventario y pedidos",
  { skip: !available },
  async (t) => {
    const f = await fixture();
    const { pool, request } = f;
    let admin, employee, client, other, product, order;
    const post = (path, body, cookie, method = "POST") =>
      request(path, { method, body, cookie });
    const orderBody = (productId, extra = {}) => ({
      clave: randomUUID(),
      tipo: "pedido",
      entrega: "retiro",
      telefono: "8888-8888",
      lineas: [{ producto_id: productId, cantidad: 1 }],
      ...extra,
    });
    try {
      await t.test(
        "Diez tablas, relaciones y preparación repetible sin pérdida",
        async () => {
          await verifySchema(pool, f.database);
          const [[before]] = await pool.query(
            "SELECT COUNT(*) AS n FROM productos",
          );
          await setup(f.admin, f.database);
          const [[after]] = await pool.query(
            "SELECT COUNT(*) AS n FROM productos",
          );
          assert.equal(before.n, after.n);
          await assert.rejects(
            pool.query("INSERT INTO inventario (producto_id) VALUES (99999)"),
          );
          await assert.rejects(
            setup(f.admin, f.database, { seed: true }),
            /vacía/,
          );
        },
      );
      await t.test(
        "Acceso, registro sin escalada de rol y cookies privadas",
        async () => {
          const a = await f.login("admin@example.test");
          assert.equal(a.status, 200);
          admin = a.cookie;
          assert.match(a.headers.get("set-cookie"), /HttpOnly/);
          assert.match(a.headers.get("set-cookie"), /SameSite=Lax/);
          employee = (await f.login("empleado@example.test")).cookie;
          const c = await post("/api/auth/registro", {
            nombre: "Cliente prueba",
            email: "cliente@example.test",
            password: f.password,
            rol_id: 1,
          });
          assert.equal(c.status, 201);
          assert.equal(c.body.rol, "cliente");
          client = c.cookie;
          const o = await post("/api/auth/registro", {
            nombre: "Otro cliente",
            email: "otro@example.test",
            password: f.password,
          });
          other = o.cookie;
          assert.equal((await request("/api/admin/productos")).status, 401);
          assert.equal(
            (await request("/api/admin/productos", { cookie: client })).status,
            403,
          );
          assert.equal(
            (await request("/api/admin/usuarios", { cookie: employee })).status,
            403,
          );
          assert.equal(
            (
              await post("/api/auth/login", {
                email: "cliente@example.test",
                password: "incorrecta",
              })
            ).status,
            401,
          );
          const [[row]] = await pool.query(
            "SELECT password_hash FROM usuarios WHERE email='cliente@example.test'",
          );
          assert.match(row.password_hash, /^scrypt\$/);
          assert.notEqual(row.password_hash, f.password);
        },
      );
      await t.test(
        "CSRF y CORS: rechazo de origen ajeno y cabecera ausente",
        async () => {
          assert.equal(
            (
              await request("/api/auth/login", {
                method: "POST",
                body: { email: "admin@example.test", password: f.password },
                origin: "https://ajeno.example",
              })
            ).status,
            403,
          );
          assert.equal(
            (
              await request("/api/admin/inventario", {
                method: "POST",
                body: {},
                cookie: admin,
                header: false,
              })
            ).status,
            403,
          );
          const ok = await fetch(f.base + "/api/auth/login", {
            method: "OPTIONS",
            headers: { Origin: f.config.publicUrl },
          });
          assert.equal(ok.status, 204);
          assert.equal(
            ok.headers.get("access-control-allow-origin"),
            f.config.publicUrl,
          );
          const bad = await fetch(f.base + "/api/auth/login", {
            method: "OPTIONS",
            headers: { Origin: "https://ajeno.example" },
          });
          assert.equal(bad.status, 403);
        },
      );
      await t.test(
        "Productos, marcas, categorías, promociones y filtros reales",
        async () => {
          const category = await post(
              "/api/admin/categorias",
              { nombre: "Prueba técnica" },
              admin,
            ),
            brand = await post(
              "/api/admin/marcas",
              { nombre: "Marca prueba" },
              admin,
            );
          assert.equal(category.status, 201);
          const body = {
            categoria_id: category.body.id,
            marca_id: brand.body.id,
            sku: "TEST-1",
            nombre: "Herramienta de prueba",
            descripcion: "Para ensamblar",
            especificaciones: "Acero 12 mm",
            precio: "10000.25",
            precio_oferta: "8000.10",
            oferta_inicio: new Date(Date.now() - 60000).toISOString(),
            oferta_fin: new Date(Date.now() + 3600000).toISOString(),
            destacado: true,
            minimo: 2,
          };
          const result = await post("/api/admin/productos", body, admin);
          assert.equal(result.status, 201);
          product = result.body.id;
          const catalog = await request(
            "/api/productos?q=12%20mm&ofertas=1&min=8000&max=9000",
          );
          assert.equal(catalog.body.total, 1);
          assert.equal(catalog.body.items[0].precio_actual, 8000.1);
          assert.equal((await request("/api/productos?q=%25")).body.total, 0);
          assert.equal(
            (await request("/api/productos?categoria=1%20OR%201=1")).status,
            400,
          );
          assert.equal(
            (
              await post(
                `/api/admin/productos/${product}`,
                { ...body, precio_oferta: "11000" },
                admin,
                "PUT",
              )
            ).status,
            400,
          );
          assert.equal(
            (
              await post(
                `/api/admin/productos/${product}`,
                { ...body, imagen: "javascript:alert(1)" },
                admin,
                "PUT",
              )
            ).status,
            400,
          );
          assert.equal(
            (
              await post(
                `/api/admin/productos/${product}`,
                { ...body, nombre: "Herramienta editada" },
                admin,
                "PUT",
              )
            ).status,
            200,
          );
          assert.equal(
            (await request("/api/productos?q=Herramienta%20editada")).body
              .total,
            1,
          );
        },
      );
      await t.test(
        "Inventario: movimientos auditados y rollback de salidas inválidas",
        async () => {
          assert.equal(
            (
              await post(
                "/api/admin/inventario",
                {
                  producto_id: product,
                  cantidad: 3,
                  motivo: "Entrada de prueba",
                },
                employee,
              )
            ).status,
            201,
          );
          assert.equal(
            (
              await post(
                "/api/admin/inventario",
                {
                  producto_id: product,
                  cantidad: -4,
                  motivo: "Salida inválida",
                },
                admin,
              )
            ).status,
            409,
          );
          const [[stock]] = await pool.execute(
            "SELECT existencia FROM inventario WHERE producto_id=?",
            [product],
          );
          assert.equal(stock.existencia, 3);
          const [[count]] = await pool.execute(
            "SELECT COUNT(*) AS n FROM movimientos_inventario WHERE producto_id=?",
            [product],
          );
          assert.equal(count.n, 1);
        },
      );
      await t.test(
        "Pedido: precio del servidor, entrega, idempotencia y privacidad",
        async () => {
          const body = orderBody(product, {
            entrega: "domicilio",
            direccion: "Dirección de prueba",
            precio: 1,
            costo_entrega: 0,
          });
          const result = await post("/api/pedidos", body, client);
          assert.equal(result.status, 201);
          order = result.body.id;
          const retry = await post("/api/pedidos", body, client);
          assert.equal(retry.status, 200);
          assert.equal(retry.body.id, order);
          const list = await request("/api/pedidos", { cookie: client });
          assert.equal(list.body[0].total, 10500.1);
          assert.equal(list.body[0].costo_entrega, 2500);
          assert.equal(
            (await request("/api/pedidos", { cookie: other })).body.length,
            0,
          );
          assert.equal(
            (
              await post(
                "/api/pedidos",
                orderBody(product, {
                  lineas: [
                    { producto_id: product, cantidad: 1 },
                    { producto_id: product, cantidad: 1 },
                  ],
                }),
                client,
              )
            ).status,
            400,
          );
          assert.equal(
            (
              await post(
                `/api/admin/pedidos/${order}`,
                { estado: "cancelado" },
                client,
                "PATCH",
              )
            ).status,
            403,
          );
        },
      );
      await t.test(
        "Cancelación idempotente y transiciones sin saltos",
        async () => {
          assert.equal(
            (
              await post(
                `/api/admin/pedidos/${order}`,
                { estado: "entregado" },
                admin,
                "PATCH",
              )
            ).status,
            409,
          );
          for (let i = 0; i < 2; i++)
            assert.equal(
              (
                await post(
                  `/api/admin/pedidos/${order}`,
                  { estado: "cancelado" },
                  employee,
                  "PATCH",
                )
              ).status,
              200,
            );
          const [[stock]] = await pool.execute(
            "SELECT existencia FROM inventario WHERE producto_id=?",
            [product],
          );
          assert.equal(stock.existencia, 3);
          assert.equal(
            (
              await post(
                `/api/admin/pedidos/${order}`,
                { estado: "confirmado" },
                admin,
                "PATCH",
              )
            ).status,
            409,
          );
        },
      );
      await t.test(
        "Concurrencia: no sobreventa, rollback y reintentos simultáneos",
        async () => {
          await post(
            "/api/admin/inventario",
            {
              producto_id: product,
              cantidad: -2,
              motivo: "Preparar prueba de concurrencia",
            },
            admin,
          );
          const results = await Promise.all([
            post("/api/pedidos", orderBody(product), client),
            post("/api/pedidos", orderBody(product), other),
          ]);
          assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
          const [[stock]] = await pool.execute(
            "SELECT existencia FROM inventario WHERE producto_id=?",
            [product],
          );
          assert.equal(stock.existencia, 0);
          const winner = results.find((r) => r.status === 201).body.id;
          await post(
            `/api/admin/pedidos/${winner}`,
            { estado: "cancelado" },
            admin,
            "PATCH",
          );
          const same = orderBody(product);
          const duplicates = await Promise.all([
            post("/api/pedidos", same, client),
            post("/api/pedidos", same, client),
          ]);
          assert.deepEqual(duplicates.map((r) => r.status).sort(), [200, 201]);
          assert.equal(duplicates[0].body.id, duplicates[1].body.id);
          await post(
            `/api/admin/pedidos/${duplicates[0].body.id}`,
            { estado: "cancelado" },
            admin,
            "PATCH",
          );
        },
      );
      await t.test(
        "Cotizaciones sin reserva, promociones vencidas y existencias negativas",
        async () => {
          const quote = await post(
            "/api/pedidos",
            orderBody(product, {
              tipo: "cotizacion",
              lineas: [{ producto_id: product, cantidad: 10 }],
            }),
            client,
          );
          assert.equal(quote.status, 201);
          const [[stock]] = await pool.execute(
            "SELECT existencia FROM inventario WHERE producto_id=?",
            [product],
          );
          assert.equal(stock.existencia, 1);
          await pool.execute(
            "UPDATE productos SET oferta_inicio=DATE_SUB(UTC_TIMESTAMP(),INTERVAL 2 DAY),oferta_fin=DATE_SUB(UTC_TIMESTAMP(),INTERVAL 1 DAY) WHERE id=?",
            [product],
          );
          assert.equal(
            (await request(`/api/productos/${product}`)).body.precio_actual,
            10000.25,
          );
          await assert.rejects(
            pool.execute(
              "UPDATE inventario SET existencia=-1 WHERE producto_id=?",
              [product],
            ),
          );
        },
      );
      await t.test(
        "Entrega completada y reportes excluyen cotizaciones y cancelaciones",
        async () => {
          const result = await post("/api/pedidos", orderBody(product), client);
          assert.equal(result.status, 201);
          for (const estado of [
            "confirmado",
            "preparando",
            "listo",
            "entregado",
          ])
            assert.equal(
              (
                await post(
                  `/api/admin/pedidos/${result.body.id}`,
                  { estado },
                  admin,
                  "PATCH",
                )
              ).status,
              200,
            );
          const dashboard = await request("/api/admin/dashboard", {
            cookie: employee,
          });
          assert.equal(dashboard.body.ventas, 10000.25);
          assert.equal(dashboard.body.top[0].unidades, 1);
        },
      );
      await t.test(
        "SEO y desactivación: un producto oculto no figura en catálogo ni sitemap",
        async () => {
          assert.match(
            (await request("/sitemap.xml")).body,
            new RegExp(`/producto/${product}/`),
          );
          await pool.execute("UPDATE productos SET activo=0 WHERE id=?", [
            product,
          ]);
          assert.equal(
            (await request(`/api/productos/${product}`)).status,
            404,
          );
          assert.doesNotMatch(
            (await request("/sitemap.xml")).body,
            new RegExp(`/producto/${product}/`),
          );
          assert.match(
            (await request("/robots.txt")).body,
            /Disallow: \/admin/,
          );
        },
      );
      await t.test(
        "Revocación inmediata de sesiones y cierre seguro",
        async () => {
          const user = (await request("/api/auth/yo", { cookie: other })).body;
          assert.equal(
            (
              await post(
                `/api/admin/usuarios/${user.id}`,
                { rol_id: 3, activo: false },
                admin,
                "PATCH",
              )
            ).status,
            200,
          );
          assert.equal(
            (await request("/api/auth/yo", { cookie: other })).status,
            401,
          );
          assert.equal(
            (await post("/api/auth/logout", {}, client)).status,
            200,
          );
          assert.equal(
            (await request("/api/auth/yo", { cookie: client })).status,
            401,
          );
        },
      );
      await t.test(
        "Preparación rechaza una base con tablas ajenas",
        async () => {
          await pool.query("CREATE TABLE ajena (id INT PRIMARY KEY)");
          await assert.rejects(setup(f.admin, f.database), /ajenas/);
          await pool.query("DROP TABLE ajena");
        },
      );
      await t.test("Solicitudes mal formadas y límite de acceso", async () => {
        assert.equal((await post("/api/auth/registro", [])).status, 400);
        assert.equal(
          (
            await post("/api/auth/registro", {
              nombre: "Prueba",
              email: "invalido",
              password: "corta",
            })
          ).status,
          400,
        );
        let last;
        for (let i = 0; i < 31; i++)
          last = await post("/api/auth/login", {
            email: "nadie@example.test",
            password: "incorrecta",
          });
        assert.equal(last.status, 429);
        assert.ok(Number(last.headers.get("retry-after")) > 0);
      });
      await t.test(
        "Control detecta un esquema distinto antes de anunciarse listo",
        async () => {
          const result = await new Promise((resolve, reject) => {
            const child = spawn(process.execPath, ["src/server.js"], {
              cwd: new URL("../../backend/", import.meta.url),
              env: {
                ...process.env,
                DB_HOST: f.config.db.host,
                DB_PORT: String(f.config.db.port),
                DB_USER: f.config.db.user,
                DB_PASSWORD: f.config.db.password,
                DB_NAME: f.database,
                PORT: "0",
              },
              stdio: ["ignore", "pipe", "pipe"],
            });
            let output = "";
            for (const stream of [child.stdout, child.stderr])
              stream.on("data", (chunk) => (output += chunk));
            child.on("error", reject);
            child.on("close", (code) => resolve({ code, output }));
          });
          assert.equal(result.code, 1);
          assert.match(result.output, /SCHEMA_NOT_READY/);
          assert.match(result.output, /npm run db:setup -- --seed-if-empty/);
          assert.doesNotMatch(result.output, /NovaObra API en/);
        },
      );
    } finally {
      await f.close();
    }
  },
);

import express from "express";
import { fileURLToPath } from "node:url";
import { auth } from "./lib/auth.js";
import { check, id, AppError } from "./lib/validation.js";
import { authRoutes } from "./routes/auth.js";
import { adminRoutes } from "./routes/admin.js";
import { catalog, productSelect, visibleSQL } from "./services/catalog.js";
import { createOrder, orders } from "./services/orders.js";
import { verifySchema } from "./schema.js";
const xml = (value) =>
  String(value).replace(
    /[<>&"']/g,
    (c) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&apos;",
      })[c],
  );
export const slug = (value) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
export function createApp(pool, config) {
  const app = express(),
    access = auth(pool, config);
  app.disable("x-powered-by");
  app.use((req, res, next) => {
    res.set({
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "X-Frame-Options": "DENY",
      "Content-Security-Policy":
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
    });
    if (config.production)
      res.set("Strict-Transport-Security", "max-age=31536000");
    const origin = req.headers.origin;
    if (origin === config.publicUrl)
      res.set({
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Credentials": "true",
        Vary: "Origin",
      });
    if (req.method === "OPTIONS") {
      if (origin !== config.publicUrl) return res.sendStatus(403);
      res.set({
        "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,X-NovaObra-Request",
      });
      return res.sendStatus(204);
    }
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      // A custom header plus exact Origin protects even unauthenticated login/registration.
      if (
        origin !== config.publicUrl ||
        req.headers["x-novaobra-request"] !== "1"
      )
        return next(
          new AppError(
            403,
            "Origen de la solicitud no permitido. Recarga la tienda desde su dirección configurada.",
          ),
        );
      if (!req.is("application/json"))
        return next(new AppError(415, "Se requiere contenido JSON."));
    }
    next();
  });
  app.use(express.json({ limit: "64kb" }));
  app.use((req, res, next) => {
    if (
      !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
      (!req.body || typeof req.body !== "object" || Array.isArray(req.body))
    )
      return next(new AppError(400, "El cuerpo debe ser un objeto JSON."));
    next();
  });
  app.use("/api", (req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });
  app.get("/api/health", async (req, res) => {
    await verifySchema(pool, config.database);
    res.json({ ok: true });
  });
  app.get("/api/config", (_req, res) => res.json(config.business));
  app.use("/api/auth", authRoutes(pool, config, access));
  for (const table of ["categorias", "marcas"])
    app.get(`/api/${table}`, async (req, res) => {
      const [rows] = await pool.query(
        `SELECT id,nombre,descripcion FROM ${table} WHERE activo=1 ORDER BY nombre`,
      );
      res.json(rows);
    });
  app.get("/api/productos", async (req, res) =>
    res.json(await catalog(pool, req.query)),
  );
  app.get("/api/productos/:id", async (req, res) => {
    const [[row]] = await pool.execute(
      `${productSelect} WHERE p.id=? AND ${visibleSQL}`,
      [id(req.params.id)],
    );
    check(row, "Producto no encontrado.", 404);
    res.json(row);
  });
  app.get("/api/pedidos", access.requireUser, async (req, res) =>
    res.json(await orders(pool, req.user)),
  );
  app.post("/api/pedidos", ...access.roles("cliente"), async (req, res) => {
    const result = await createOrder(pool, config, req.user, req.body);
    res.status(result.repetido ? 200 : 201).json(result);
  });
  app.use("/api/admin", adminRoutes(pool, access));
  app.use("/api", (_req, _res, next) =>
    next(new AppError(404, "Ruta no encontrada.")),
  );
  app.get("/robots.txt", (_req, res) =>
    res
      .type("text")
      .send(
        `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /cuenta\nDisallow: /carrito\nDisallow: /api/\nSitemap: ${config.publicUrl}/sitemap.xml\n`,
      ),
  );
  app.get("/sitemap.xml", async (req, res) => {
    const [products] = await pool.query(
      `SELECT p.id,p.nombre FROM productos p JOIN categorias c ON c.id=p.categoria_id JOIN marcas m ON m.id=p.marca_id WHERE ${visibleSQL} ORDER BY p.id LIMIT 45000`,
    );
    const paths = [
      "/",
      "/catalogo",
      "/ofertas",
      "/nosotros",
      "/contacto",
      ...products.map((p) => `/producto/${p.id}/${slug(p.nombre)}`),
    ];
    res
      .type("application/xml")
      .send(
        `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map((path) => `<url><loc>${xml(config.publicUrl + path)}</loc></url>`).join("")}</urlset>`,
      );
  });
  const dist = fileURLToPath(new URL("../frontend/dist", import.meta.url));
  app.use(express.static(dist));
  app.get("/{*path}", (_req, res) => res.sendFile(`${dist}/index.html`));
  app.use((error, req, res, _next) => {
    const status =
      error.status ||
      ([
        "ER_DUP_ENTRY",
        "ER_NO_REFERENCED_ROW_2",
        "ER_ROW_IS_REFERENCED_2",
        "ER_LOCK_DEADLOCK",
        "ER_LOCK_WAIT_TIMEOUT",
      ].includes(error.code)
        ? 409
        : error.type === "entity.parse.failed"
          ? 400
          : error.code === "ER_NO_SUCH_TABLE"
            ? 503
            : 500);
    if (status >= 500) console.error("Tienda:", error.code || error.name);
    const message = error.status
      ? error.message
      : status === 409
        ? "Conflicto de datos. Comprueba duplicados y vuelve a intentarlo."
        : status === 503
          ? "Faltan tablas. Ejecuta npm run db:setup desde la raíz del proyecto."
          : status === 400
            ? "JSON no válido."
            : "No se pudo completar la operación. Revisa el servidor.";
    res.status(status).json({ error: message });
  });
  return app;
}

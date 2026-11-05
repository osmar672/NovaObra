import mysql from "mysql2/promise";
import { readFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { setup } from "../backend/src/schema.js";
import { createApp } from "../backend/src/app.js";
import { hashPassword } from "../backend/src/middlewares/authMiddleware.js";
import { createPool } from "../backend/src/db.js";
export const available = !!process.env.NOVAOBRA_TEST_ADMIN_FILE;
export async function fixture({ seed = true, overrides = {} } = {}) {
  const credentials = JSON.parse(
    await readFile(process.env.NOVAOBRA_TEST_ADMIN_FILE, "utf8"),
  );
  const db = {
    host: process.env.TEST_DB_HOST || "127.0.0.1",
    port: Number(process.env.TEST_DB_PORT || 3306),
    user: credentials.user,
    password: credentials.password,
    decimalNumbers: true,
    timezone: "Z",
  };
  const admin = await mysql.createConnection(db),
    database = `novaobra_shop_test_${randomBytes(6).toString("hex")}`;
  let pool, server;
  try {
    await setup(admin, database, { seed });
    pool = createPool({ ...db, database, connectionLimit: 12 });
    const password = randomBytes(20).toString("hex"),
      hash = await hashPassword(password);
    for (const [role, name] of [
      [1, "Admin"],
      [2, "Empleado"],
    ])
      await pool.execute(
        "INSERT INTO usuarios (rol_id,nombre,email,password_hash) VALUES (?,?,?,?)",
        [role, name, `${name.toLowerCase()}@example.test`, hash],
      );
    const config = {
      database,
      db: { ...db, database },
      publicUrl: "http://127.0.0.1:5174",
      secret: randomBytes(48).toString("hex"),
      production: false,
      business: {
        phone: "",
        whatsapp: "",
        email: "",
        address: "",
        about: "",
        deliveryFee: 2500,
      },
    };
    Object.assign(config,overrides);
    const tokens=new Map();
    const app = createApp(pool, config);
    server = await new Promise((resolve) => {
      const s = app.listen(0, "127.0.0.1", () => resolve(s));
    });
    const base = `http://127.0.0.1:${server.address().port}`;
    async function request(
      path,
      {
        method = "GET",
        body,
        cookie,
        token,
        origin = config.publicUrl,
        header = true,
      } = {},
    ) {
      const headers = {};
      if (cookie) headers.Cookie = cookie;
      if(token||tokens.has(cookie))headers.Authorization = `Bearer ${token || tokens.get(cookie)}`;
      if (body !== undefined) {
        headers["Content-Type"] = "application/json";
        if (origin) headers.Origin = origin;
        if (header) headers["X-NovaObra-Request"] = "1";
      }
      const response = await fetch(base + path, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      const content = response.headers.get("content-type")?.includes("json")
        ? await response.json()
        : await response.text();
      const responseCookie=response.headers.getSetCookie()[0]?.split(";")[0];
      if(content.token&&responseCookie)tokens.set(responseCookie,content.token);
      return {
        status: response.status,
        body: content,
        cookie: responseCookie,
        headers: response.headers,
      };
    }
    async function login(email) {
      return request("/api/auth/login", {
        method: "POST",
        body: { email, password },
      });
    }
    return {
      pool,
      admin,
      database,
      config,
      base,
      password,
      request,
      login,
      close: async () => {
        server.closeAllConnections();
        await new Promise((resolve) => server.close(resolve));
        await pool.end();
        await admin.query(`DROP DATABASE \`${database}\``);
        await admin.end();
      },
    };
  } catch (error) {
    if (server) server.close();
    if (pool) await pool.end();
    await admin.query(`DROP DATABASE IF EXISTS \`${database}\``);
    await admin.end();
    throw error;
  }
}

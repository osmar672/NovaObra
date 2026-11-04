import { app } from "./app.js";
import { pool } from "./config/db.js";
const host = process.env.HOST || "127.0.0.1",
  port = Number(process.env.PORT || 3001);
let server;
let phase = "MySQL";
try {
  await pool.query("SELECT 1");
  phase = "el servidor HTTP";
  // Express 5 can pass a bind error to a listen callback. Wait for the actual
  // listening event instead of reporting readiness merely because it was called.
  await new Promise((resolve, reject) => {
    server = app.listen(port, host);
    server.once("error", reject);
    server.once("listening", () => {
      server.off("error", reject);
      resolve();
    });
  });
  let closing = false;
  const shutdown = (code = 0) => {
    if (closing) return;
    closing = true;
    server.close(async () => {
      await pool.end();
      process.exitCode = code;
    });
  };
  server.on("error", (error) => {
    console.error("Fallo del servidor HTTP:", error.code || error.name);
    shutdown(1);
  });
  for (const signal of ["SIGINT", "SIGTERM"])
    process.on(signal, () => shutdown());
  console.log(`NovaObra API en ${host}:${server.address().port}`);
} catch (error) {
  console.error(`No se pudo iniciar ${phase}:`, error.code || error.name);
  await pool.end();
  process.exitCode = 1;
}

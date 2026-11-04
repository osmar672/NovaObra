import { createPool } from "./db.js";
import { configuration } from "./config.js";
import { createApp } from "./app.js";
import { verifySchema } from "./schema.js";
let pool;
try {
  const config = configuration();
  pool = createPool(config.db);
  await verifySchema(pool, config.database);
  const app = createApp(pool, config);
  const server = await new Promise((resolve, reject) => {
    const s = app.listen(config.port, config.host, () => resolve(s));
    s.once("error", reject);
  });
  console.log(
    `NovaObra Tienda API en http://${config.host}:${server.address().port}`,
  );
  let closing = false;
  for (const signal of ["SIGINT", "SIGTERM"])
    process.on(signal, () => {
      if (closing) return;
      closing = true;
      server.close(async () => {
        await pool.end();
      });
      server.closeIdleConnections();
    });
} catch (error) {
  console.error("No se pudo iniciar la tienda:", error.code || error.message);
  if (pool) await pool.end();
  process.exitCode = 1;
}

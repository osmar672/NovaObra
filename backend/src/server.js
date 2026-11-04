import { app } from "./app.js";
import { pool } from "./config/db.js";
const host = process.env.HOST || "127.0.0.1",
  port = Number(process.env.PORT || 3001);
try {
  await pool.query("SELECT 1");
  const server = app.listen(port, host, () =>
    console.log(`NovaObra API en ${host}:${port}`),
  );
  for (const signal of ["SIGINT", "SIGTERM"])
    process.on(signal, () =>
      server.close(async () => {
        await pool.end();
        process.exit(0);
      }),
    );
} catch (e) {
  console.error("No se pudo conectar a MySQL:", e.code || e.name);
  await pool.end();
  process.exitCode = 1;
}

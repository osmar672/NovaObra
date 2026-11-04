import { app } from "./app.js";
import { pool } from "./config/db.js";
import { verifyTables } from "../migrations/common.js";
import mysql from "mysql2/promise";
import { createSchema } from "../migrations/index.js";
import { databaseSettings } from "./config/settings.js";
import { identity, listen } from "./runtime.js";
const host = process.env.HOST || "127.0.0.1",
  port = Number(process.env.PORT || 3001);
let server;
let phase = "MySQL";
try {
  phase = "el esquema MySQL";
  try {
    await verifyTables(pool, process.env.DB_NAME || "NovaObra");
  } catch {
    const connection = await mysql.createConnection({...databaseSettings(),database:undefined,multipleStatements:true});
    try {
      await createSchema(connection,{database:databaseSettings().database});
      console.log("Tablas de NovaObra preparadas. Los registros existentes se conservaron.");
    } catch(error) {
      if(!error.code)error.code="SCHEMA_NOT_READY";
      throw error;
    } finally {await connection.end();}
  }
  phase = "el servidor HTTP";
  // Express 5 can pass a bind error to a listen callback. Wait for the actual
  // listening event instead of reporting readiness merely because it was called.
  server = await listen(app,host,port,identity(databaseSettings()));
  if(!server) {
    console.log(`NovaObra ya está ejecutándose en ${host}:${port}. Puedes iniciar el frontend en otra terminal con: cd ../frontend y npm run dev. Mantén abierta la terminal del backend original.`);
    await pool.end();
  } else {
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
  }
} catch (error) {
  console.error(`No se pudo iniciar ${phase}:`, error.code || error.name);
  if (["SCHEMA_NOT_READY","EADDRINUSE"].includes(error.code)) console.error(error.message);
  if(error.code==="SCHEMA_NOT_READY") console.error("Revisa DB_NAME en backend/.env; esa base debe ser exclusiva de NovaObra Control. Ejecuta npm run db:setup -- --seed-if-empty para obtener el diagnóstico.");
  if(error.code==="ER_ACCESS_DENIED_ERROR" || error.code==="ER_DBACCESS_DENIED_ERROR") console.error("Revisa las credenciales y permisos MySQL: ejecuta npm run db:configure dentro de backend.");
  if(error.code==="ECONNREFUSED") console.error("Inicia el servicio MySQL y revisa DB_HOST y DB_PORT en backend/.env.");
  await pool.end();
  process.exitCode = 1;
}

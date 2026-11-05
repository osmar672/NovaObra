import {createServer as httpsServer} from 'node:https';
import {createServer as httpServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import { createPool } from "./db.js";
import { configuration } from "./config.js";
import { createApp } from "./app.js";
import { verifySchema } from "./schema.js";
let pool,server,redirect;
try {
  const config = configuration();
  pool = createPool(config.db);
  await verifySchema(pool, config.database);
  const app = createApp(pool, config);
  const awaitCert=config.tls?await readFile(config.tls.cert):null,awaitKey=config.tls?await readFile(config.tls.key):null;
  server = await new Promise((resolve, reject) => {
    const s=config.tls?httpsServer({cert:awaitCert,key:awaitKey,minVersion:"TLSv1.2"},app):httpServer(app);
    s.listen(config.port, config.host, () => resolve(s));
    s.once("error", reject);
  });
  if(config.redirectPort){
    redirect=httpServer((req,res)=>{res.writeHead(308,{Location:config.publicUrl+(req.url.startsWith('/')?req.url:'/')});res.end();});
    await new Promise((resolve,reject)=>{redirect.once('error',reject);redirect.listen(config.redirectPort,config.host,resolve);});
  }
  console.log(
    `NovaObra Tienda API en ${config.tls?"https":"http"}://${config.host}:${server.address().port}`,
  );
  let closing = false;
  for (const signal of ["SIGINT", "SIGTERM"])
    process.on(signal, () => {
      if (closing) return;
      closing = true;
      redirect?.close();
      server.close(async () => {
        await pool.end();
      });
      server.closeIdleConnections();
    });
} catch (error) {
  console.error("No se pudo iniciar la tienda:", error.code || error.message);
  redirect?.close();
  server?.closeAllConnections();
  server?.close();
  if (pool) await pool.end();
  process.exitCode = 1;
}

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { configuration } from "./backend/src/config.js";
const cwd = fileURLToPath(new URL(".", import.meta.url));
const children = new Set();
let closing = false, keyboard;
async function stop(code = 0) {
  if (closing) return;
  closing = true;
  process.exitCode = code;
  if (keyboard) {
    process.stdin.removeListener("data", keyboard);
    process.stdin.setRawMode(false);
    process.stdin.pause();
  }
  await Promise.all([...children].map(child => new Promise(resolve => {
    if (child.exitCode !== null || child.signalCode !== null) return resolve();
    const timer = setTimeout(() => child.kill("SIGKILL"), 3000);
    timer.unref();
    child.once("close", () => { clearTimeout(timer); resolve(); });
    child.kill("SIGTERM");
  })));
}
function launch(args) {
  if (closing) throw new Error("Inicio cancelado.");
  const child = spawn(process.execPath, args, {
    cwd, stdio: ["ignore", "inherit", "inherit"], env: process.env,
  });
  children.add(child);
  child.once("error", () => { console.error("No se pudo abrir un servicio."); void stop(1); });
  child.once("close", () => {
    children.delete(child);
    if (!closing) { console.error("Un servicio terminó inesperadamente."); void stop(1); }
  });
}
function freePort(host, port) {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", () => reject(new Error(`Puerto ${port} no disponible. Cierra la otra instancia antes de iniciar.`)));
    server.listen(port, host, () => server.close(resolve));
  });
}
async function ready(url) {
  for (let attempt = 0; attempt < 60; attempt++) {
    if (closing) throw new Error("Inicio interrumpido.");
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1000) });
      if (response.ok && (await response.json()).ok === true) return;
    } catch {}
    await delay(250);
  }
  throw new Error("La API no respondió. Revisa MySQL y la configuración local.");
}
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => { void stop(); });
try {
  const config = configuration();
  if (config.production) throw new Error("Para producción usa npm run build y npm run serve detrás de HTTPS.");
  if (config.publicUrl !== "http://127.0.0.1:5174")
    throw new Error("El inicio local usa PUBLIC_URL=http://127.0.0.1:5174. Para otro origen usa npm run serve.");
  if (config.port === 5174) throw new Error("PORT no puede ser 5174: ese puerto corresponde a la interfaz.");
  if (config.port === 0) throw new Error("El iniciador necesita un PORT fijo entre 1 y 65535.");
  await freePort(config.host, config.port);
  await freePort("127.0.0.1", 5174);
  launch(["backend/src/server.js"]);
  await ready(`http://${config.host}:${config.port}/api/health`);
  launch(["node_modules/vite/bin/vite.js", "--config", "frontend/vite.config.js", "--clearScreen", "false"]);
  await ready("http://127.0.0.1:5174/api/health");
  if (process.stdin.isTTY) {
    keyboard = data => { if (data.toString().includes("\u0003")) { console.log("\nDeteniendo NovaObra..."); void stop(); } };
    process.stdin.setRawMode(true);
    process.stdin.on("data", keyboard);
    process.stdin.resume();
  }
  console.log("\nNovaObra lista en http://127.0.0.1:5174. Ctrl+C detiene ambos servicios.");
} catch (error) {
  if (!closing) {
    console.error(error.message);
    console.error("Si falta configuración, ejecuta npm run db:configure desde la raíz del proyecto.");
    await stop(1);
  }
}

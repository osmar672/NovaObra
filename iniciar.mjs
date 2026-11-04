import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile, access } from "node:fs/promises";
import { createServer } from "node:net";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { setTimeout as delay } from "node:timers/promises";

const root = dirname(fileURLToPath(import.meta.url));
const children = new Set();
let stopping = false;
let inputHandler;

async function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  if (inputHandler) {
    process.stdin.removeListener("data", inputHandler);
    process.stdin.setRawMode(false);
    process.stdin.pause();
  }
  await Promise.all([...children].map((child) => new Promise((resolve) => {
    if (child.exitCode !== null || child.signalCode !== null) return resolve();
    const timer = setTimeout(() => child.kill("SIGKILL"), 3000);
    timer.unref();
    child.once("close", () => { clearTimeout(timer); resolve(); });
    child.kill("SIGTERM");
  })));
}

for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => { void stop(); });

function launch(command, args, cwd, service = false, shell = false) {
  if (stopping) throw new Error("Inicio cancelado.");
  const child = spawn(command, args, {
    cwd,
    env: process.env,
    // El iniciador conserva el teclado; Vite no debe activar su propio modo raw.
    stdio: service ? ["ignore", "inherit", "inherit"] : "inherit",
    shell,
  });
  children.add(child);
  child.once("close", (code) => {
    children.delete(child);
    if (service && !stopping) {
      console.error(`Un servicio terminó (${code ?? "señal"}). Se detendrá la aplicación.`);
      void stop(code || 1);
    }
  });
  return child;
}

function run(command, args, cwd, shell = false) {
  return new Promise((resolve, reject) => {
    const child = launch(command, args, cwd, false, shell);
    child.once("error", () => reject(new Error("No se pudo ejecutar npm. Instala Node.js con npm y vuelve a intentarlo.")));
    child.once("close", (code) => code === 0 ? resolve() : reject(new Error("El paso anterior falló. Corrige el error indicado y vuelve a iniciar.")));
  });
}

async function exists(path) {
  try { await access(path); return true; } catch { return false; }
}

async function dependencies(directory, requiredFile) {
  const cwd = join(root, directory);
  const digest = createHash("sha256").update(await readFile(join(cwd, "package-lock.json"))).digest("hex");
  const marker = join(cwd, "node_modules", ".novaobra-lock");
  const installed = await readFile(marker, "utf8").catch(() => "");
  if (installed === digest && await exists(join(cwd, "node_modules", requiredFile))) return;
  console.log(`Instalando dependencias de ${directory} (requiere Internet la primera vez)...`);
  await run(process.platform === "win32" ? "npm.cmd" : "npm", ["ci", "--include=dev", "--no-audit", "--no-fund"], cwd, process.platform === "win32");
  await writeFile(marker, digest);
}

async function password() {
  if (process.env.DB_PASSWORD !== undefined) return process.env.DB_PASSWORD;
  if (!process.stdin.isTTY)
    throw new Error("Falta backend/.env. Inicia desde una terminal interactiva para configurar la contraseña, o define DB_PASSWORD en el entorno.");
  let muted = false;
  const output = new Writable({ write(chunk, encoding, done) {
    if (!muted) process.stdout.write(chunk, encoding);
    done();
  }});
  const rl = createInterface({ input: process.stdin, output, terminal: true });
  process.stdout.write("Contraseña de MySQL (se guardará solo en backend/.env): ");
  muted = true;
  try { return await rl.question(""); }
  finally { muted = false; rl.close(); process.stdout.write("\n"); }
}

function quote(value) {
  if (/[\r\n]/.test(value)) throw new Error("La contraseña debe ocupar una sola línea.");
  for (const delimiter of ["'", "`", '"']) {
    if (!value.includes(delimiter) && (delimiter !== '"' || !value.includes("\\")))
      return delimiter + value + delimiter;
  }
  throw new Error("Configura la contraseña directamente en backend/.env; contiene una combinación de comillas no admitida por el asistente.");
}

async function configure(localPassword) {
  const file = join(root, "backend", ".env");
  if (!await exists(file)) {
    let example = await readFile(join(root, "backend", ".env.example"), "utf8");
    // Las variables de sesión permiten automatizar una instalación sin guardar secretos en el código.
    for (const key of ["HOST", "PORT", "DB_HOST", "DB_PORT", "DB_USER", "DB_NAME", "CORS_ORIGIN"]) {
      if (process.env[key] !== undefined)
        example = example.replace(new RegExp(`^${key}=.*$`, "m"), () => `${key}=${quote(process.env[key])}`);
    }
    example = example.replace(/^DB_PASSWORD=.*$/m, () => `DB_PASSWORD=${quote(localPassword)}`);
    await writeFile(file, example, { mode: 0o600, flag: "wx" });
    console.log("Configuración local guardada en backend/.env (excluido de Git y del ZIP).");
  }
  const require = createRequire(join(root, "backend", "package.json"));
  require("dotenv").config({ path: file, quiet: true });
}

function freePort(host, port) {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", () => reject(new Error(`El puerto ${port} no está disponible. Cierra la otra instancia de NovaObra o revisa backend/.env.`)));
    server.listen(port, host, () => server.close(resolve));
  });
}

async function ready(url, check) {
  for (let attempt = 0; attempt < 60; attempt++) {
    if (stopping) throw new Error("Inicio interrumpido.");
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1000) });
      if (response.ok && await check(response)) return;
    } catch { /* El servicio aún puede estar iniciándose. */ }
    await delay(500);
  }
  throw new Error(`El servicio no respondió en ${url}. Revisa los mensajes anteriores.`);
}

function browser(url) {
  if (process.env.NOVAOBRA_NO_BROWSER === "1") return;
  const [command, args] = process.platform === "win32"
    ? ["cmd.exe", ["/d", "/c", "start", "", url]]
    : process.platform === "darwin" ? ["open", [url]] : ["xdg-open", [url]];
  const child = spawn(command, args, { stdio: "ignore", detached: true });
  child.on("error", () => {});
  child.unref();
}

function keyboard() {
  if (!process.stdin.isTTY) return;
  inputHandler = (data) => {
    if (data.includes(3)) {
      console.log("\nDeteniendo NovaObra...");
      void stop();
    }
  };
  process.stdin.setRawMode(true);
  process.stdin.on("data", inputHandler);
  process.stdin.resume();
}

try {
  const [major, minor] = process.versions.node.split(".").map(Number);
  if (major < 22 || (major === 22 && minor < 12))
    throw new Error("Se requiere Node.js 22.12 o posterior. Se recomienda Node.js 24 LTS.");
  console.log("NovaObra Control - inicio local");
  const localPassword = await exists(join(root, "backend", ".env")) ? undefined : await password();
  await dependencies("backend", "mysql2/package.json");
  await dependencies("frontend", "vite/bin/vite.js");
  await configure(localPassword);
  await run(process.execPath, ["scripts/database.js", "--seed-if-empty"], join(root, "backend"));
  if (!process.argv.includes("--setup")) {
    const host = process.env.HOST || "127.0.0.1";
    const port = Number(process.env.PORT || 3001);
    if (!Number.isInteger(port) || port < 1 || port > 65535)
      throw new Error("PORT debe estar entre 1 y 65535 en backend/.env.");
    const { compatibleApi, identity } = await import("./backend/src/runtime.js");
    const { databaseSettings } = await import("./backend/src/config/settings.js");
    const reuse = await compatibleApi(host, port, identity(databaseSettings()));
    if (!reuse) await freePort(host, port);
    await freePort("127.0.0.1", 5173);
    if (!reuse) {
      const api = launch(process.execPath, ["src/server.js"], join(root, "backend"), true);
      api.once("error", () => { console.error("No se pudo iniciar la API."); void stop(1); });
    } else console.log("Se utilizará el backend compatible que ya está iniciado. Mantén abierta su terminal.");
    await ready(`http://${host}:${port}/api/health`, async (response) => (await response.json()).database === "connected");
    const ui = launch(process.execPath, ["node_modules/vite/bin/vite.js"], join(root, "frontend"), true);
    ui.once("error", () => { console.error("No se pudo iniciar Vite."); void stop(1); });
    await ready("http://127.0.0.1:5173/api/health", async (response) => (await response.json()).database === "connected");
    keyboard();
    console.log("\nNovaObra lista en http://127.0.0.1:5173\nMantén esta ventana abierta. Pulsa Ctrl+C para detener ambos servicios.\n");
    browser("http://127.0.0.1:5173");
  }
} catch (error) {
  if (!stopping) {
    console.error(`\n${error.message}`);
    await stop(1);
  }
}

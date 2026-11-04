import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { configuration } from "./backend/config.js";
const cwd = fileURLToPath(new URL(".", import.meta.url));
try {
  const config = configuration();
  if (config.production)
    throw new Error(
      "Para producción usa npm run build y npm run serve detrás de HTTPS.",
    );
  if (config.publicUrl !== "http://127.0.0.1:5174")
    throw new Error(
      "El inicio local usa PUBLIC_URL=http://127.0.0.1:5174. Para servir el build con otro origen usa npm run serve.",
    );
  const children = [];
  let closing = false;
  function stop(code) {
    if (closing) return;
    closing = true;
    process.exitCode = code;
    for (const child of children)
      if (child.exitCode === null) child.kill("SIGTERM");
  }
  for (const args of [
    ["backend/server.js"],
    ["node_modules/vite/bin/vite.js", "--config", "frontend/vite.config.js"],
  ]) {
    const child = spawn(process.execPath, args, {
      cwd,
      stdio: "inherit",
      env: process.env,
    });
    children.push(child);
    child.on("error", (error) => {
      console.error(error.code || error.name);
      stop(1);
    });
    child.on("exit", (code) => stop(code || 0));
  }
  for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => stop(0));
} catch (error) {
  console.error(error.message);
  console.error("Primero ejecuta npm run db:configure dentro de tienda.");
  process.exitCode = 1;
}

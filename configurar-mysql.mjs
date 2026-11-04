import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const backend = join(root, "backend");
const [major, minor] = process.versions.node.split(".").map(Number);

function run(command, args, shell = false) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: backend,
      stdio: "inherit",
      shell,
    });
    child.once("error", () =>
      reject(
        new Error("No se pudo ejecutar Node.js/npm. Revisa su instalación."),
      ),
    );
    child.once("close", (code) => resolve(code ?? 1));
  });
}

try {
  if (major < 22 || (major === 22 && minor < 12))
    throw new Error(
      "Instala Node.js 22.12 o posterior; se recomienda Node.js 24 LTS.",
    );
  let installed = true;
  for (const name of ["mysql2", "dotenv"])
    try {
      await access(join(backend, "node_modules", name, "package.json"));
    } catch {
      installed = false;
    }
  if (!installed) {
    console.log(
      "Instalando las dependencias del backend para configurar MySQL...",
    );
    const code = await run(
      process.platform === "win32" ? "npm.cmd" : "npm",
      ["ci", "--no-audit", "--no-fund"],
      process.platform === "win32",
    );
    if (code !== 0)
      throw new Error(
        "No se pudieron instalar las dependencias. Revisa Internet y el mensaje anterior.",
      );
  }
  process.exitCode = await run(process.execPath, [
    "scripts/configure-mysql.js",
  ]);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}

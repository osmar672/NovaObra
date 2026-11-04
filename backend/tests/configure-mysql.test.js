import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import dotenv from "dotenv";
import { PassThrough, Writable } from "node:stream";
import {
  applicationEnvironment,
  configurationError,
  configureMysql,
  promptAdministrator,
  readConfiguration,
  saveEnvironment,
} from "../scripts/configure-mysql.js";

const example =
  "HOST=127.0.0.1\nDB_HOST=127.0.0.1\nDB_PORT=3306\nDB_NAME=NovaObra\nDB_USER=NovaObra\nDB_PASSWORD=\n";

test("Configuración local: respeta .env, usa valores de ejemplo y rechaza destinos no locales", () => {
  const parsed = readConfiguration(
    "DB_PORT=3307\nDB_NAME=Base_local\nDB_USER=cuenta\nDB_PASSWORD='local-test'",
    example,
  );
  assert.equal(parsed.host, "127.0.0.1");
  assert.equal(parsed.port, 3307);
  assert.equal(parsed.database, "Base_local");
  assert.equal(parsed.user, "cuenta");
  assert.equal(parsed.password, "local-test");
  for (const invalid of [
    "DB_PORT=0",
    "DB_PORT=3306.5",
    "DB_NAME=bad;DROP",
    "DB_NAME=_bad",
    "DB_HOST=example.com",
  ])
    assert.throws(() => readConfiguration(invalid, example));
});

test("Configuración local: conserva comentarios, CRLF y otras variables y reemplaza credenciales duplicadas", () => {
  const text =
    "# mi configuración\r\nPORT=4200\r\nDB_USER=antiguo\r\nDB_PASSWORD=vieja\r\nexport DB_USER=otro\r\nDB_PASSWORD=otra # antes\r\nCUSTOM='sin cambios'\r\n";
  const config = readConfiguration(text, example);
  const updated = applicationEnvironment(
    text,
    config,
    "novaobra_app_test",
    "N0v!randomtest",
  );
  assert.ok(updated.startsWith("# mi configuración\r\nPORT=4200\r\n"));
  assert.ok(updated.includes("CUSTOM='sin cambios'\r\n"));
  assert.equal(updated.match(/DB_USER='novaobra_app_test'/g).length, 2);
  assert.equal(updated.match(/DB_PASSWORD='N0v!randomtest'/g).length, 2);
  assert.equal(updated.replaceAll("\r\n", "").includes("\n"), false);
  assert.equal(dotenv.parse(updated).DB_HOST, "127.0.0.1");
  assert.equal(dotenv.parse(updated).DB_USER, "novaobra_app_test");
});

test("Configuración local: nunca divulga SQL ni mensajes originales que puedan incluir contraseñas", () => {
  for (const code of [
    "ER_ACCESS_DENIED_ERROR",
    "ER_SPECIFIC_ACCESS_DENIED_ERROR",
    "ER_NOT_VALID_PASSWORD",
    "UNKNOWN",
    "ECONNREFUSED",
  ]) {
    const safe = configurationError(
      Object.assign(
        new Error("sensitive-marker IDENTIFIED BY 'never-log-this'"),
        { code, sql: "sensitive-marker" },
      ),
    );
    assert.equal(JSON.stringify(safe).includes("sensitive-marker"), false);
    assert.equal(safe.message.includes("never-log-this"), false);
    assert.equal(safe.cause, undefined);
  }
});

test("Configuración local: rechaza contraseñas por entrada redirigida", async () => {
  await assert.rejects(
    promptAdministrator({ input: { isTTY: false }, output: { isTTY: true } }),
    { code: "INTERACTIVE_REQUIRED" },
  );
});

test("Configuración local: creación exclusiva evita sobreescribir un .env creado por otro proceso", async () => {
  const directory = await mkdtemp(join(tmpdir(), "novaobra-config-test-"));
  try {
    const path = join(directory, ".env");
    await writeFile(path, "CUSTOM=concurrent-change\n");
    await assert.rejects(saveEnvironment(path, null, "DB_USER=new-account\n"), {
      code: "ENV_CHANGED",
    });
    assert.equal(await readFile(path, "utf8"), "CUSTOM=concurrent-change\n");
    assert.deepEqual(await readdir(directory), [".env"]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("Configuración local: credenciales incorrectas conservan archivo y eliminan el bloqueo", async () => {
  const directory = await mkdtemp(join(tmpdir(), "novaobra-config-test-"));
  const envPath = join(directory, ".env"),
    examplePath = join(directory, ".env.example");
  try {
    const original = example + "CUSTOM=keep\n";
    await writeFile(envPath, original);
    await writeFile(examplePath, example);
    await assert.rejects(
      configureMysql({
        envPath,
        examplePath,
        admin: { user: "root", password: "unit-only-marker" },
        connect: async () => {
          throw Object.assign(new Error("unit-only-marker"), {
            code: "ER_ACCESS_DENIED_ERROR",
          });
        },
      }),
      { code: "ADMIN_ACCESS_DENIED" },
    );
    assert.equal(await readFile(envPath, "utf8"), original);
    assert.deepEqual((await readdir(directory)).sort(), [
      ".env",
      ".env.example",
    ]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("Configuración local: Ctrl+C cancela el formulario sin dejar la pregunta pendiente", async () => {
  const input = new PassThrough();
  input.isTTY = true;
  input.setRawMode = () => input;
  let seen = "";
  const output = new Writable({
    write(chunk, encoding, done) {
      seen += chunk.toString();
      done();
    },
  });
  output.isTTY = true;
  const pending = promptAdministrator({ input, output });
  input.write("\x03");
  await assert.rejects(pending, { code: "CONFIGURATION_CANCELLED" });
  assert.ok(seen.includes("Usuario administrador"));
  input.destroy();
  output.destroy();
});

test("Configuración local: la contraseña escrita no se devuelve en la salida de la terminal", async () => {
  const input = new PassThrough();
  input.isTTY = true;
  input.setRawMode = () => input;
  let seen = "";
  const output = new Writable({
    write(chunk, encoding, done) {
      seen += chunk.toString();
      done();
    },
  });
  output.isTTY = true;
  const pending = promptAdministrator({ input, output });
  input.write("\r");
  await new Promise((resolve) => setImmediate(resolve));
  const marker = "terminal-fixture-only!";
  input.write(marker + "\r");
  const result = await pending;
  assert.equal(result.user, "root");
  assert.equal(result.password, marker);
  assert.equal(seen.includes(marker), false);
  input.destroy();
  output.destroy();
});

import mysql from "mysql2/promise";
import dotenv from "dotenv";
import { readFile, writeFile, rename, unlink, open } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { ask } from "./prompt.js";
import { setup } from "../src/schema.js";
const envPath = new URL("../.env", import.meta.url),
  lockPath = new URL("../.env.configure.lock", import.meta.url),
  tempPath = new URL(
    `../.env.configure-${randomBytes(8).toString("hex")}.tmp`,
    import.meta.url,
  );
let connection,
  lock,
  newUser,
  createdUser = false,
  success = false;
try {
  lock = await open(lockPath, "wx", 0o600);
  const original = await readFile(envPath, "utf8").catch((error) => {
    if (error.code === "ENOENT") return null;
    throw error;
  });
  const values = dotenv.parse(
    original ||
      (await readFile(new URL("../.env.example", import.meta.url), "utf8")),
  );
  const database = values.DB_NAME || "NovaObraTienda",
    host = values.DB_HOST || "127.0.0.1";
  if (!["localhost", "127.0.0.1", "::1"].includes(host))
    throw new Error("Este asistente configura únicamente MySQL local.");
  if (!/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(database))
    throw new Error("DB_NAME no válido.");
  console.log(`Se preparará la base exclusiva de la tienda: ${database}.`);
  const admin =
    (await ask("Usuario administrador de MySQL [root]: ")).trim() || "root";
  const password = await ask(
    "Contraseña del administrador de MySQL (oculta): ",
    { secret: true },
  );
  connection = await mysql.createConnection({
    host,
    port: Number(values.DB_PORT || 3306),
    user: admin,
    password,
    connectTimeout: 10000,
  });
  await setup(connection, database);
  const [[client]] = await connection.query("SELECT USER() AS identity");
  const accountHost = client.identity.slice(
    client.identity.lastIndexOf("@") + 1,
  );
  if (!["localhost", "127.0.0.1", "::1"].includes(accountHost))
    throw new Error("MySQL no identifica la conexión como local.");
  newUser = `tienda_${randomBytes(8).toString("hex")}`;
  const appPassword = randomBytes(32).toString("base64url");
  await connection.query("CREATE USER ?@? IDENTIFIED BY ?", [
    newUser,
    accountHost,
    appPassword,
  ]);
  createdUser = true;
  // Escape grant wildcards as well as quoting the identifier.
  const grantDatabase = database.replaceAll("_", "\\_");
  await connection.query(
    `GRANT SELECT,INSERT,UPDATE,DELETE,CREATE,ALTER,INDEX,REFERENCES ON \`${grantDatabase}\`.* TO ?@?`,
    [newUser, accountHost],
  );
  const probe = await mysql.createConnection({
    host,
    port: Number(values.DB_PORT || 3306),
    user: newUser,
    password: appPassword,
    database,
  });
  await probe.query("SELECT 1");
  await probe.end();
  const settings = {
    ...values,
    DB_HOST: host,
    DB_PORT: values.DB_PORT || "3306",
    DB_NAME: database,
    DB_USER: newUser,
    DB_PASSWORD: appPassword,
    JWT_SECRET:
      (values.JWT_SECRET || values.SESSION_SECRET)?.length >= 48
        ? (values.JWT_SECRET || values.SESSION_SECRET)
        : randomBytes(48).toString("hex"),
  };
  const current = await readFile(envPath, "utf8").catch((error) => {
    if (error.code === "ENOENT") return null;
    throw error;
  });
  if (current !== original)
    throw new Error(
      "El archivo .env cambió durante la configuración. Revisa los cambios antes de repetir.",
    );
  await writeFile(
    tempPath,
    Object.entries(settings)
      .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
      .join("\n") + "\n",
    { flag: "wx", mode: 0o600 },
  );
  await rename(tempPath, envPath);
  success = true;
  console.log(
    "Tienda preparada: 12 tablas y una cuenta MySQL propia. La clave de root no se guardó.",
  );
  console.log(
    "Crea tu administrador web con npm run admin:create; luego ejecuta npm start.",
  );
} catch (error) {
  console.error("Configuración incompleta:", error.code || error.message);
  process.exitCode = 1;
} finally {
  if (connection) {
    if (createdUser && !success) {
      try {
        const [[client]] = await connection.query("SELECT USER() AS identity");
        await connection.query("DROP USER IF EXISTS ?@?", [
          newUser,
          client.identity.slice(client.identity.lastIndexOf("@") + 1),
        ]);
      } catch {
        console.error(
          "No se pudo retirar la cuenta MySQL temporal de este intento.",
        );
      }
    }
    await connection.end();
  }
  await unlink(tempPath).catch(() => {});
  if (lock) {
    await lock.close();
    await unlink(lockPath).catch(() => {});
  }
}

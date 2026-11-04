import mysql from "mysql2/promise";
import dotenv from "dotenv";
import { randomBytes } from "node:crypto";
import { constants } from "node:fs";
import {
  chmod,
  link,
  lstat,
  open,
  readFile,
  rename,
  unlink,
} from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { runMigrations } from "../migrations/index.js";
import {
  rejectForeignObjects,
  validateDatabase,
  verifyMysql,
  verifyTables,
} from "../migrations/common.js";

const backend = fileURLToPath(new URL("../", import.meta.url));
const accountPrefix = "novaobra_app_";
const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);

export class MysqlConfigurationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "MysqlConfigurationError";
    this.code = code;
  }
}

function failure(code, message) {
  return new MysqlConfigurationError(code, message);
}

// Driver errors may contain complete SQL, including IDENTIFIED BY. Never retain
// or display the original error or its cause outside this module.
export function configurationError(error) {
  if (error instanceof MysqlConfigurationError) return error;
  if (
    ["ER_ACCESS_DENIED_ERROR", "ER_ACCESS_DENIED_NO_PASSWORD_ERROR"].includes(
      error?.code,
    )
  )
    return failure(
      "ADMIN_ACCESS_DENIED",
      "MySQL rechazó el acceso del administrador. Comprueba su usuario y contraseña en este mismo servidor. La contraseña solicitada es la de MySQL, no la de Windows.",
    );
  if (
    [
      "ER_SPECIFIC_ACCESS_DENIED_ERROR",
      "ER_DBACCESS_DENIED_ERROR",
      "ER_TABLEACCESS_DENIED_ERROR",
    ].includes(error?.code)
  )
    return failure(
      "ADMIN_PRIVILEGES",
      "El administrador MySQL no tiene permisos suficientes para crear una cuenta y preparar esta base. Usa root u otro administrador con CREATE USER y permisos sobre la base, incluido GRANT OPTION.",
    );
  if (error?.code === "ER_NOT_VALID_PASSWORD")
    return failure(
      "PASSWORD_POLICY",
      "MySQL rechazó la contraseña generada por su política de contraseñas. Consulta al administrador; no se redujo la seguridad del servidor.",
    );
  if (
    ["ECONNREFUSED", "ENOTFOUND", "ETIMEDOUT", "EHOSTUNREACH"].includes(
      error?.code,
    )
  )
    return failure(
      "MYSQL_UNREACHABLE",
      "No se pudo conectar con MySQL. Comprueba que el servicio esté iniciado y que DB_HOST y DB_PORT sean correctos en backend/.env.",
    );
  if (["EACCES", "EPERM", "EROFS"].includes(error?.code))
    return failure(
      "ENV_PERMISSIONS",
      "No se pudo guardar backend/.env de forma privada. Comprueba los permisos de la carpeta y cierra los programas que bloquean el archivo.",
    );
  return failure(
    "CONFIGURATION_FAILED",
    "No se pudo completar la configuración de MySQL. Se conservó el archivo .env anterior y no se eliminaron bases ni registros. Comprueba la versión MySQL 8.0.16 o posterior y los permisos del administrador.",
  );
}

function schemaError(error) {
  if (/objetos ajenos/.test(error?.message))
    return failure(
      "FOREIGN_OBJECTS",
      "La base contiene objetos ajenos a NovaObra. No se modificaron sus tablas ni datos. Configura una base exclusiva en DB_NAME.",
    );
  if (/MySQL 8\.0\.16/.test(error?.message))
    return failure(
      "MYSQL_VERSION",
      "Se requiere MySQL 8.0.16 o posterior; MariaDB no es compatible.",
    );
  return error;
}

async function snapshot(path) {
  try {
    const info = await lstat(path, { bigint: true });
    if (!info.isFile() || info.isSymbolicLink())
      throw failure(
        "ENV_TYPE",
        "backend/.env debe ser un archivo local normal, sin enlaces simbólicos.",
      );
    const handle = await open(
      path,
      constants.O_RDONLY | (constants.O_NOFOLLOW || 0),
    );
    try {
      const opened = await handle.stat({ bigint: true });
      if (opened.ino !== info.ino || opened.dev !== info.dev)
        throw failure(
          "ENV_CHANGED",
          "backend/.env cambió durante la configuración. Vuelve a ejecutar el asistente.",
        );
      return {
        text: await handle.readFile("utf8"),
        ino: opened.ino,
        dev: opened.dev,
        mtimeNs: opened.mtimeNs,
        size: opened.size,
      };
    } finally {
      await handle.close();
    }
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

async function unchanged(path, previous) {
  const current = await snapshot(path);
  if (
    Boolean(current) !== Boolean(previous) ||
    (previous &&
      ["text", "ino", "dev", "mtimeNs", "size"].some(
        (key) => current[key] !== previous[key],
      ))
  )
    throw failure(
      "ENV_CHANGED",
      "backend/.env cambió durante la configuración. Se conservaron los cambios externos; vuelve a ejecutar el asistente.",
    );
}

export function readConfiguration(text, defaults = "") {
  const values = { ...dotenv.parse(defaults), ...dotenv.parse(text) };
  const host = values.DB_HOST || "127.0.0.1";
  if (!localHosts.has(host.toLowerCase()))
    throw failure(
      "LOCAL_MYSQL_ONLY",
      "Este asistente configura MySQL en tu propia computadora. Usa DB_HOST=127.0.0.1 o localhost; para un servidor remoto solicita la cuenta al administrador de ese servidor.",
    );
  const port = Number(values.DB_PORT || 3306);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw failure("INVALID_PORT", "DB_PORT debe estar entre 1 y 65535.");
  const database = values.DB_NAME || "NovaObra";
  try {
    validateDatabase(database);
  } catch {
    throw failure(
      "INVALID_DATABASE",
      "DB_NAME debe empezar por una letra y contener solo letras, números o guion bajo, con un máximo de 64 caracteres.",
    );
  }
  return {
    host,
    port,
    database,
    user: values.DB_USER || "NovaObra",
    password: values.DB_PASSWORD || "",
    connectTimeout: 10000,
  };
}

export function applicationEnvironment(text, config, user, password) {
  const newline = text.includes("\r\n") ? "\r\n" : "\n";
  const replacements = { DB_USER: user, DB_PASSWORD: password };
  let next = text.replace(
    /^([ \t]*(?:export[ \t]+)?)(DB_USER|DB_PASSWORD)[ \t]*=[^\r\n]*(\r?)$/gm,
    (_line, prefix, key, carriage) =>
      `${prefix}${key}='${replacements[key]}'${carriage}`,
  );
  const parsed = dotenv.parse(next);
  const missing = {
    DB_HOST: config.host,
    DB_PORT: String(config.port),
    DB_NAME: config.database,
    ...replacements,
  };
  for (const [key, value] of Object.entries(missing)) {
    if (Object.hasOwn(parsed, key)) continue;
    if (next && !next.endsWith("\n")) next += newline;
    next += `${key}='${value}'${newline}`;
  }
  return next;
}

// A lock serializes assistant instances. Snapshot comparison additionally rejects
// edits made by an editor while MySQL setup was running. Rename publishes only a
// complete file; link provides exclusive creation when .env did not exist.
export async function saveEnvironment(path, previous, text) {
  const temporary = resolve(
    dirname(path),
    `.env.configure-${randomBytes(10).toString("hex")}.tmp`,
  );
  let handle;
  try {
    handle = await open(temporary, "wx", 0o600);
    await handle.writeFile(text, "utf8");
    await handle.sync();
    await handle.close();
    handle = undefined;
    await unchanged(path, previous);
    if (previous) await rename(temporary, path);
    else {
      try {
        await link(temporary, path);
      } catch (error) {
        if (error.code === "EEXIST")
          throw failure(
            "ENV_CHANGED",
            "Otro proceso creó backend/.env. Se conservó su archivo; vuelve a ejecutar el asistente.",
          );
        throw error;
      }
    }
  } finally {
    if (handle) await handle.close().catch(() => {});
    await unlink(temporary).catch(() => {});
  }
}

async function close(connection) {
  if (connection) await connection.end().catch(() => {});
}

async function hasLimitedGrants(connection, database) {
  const [rows] = await connection.query("SHOW GRANTS FOR CURRENT_USER()");
  const scope = mysql.escapeId(database.replace(/_/g, "\\_")) + ".*";
  return (
    rows.length > 0 &&
    rows.every((row) => {
      const grant = String(Object.values(row)[0]);
      if (/WITH GRANT OPTION/i.test(grant)) return false;
      if (/^GRANT USAGE ON \*\.\* TO /i.test(grant)) return true;
      return grant.startsWith("GRANT ") && grant.includes(` ON ${scope} TO `);
    })
  );
}

/** Local-only API. admin can be {user,password} or an async interactive provider.
 * No credentials are returned. Tests may inject connect without using a server. */
export async function configureMysql({
  envPath = resolve(backend, ".env"),
  examplePath = resolve(backend, ".env.example"),
  admin,
  onProgress = () => {},
  connect = mysql.createConnection,
} = {}) {
  let lock,
    administrator,
    application,
    created,
    committed = false;
  const lockPath = `${envPath}.configure.lock`;
  try {
    try {
      lock = await open(lockPath, "wx", 0o600);
    } catch (error) {
      if (error.code === "EEXIST")
        throw failure(
          "CONFIGURATION_BUSY",
          "Otro asistente está configurando MySQL. Cierra ese proceso y vuelve a intentarlo. Si ya terminó, elimina únicamente backend/.env.configure.lock.",
        );
      throw error;
    }
    const previous = await snapshot(envPath);
    const defaults = await readFile(examplePath, "utf8");
    const source = previous?.text ?? defaults;
    const config = readConfiguration(source, defaults);
    const base = {
      host: config.host,
      port: config.port,
      connectTimeout: config.connectTimeout,
      multipleStatements: true,
    };

    // Only accounts created by this assistant qualify for automatic reuse. Root
    // and other existing accounts are never adopted as application identities.
    if (previous && config.user.startsWith(accountPrefix)) {
      try {
        application = await connect({
          ...base,
          database: config.database,
          user: config.user,
          password: config.password,
        });
        if (!(await hasLimitedGrants(application, config.database)))
          throw failure(
            "UNSAFE_APPLICATION_ACCOUNT",
            "La cuenta configurada requiere sustituirse por una cuenta exclusiva de esta base.",
          );
        await verifyMysql(application);
        await rejectForeignObjects(application, config.database);
        await verifyTables(application, config.database);
        const result = await runMigrations(application, {
          database: config.database,
          seedIfEmpty: true,
        });
        await unchanged(envPath, previous);
        await chmod(envPath, 0o600);
        return {
          database: config.database,
          user: config.user,
          reused: true,
          tables: 10,
          seeded: result.steps.includes("002_seed_data"),
        };
      } catch (error) {
        const safe = schemaError(error);
        if (
          safe instanceof MysqlConfigurationError &&
          safe.code !== "UNSAFE_APPLICATION_ACCOUNT"
        )
          throw safe;
        if (
          safe.code !== "UNSAFE_APPLICATION_ACCOUNT" &&
          ![
            "ER_ACCESS_DENIED_ERROR",
            "ER_BAD_DB_ERROR",
            "ER_DBACCESS_DENIED_ERROR",
            "ER_TABLEACCESS_DENIED_ERROR",
          ].includes(error.code) &&
          !/diez tablas/.test(error.message)
        )
          throw error;
      } finally {
        await close(application);
        application = undefined;
      }
    }

    const credentials = typeof admin === "function" ? await admin() : admin;
    if (
      !credentials ||
      typeof credentials.user !== "string" ||
      !credentials.user.trim() ||
      typeof credentials.password !== "string"
    )
      throw failure(
        "ADMIN_REQUIRED",
        "Introduce un usuario administrador MySQL y su contraseña en la terminal local.",
      );
    await onProgress("Comprobando el acceso del administrador MySQL...");
    administrator = await connect({
      ...base,
      user: credentials.user.trim(),
      password: credentials.password,
    });
    await verifyMysql(administrator);
    await rejectForeignObjects(administrator, config.database);
    const [[{ clientHost }]] = await administrator.query(
      "SELECT SUBSTRING_INDEX(USER(), '@', -1) AS clientHost",
    );
    if (!localHosts.has(String(clientHost).toLowerCase()))
      throw failure(
        "LOCAL_MYSQL_ONLY",
        "MySQL no identificó la conexión como local. Usa un servidor MySQL instalado en esta computadora y DB_HOST=127.0.0.1 o localhost.",
      );
    const user = `${accountPrefix}${randomBytes(6).toString("hex")}`;
    const password = `N0v!${randomBytes(32).toString("base64url")}`;
    await administrator.query("CREATE USER ?@? IDENTIFIED BY ?", [
      user,
      clientHost,
      password,
    ]);
    created = { user, host: clientHost };
    // Escape underscores: MySQL otherwise treats them as database wildcards in
    // GRANT, even inside a quoted identifier.
    const grantDatabase = config.database.replace(/_/g, "\\_");
    await administrator.query(
      "GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES ON ??.* TO ?@?",
      [grantDatabase, user, clientHost],
    );
    await onProgress(
      "Preparando las diez tablas y conservando los registros existentes...",
    );
    const result = await runMigrations(administrator, {
      database: config.database,
      seedIfEmpty: true,
    });
    application = await connect({
      ...base,
      database: config.database,
      user,
      password,
    });
    await verifyTables(application, config.database);
    for (const table of await verifyTables(application, config.database))
      await application.query("SELECT 1 FROM ??.?? LIMIT 1", [
        config.database,
        table,
      ]);
    await onProgress(
      "Cuenta de aplicación verificada; guardando la configuración local...",
    );
    await saveEnvironment(
      envPath,
      previous,
      applicationEnvironment(source, config, user, password),
    );
    committed = true;
    return {
      database: config.database,
      user,
      reused: false,
      tables: 10,
      seeded: result.steps.includes("002_seed_data"),
    };
  } catch (error) {
    let safe = configurationError(schemaError(error));
    if (created && administrator && !committed) {
      try {
        await administrator.query("DROP USER ?@?", [
          created.user,
          created.host,
        ]);
      } catch {
        safe = failure(
          "ACCOUNT_CLEANUP_REQUIRED",
          `${safe.message} No se pudo retirar la cuenta temporal ${created.user}; pide al administrador que elimine únicamente esa cuenta local. No se cambió ninguna cuenta anterior.`,
        );
      }
    }
    throw safe;
  } finally {
    await close(application);
    await close(administrator);
    if (lock) {
      await lock.close().catch(() => {});
      await unlink(lockPath).catch(() => {});
    }
  }
}

export async function promptAdministrator({
  input = process.stdin,
  output = process.stdout,
} = {}) {
  if (!input.isTTY || !output.isTTY)
    throw failure(
      "INTERACTIVE_REQUIRED",
      "Abre CONFIGURAR_MYSQL.bat o npm run configurar:mysql desde una terminal interactiva. Las contraseñas no se aceptan como argumentos ni por entrada redirigida.",
    );
  let muted = false;
  const hiddenOutput = new Writable({
    write(chunk, encoding, done) {
      if (!muted) output.write(chunk, encoding);
      done();
    },
  });
  const terminal = createInterface({
    input,
    output: hiddenOutput,
    terminal: true,
  });
  const cancellation = new AbortController();
  terminal.on("SIGINT", () => cancellation.abort());
  try {
    const user =
      (
        await terminal.question("Usuario administrador MySQL [root]: ", {
          signal: cancellation.signal,
        })
      ).trim() || "root";
    output.write(
      "Contraseña del administrador MySQL (oculta; no se guardará): ",
    );
    muted = true;
    const password = await terminal.question("", {
      signal: cancellation.signal,
    });
    output.write("\n");
    return { user, password };
  } catch (error) {
    if (error.name === "AbortError")
      throw failure(
        "CONFIGURATION_CANCELLED",
        "Configuración cancelada. No se guardó la contraseña del administrador.",
      );
    throw error;
  } finally {
    muted = false;
    terminal.close();
  }
}

export async function main() {
  try {
    if (process.argv.length > 2)
      throw failure(
        "NO_ARGUMENTS",
        "Ejecuta el asistente sin argumentos. La contraseña se solicita de forma oculta en la terminal local.",
      );
    console.log("NovaObra — configuración local de MySQL");
    const result = await configureMysql({
      admin: promptAdministrator,
      onProgress: (message) => console.log(message),
    });
    console.log(
      result.reused
        ? "La configuración existente funciona; se conservó la cuenta de aplicación."
        : "Conexión verificada. Se guardó una cuenta exclusiva de la aplicación en backend/.env.",
    );
    console.log(
      `Base: ${result.database}. Tablas: ${result.tables}. ${result.seeded ? "Datos iniciales cargados." : "Registros existentes conservados."}`,
    );
    console.log(
      "La contraseña del administrador no se guardó. Ya puedes iniciar NovaObra.",
    );
  } catch (error) {
    console.error(
      `No se pudo configurar MySQL: ${configurationError(error).message}`,
    );
    process.exitCode = 1;
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  await main();

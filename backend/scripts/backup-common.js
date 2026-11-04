import mysql from "mysql2/promise";
import { databaseSettings } from "../src/config/settings.js";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";

export const tables = [
  "categorias",
  "proveedores",
  "clientes",
  "empleados",
  "productos",
  "compras",
  "ventas",
  "detalle_compras",
  "detalle_ventas",
  "movimientos_inventario",
];
const maximumBytes = 256 * 1024 * 1024;
const marker = "-- NovaObra Control: respaldo SQL controlado v1\n";
const begin = "-- NOVAOBRA-DATOS-INICIO\n";
const end = "-- NOVAOBRA-DATOS-FIN\n";

export function settings() {
  return databaseSettings();
}

export function connection(config, selectDatabase = true) {
  return mysql.createConnection({
    ...config,
    ...(selectDatabase ? {} : { database: undefined }),
    dateStrings: true,
    decimalNumbers: true,
  });
}

export async function expectedSchema() {
  const full = (
    await readFile(
      new URL("../../database/schema.sql", import.meta.url),
      "utf8",
    )
  ).replaceAll("\r\n", "\n");
  const schema = full
    .replace(/^CREATE DATABASE[^;]+;\s*/i, "")
    .replace(/^USE\s+NovaObra;\s*/i, "")
    .trim();
  if (
    (schema.match(/CREATE TABLE IF NOT EXISTS/g) || []).length !== 10 ||
    /\b(?:DROP|TRUNCATE|USE|CREATE DATABASE)\b/i.test(schema)
  ) {
    throw new Error("El esquema de respaldo no corresponde a las diez tablas.");
  }
  return schema;
}

export async function verifyTables(c, requireEmpty = false) {
  const [rows] = await c.query("SHOW FULL TABLES");
  if (requireEmpty && rows.length) {
    throw new Error(
      "Restauración rechazada: el destino contiene tablas o vistas. Use una base nueva o sin tablas; no se modificó ningún objeto ni registro.",
    );
  }
  const names = rows.map((row) => Object.values(row)[0]);
  if (
    rows.some((row) => Object.values(row)[1] !== "BASE TABLE") ||
    names.some((name) => !tables.includes(name))
  ) {
    throw new Error(
      "La base contiene tablas o vistas ajenas a NovaObra; no se modificó su contenido.",
    );
  }
  if (
    !requireEmpty &&
    (names.length !== 10 || tables.some((name) => !names.includes(name)))
  ) {
    throw new Error("Se esperaban exactamente las diez tablas de NovaObra.");
  }
  const counts = {};
  for (const name of names) {
    const [[row]] = await c.query("SELECT COUNT(*) n FROM ??", [name]);
    counts[name] = Number(row.n);
  }
  return counts;
}

function option(value) {
  if (String(value).includes("\0"))
    throw new Error("La configuración MySQL contiene un carácter no admitido.");
  return (
    '"' +
    String(value)
      .replaceAll("\\", "\\\\")
      .replaceAll('"', '\\"')
      .replaceAll("\n", "\\n")
      .replaceAll("\r", "\\r")
      .replaceAll("\t", "\\t") +
    '"'
  );
}

function childEnvironment() {
  const env = { ...process.env };
  delete env.DB_PASSWORD;
  delete env.MYSQL_PWD;
  return env;
}

export async function runClient(executable, args, input) {
  return new Promise((resolve, reject) => {
    const process = spawn(executable, args, {
      shell: false,
      env: childEnvironment(),
      stdio: [input === undefined ? "ignore" : "pipe", "pipe", "pipe"],
    });
    const chunks = [];
    let bytes = 0;
    let failed;
    process.on("error", (error) =>
      reject(
        new Error(
          `No se pudo ejecutar el cliente MySQL (${error.code || "error"}). Configure MYSQL_PATH o MYSQLDUMP_PATH.`,
        ),
      ),
    );
    process.stdout.on("data", (chunk) => {
      bytes += chunk.length;
      if (bytes > maximumBytes) {
        failed = new Error(
          "El respaldo supera el límite de 256 MiB de esta herramienta académica.",
        );
        process.kill();
      } else chunks.push(chunk);
    });
    // Consume stderr without exposing credentials, SQL values or private paths.
    process.stderr.on("data", () => {});
    process.on("close", (code) => {
      if (failed) reject(failed);
      else if (code !== 0)
        reject(
          new Error(
            `El cliente MySQL terminó con código ${code}. Revise conexión, versión y permisos.`,
          ),
        );
      else resolve(Buffer.concat(chunks).toString("utf8"));
    });
    if (input !== undefined) {
      process.stdin.on("error", () => {}); // A server error may close stdin before the entire file is consumed.
      process.stdin.end(input);
    }
  });
}

export async function assertClient(executable) {
  const version = await runClient(executable, ["--version"]);
  if (!/\bVer\s+8\./i.test(version) || /MariaDB/i.test(version))
    throw new Error("Se requiere un cliente oficial compatible con MySQL 8.");
}

export async function withDefaults(config, fn) {
  const directory = await mkdtemp(join(tmpdir(), "novaobra-mysql-"));
  const file = join(directory, "client.cnf");
  try {
    await writeFile(
      file,
      `[client]\nhost=${option(config.host)}\nport=${config.port}\nuser=${option(config.user)}\npassword=${option(config.password)}\nprotocol=tcp\ndefault-character-set=utf8mb4\n`,
      { mode: 0o600, flag: "wx" },
    );
    return await fn(file);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

// Remove comments only outside literals and split statements only at real semicolons.
// Versioned mysqldump SET comments are intentionally discarded, never executed.
export function statements(sql) {
  const output = [];
  let current = "",
    quote = null;
  for (let i = 0; i < sql.length; i++) {
    const c = sql[i],
      next = sql[i + 1];
    if (quote) {
      current += c;
      if (c === "\\" && quote !== "`") {
        if (next === undefined) throw new Error("Literal SQL incompleto.");
        current += next;
        i++;
      } else if (c === quote) {
        if (next === quote) {
          current += next;
          i++;
        } else quote = null;
      }
      continue;
    }
    if (c === "'" || c === '"' || c === "`") {
      quote = c;
      current += c;
      continue;
    }
    if (c === "/" && next === "*") {
      const finish = sql.indexOf("*/", i + 2);
      if (finish < 0) throw new Error("Comentario SQL incompleto.");
      i = finish + 1;
      current += " ";
      continue;
    }
    if (
      c === "#" ||
      (c === "-" && next === "-" && /\s/.test(sql[i + 2] || " "))
    ) {
      const finish = sql.indexOf("\n", i + 1);
      if (finish < 0) break;
      i = finish;
      current += "\n";
      continue;
    }
    if (c === ";") {
      if (current.trim()) output.push(current.trim());
      current = "";
    } else current += c;
  }
  if (quote || current.trim())
    throw new Error("Sentencia SQL incompleta o sin terminador.");
  return output;
}

function literalList(input) {
  let index = 0,
    count = 0;
  const skip = () => {
    while (/\s/.test(input[index] || "") && index < input.length) index++;
  };
  while (index < input.length) {
    skip();
    if (input[index] === "'") {
      index++;
      let closed = false;
      while (index < input.length) {
        if (input[index] === "\\") {
          index += 2;
          continue;
        }
        if (input[index] === "'") {
          if (input[index + 1] === "'") {
            index += 2;
            continue;
          }
          index++;
          closed = true;
          break;
        }
        index++;
      }
      if (!closed) throw new Error("Cadena de respaldo incompleta.");
    } else {
      const match =
        /^(?:NULL\b|0x[0-9a-f]+\b|[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)/i.exec(
          input.slice(index),
        );
      if (!match)
        throw new Error("El respaldo contiene una expresión SQL no permitida.");
      index += match[0].length;
    }
    count++;
    skip();
    if (index === input.length) return count;
    if (input[index] !== ",")
      throw new Error("El respaldo contiene una expresión SQL no permitida.");
    index++;
    skip();
    if (index === input.length) throw new Error("Lista de datos incompleta.");
  }
  throw new Error("Lista de datos vacía.");
}

export function validateInsert(statement, columns) {
  const match =
    /^INSERT INTO `([a-z_]+)` \(([^)]+)\) VALUES \(([\s\S]*)\)$/i.exec(
      statement,
    );
  if (!match || !tables.includes(match[1]))
    throw new Error(
      "El respaldo contiene instrucciones o tablas no permitidas.",
    );
  const names = match[2]
    .split(",")
    .map((column) => /^`([a-z_]+)`$/.exec(column.trim())?.[1]);
  if (
    !names.length ||
    names.some((name) => !name || !columns[match[1]].includes(name)) ||
    new Set(names).size !== names.length
  )
    throw new Error("El respaldo contiene columnas no permitidas.");
  if (literalList(match[3]) !== names.length)
    throw new Error("El número de valores no coincide con sus columnas.");
  return match[1];
}

export function schemaColumns(schema) {
  const result = {};
  for (const name of tables) {
    const expression = new RegExp(
      `CREATE TABLE IF NOT EXISTS ${name} \\(([\\s\\S]*?)\\n\\) ENGINE=InnoDB;`,
    );
    const section = expression.exec(schema)?.[1];
    if (!section)
      throw new Error("No se pudo identificar el esquema de respaldo.");
    result[name] = [
      ...section.matchAll(
        /^\s*([a-z_]+)\s+(?:INT|VARCHAR|ENUM|DECIMAL|DATETIME|DATE)\b/gm,
      ),
    ].map((match) => match[1]);
  }
  return result;
}

export function dataStatements(data, schema) {
  const columns = schemaColumns(schema),
    groups = Object.fromEntries(tables.map((name) => [name, []]));
  for (const statement of statements(data)) {
    const name = validateInsert(statement, columns);
    groups[name].push(statement + ";");
  }
  return tables.flatMap((name) => groups[name]);
}

export function counterStatements(counters) {
  if (
    !Array.isArray(counters) ||
    counters.length !== tables.length ||
    counters.some(
      (value) =>
        !Number.isSafeInteger(value) || value < 1 || value > 4294967296,
    )
  ) {
    throw new Error("Contadores AUTO_INCREMENT inválidos en el respaldo.");
  }
  return tables
    .map(
      (table, i) => `ALTER TABLE \`${table}\` AUTO_INCREMENT=${counters[i]};`,
    )
    .join("\n");
}

export function encodeBackup(schema, inserts, counters = tables.map(() => 1)) {
  const data = inserts.join("\n") + "\n";
  const counterSql = counterStatements(counters);
  const digest = createHash("sha256")
    .update(schema + "\n" + counterSql + "\n" + data)
    .digest("hex");
  return (
    marker +
    `-- SHA256: ${digest}\n-- AUTO_INCREMENT: ${JSON.stringify(counters)}\n` +
    schema +
    "\n" +
    counterSql +
    "\n" +
    begin +
    data +
    end
  );
}

export function decodeBackup(sql, schema) {
  if (Buffer.byteLength(sql) > maximumBytes)
    throw new Error("El respaldo supera el límite de 256 MiB.");
  if (!sql.startsWith(marker))
    throw new Error(
      "Use un respaldo generado por db:backup; no se admite SQL arbitrario.",
    );
  const metadata =
    /^-- SHA256: ([0-9a-f]{64})\n-- AUTO_INCREMENT: (\[[^\n]+\])\n/.exec(
      sql.slice(marker.length),
    );
  if (!metadata)
    throw new Error("El respaldo no tiene una huella y contadores válidos.");
  let counters;
  try {
    counters = JSON.parse(metadata[2]);
  } catch {
    throw new Error("Contadores del respaldo inválidos.");
  }
  const counterSql = counterStatements(counters);
  const prefix =
    marker + metadata[0] + schema + "\n" + counterSql + "\n" + begin;
  if (!sql.startsWith(prefix) || !sql.endsWith(end))
    throw new Error(
      "El respaldo no coincide con el esquema y formato de esta versión.",
    );
  const data = sql.slice(prefix.length, -end.length);
  const digest = createHash("sha256")
    .update(schema + "\n" + counterSql + "\n" + data)
    .digest("hex");
  if (digest !== metadata[1])
    throw new Error(
      "El respaldo está modificado o incompleto (SHA256 inválido).",
    );
  return { inserts: dataStatements(data, schema), counters };
}

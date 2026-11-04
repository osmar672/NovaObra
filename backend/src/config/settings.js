import dotenv from "dotenv";

dotenv.config({ path: new URL("../../.env", import.meta.url), quiet: true });

export function databaseSettings() {
  const config = {
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "NovaObra",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "NovaObra",
    connectTimeout: 10000,
  };
  if (!/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(config.database))
    throw new Error("DB_NAME debe empezar por una letra y contener solo letras, números o guion bajo (máximo 64 caracteres).");
  if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535)
    throw new Error("DB_PORT debe ser un puerto válido entre 1 y 65535.");
  return config;
}

import test from "node:test";
import assert from "node:assert/strict";
import { credential } from "../backend/src/middlewares/validaciones.js";
import { hashPassword, verifyPassword } from "../backend/src/middlewares/authMiddleware.js";
import { promotionDate } from "../backend/src/services/catalog.js";
import { configuration } from "../backend/src/config.js";

test("La autenticación conserva todos los caracteres de la contraseña", async () => {
  const value = "  Una contraseña larga  ";
  const hash = await hashPassword(value);
  assert.equal(await verifyPassword(credential(value), hash), true);
  assert.equal(await verifyPassword(credential(value.trim()), hash), false);
  for (const invalid of [undefined, null, {}, "", "x".repeat(129)])
    assert.throws(() => credential(invalid), { status: 400 });
});

test("Las ofertas rechazan fechas inexistentes y fuera del rango de MySQL", () => {
  for (const value of ["2026-02-30T12:00Z", "2025-02-29T12:00Z", "2026-04-31T12:00Z", "2026-01-01T24:00Z", "0001-01-01T12:00Z"])
    assert.throws(() => promotionDate(value), { status: 400 });
  assert.equal(promotionDate("2024-02-29T12:30Z"), "2024-02-29 12:30:00");
  assert.equal(promotionDate("2026-11-05T12:30:25.123Z"), "2026-11-05 12:30:25");
});

test("La configuración rechaza puertos inválidos antes de abrir servicios", () => {
  const original = { ...process.env };
  try {
    process.env.SESSION_SECRET = "x".repeat(64);
    process.env.PUBLIC_URL = "http://127.0.0.1:5174";
    process.env.NODE_ENV = "test";
    process.env.PORT = "3003";
    process.env.DB_PORT = "3306";
    for (const name of ["PORT", "DB_PORT"]) {
      for (const value of ["-1", "65536", "abc", "3003.5", ...(name === "DB_PORT" ? ["0"] : [])]) {
        const previous = process.env[name];
        process.env[name] = value;
        assert.throws(() => configuration(), new RegExp(name));
        process.env[name] = previous;
      }
    }
  } finally {
    for (const key of Object.keys(process.env)) if (!(key in original)) delete process.env[key];
    Object.assign(process.env, original);
  }
});

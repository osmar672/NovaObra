import {
  randomBytes,
  scrypt as callbackScrypt,
  timingSafeEqual,
  createHmac,
} from "node:crypto";
import { promisify } from "node:util";
import { AppError, check } from "./validation.js";
const scrypt = promisify(callbackScrypt);
export async function hashPassword(value) {
  const salt = randomBytes(16).toString("hex");
  const key = await scrypt(value, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt}$${key.toString("hex")}`;
}
export async function verifyPassword(value, encoded) {
  const [algorithm, salt, hash] = encoded.split("$");
  if (algorithm !== "scrypt" || !/^[a-f0-9]{128}$/.test(hash || ""))
    return false;
  const key = await scrypt(value, salt, 64, { N: 16384, r: 8, p: 1 });
  return timingSafeEqual(key, Buffer.from(hash, "hex"));
}
export function issueToken(user, secret, now = Date.now()) {
  const payload = Buffer.from(
    JSON.stringify({
      id: user.id,
      v: user.version_sesion,
      exp: now + 8 * 3600000,
    }),
  ).toString("base64url");
  return `${payload}.${createHmac("sha256", secret).update(payload).digest("base64url")}`;
}
export function readToken(token, secret, now = Date.now()) {
  try {
    const [payload, sig, extra] = token.split(".");
    if (extra || !payload || !sig) return null;
    const expected = createHmac("sha256", secret).update(payload).digest();
    const actual = Buffer.from(sig, "base64url");
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
      return null;
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString());
    return Number.isInteger(parsed.id) &&
      Number.isInteger(parsed.v) &&
      parsed.exp > now
      ? parsed
      : null;
  } catch {
    return null;
  }
}
export function sessionCookie(res, token, production, clear = false) {
  res.cookie("novaobra_session", token, {
    httpOnly: true,
    secure: production,
    sameSite: "lax",
    path: "/",
    maxAge: clear ? 0 : 8 * 3600000,
  });
}
export function auth(pool, config) {
  const requireUser = async (req, res, next) => {
    try {
      const cookie = (req.headers.cookie || "")
        .split(";")
        .map((v) => v.trim())
        .find((v) => v.startsWith("novaobra_session="));
      const token = readToken(cookie?.slice(17) || "", config.secret);
      check(token, "Inicia sesión para continuar.", 401);
      const [[user]] = await pool.execute(
        "SELECT u.id,u.nombre,u.email,u.rol_id,u.version_sesion,r.nombre AS rol FROM usuarios u JOIN roles r ON r.id=u.rol_id WHERE u.id=? AND u.activo=1",
        [token.id],
      );
      check(
        user && user.version_sesion === token.v,
        "Tu sesión ha caducado. Inicia sesión de nuevo.",
        401,
      );
      req.user = user;
      next();
    } catch (error) {
      next(error);
    }
  };
  const roles = (...allowed) => [
    requireUser,
    (req, res, next) =>
      allowed.includes(req.user.rol)
        ? next()
        : next(new AppError(403, "No tienes permiso para esta operación.")),
  ];
  return { requireUser, roles };
}
// Single-process bounded limiter. Production with multiple replicas needs a shared store.
export function loginLimiter() {
  const entries = new Map();
  return (req, res, next) => {
    const now = Date.now();
    for (const [key, value] of entries)
      if (value.until <= now) entries.delete(key);
    const key = req.ip;
    const entry = entries.get(key) || { count: 0, until: now + 15 * 60000 };
    if (entries.size >= 10000 && !entries.has(key))
      return next(
        new AppError(429, "Demasiadas solicitudes. Intenta más tarde."),
      );
    entries.set(key, entry);
    entry.count++;
    if (entry.count > 30) {
      res.set("Retry-After", String(Math.ceil((entry.until - now) / 1000)));
      return next(new AppError(429, "Demasiados intentos. Espera 15 minutos."));
    }
    next();
  };
}

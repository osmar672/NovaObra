import jwt from "jsonwebtoken";
import {
  randomBytes,
  scrypt as callbackScrypt,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { AppError, check } from "./validaciones.js";
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
  return jwt.sign({ v: user.version_sesion, iat: Math.floor(now / 1000) }, secret, {
    algorithm: "HS256", subject: String(user.id), expiresIn: "8h", issuer: "NovaObra", audience: "NovaObra-client",
  });
}
export function readToken(token, secret, now = Date.now()) {
  try {
    const parsed = jwt.verify(token, secret, { algorithms: ["HS256"], issuer: "NovaObra", audience: "NovaObra-client", clockTimestamp: Math.floor(now / 1000) });
    const id = Number(parsed.sub);
    return Number.isSafeInteger(id) && id > 0 && Number.isInteger(parsed.v) ? { ...parsed, id } : null;
  } catch { return null; }
}
export function sessionCookie(res, token, production, clear = false) {
  const options = {
    httpOnly: true,
    secure: production,
    sameSite: "lax",
    path: "/",
  };
  if (clear) res.clearCookie("novaobra_session", options);
  else res.cookie("novaobra_session", token, { ...options, maxAge: 8 * 3600000 });
}
export function cookieToken(req) {
  const cookie = (req.headers.cookie || "").split(";").map(v => v.trim())
    .find(v => v.startsWith("novaobra_session="));
  try { return decodeURIComponent(cookie?.slice(17) || ""); } catch { return ""; }
}
export function auth(pool, config) {
  const authenticate = async (req, res, next, source = "auto") => {
    try {
      const authorization = req.headers.authorization;
      const bearer = typeof authorization === "string" && /^Bearer [^ ]+$/i.test(authorization) ? authorization.slice(7) : "";
      const value = source === "cookie" ? cookieToken(req) : authorization !== undefined ? bearer : cookieToken(req);
      const token = readToken(value, config.secret);
      check(token, "No autorizado", 401);
      const [[user]] = await pool.execute(
        "SELECT u.id,u.nombre,u.email,u.rol_id,u.version_sesion,u.creado AS fechaCreacion,r.nombre AS rol FROM usuarios u JOIN roles r ON r.id=u.rol_id WHERE u.id=? AND u.activo=1",
        [token.id],
      );
      check(
        user && user.version_sesion === token.v,
        "No autorizado",
        401,
      );
      req.user = user;
      req.authToken = value;
      next();
    } catch (error) {
      if (source === "cookie" && error.status === 401) sessionCookie(res, "", config.production, true);
      next(error);
    }
  };
  const requireUser = (req, res, next) => authenticate(req, res, next);
  const cookieCsrf = (req, res, next) => {
    if (req.headers.origin !== config.publicUrl || req.headers["x-novaobra-request"] !== "1")
      return next(new AppError(403, "Origen de la solicitud no permitido."));
    next();
  };
  const requireCookie = (req, res, next) => authenticate(req, res, next, "cookie");
  const roles = (...allowed) => [
    requireUser,
    (req, res, next) =>
      allowed.includes(req.user.rol)
        ? next()
        : next(new AppError(403, "No tienes permiso para esta operación.")),
  ];
  const requireBearer = (req, res, next) => {
    if (!/^Bearer [^ ]+$/i.test(req.headers.authorization || "")) return next(new AppError(401, "No autorizado"));
    return requireUser(req, res, next);
  };
  return { requireUser, requireBearer, requireCookie, cookieCsrf, roles };
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

import { HttpError } from "../middlewares/errors.js";
export function check(ok, msg) {
  if (!ok) throw new HttpError(400, msg);
}
export function id(value) {
  check(
    typeof value === "number" ||
      (typeof value === "string" && /^[0-9]+$/.test(value)),
    "Identificador inválido.",
  );
  const n = Number(value);
  check(
    Number.isSafeInteger(n) && n > 0 && n <= 4294967295,
    "Identificador inválido.",
  );
  return n;
}
export function quantity(v, positive = false) {
  check(
    typeof v === "number" &&
      Number.isInteger(v) &&
      v >= (positive ? 1 : 0) &&
      v <= 1000000,
    "Cantidad inválida (máximo 1000000).",
  );
  return v;
}
export function money(v) {
  check(
    typeof v === "number" &&
      Number.isFinite(v) &&
      v >= 0 &&
      v <= 9999999999.99 &&
      Math.abs(v * 100 - Math.round(v * 100)) < 0.001,
    "Precio inválido: use hasta dos decimales.",
  );
  return v;
}
export function text(v, max = 255, required = false) {
  check(
    typeof v === "string" &&
      v.length <= max &&
      (!required || v.trim().length > 0),
    "Texto vacío o demasiado largo.",
  );
  return v.trim();
}
export function record(body, fields) {
  check(
    body && typeof body === "object" && !Array.isArray(body),
    "Objeto JSON requerido.",
  );
  check(
    Object.keys(body).every((k) => Object.hasOwn(fields, k)),
    "Campos no permitidos.",
  );
  const out = {};
  for (const [k, t] of Object.entries(fields)) {
    let v = body[k];
    if (v === undefined && t === "active") v = "activo";
    if (t === "optional" || t === "email") {
      if (v === undefined || v === null || v === "") {
        out[k] = null;
        continue;
      }
    }
    if (t === "id") v = id(v);
    if (t === "quantity") v = quantity(v);
    if (t === "money") v = money(v);
    if (t === "text") v = text(v, 120, true);
    if (t === "optional") v = text(v);
    if (t === "email") {
      v = text(v);
      check(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Correo inválido.");
    }
    if (t === "active")
      check(["activo", "inactivo"].includes(v), "Estado inválido.");
    if (t === "date") {
      check(
        typeof v === "string" &&
          /^\d{4}-\d{2}-\d{2}$/.test(v) &&
          !Number.isNaN(Date.parse(v)) &&
          new Date(v).toISOString().slice(0, 10) === v,
        "Fecha inválida.",
      );
    }
    out[k] = v;
  }
  return out;
}

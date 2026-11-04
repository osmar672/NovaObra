export class AppError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export function check(condition, message, status = 400) {
  if (!condition) throw new AppError(status, message);
}
export function text(value, name, max = 160, required = true) {
  check(typeof value === "string", `${name}: debe ser texto.`);
  const clean = value.trim();
  check(
    (!required || clean.length > 0) && clean.length <= max,
    `${name}: longitud no válida (máximo ${max}).`,
  );
  return clean;
}
export function integer(value, name, min = 1, max = 1000000) {
  check(
    (typeof value === "number" ||
      (typeof value === "string" && /^-?\d+$/.test(value))) &&
      Number.isSafeInteger(Number(value)) &&
      Number(value) >= min &&
      Number(value) <= max,
    `${name}: número entero no válido.`,
  );
  return Number(value);
}
export const id = (value) => integer(value, "Identificador", 1, 4294967295);
export function cents(value, name = "Precio") {
  check(
    (typeof value === "string" || typeof value === "number") &&
      /^\d{1,8}(\.\d{1,2})?$/.test(String(value)),
    `${name}: importe no válido.`,
  );
  return Math.round(Number(value) * 100);
}
export function email(value) {
  const result = text(value, "Correo", 190).toLowerCase();
  check(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result), "Correo no válido.");
  return result;
}
export function password(value) {
  check(
    typeof value === "string" && value.length >= 12 && value.length <= 128,
    "La contraseña debe tener entre 12 y 128 caracteres.",
  );
  return value;
}
export function imageUrl(value = "") {
  const result = text(value, "Imagen", 1000, false);
  if (!result) return "";
  let url;
  try {
    url = new URL(result);
  } catch {
    throw new AppError(400, "Usa una URL HTTPS para la imagen.");
  }
  check(
    url.protocol === "https:" && !url.username && !url.password,
    "Usa una URL HTTPS para la imagen.",
  );
  return result;
}
export function flag(value, fallback = false) {
  if (value === undefined) return fallback;
  check(typeof value === "boolean", "El valor debe ser verdadero o falso.");
  return value;
}
export async function transaction(pool, action) {
  const c = await pool.getConnection();
  try {
    await c.beginTransaction();
    const result = await action(c);
    await c.commit();
    return result;
  } catch (error) {
    await c.rollback();
    throw error;
  } finally {
    c.release();
  }
}

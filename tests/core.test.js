import test from "node:test";
import assert from "node:assert/strict";
import {
  hashPassword,
  verifyPassword,
  issueToken,
  readToken,
} from "../backend/src/middlewares/authMiddleware.js";
import { cents, imageUrl, integer } from "../backend/src/middlewares/validaciones.js";
import { orderLines, allowedNext } from "../backend/src/services/orders.js";
test("Contraseñas: sal aleatoria y rechazo de contraseñas incorrectas", async () => {
  const value = "Una clave larga de prueba";
  const a = await hashPassword(value),
    b = await hashPassword(value);
  assert.notEqual(a, b);
  assert.equal(await verifyPassword(value, a), true);
  assert.equal(await verifyPassword("incorrecta", a), false);
  assert.equal(a.includes(value), false);
});
test("Sesiones: firma, expiración y contenido manipulados", () => {
  const user = { id: 1, version_sesion: 2 },
    secret = "x".repeat(64),
    now = 100000;
  const token = issueToken(user, secret, now);
  assert.equal(readToken(token, secret, now).id, 1);
  assert.equal(readToken(token, secret, now + 8 * 3600000), null);
  assert.equal(readToken(token + "x", secret, now), null);
  assert.equal(readToken(token, "otra clave", now), null);
  assert.equal(readToken("invalid", secret, now), null);
});
test("Validación estricta de importes, cantidades e imágenes", () => {
  assert.equal(cents("123.45"), 12345);
  for (const value of ["1e2", "-1", "1.001", true, null])
    assert.throws(() => cents(value));
  for (const value of [true, "1.5", "1 OR 1=1"])
    assert.throws(() => integer(value, "Cantidad"));
  for (const value of [
    "javascript:alert(1)",
    "http://example.com/a.jpg",
    "https://user:pass@example.com",
  ])
    assert.throws(() => imageUrl(value));
  assert.equal(
    imageUrl("https://example.com/a.webp"),
    "https://example.com/a.webp",
  );
});
test("Pedidos: duplicados, cantidades y transiciones válidas", () => {
  assert.throws(() =>
    orderLines([
      { producto_id: 1, cantidad: 1 },
      { producto_id: 1, cantidad: 2 },
    ]),
  );
  assert.throws(() => orderLines([{ producto_id: 1, cantidad: 0 }]));
  assert.deepEqual(
    allowedNext({ tipo: "pedido", estado: "preparando", entrega: "retiro" }),
    ["listo", "cancelado"],
  );
  assert.deepEqual(
    allowedNext({ tipo: "pedido", estado: "enviado", entrega: "domicilio" }),
    ["entregado"],
  );
  assert.deepEqual(
    allowedNext({ tipo: "cotizacion", estado: "confirmado" }),
    [],
  );
});

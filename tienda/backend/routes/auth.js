import { Router } from "express";
import {
  check,
  text,
  email,
  password,
  transaction,
} from "../lib/validation.js";
import {
  hashPassword,
  verifyPassword,
  issueToken,
  sessionCookie,
  loginLimiter,
} from "../lib/auth.js";
export function authRoutes(pool, config, access) {
  const router = Router(),
    limiter = loginLimiter();
  const dummyHash = hashPassword("unavailable-account-comparison");
  const respond = (res, user) => {
    sessionCookie(res, issueToken(user, config.secret), config.production);
    res.json({
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
    });
  };
  router.post("/registro", limiter, async (req, res) => {
    const name = text(req.body.nombre, "Nombre", 120),
      mail = email(req.body.email),
      hash = await hashPassword(password(req.body.password));
    const user = await transaction(pool, async (c) => {
      const [r] = await c.execute(
        "INSERT INTO usuarios (rol_id,nombre,email,password_hash) VALUES (3,?,?,?)",
        [name, mail, hash],
      );
      await c.execute("INSERT INTO clientes (usuario_id) VALUES (?)", [
        r.insertId,
      ]);
      return {
        id: r.insertId,
        nombre: name,
        email: mail,
        rol: "cliente",
        version_sesion: 0,
      };
    });
    res.status(201);
    respond(res, user);
  });
  router.post("/login", limiter, async (req, res) => {
    const mail = email(req.body.email),
      pass = text(req.body.password, "Contraseña", 128);
    const [[user]] = await pool.execute(
      "SELECT u.*,r.nombre AS rol FROM usuarios u JOIN roles r ON r.id=u.rol_id WHERE u.email=?",
      [mail],
    );
    const matches = await verifyPassword(
      pass,
      user?.password_hash || (await dummyHash),
    );
    check(matches && user?.activo, "Correo o contraseña incorrectos.", 401);
    respond(res, user);
  });
  router.get("/yo", access.requireUser, (req, res) =>
    res.json({
      id: req.user.id,
      nombre: req.user.nombre,
      email: req.user.email,
      rol: req.user.rol,
    }),
  );
  router.post("/logout", access.requireUser, async (req, res) => {
    await pool.execute(
      "UPDATE usuarios SET version_sesion=version_sesion+1 WHERE id=?",
      [req.user.id],
    );
    sessionCookie(res, "", config.production, true);
    res.json({ ok: true });
  });
  router.put("/password", access.requireUser, limiter, async (req, res) => {
    const [[user]] = await pool.execute(
      "SELECT password_hash FROM usuarios WHERE id=?",
      [req.user.id],
    );
    check(
      await verifyPassword(
        text(req.body.actual, "Contraseña actual", 128),
        user.password_hash,
      ),
      "Contraseña actual incorrecta.",
      400,
    );
    await pool.execute(
      "UPDATE usuarios SET password_hash=?,version_sesion=version_sesion+1 WHERE id=?",
      [await hashPassword(password(req.body.nueva)), req.user.id],
    );
    sessionCookie(res, "", config.production, true);
    res.json({ ok: true });
  });
  return router;
}

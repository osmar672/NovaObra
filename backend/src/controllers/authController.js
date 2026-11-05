import { check, text, email, password, credential } from '../middlewares/validaciones.js';
import { verifyPassword, issueToken, sessionCookie } from '../middlewares/authMiddleware.js';
import { createUser, publicUser } from '../models/usuario.js';
export function authController(pool, config) {
  const dummy = import('../middlewares/authMiddleware.js').then(m => m.hashPassword('unavailable-account-comparison'));
  const respond = (res, user) => {
    const token = issueToken(user, config.secret);
    sessionCookie(res, token, config.production);
    res.json({ token, usuario: publicUser(user) });
  };
  return {
    register: async (req, res) => {
      try {
        const user = await createUser(pool, text(req.body.nombre, 'Nombre', 120), email(req.body.correo ?? req.body.email), password(req.body.password));
        res.status(201);
        if (req.path === '/registro') return respond(res, user);
        res.json(publicUser(user));
      } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') { error.status = 400; error.message = 'El correo ya existe.'; }
        throw error;
      }
    },
    login: async (req, res) => {
      let mail, pass;
      try { mail = email(req.body.correo ?? req.body.email); pass = credential(req.body.password); }
      catch { check(false, 'Correo o contraseña incorrectos.', 401); }
      const [[user]] = await pool.execute('SELECT u.*,u.creado AS fechaCreacion,r.nombre AS rol FROM usuarios u JOIN roles r ON r.id=u.rol_id WHERE u.email=?', [mail]);
      check(await verifyPassword(pass, user?.password_hash || await dummy) && user?.activo, 'Correo o contraseña incorrectos.', 401);
      respond(res, user);
    },
    me: (req, res) => res.json(publicUser(req.user)),
    logout: async (req, res) => {
      await pool.execute('UPDATE usuarios SET version_sesion=version_sesion+1 WHERE id=?', [req.user.id]);
      sessionCookie(res, '', config.production, true); res.json({ ok: true });
    },
    changePassword: async (req, res) => {
      const [[user]] = await pool.execute('SELECT password_hash FROM usuarios WHERE id=?', [req.user.id]);
      check(await verifyPassword(credential(req.body.actual), user.password_hash), 'Contraseña actual incorrecta.');
      const { hashPassword } = await import('../middlewares/authMiddleware.js');
      await pool.execute('UPDATE usuarios SET password_hash=?,version_sesion=version_sesion+1 WHERE id=?', [await hashPassword(password(req.body.nueva)), req.user.id]);
      sessionCookie(res, '', config.production, true); res.json({ ok: true });
    },
  };
}

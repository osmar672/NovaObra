import { check, text, email, password, credential, transaction } from '../middlewares/validaciones.js';
import { verifyPassword, issueToken, refreshCookie, clearSessionCookies, cookieToken } from '../middlewares/authMiddleware.js';
import { createUser, publicUser } from '../models/usuario.js';
import {startSession,rotateSession,logoutSession,revokeUserSessions} from '../models/sesion.js';
export function authController(pool, config) {
  const dummy = import('../middlewares/authMiddleware.js').then(m => m.hashPassword('unavailable-account-comparison'));
  const respond = (res, session) => {
    const user=session.user;
    const token = issueToken(user, config.secret, Date.now(), config.accessTokenSeconds || 900);
    refreshCookie(res, session.value, config.secureCookies ?? config.production, session.expires);
    res.clearCookie("novaobra_session",{httpOnly:true,secure:Boolean(config.secureCookies ?? config.production),sameSite:"lax",path:"/"});
    res.json({ token, usuario: publicUser(user) });
  };
  return {
    register: async (req, res) => {
      try {
        const user = await createUser(pool, text(req.body.nombre, 'Nombre', 120), email(req.body.correo ?? req.body.email), password(req.body.password));
        res.status(201);
        if (req.path === '/registro') return respond(res, await startSession(pool,user,config));
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
      respond(res, await startSession(pool,user,config));
    },
    me: (req, res) => res.json(publicUser(req.user)),
    session: async (req,res) => {
      try { respond(res,await rotateSession(pool,cookieToken(req))); }
      catch(error){if(error.status===401)clearSessionCookies(res,config.secureCookies ?? config.production);throw error;}
    },
    logout: async (req,res) => {
      await logoutSession(pool,{user:req.user,value:cookieToken(req)});
      clearSessionCookies(res,config.secureCookies ?? config.production);res.json({ok:true});
    },
    changePassword: async (req, res) => {
      const { hashPassword } = await import('../middlewares/authMiddleware.js');
      const nextHash=await hashPassword(password(req.body.nueva));
      await transaction(pool,async c=>{
        const [[user]]=await c.execute('SELECT password_hash,version_sesion FROM usuarios WHERE id=? FOR UPDATE',[req.user.id]);
        check(user&&user.version_sesion===req.user.version_sesion,'No autorizado',401);
        check(await verifyPassword(credential(req.body.actual),user.password_hash),'Contraseña actual incorrecta.');
        await c.execute('UPDATE usuarios SET password_hash=?,version_sesion=version_sesion+1 WHERE id=?',[nextHash,req.user.id]);
        await revokeUserSessions(c,req.user.id);
      });
      clearSessionCookies(res,config.secureCookies ?? config.production);res.json({ok:true});
    },
  };
}

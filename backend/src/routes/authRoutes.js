import {googleRoutes} from './googleRoutes.js';
import { Router } from 'express';
import { authController } from '../controllers/authController.js';
import { loginLimiter } from '../middlewares/authMiddleware.js';
export function authRoutes(pool, config, access, adapters={}) {
  const router = Router(), c = authController(pool, config), limiter = loginLimiter();
  router.get('/options',(_req,res)=>res.json({googleEnabled:Boolean(config.google?.enabled)}));
  router.use('/google',googleRoutes(pool,config,access,adapters));
  router.post(['/register', '/registro'], limiter, c.register);
  router.post('/login', limiter, c.login);
  router.post(['/refresh','/session'], access.cookieCsrf, c.session);
  router.get('/me', access.requireBearer, c.me);
  router.get('/yo', access.requireUser, c.me);
  router.post('/logout', (req,res,next)=>req.headers.authorization!==undefined?access.requireBearer(req,res,next):access.cookieCsrf(req,res,next), c.logout);
  router.put('/password', access.requireUser, limiter, c.changePassword);
  return router;
}

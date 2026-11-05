import { Router } from 'express';
import { authController } from '../controllers/authController.js';
import { loginLimiter } from '../middlewares/authMiddleware.js';
export function authRoutes(pool, config, access) {
  const router = Router(), c = authController(pool, config), limiter = loginLimiter();
  router.post(['/register', '/registro'], limiter, c.register);
  router.post('/login', limiter, c.login);
  router.get('/me', access.requireBearer, c.me);
  router.get('/yo', access.requireUser, c.me);
  router.post('/logout', access.requireUser, c.logout);
  router.put('/password', access.requireUser, limiter, c.changePassword);
  return router;
}

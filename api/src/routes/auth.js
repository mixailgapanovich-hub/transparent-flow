import { Router } from 'express';
import { login, AUTH_COOKIE, COOKIE_OPTIONS } from '../services/authService.js';

const router = Router();
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// POST /api/auth/login — { email, password } → cookie + { user }
router.post('/login', wrap(async (req, res) => {
  const { email, password } = req.body ?? {};
  const { user, token } = await login(email, password);
  res.cookie(AUTH_COOKIE, token, COOKIE_OPTIONS);
  res.json({ user });
}));

// POST /api/auth/logout — гасим cookie
router.post('/logout', (_req, res) => {
  res.clearCookie(AUTH_COOKIE, { ...COOKIE_OPTIONS, maxAge: undefined });
  res.json({ ok: true });
});

// GET /api/auth/me — текущий юзер по cookie. Возвращает 401, если не авторизован.
router.get('/me', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Не авторизован' });
  res.json({ user: req.user });
});

export default router;

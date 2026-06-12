import { Router } from 'express';
import { login, updateOwnProfile, changeOwnPassword, AUTH_COOKIE, COOKIE_OPTIONS } from '../services/authService.js';

const router = Router();
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
const requireUser = (req, res, next) => (req.user ? next() : res.status(401).json({ error: 'Не авторизован' }));

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

// PATCH /api/auth/profile — сменить своё имя. Возвращает обновлённого юзера.
router.patch('/profile', requireUser, wrap(async (req, res) => {
  const user = await updateOwnProfile(req.user.id, { name: req.body?.name });
  res.json({ user });
}));

// POST /api/auth/change-password — { currentPassword, newPassword }.
router.post('/change-password', requireUser, wrap(async (req, res) => {
  const { currentPassword, newPassword } = req.body ?? {};
  res.json(await changeOwnPassword(req.user.id, currentPassword, newPassword));
}));

export default router;

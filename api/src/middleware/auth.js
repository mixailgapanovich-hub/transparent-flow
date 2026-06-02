// Middleware: вытаскивает JWT из cookie, кладёт юзера в req.user.
// Любой защищённый роут после этого может делать req.user.role и req.user.id.

import { AUTH_COOKIE, verifyToken, getUserById } from '../services/authService.js';

export async function attachUser(req, _res, next) {
  const token = req.cookies?.[AUTH_COOKIE];
  if (!token) return next();
  const payload = verifyToken(token);
  if (!payload) return next();
  const user = await getUserById(payload.sub);
  if (user) req.user = user;
  next();
}

/** Жёсткий guard: без req.user отдаём 401. */
export function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }
  next();
}

/** Guard администратора: ставится ПОСЛЕ requireAuth на мутирующих admin-роутах. */
export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Действие доступно только администратору' });
  }
  next();
}

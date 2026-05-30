// Центр уведомлений для PM. requireAuth монтируется в server.js.

import { Router } from 'express';
import { listForPm, pmUnreadCounts, markRead } from '../services/notificationsFeed.js';

const router = Router();
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// Лента PM. ?category=&unread=true&limit=&offset=
router.get('/', wrap(async (req, res) => {
  const { category, unread, limit, offset } = req.query;
  const rows = await listForPm(req.user.id, {
    category: category || null,
    unread: unread === 'true',
    limit: Math.min(Number(limit) || 30, 100),
    offset: Number(offset) || 0,
  });
  res.json(rows);
}));

// Счётчики непрочитанного (для бейджа на колокольчике и вкладках).
router.get('/unread-counts', wrap(async (req, res) => {
  res.json(await pmUnreadCounts(req.user.id));
}));

// Отметить прочитанным. body: { eventIds: [...] }
router.post('/read', wrap(async (req, res) => {
  const { eventIds } = req.body ?? {};
  res.json(await markRead({ type: 'user', id: req.user.id }, eventIds ?? []));
}));

export default router;

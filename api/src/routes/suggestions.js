// PM-обработка предложений задач от клиента.

import { Router } from 'express';
import { acceptSuggestion, rejectSuggestion } from '../services/notificationsFeed.js';

const router = Router();
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// Принять предложение → создать реальную задачу (backlog).
router.post('/:id/accept', wrap(async (req, res) => {
  const task = await acceptSuggestion(req.params.id, { actorId: req.user?.id ?? null });
  res.status(201).json(task);
}));

// Отклонить предложение.
router.post('/:id/reject', wrap(async (req, res) => {
  res.json(await rejectSuggestion(req.params.id));
}));

export default router;

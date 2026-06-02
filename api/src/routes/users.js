import { Router } from 'express';
import { listUsers, createUser, updateUser, resetPassword } from '../services/userService.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// GET доступен всем PM (нужен в выпадашке исполнителей).
router.get('/', wrap(async (_req, res) => {
  res.json(await listUsers());
}));

// Мутации — только админ.
router.post('/', requireAdmin, wrap(async (req, res) => {
  res.status(201).json(await createUser(req.body ?? {}));
}));

router.patch('/:id', requireAdmin, wrap(async (req, res) => {
  res.json(await updateUser(req.params.id, req.body ?? {}));
}));

router.post('/:id/reset-password', requireAdmin, wrap(async (req, res) => {
  res.json(await resetPassword(req.params.id, req.body?.password));
}));

export default router;

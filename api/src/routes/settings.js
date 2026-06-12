// Глобальные настройки агентства. GET — любому залогиненному, PUT — только admin.

import { Router } from 'express';
import { requireAdmin } from '../middleware/auth.js';
import { getSettings, updateSettings } from '../services/settingsService.js';

const router = Router();
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

router.get('/', wrap(async (_req, res) => {
  res.json(await getSettings());
}));

router.put('/', requireAdmin, wrap(async (req, res) => {
  res.json(await updateSettings(req.body ?? {}));
}));

export default router;

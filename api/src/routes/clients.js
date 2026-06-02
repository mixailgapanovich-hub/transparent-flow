// Управление клиентами: CRUD (admin) + генерация one-time Telegram onboarding токена.

import { Router } from 'express';
import { pool } from '../db/pool.js';
import { telegramState } from '../services/channels/telegram.js';
import { requireAdmin } from '../middleware/auth.js';
import { listClients, createClient, updateClient, deleteClient } from '../services/clientsAdminService.js';

const router = Router();
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// ── Админ-CRUD клиентов ──────────────────────────────────────────────────────
router.get('/', wrap(async (_req, res) => {
  res.json(await listClients());
}));

router.post('/', requireAdmin, wrap(async (req, res) => {
  res.status(201).json(await createClient(req.body ?? {}));
}));

router.patch('/:id', requireAdmin, wrap(async (req, res) => {
  res.json(await updateClient(req.params.id, req.body ?? {}));
}));

router.delete('/:id', requireAdmin, wrap(async (req, res) => {
  await deleteClient(req.params.id);
  res.status(204).end();
}));

/**
 * POST /api/clients/:clientId/telegram-onboarding
 * Генерирует one-time токен (TTL 24ч), возвращает deep-link.
 * Старые неиспользованные токены остаются — они истекут сами. Клиент увидит
 * «ссылка недействительна» только если использовал старую после создания новой.
 */
router.post('/:clientId/telegram-onboarding', async (req, res, next) => {
  try {
    const { clientId } = req.params;
    const check = await pool.query('SELECT id FROM clients WHERE id = $1', [clientId]);
    if (check.rowCount === 0) return res.status(404).json({ error: 'Client not found' });

    const result = await pool.query(
      `INSERT INTO client_telegram_onboarding (client_id) VALUES ($1) RETURNING token`,
      [clientId],
    );
    const { token } = result.rows[0];

    const botUsername = telegramState.botUsername || process.env.TELEGRAM_BOT_USERNAME || null;
    const link = botUsername ? `https://t.me/${botUsername}?start=${token}` : null;
    res.json({ link, token, botConfigured: !!botUsername });
  } catch (err) {
    next(err);
  }
});

export default router;

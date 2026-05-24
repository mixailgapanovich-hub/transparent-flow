// Управление клиентами — сейчас только генерация one-time Telegram onboarding токена.

import { Router } from 'express';
import { pool } from '../db/pool.js';
import { telegramState } from '../services/channels/telegram.js';

const router = Router();

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

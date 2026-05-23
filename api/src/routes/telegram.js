// Webhook + общий обработчик апдейтов от Telegram.
//
// Обрабатываем только команду /start <clientId> (deep-link от PM-а):
// клиент жмёт ссылку → бот видит /start <uuid> → сохраняем chat_id и приветствуем.

import { Router } from 'express';
import { pool } from '../db/pool.js';
import * as telegram from '../services/channels/telegram.js';

const SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || 'dev-webhook-secret';

/** Обработка одного update от Telegram. Используется и webhook, и polling. */
export async function handleUpdate(update) {
  const msg = update?.message;
  if (!msg) return;
  const text = (msg.text || '').trim();
  const chatId = String(msg.chat?.id ?? '');
  const username = msg.from?.username || null;

  if (!text.startsWith('/start')) return;
  const parts = text.split(/\s+/);
  const param = parts[1];

  if (!param) {
    await telegram.send(
      chatId,
      'Привет! Чтобы привязать этот чат к проекту, перейдите по deep-link от менеджера.',
    );
    return;
  }
  // param — это clientId (UUID)
  const result = await pool.query(
    `UPDATE clients
        SET telegram_chat_id = $1, telegram_username = $2
      WHERE id = $3
      RETURNING company_name`,
    [chatId, username, param],
  );
  if (result.rowCount === 0) {
    await telegram.send(chatId, 'Не удалось распознать ссылку. Проверьте у менеджера.');
    return;
  }
  const company = result.rows[0].company_name;
  await telegram.send(
    chatId,
    `Готово! Чат привязан к проекту «${company}». ` +
      'Здесь будут приходить уведомления по задачам.',
  );
}

const router = Router();

router.post('/webhook/:secret', async (req, res) => {
  if (req.params.secret !== SECRET) return res.status(404).end();
  res.json({ ok: true }); // быстро отвечаем, чтобы Telegram не ретраил
  try {
    await handleUpdate(req.body);
  } catch (err) {
    console.error('[telegram] webhook error:', err);
  }
});

export default router;

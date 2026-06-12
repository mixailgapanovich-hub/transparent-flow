// Webhook + общий обработчик апдейтов от Telegram.
//
// /start <token>: клиент жмёт one-time deep-link от PM-а → привязываем chat_id.
// Токены живут в client_telegram_onboarding (migration 003); каждый — разовый, TTL 24ч.
// Старый подход /start <clientId> убран — он позволял угнать уведомления по UUID.

import { Router } from 'express';
import { pool, withTransaction } from '../db/pool.js';
import * as telegram from '../services/channels/telegram.js';

const SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || 'dev-webhook-secret';

function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

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

  // Ищем one-time token. Сначала project-токен (несколько получателей на проект),
  // затем — старый client-токен (одна привязка). FOR UPDATE блокирует гонку двойного использования.
  const label = msg.from?.first_name || null;
  let company = null;
  try {
    await withTransaction(async (c) => {
      // 1) Project-onboarding (итерация 5): добавляем чат в получателей проекта.
      const projRes = await c.query(
        `SELECT pto.project_id, p.name AS project_name
           FROM project_telegram_onboarding pto
           JOIN projects p ON p.id = pto.project_id
          WHERE pto.token = $1::uuid AND pto.used_at IS NULL AND pto.expires_at > now()
          FOR UPDATE OF pto`,
        [param],
      );
      if (projRes.rowCount > 0) {
        const { project_id, project_name } = projRes.rows[0];
        await c.query(
          `INSERT INTO project_telegram_recipients (project_id, chat_id, username, label)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (project_id, chat_id)
           DO UPDATE SET username = EXCLUDED.username, label = EXCLUDED.label`,
          [project_id, chatId, username, label],
        );
        await c.query(
          `UPDATE project_telegram_onboarding SET used_at = now() WHERE token = $1::uuid`,
          [param],
        );
        company = project_name;
        return;
      }

      // 2) Старый client-токен (одна привязка на клиента).
      const tokenRes = await c.query(
        `SELECT client_id FROM client_telegram_onboarding
          WHERE token = $1::uuid AND used_at IS NULL AND expires_at > now()
          FOR UPDATE`,
        [param],
      );
      if (tokenRes.rowCount === 0) return; // company остаётся null → ответим «недействительна»

      const { client_id } = tokenRes.rows[0];
      const clientRes = await c.query(
        `UPDATE clients SET telegram_chat_id = $1, telegram_username = $2
          WHERE id = $3 RETURNING company_name`,
        [chatId, username, client_id],
      );
      await c.query(
        `UPDATE client_telegram_onboarding SET used_at = now() WHERE token = $1::uuid`,
        [param],
      );
      company = clientRes.rows[0]?.company_name ?? null;
    });
  } catch (err) {
    // $1::uuid выбросит ошибку если param не UUID-формат — это нормально.
    if (!err.message?.includes('invalid input syntax for type uuid')) {
      console.error('[telegram] handleUpdate error:', err);
    }
  }

  if (!company) {
    await telegram.send(
      chatId,
      'Ссылка недействительна или уже использована. Запросите новую у менеджера.',
    );
    return;
  }

  await telegram.send(
    chatId,
    `Готово! Чат привязан к проекту <b>«${escapeHtml(company)}»</b>. Здесь будут приходить уведомления по задачам.`,
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

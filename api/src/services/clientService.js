// Сервис клиентов: пока только onboarding-токены для Telegram-привязки.
// Полный CRUD клиентов выходит за скоуп этой итерации.

import { randomUUID } from 'node:crypto';
import { pool, withTransaction } from './../db/pool.js';
import { HttpError } from './taskService.js';

const ONBOARDING_TTL_HOURS = 24;

/**
 * Выдаёт одноразовый токен для привязки чата Telegram к клиенту.
 * Возвращает {token, expiresAt}. Сам deep-link строит роут.
 */
export async function issueTelegramOnboardingToken(clientId, { issuedBy = null } = {}) {
  const exists = await pool.query('SELECT 1 FROM clients WHERE id = $1', [clientId]);
  if (exists.rowCount === 0) throw new HttpError(404, 'Client not found');

  const token = randomUUID();
  const expiresAt = new Date(Date.now() + ONBOARDING_TTL_HOURS * 60 * 60 * 1000);

  await pool.query(
    `INSERT INTO client_telegram_onboarding (token, client_id, issued_by, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [token, clientId, issuedBy, expiresAt],
  );
  return { token, expiresAt };
}

/**
 * Принимает /start <token> от клиента. Атомарно: проверяем актуальность токена,
 * прописываем chat_id, гасим токен. Возвращает имя компании для приветствия —
 * либо null, если токен невалидный.
 */
export async function consumeTelegramOnboardingToken(token, chatId, username) {
  return withTransaction(async (c) => {
    const r = await c.query(
      `SELECT client_id, used_at, expires_at FROM client_telegram_onboarding
        WHERE token = $1 FOR UPDATE`,
      [token],
    );
    if (r.rowCount === 0) return null;
    const row = r.rows[0];
    if (row.used_at) return null;
    if (new Date(row.expires_at) < new Date()) return null;

    await c.query(
      `UPDATE clients
          SET telegram_chat_id = $1, telegram_username = $2
        WHERE id = $3`,
      [chatId, username, row.client_id],
    );
    await c.query(
      `UPDATE client_telegram_onboarding SET used_at = now() WHERE token = $1`,
      [token],
    );
    const company = await c.query(
      `SELECT company_name FROM clients WHERE id = $1`,
      [row.client_id],
    );
    return company.rows[0]?.company_name ?? null;
  });
}

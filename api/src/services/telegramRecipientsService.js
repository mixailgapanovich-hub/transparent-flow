// Получатели Telegram на уровне проекта (итерация 5): несколько чатов на проект,
// self-serve привязка через одноразовый project-onboarding токен.
//
// Совместимость: старый clients.telegram_chat_id остаётся рабочим — резолвер
// получателей подмешивает его к списку, поэтому уже привязанные клиенты не теряются.

import { pool } from '../db/pool.js';
import { telegramState } from './channels/telegram.js';
import { HttpError } from './taskService.js';

function botUsername() {
  return telegramState.botUsername || process.env.TELEGRAM_BOT_USERNAME || null;
}

/** Создаёт project-onboarding токен и возвращает deep-link на бота. */
export async function createProjectOnboarding(projectId) {
  const check = await pool.query('SELECT 1 FROM projects WHERE id = $1', [projectId]);
  if (check.rowCount === 0) throw new HttpError(404, 'Проект не найден');

  const res = await pool.query(
    `INSERT INTO project_telegram_onboarding (project_id) VALUES ($1) RETURNING token`,
    [projectId],
  );
  const { token } = res.rows[0];
  const uname = botUsername();
  return {
    token,
    link: uname ? `https://t.me/${uname}?start=${token}` : null,
    botConfigured: !!uname,
  };
}

/** Список получателей проекта (для UI кабинета). chat_id наружу не отдаём. */
export async function listProjectRecipients(projectId) {
  const res = await pool.query(
    `SELECT id, username, label, created_at
       FROM project_telegram_recipients
      WHERE project_id = $1
      ORDER BY created_at`,
    [projectId],
  );
  return res.rows.map((r) => ({
    id: r.id,
    username: r.username,
    label: r.label,
    createdAt: r.created_at,
  }));
}

/** Upsert получателя по (project_id, chat_id). Вызывается ботом при /start <token>. */
export async function addRecipient(projectId, { chatId, username, label }) {
  await pool.query(
    `INSERT INTO project_telegram_recipients (project_id, chat_id, username, label)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (project_id, chat_id)
     DO UPDATE SET username = EXCLUDED.username, label = EXCLUDED.label`,
    [projectId, chatId, username ?? null, label ?? null],
  );
}

/** Клиент удаляет получателя из своего проекта. */
export async function removeRecipient(projectId, recipientId) {
  const res = await pool.query(
    `DELETE FROM project_telegram_recipients WHERE id = $1 AND project_id = $2`,
    [recipientId, projectId],
  );
  if (res.rowCount === 0) throw new HttpError(404, 'Получатель не найден');
  return { ok: true };
}

/**
 * Все chat_id, которым надо доставлять уведомления по проекту:
 *   - получатели project_telegram_recipients
 *   - + легаси clients.telegram_chat_id (если задан и ещё не в списке)
 */
export async function resolveProjectChatIds(projectId) {
  const res = await pool.query(
    `SELECT chat_id FROM project_telegram_recipients WHERE project_id = $1
     UNION
     SELECT c.telegram_chat_id
       FROM projects p JOIN clients c ON c.id = p.client_id
      WHERE p.id = $1 AND c.telegram_chat_id IS NOT NULL`,
    [projectId],
  );
  return res.rows.map((r) => r.chat_id).filter(Boolean);
}

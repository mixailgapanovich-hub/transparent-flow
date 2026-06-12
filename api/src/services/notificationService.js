// Центральная логика каскада уведомлений (FR-04).
//
// Каждый тик:
//   1. Берём задачи в статусе 'waiting' с непустым magic_link_token и не истёкшим TTL.
//   2. Для каждой задачи смотрим, какой уровень был отправлен последним (по task_events).
//   3. Считаем бизнес-дни с момента перехода в waiting.
//   4. Решаем нужен ли следующий уровень. Если да — шлём через все нужные каналы
//      и атомарно записываем 'notification_sent' в task_events.
//   5. После уровня 3 + ещё одного бизнес-дня — финальное 'cascade_exhausted' с
//      внутренним уведомлением PM-у.
//
// Идемпотентность: вычисление "следующего уровня" опирается на максимальный уже
// записанный уровень, поэтому повторный вызов tick() в течение того же временного
// окна не делает повторных отправок.

import { pool, withTransaction } from '../db/pool.js';
import { businessDaysBetween } from './businessDays.js';
import {
  renderTemplate,
  renderCascadeExhausted,
  renderVerificationAct,
} from './notificationTemplates.js';
import * as telegram from './channels/telegram.js';
import * as email from './channels/email.js';
import { resolveProjectChatIds } from './telegramRecipientsService.js';

export const schedulerState = {
  running: false,
  lastTickAt: null,
  lastTickDurationMs: null,
  lastTickError: null,
  lastTickSummary: null, // { processed, sent, skipped }
};

/** Уровень → набор каналов (по таблице 3.12). */
const CHANNELS_BY_LEVEL = {
  1: ['telegram'],
  2: ['telegram', 'email'],
  3: ['telegram', 'email'],
};

/** Требуемый возраст waiting-задачи в РАБОЧИХ днях для каждого уровня. */
const REQUIRED_DAYS = { 1: 0, 2: 2, 3: 4 };
const CASCADE_EXHAUSTED_DAYS = 5;

/**
 * Получает «начало ожидания» для задачи. Берём самое позднее событие
 * 'magic_link_issued' либо 'status_change' → 'waiting'.
 */
async function getWaitingStartedAt(client, taskId) {
  const res = await client.query(
    `SELECT created_at FROM task_events
      WHERE task_id = $1
        AND event_type IN ('magic_link_issued', 'status_change')
        AND (event_type <> 'status_change' OR payload->>'to' = 'waiting')
      ORDER BY created_at DESC
      LIMIT 1`,
    [taskId],
  );
  return res.rows[0]?.created_at ?? null;
}

/**
 * Максимальный уровень, по которому была *попытка* (sent ИЛИ failed).
 * Failed-попытка считается «отработанной» — иначе при отключённом канале
 * каскад зацикливался бы на уровне 1 и никогда не доходил до 2/3.
 * Реальный статус доставки виден в payload событий, PM может ретригернуть вручную.
 */
async function getMaxAttemptedLevel(client, taskId) {
  const res = await client.query(
    `SELECT MAX((payload->>'level')::int) AS lvl
       FROM task_events
      WHERE task_id = $1
        AND event_type IN ('notification_sent', 'notification_failed')`,
    [taskId],
  );
  return res.rows[0]?.lvl ?? 0;
}

async function hasCascadeExhaustedFor(client, taskId) {
  const res = await client.query(
    `SELECT 1 FROM task_events
      WHERE task_id = $1 AND event_type = 'cascade_exhausted'
      LIMIT 1`,
    [taskId],
  );
  return res.rowCount > 0;
}

/**
 * Главный обработчик одной задачи: блокирует строку, выбирает следующий уровень,
 * шлёт, фиксирует событие. Принимает уже открытый transaction client.
 */
async function processOneTask(client, taskRow, now) {
  const taskId = taskRow.id;

  // Перепроверяем под FOR UPDATE — статус мог измениться между SELECT и блокировкой.
  const check = await client.query(
    `SELECT t.id, t.status, t.magic_link_token, t.magic_link_expires_at,
            t.title, t.deadline,
            p.id AS project_id, p.name AS project_name, p.slug AS project_slug,
            c.id AS client_id, c.contact_name, c.email AS client_email,
            c.telegram_chat_id
       FROM tasks t
       JOIN projects p ON p.id = t.project_id
       JOIN clients  c ON c.id = p.client_id
      WHERE t.id = $1
      FOR UPDATE`,
    [taskId],
  );
  if (check.rowCount === 0) return { taskId, skipped: 'task-gone' };
  const t = check.rows[0];
  if (t.status !== 'waiting' || !t.magic_link_token) {
    return { taskId, skipped: 'not-waiting' };
  }
  if (t.magic_link_expires_at && new Date(t.magic_link_expires_at) < now) {
    return { taskId, skipped: 'magic-expired' };
  }

  const startedAt = await getWaitingStartedAt(client, taskId);
  if (!startedAt) return { taskId, skipped: 'no-start-event' };
  const days = businessDaysBetween(new Date(startedAt), now);
  const attemptedLevel = await getMaxAttemptedLevel(client, taskId);

  // Каскад исчерпан?
  if (
    attemptedLevel >= 3 &&
    days >= CASCADE_EXHAUSTED_DAYS &&
    !(await hasCascadeExhaustedFor(client, taskId))
  ) {
    await emitCascadeExhausted(client, t);
    return { taskId, sent: 'cascade_exhausted', success: true };
  }

  // Следующий уровень — строго на 1 больше уже отработанного,
  // но только если время по таблице требований уже наступило.
  const nextLevel = attemptedLevel + 1;
  if (nextLevel > 3) return { taskId, skipped: 'cascade-complete', days, attemptedLevel };
  if (days < REQUIRED_DAYS[nextLevel]) {
    return { taskId, skipped: 'level-not-due-yet', days, attemptedLevel, requiredDays: REQUIRED_DAYS[nextLevel] };
  }

  const magicLink = `https://client.transparent-flow.app/task/${taskId}?token=${t.magic_link_token}`;
  const ctx = {
    projectName: t.project_name,
    taskTitle: t.title,
    deadline: t.deadline,
    magicLink,
    clientName: t.contact_name,
  };

  const { subject, telegramBody, emailText, emailHtml } = renderTemplate(nextLevel, ctx);
  const channels = CHANNELS_BY_LEVEL[nextLevel];

  const deliveries = {};
  for (const ch of channels) {
    try {
      if (ch === 'telegram') {
        // Доставляем ВСЕМ получателям проекта (project_telegram_recipients +
        // легаси clients.telegram_chat_id). Успех канала = доставка хотя бы одному.
        const chatIds = await resolveProjectChatIds(t.project_id);
        if (chatIds.length === 0) {
          deliveries.telegram = { ok: false, error: 'no-recipients' };
        } else {
          const results = [];
          for (const cid of chatIds) {
            try {
              results.push({ chatId: cid, ...(await telegram.send(cid, telegramBody)) });
            } catch (e) {
              results.push({ chatId: cid, ok: false, error: e.message });
            }
          }
          deliveries.telegram = { ok: results.some((r) => r.ok), recipients: results.length, results };
        }
      } else if (ch === 'email') {
        const r = await email.send({ to: t.client_email, subject, text: emailText, html: emailHtml });
        deliveries.email = r;
      }
    } catch (err) {
      deliveries[ch] = { error: err.message };
    }
  }

  // Считаем успех если хотя бы один канал доставил.
  const success = Object.values(deliveries).some((r) => r && r.ok);

  // При успешной отправке продлеваем magic-link на +7 дней от now: цикл каскада
  // занимает до 5 рабочих дней, и нам нужно, чтобы ссылка оставалась рабочей до
  // его конца. Решение из диплома 3.3.2 (link жив весь каскад).
  if (success) {
    const newExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    await client.query(
      `UPDATE tasks SET magic_link_expires_at = $1 WHERE id = $2`,
      [newExpiresAt, taskId],
    );
  }

  await client.query(
    `INSERT INTO task_events (task_id, actor_type, event_type, payload)
     VALUES ($1, 'system', $2, $3::jsonb)`,
    [
      taskId,
      success ? 'notification_sent' : 'notification_failed',
      JSON.stringify({ level: nextLevel, channels, deliveries, daysAt: days }),
    ],
  );
  // Дублируем удобочитаемую строку в history.
  await client.query(
    `INSERT INTO task_events (task_id, actor_type, event_type, payload)
     VALUES ($1, 'system', 'history', $2::jsonb)`,
    [taskId, JSON.stringify({ text: `Уведомление уровня ${nextLevel} ${success ? 'отправлено' : 'не отправлено'} (каналы: ${channels.join(', ')})` })],
  );

  return { taskId, sent: nextLevel, channels, success };
}

async function emitCascadeExhausted(client, t) {
  const { emailText } = renderCascadeExhausted({
    projectName: t.project_name,
    taskTitle: t.title,
  });
  // PM-уведомление: пока пишем только в task_events, фронт это покажет в NotificationsDropdown.
  await client.query(
    `INSERT INTO task_events (task_id, actor_type, event_type, payload)
     VALUES ($1, 'system', 'cascade_exhausted', $2::jsonb)`,
    [t.id, JSON.stringify({ message: emailText })],
  );
  await client.query(
    `INSERT INTO task_events (task_id, actor_type, event_type, payload)
     VALUES ($1, 'system', 'history', $2::jsonb)`,
    [t.id, JSON.stringify({ text: 'Каскад уведомлений исчерпан — клиент не ответил за 5 дней' })],
  );
}

/**
 * Один проход планировщика. now можно подменить (virtualNow) для демо.
 * Возвращает summary {processed, sent, skipped}.
 */
export async function tick({ now = new Date() } = {}) {
  const t0 = Date.now();
  schedulerState.lastTickError = null;
  let processed = 0;
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  try {
    // Тянем кандидатов без блокировки — блокировку возьмём в transaction для каждой задачи.
    const tasks = await pool.query(
      `SELECT id FROM tasks
        WHERE status = 'waiting' AND magic_link_token IS NOT NULL`,
    );

    for (const row of tasks.rows) {
      processed += 1;
      try {
        const result = await withTransaction(async (c) => processOneTask(c, row, now));
        if (result.sent === undefined) skipped += 1;
        else if (result.success) sent += 1;
        else failed += 1;
      } catch (err) {
        console.error(`[notify] task ${row.id} failed:`, err.message);
        failed += 1;
      }
    }

    const summary = { processed, sent, failed, skipped };
    schedulerState.lastTickAt = new Date().toISOString();
    schedulerState.lastTickDurationMs = Date.now() - t0;
    schedulerState.lastTickSummary = summary;
    console.log(`[notify] tick done: ${JSON.stringify(summary)} (${schedulerState.lastTickDurationMs}ms)`);
    return summary;
  } catch (err) {
    schedulerState.lastTickError = err.message;
    console.error('[notify] tick fatal:', err);
    throw err;
  }
}

/**
 * Юридический акт после клика «Принять контент» PM-ом. Пишет два события
 * (одно — read-friendly history, второе — структурированное verification_email_*).
 */
export async function sendVerificationEmail(taskId) {
  const res = await pool.query(
    `SELECT t.id, t.title,
            p.name AS project_name,
            c.contact_name, c.email AS client_email
       FROM tasks t
       JOIN projects p ON p.id = t.project_id
       JOIN clients  c ON c.id = p.client_id
      WHERE t.id = $1`,
    [taskId],
  );
  if (res.rowCount === 0) return { skipped: 'task-gone' };
  const t = res.rows[0];
  const acceptedAt = new Date();
  const { subject, emailText, emailHtml } = renderVerificationAct({
    projectName: t.project_name,
    taskTitle: t.title,
    clientName: t.contact_name,
    acceptedAt,
  });

  let result;
  try {
    result = await email.send({ to: t.client_email, subject, text: emailText, html: emailHtml });
  } catch (err) {
    await pool.query(
      `INSERT INTO task_events (task_id, actor_type, event_type, payload)
       VALUES ($1, 'system', 'verification_email_failed', $2::jsonb)`,
      [taskId, JSON.stringify({ error: err.message, recipient: t.client_email })],
    );
    return { ok: false, error: err.message };
  }

  await pool.query(
    `INSERT INTO task_events (task_id, actor_type, event_type, payload)
     VALUES ($1, 'system', 'verification_email_sent', $2::jsonb)`,
    [
      taskId,
      JSON.stringify({
        recipient: t.client_email,
        messageId: result?.messageId ?? null,
        previewUrl: result?.previewUrl ?? null,
        acceptedAt: acceptedAt.toISOString(),
      }),
    ],
  );
  return { ok: true, ...result };
}

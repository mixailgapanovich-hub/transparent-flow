// Цикл согласования. PM отправляет результат на согласование (submitForReview →
// status review + новый раунд), клиент Одобряет (approveReview → done + акт) или
// Возвращает на доработку (requestChanges → in-progress). PM может отозвать раунд
// (cancelReview → in-progress, раунд withdrawn).
//
// Вход в review — ТОЛЬКО через submitForReview (создаёт раунд). Generic-переход
// в/из review через taskService.transitionStatus заблокирован — иначе можно было бы
// получить «пустой» review без раунда или закрыть задачу мимо акта приёмки.

import { pool, withTransaction } from '../db/pool.js';
import { HttpError, getTaskById } from './taskService.js';
import { moveUploadedFiles } from './guestService.js';

/** Берёт последний pending-раунд задачи под FOR UPDATE. null, если такого нет. */
async function lockPendingApproval(client, taskId) {
  const r = await client.query(
    `SELECT id, round FROM task_approvals
      WHERE task_id = $1 AND status = 'pending'
      ORDER BY round DESC LIMIT 1 FOR UPDATE`,
    [taskId],
  );
  return r.rows[0] ?? null;
}

/**
 * PM отправляет результат на согласование.
 * Допустимо из in-progress / client-uploaded. Файлы (если есть) переносятся в
 * storage/<task_id>/ с uploaded_by='pm' и привязкой к раунду (approval_id).
 */
export async function submitForReview(taskId, { message = '', link = '', files = [], actorId = null } = {}) {
  const cur = await pool.query('SELECT status FROM tasks WHERE id = $1', [taskId]);
  if (cur.rowCount === 0) throw new HttpError(404, 'Задача не найдена');
  const status = cur.rows[0].status;
  if (!['in-progress', 'client-uploaded'].includes(status)) {
    throw new HttpError(409, 'Отправить на согласование можно только задачу «в работе» или с загруженным контентом');
  }

  // Файлы трогаем до транзакции (диск), внутри транзакции только пишем строки.
  const movedKeys = Array.isArray(files) && files.length ? await moveUploadedFiles(taskId, files) : [];

  const id = await withTransaction(async (c) => {
    const nextRound = await c.query(
      `SELECT COALESCE(MAX(round), 0) + 1 AS next FROM task_approvals WHERE task_id = $1`,
      [taskId],
    );
    const round = nextRound.rows[0].next;

    const ins = await c.query(
      `INSERT INTO task_approvals (task_id, round, status, submitted_by, message, link)
       VALUES ($1, $2, 'pending', $3, $4, $5)
       RETURNING id`,
      [taskId, round, actorId, message?.trim() || null, link?.trim() || null],
    );
    const approvalId = ins.rows[0].id;

    for (const m of movedKeys) {
      await c.query(
        `INSERT INTO task_files (task_id, filename, file_size, storage_key, uploaded_by, approval_id)
         VALUES ($1, $2, $3, $4, 'pm', $5)`,
        [taskId, m.filename, m.size, m.storageKey, approvalId],
      );
    }

    await c.query(`UPDATE tasks SET status = 'review', updated_at = now() WHERE id = $1`, [taskId]);

    await c.query(
      `INSERT INTO task_events (task_id, actor_type, actor_id, event_type, payload)
       VALUES ($1, 'pm', $2, 'review_requested', $3::jsonb)`,
      [taskId, actorId, JSON.stringify({ approvalId, round, hasLink: Boolean(link?.trim()), files: movedKeys.length })],
    );
    await c.query(
      `INSERT INTO task_events (task_id, actor_type, actor_id, event_type, payload)
       VALUES ($1, 'pm', $2, 'history', $3::jsonb)`,
      [taskId, actorId, JSON.stringify({ text: `Отправлено клиенту на согласование (раунд ${round})` })],
    );
    return taskId;
  });

  return getTaskById(id);
}

/**
 * Клиент одобряет результат. Последний pending-раунд → approved, задача → done,
 * пишутся review_approved + content_accepted. После COMMIT отправляется акт приёмки.
 */
export async function approveReview(taskId, { clientId = null } = {}) {
  const id = await withTransaction(async (c) => {
    const cur = await c.query('SELECT status FROM tasks WHERE id = $1 FOR UPDATE', [taskId]);
    if (cur.rowCount === 0) throw new HttpError(404, 'Задача не найдена');
    if (cur.rows[0].status !== 'review') throw new HttpError(409, 'Задача сейчас не на согласовании');

    const ap = await lockPendingApproval(c, taskId);
    if (!ap) throw new HttpError(409, 'Нет активного раунда согласования');

    await c.query(
      `UPDATE task_approvals SET status = 'approved', decided_at = now(), decided_by_client = $2 WHERE id = $1`,
      [ap.id, clientId],
    );
    await c.query(`UPDATE tasks SET status = 'done', updated_at = now() WHERE id = $1`, [taskId]);

    await c.query(
      `INSERT INTO task_events (task_id, actor_type, actor_id, event_type, payload)
       VALUES ($1, 'client', $2, 'review_approved', $3::jsonb)`,
      [taskId, clientId, JSON.stringify({ approvalId: ap.id, round: ap.round })],
    );
    // Тот же content_accepted, что и при client-uploaded → done — единый юридический акт.
    await c.query(
      `INSERT INTO task_events (task_id, actor_type, actor_id, event_type, payload)
       VALUES ($1, 'client', $2, 'content_accepted', $3::jsonb)`,
      [taskId, clientId, JSON.stringify({ acceptedAt: new Date().toISOString(), approvalId: ap.id })],
    );
    await c.query(
      `INSERT INTO task_events (task_id, actor_type, actor_id, event_type, payload)
       VALUES ($1, 'client', $2, 'history', $3::jsonb)`,
      [taskId, clientId, JSON.stringify({ text: 'Клиент одобрил результат — задача закрыта' })],
    );
    return taskId;
  });

  // Акт приёмки — после COMMIT (как в transitionStatus), не валим запрос при ошибке письма.
  try {
    const { sendVerificationEmail } = await import('./notificationService.js');
    await sendVerificationEmail(id);
  } catch (err) {
    console.error(`[approval] verification email failed for ${id}:`, err.message);
  }

  return getTaskById(id);
}

/**
 * Клиент возвращает на доработку. Раунд → changes_requested (с комментарием),
 * задача → in-progress. Комментарий обязателен.
 */
export async function requestChanges(taskId, { clientId = null, comment } = {}) {
  if (!comment?.trim()) throw new HttpError(400, 'Опишите, что нужно доработать');

  const id = await withTransaction(async (c) => {
    const cur = await c.query('SELECT status FROM tasks WHERE id = $1 FOR UPDATE', [taskId]);
    if (cur.rowCount === 0) throw new HttpError(404, 'Задача не найдена');
    if (cur.rows[0].status !== 'review') throw new HttpError(409, 'Задача сейчас не на согласовании');

    const ap = await lockPendingApproval(c, taskId);
    if (!ap) throw new HttpError(409, 'Нет активного раунда согласования');

    await c.query(
      `UPDATE task_approvals
          SET status = 'changes_requested', decided_at = now(),
              decision_comment = $2, decided_by_client = $3
        WHERE id = $1`,
      [ap.id, comment.trim().slice(0, 4000), clientId],
    );
    await c.query(`UPDATE tasks SET status = 'in-progress', updated_at = now() WHERE id = $1`, [taskId]);

    await c.query(
      `INSERT INTO task_events (task_id, actor_type, actor_id, event_type, payload)
       VALUES ($1, 'client', $2, 'review_changes_requested', $3::jsonb)`,
      [taskId, clientId, JSON.stringify({ approvalId: ap.id, round: ap.round, comment: comment.trim().slice(0, 300) })],
    );
    await c.query(
      `INSERT INTO task_events (task_id, actor_type, actor_id, event_type, payload)
       VALUES ($1, 'client', $2, 'history', $3::jsonb)`,
      [taskId, clientId, JSON.stringify({ text: `Клиент вернул на доработку: «${comment.trim().slice(0, 200)}»` })],
    );
    return taskId;
  });

  return getTaskById(id);
}

/** PM отзывает задачу с согласования (до решения клиента). Раунд → withdrawn, задача → in-progress. */
export async function cancelReview(taskId, { actorId = null } = {}) {
  const id = await withTransaction(async (c) => {
    const cur = await c.query('SELECT status FROM tasks WHERE id = $1 FOR UPDATE', [taskId]);
    if (cur.rowCount === 0) throw new HttpError(404, 'Задача не найдена');
    if (cur.rows[0].status !== 'review') throw new HttpError(409, 'Задача сейчас не на согласовании');

    const ap = await lockPendingApproval(c, taskId);
    if (ap) {
      await c.query(
        `UPDATE task_approvals SET status = 'withdrawn', decided_at = now() WHERE id = $1`,
        [ap.id],
      );
    }
    await c.query(`UPDATE tasks SET status = 'in-progress', updated_at = now() WHERE id = $1`, [taskId]);
    await c.query(
      `INSERT INTO task_events (task_id, actor_type, actor_id, event_type, payload)
       VALUES ($1, 'pm', $2, 'history', $3::jsonb)`,
      [taskId, actorId, JSON.stringify({ text: 'Снято с согласования менеджером' })],
    );
    return taskId;
  });

  return getTaskById(id);
}

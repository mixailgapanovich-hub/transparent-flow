// Лента центра уведомлений (внутри приложения, без рассылок).
// Источник — task_events. Здесь только чтение + группировка по категориям
// и флаг «прочитано» через notification_reads.

import { pool } from '../db/pool.js';
import { HttpError } from './taskService.js';

// Категория вкладки → набор event_type.
export const CATEGORY_EVENTS = {
  comments:   ['comment_added'],
  approvals:  ['review_requested', 'review_approved', 'review_changes_requested'],
  escalation: ['notification_sent', 'notification_failed', 'cascade_exhausted'],
  acts:       ['verification_email_sent', 'verification_email_failed', 'content_accepted'],
  content:    ['client_upload'],
  inbox:      ['task_suggested', 'client_question'],
  // «Движение» — перетаскивания/смена статуса задач. Намеренно НЕ попадает во
  // вкладку «Все» и не считается непрочитанным (см. queryFeed/unreadCounts).
  movement:   ['status_change'],
};

const ALL_PM_EVENTS = [...new Set(Object.values(CATEGORY_EVENTS).flat())];

// Что показываем клиенту в его кабинете.
const CLIENT_EVENTS = [
  'comment_added',        // ответы PM (фильтр authorType='pm' ниже)
  'status_change',        // движение его задач
  'review_requested',     // PM просит согласовать результат
  'review_approved',      // подтверждение его же одобрения
  'content_accepted',
  'verification_email_sent',
  'notification_sent',    // напоминания, адресованные ему
];

/** event_type → категория вкладки. */
function categoryOf(eventType) {
  for (const [cat, types] of Object.entries(CATEGORY_EVENTS)) {
    if (types.includes(eventType)) return cat;
  }
  return 'other';
}

/**
 * Общий построитель ленты.
 * subject: { type:'user'|'client', id } — для флага read.
 * opts: { projectId?, eventTypes, category?, unread?, limit, offset, statusChange?, commentPmOnly? }
 */
async function queryFeed(subject, opts) {
  const {
    projectId = null,
    eventTypes,
    category = null,
    unread = false,
    limit = 30,
    offset = 0,
    commentPmOnly = false,
  } = opts;

  // Если задана категория — сужаем список типов до её набора (пересечение с допустимыми).
  let types = eventTypes;
  if (category && CATEGORY_EVENTS[category]) {
    types = eventTypes.filter((t) => CATEGORY_EVENTS[category].includes(t));
    if (types.length === 0) types = ['__none__'];
  }

  const params = [subject.type, subject.id, types];
  const conds = [`e.event_type = ANY($3)`];

  if (projectId) {
    params.push(projectId);
    conds.push(`COALESCE(t.project_id, e.project_id) = $${params.length}`);
  }

  // «Движение» (status_change) не засоряет общий список «Все» — оно доступно
  // только в своей вкладке (category='movement').
  if (!category) {
    conds.push(`e.event_type <> 'status_change'`);
  }
  // Клиенту показываем только ответы PM, а не его собственные комментарии.
  if (commentPmOnly) {
    conds.push(`(e.event_type <> 'comment_added' OR e.payload->>'authorType' = 'pm')`);
  }

  let where = conds.join(' AND ');
  if (unread) where += ` AND nr.event_id IS NULL`;

  params.push(limit, offset);

  const sql = `
    SELECT
      e.id, e.task_id, e.event_type, e.payload, e.created_at,
      t.title AS task_title,
      p.id    AS project_id,
      p.name  AS project_name,
      p.slug  AS project_slug,
      (nr.event_id IS NOT NULL) AS read
    FROM task_events e
    LEFT JOIN tasks t    ON t.id = e.task_id
    LEFT JOIN projects p ON p.id = COALESCE(t.project_id, e.project_id)
    LEFT JOIN notification_reads nr
      ON nr.event_id = e.id AND nr.subject_type = $1 AND nr.subject_id = $2
    WHERE ${where}
    ORDER BY e.created_at DESC
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `;
  const r = await pool.query(sql, params);
  return r.rows.map((row) => ({ ...row, category: categoryOf(row.event_type) }));
}

/** Счётчик непрочитанного по категориям — для бейджей на вкладках/колокольчике. */
async function unreadCounts(subject, { projectId = null, eventTypes, commentPmOnly = false }) {
  const params = [subject.type, subject.id, eventTypes];
  // status_change («движение») не считается непрочитанным — не нагоняет бейдж.
  const conds = [`e.event_type = ANY($3)`, `nr.event_id IS NULL`, `e.event_type <> 'status_change'`];
  if (projectId) { params.push(projectId); conds.push(`COALESCE(t.project_id, e.project_id) = $${params.length}`); }
  if (commentPmOnly) conds.push(`(e.event_type <> 'comment_added' OR e.payload->>'authorType' = 'pm')`);

  const sql = `
    SELECT e.event_type, COUNT(*)::int AS count
    FROM task_events e
    LEFT JOIN tasks t ON t.id = e.task_id
    LEFT JOIN notification_reads nr
      ON nr.event_id = e.id AND nr.subject_type = $1 AND nr.subject_id = $2
    WHERE ${conds.join(' AND ')}
    GROUP BY e.event_type
  `;
  const r = await pool.query(sql, params);
  const byCat = {};
  let total = 0;
  for (const row of r.rows) {
    const cat = categoryOf(row.event_type);
    byCat[cat] = (byCat[cat] ?? 0) + row.count;
    total += row.count;
  }
  return { total, byCat };
}

// ── PM ───────────────────────────────────────────────────────────────────────
export function listForPm(userId, { category, unread, limit, offset } = {}) {
  return queryFeed({ type: 'user', id: userId }, {
    eventTypes: ALL_PM_EVENTS, category, unread, limit, offset,
  });
}
export function pmUnreadCounts(userId) {
  return unreadCounts({ type: 'user', id: userId }, {
    eventTypes: ALL_PM_EVENTS,
  });
}

// ── Клиент ─────────────────────────────────────────────────────────────────────
export function listForClient(ctx, { category, unread, limit, offset } = {}) {
  return queryFeed({ type: 'client', id: ctx.client.id }, {
    projectId: ctx.project.id, eventTypes: CLIENT_EVENTS, category, unread, limit, offset,
    commentPmOnly: true,
  });
}
export function clientUnreadCounts(ctx) {
  return unreadCounts({ type: 'client', id: ctx.client.id }, {
    projectId: ctx.project.id, eventTypes: CLIENT_EVENTS, commentPmOnly: true,
  });
}

// ── Отметка прочитанного ─────────────────────────────────────────────────────
export async function markRead(subject, eventIds) {
  if (!Array.isArray(eventIds) || eventIds.length === 0) return { marked: 0 };
  const r = await pool.query(
    `INSERT INTO notification_reads (subject_type, subject_id, event_id)
     SELECT $1, $2, x FROM unnest($3::uuid[]) AS x
     ON CONFLICT DO NOTHING`,
    [subject.type, subject.id, eventIds],
  );
  return { marked: r.rowCount };
}

// ── Принятие предложения задачи (PM) ─────────────────────────────────────────
export async function acceptSuggestion(suggestionId, { actorId = null } = {}) {
  const { createTask } = await import('./taskService.js');

  const sug = await pool.query(
    `SELECT s.id, s.status, s.title, s.description, p.slug
       FROM task_suggestions s JOIN projects p ON p.id = s.project_id
      WHERE s.id = $1`,
    [suggestionId],
  );
  if (sug.rowCount === 0) throw new HttpError(404, 'Предложение не найдено');
  if (sug.rows[0].status !== 'pending') throw new HttpError(409, 'Предложение уже обработано');

  const { title, description, slug } = sug.rows[0];
  const task = await createTask({ projectSlug: slug, title, description, status: 'backlog' }, { actorId });

  await pool.query(`UPDATE task_suggestions SET status = 'accepted' WHERE id = $1`, [suggestionId]);
  return task;
}

export async function rejectSuggestion(suggestionId) {
  const r = await pool.query(
    `UPDATE task_suggestions SET status = 'rejected' WHERE id = $1 AND status = 'pending'`,
    [suggestionId],
  );
  if (r.rowCount === 0) throw new HttpError(409, 'Предложение не найдено или уже обработано');
  return { ok: true };
}

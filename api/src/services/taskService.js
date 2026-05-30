// Сборка DTO задач в форме, ожидаемой текущим фронтом (см. INITIAL_TASKS в src/data/mockData.js).
// Для read-only этапа держим 5–6 коротких запросов и собираем объект в JS — это проще
// читать и отлаживать, чем один монструозный SELECT с json_agg.

import { randomUUID } from 'node:crypto';
import { pool, withTransaction } from '../db/pool.js';
import { canTransitionStatus } from './taskWorkflow.js';

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export { HttpError };

function initialsFrom(name) {
  if (!name) return '';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

/** Группирует массив строк по ключу в Map<key, row[]>. */
function groupBy(rows, key) {
  const map = new Map();
  for (const row of rows) {
    const k = row[key];
    const arr = map.get(k) ?? [];
    arr.push(row);
    map.set(k, arr);
  }
  return map;
}

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return null;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

/** Сборка одного DTO задачи из «сырых» строк. */
function buildTaskDto(taskRow, related) {
  const { filesByTask, commentsByTask, assigneesByTask, depsByTask, historyByTask } = related;

  const files = (filesByTask.get(taskRow.id) ?? []).map((f) => ({
    id: f.id,
    name: f.filename,
    size: formatBytes(f.file_size) ?? '—',
  }));

  const comments = (commentsByTask.get(taskRow.id) ?? []).map((c) => ({
    id: c.id,
    author: c.author_type, // 'pm' | 'client'
    name: c.author_name,
    message: c.message,
    anchor: c.anchor ?? null, // {start, end, quote} для комментариев к выделению, иначе null
    at: c.created_at?.toISOString?.() ?? c.created_at,
  }));

  const assignees = (assigneesByTask.get(taskRow.id) ?? []).map((a) => ({
    id: a.user_id,
    name: a.name,
    initials: initialsFrom(a.name),
  }));

  const dependsOn = (depsByTask.get(taskRow.id) ?? []).map((d) => d.depends_on_id);

  const history = (historyByTask.get(taskRow.id) ?? []).map((h) => ({
    date: h.created_at?.toISOString?.() ?? h.created_at,
    text: h.payload?.text ?? '',
  }));

  const magicLink = taskRow.magic_link_token
    ? `https://client.transparent-flow.app/task/${taskRow.id}?token=${taskRow.magic_link_token}`
    : '';

  return {
    id: taskRow.id,
    projectId: taskRow.project_slug, // фронт фильтрует по слагу
    title: taskRow.title,
    description: taskRow.description ?? '',
    status: taskRow.status,
    tag: taskRow.tag,
    deadline: taskRow.deadline?.toISOString?.() ?? taskRow.deadline,
    hasFiles: files.length > 0,
    files,
    comments,
    assignees,
    dependsOn,
    history,
    magicLink,
    isImportant: taskRow.tag === 'Ключевая',
    // Привязка клиента — для UI «Подключить Telegram»
    clientId: taskRow.client_id ?? null,
    clientTelegramLinked: Boolean(taskRow.client_telegram_chat_id),
  };
}

/** Собирает все связанные сущности одним заходом для переданного набора task_id. */
async function fetchRelations(taskIds) {
  if (taskIds.length === 0) {
    return {
      filesByTask: new Map(),
      commentsByTask: new Map(),
      assigneesByTask: new Map(),
      depsByTask: new Map(),
      historyByTask: new Map(),
    };
  }

  const [files, comments, assignees, deps, history] = await Promise.all([
    pool.query(
      `SELECT id, task_id, filename, file_size, uploaded_at
       FROM task_files WHERE task_id = ANY($1::uuid[])
       ORDER BY uploaded_at`,
      [taskIds],
    ),
    pool.query(
      `SELECT id, task_id, author_type, author_name, message, anchor, created_at
       FROM task_comments WHERE task_id = ANY($1::uuid[])
       ORDER BY created_at`,
      [taskIds],
    ),
    pool.query(
      `SELECT ta.task_id, ta.user_id, u.name
       FROM task_assignees ta
       JOIN users u ON u.id = ta.user_id
       WHERE ta.task_id = ANY($1::uuid[])`,
      [taskIds],
    ),
    pool.query(
      `SELECT task_id, depends_on_id FROM task_dependencies
       WHERE task_id = ANY($1::uuid[])`,
      [taskIds],
    ),
    pool.query(
      `SELECT task_id, payload, created_at FROM task_events
       WHERE task_id = ANY($1::uuid[]) AND event_type = 'history'
       ORDER BY created_at`,
      [taskIds],
    ),
  ]);

  return {
    filesByTask: groupBy(files.rows, 'task_id'),
    commentsByTask: groupBy(comments.rows, 'task_id'),
    assigneesByTask: groupBy(assignees.rows, 'task_id'),
    depsByTask: groupBy(deps.rows, 'task_id'),
    historyByTask: groupBy(history.rows, 'task_id'),
  };
}

/** Список задач. Если задан projectSlug — фильтруем по нему.
 *  excludeInternal=true прячет внутренние задачи (для клиентского вида). */
export async function listTasks({ projectSlug, excludeInternal = false } = {}) {
  const params = [];
  const conds = [];
  if (projectSlug) {
    params.push(projectSlug);
    conds.push(`p.slug = $${params.length}`);
  }
  if (excludeInternal) {
    conds.push('NOT t.is_internal');
  }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';

  const tasksRes = await pool.query(
    `SELECT t.id, t.title, t.description, t.status, t.tag, t.deadline,
            t.magic_link_token, t.created_at, t.updated_at,
            p.slug AS project_slug,
            c.id AS client_id,
            c.telegram_chat_id AS client_telegram_chat_id
     FROM tasks t
     JOIN projects p ON p.id = t.project_id
     JOIN clients  c ON c.id = p.client_id
     ${where}
     ORDER BY t.created_at`,
    params,
  );

  const taskIds = tasksRes.rows.map((r) => r.id);
  const relations = await fetchRelations(taskIds);

  return tasksRes.rows.map((row) => buildTaskDto(row, relations));
}

/** Одна задача по UUID. Возвращает null, если не найдена. */
export async function getTaskById(id) {
  const tasksRes = await pool.query(
    `SELECT t.id, t.title, t.description, t.status, t.tag, t.deadline,
            t.magic_link_token, t.created_at, t.updated_at,
            p.slug AS project_slug,
            c.id AS client_id,
            c.telegram_chat_id AS client_telegram_chat_id
     FROM tasks t
     JOIN projects p ON p.id = t.project_id
     JOIN clients  c ON c.id = p.client_id
     WHERE t.id = $1`,
    [id],
  );
  if (tasksRes.rows.length === 0) return null;

  const relations = await fetchRelations([id]);
  return buildTaskDto(tasksRes.rows[0], relations);
}

// ─────────────────────────────────────────────────────────────────────────────
// Мутации
// ─────────────────────────────────────────────────────────────────────────────

/** Записывает строку истории в task_events (event_type='history'). */
async function logHistory(client, taskId, text, actorType = 'pm', actorId = null) {
  await client.query(
    `INSERT INTO task_events (task_id, actor_type, actor_id, event_type, payload)
     VALUES ($1, $2, $3, 'history', $4::jsonb)`,
    [taskId, actorType, actorId, JSON.stringify({ text })],
  );
}

/** Смена статуса задачи. Валидируется FSM. */
export async function transitionStatus(taskId, toStatus, { isAdmin = false, actorId = null } = {}) {
  let didAcceptContent = false;
  const id = await withTransaction(async (c) => {
    const cur = await c.query('SELECT status FROM tasks WHERE id = $1 FOR UPDATE', [taskId]);
    if (cur.rows.length === 0) throw new HttpError(404, 'Task not found');
    const fromStatus = cur.rows[0].status;

    if (!canTransitionStatus(fromStatus, toStatus, { isAdmin })) {
      throw new HttpError(
        409,
        `FSM violation: ${fromStatus} → ${toStatus} not allowed${isAdmin ? ' (even as admin)' : ''}`,
      );
    }

    if (fromStatus !== toStatus) {
      await c.query(
        `UPDATE tasks SET status = $1, updated_at = now() WHERE id = $2`,
        [toStatus, taskId],
      );
      await c.query(
        `INSERT INTO task_events (task_id, actor_type, actor_id, event_type, payload)
         VALUES ($1, 'pm', $2, 'status_change', $3::jsonb)`,
        [taskId, actorId, JSON.stringify({ from: fromStatus, to: toStatus })],
      );
      await logHistory(c, taskId, `Статус изменён: ${toStatus}`, 'pm', actorId);

      // Глава 4.2 п.1: момент юридической передачи контента — переход
      // client-uploaded → done. Сам факт принятия фиксируем здесь же,
      // отправку email-акта откладываем на пост-COMMIT (см. ниже).
      if (fromStatus === 'client-uploaded' && toStatus === 'done') {
        await c.query(
          `INSERT INTO task_events (task_id, actor_type, actor_id, event_type, payload)
           VALUES ($1, 'pm', $2, 'content_accepted', $3::jsonb)`,
          [taskId, actorId, JSON.stringify({ acceptedAt: new Date().toISOString() })],
        );
        didAcceptContent = true;
      }
    }

    return taskId;
  });

  // ВАЖНО: отправка email — после COMMIT, чтобы не держать транзакцию открытой
  // на время сетевого запроса и чтобы клиент получил письмо только если статус
  // действительно зафиксирован в БД. Импорт здесь (динамический), чтобы избежать
  // циклической зависимости между сервисами.
  if (didAcceptContent) {
    try {
      const { sendVerificationEmail } = await import('./notificationService.js');
      await sendVerificationEmail(id);
    } catch (err) {
      // Не валим основной запрос: PM уже принял контент, письмо можно ретригернуть
      // вручную через UI (verification_email_failed event и кнопка «Переотправить акт»).
      console.error(`[task] verification email failed for ${id}:`, err.message);
    }
  }

  return getTaskById(id);
}

/** Частичное обновление полей задачи (title, description, deadline, tag). */
export async function updateTaskFields(taskId, patch, { actorId = null } = {}) {
  const allowed = ['title', 'description', 'deadline', 'tag'];
  const sets = [];
  const params = [];
  for (const key of allowed) {
    if (key in patch) {
      params.push(patch[key]);
      sets.push(`${key} = $${params.length}`);
    }
  }
  if (sets.length === 0) {
    const existing = await getTaskById(taskId);
    if (!existing) throw new HttpError(404, 'Task not found');
    return existing;
  }

  const id = await withTransaction(async (c) => {
    params.push(taskId);
    const res = await c.query(
      `UPDATE tasks SET ${sets.join(', ')}, updated_at = now()
       WHERE id = $${params.length}
       RETURNING id`,
      params,
    );
    if (res.rowCount === 0) throw new HttpError(404, 'Task not found');

    await logHistory(c, taskId, 'Обновлено из модального окна', 'pm', actorId);
    return taskId;
  });
  return getTaskById(id);
}

/** Создание задачи. projectSlug обязателен. */
export async function createTask(input, { actorId = null } = {}) {
  const { projectSlug, title, description, status, tag, deadline, assigneeIds } = input;
  if (!projectSlug) throw new HttpError(400, 'projectSlug required');
  if (!title) throw new HttpError(400, 'title required');

  const id = await withTransaction(async (c) => {
    const proj = await c.query('SELECT id FROM projects WHERE slug = $1', [projectSlug]);
    if (proj.rows.length === 0) throw new HttpError(404, `Project ${projectSlug} not found`);
    const projectId = proj.rows[0].id;

    const taskId = randomUUID();
    await c.query(
      `INSERT INTO tasks (id, project_id, title, description, status, tag, deadline)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        taskId,
        projectId,
        title,
        description ?? '',
        status ?? 'backlog',
        tag ?? 'Обычная',
        deadline ?? null,
      ],
    );

    for (const userId of assigneeIds ?? []) {
      await c.query(
        `INSERT INTO task_assignees (task_id, user_id) VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [taskId, userId],
      );
    }

    await logHistory(c, taskId, 'Задача создана', 'pm', actorId);
    return taskId;
  });
  return getTaskById(id);
}

export async function deleteTask(taskId, { actor } = {}) {
  // Ролевая модель удаления:
  // - admin: удаляет любую задачу
  // - pm: удаляет только если он в исполнителях задачи
  // - остальные роли (например, будущий viewer/observer): запрещено
  if (!actor) throw new HttpError(401, 'Authentication required');

  if (actor.role !== 'admin') {
    if (actor.role !== 'pm') {
      throw new HttpError(403, 'У вас нет прав на удаление задач');
    }
    const { rows } = await pool.query(
      'SELECT 1 FROM task_assignees WHERE task_id = $1 AND user_id = $2 LIMIT 1',
      [taskId, actor.id],
    );
    if (rows.length === 0) {
      throw new HttpError(403, 'Удалять задачу может только администратор или её исполнитель');
    }
  }

  const res = await pool.query('DELETE FROM tasks WHERE id = $1', [taskId]);
  if (res.rowCount === 0) throw new HttpError(404, 'Task not found');
}

export async function addComment(taskId, { authorType, authorName, message, authorId = null, anchor = null }) {
  if (!message?.trim()) throw new HttpError(400, 'message required');
  if (!['pm', 'client'].includes(authorType)) {
    throw new HttpError(400, 'authorType must be pm|client');
  }

  // anchor (если есть) — {start, end, quote}. Валидируем форму, чтобы не писать мусор.
  let anchorJson = null;
  if (anchor) {
    const { start, end, quote } = anchor;
    if (
      Number.isInteger(start) && Number.isInteger(end) &&
      start >= 0 && end >= start && typeof quote === 'string'
    ) {
      anchorJson = JSON.stringify({ start, end, quote: quote.slice(0, 2000) });
    }
  }

  const id = await withTransaction(async (c) => {
    const exists = await c.query('SELECT 1 FROM tasks WHERE id = $1', [taskId]);
    if (exists.rowCount === 0) throw new HttpError(404, 'Task not found');

    const ins = await c.query(
      `INSERT INTO task_comments (task_id, author_type, author_id, author_name, message, anchor)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)
       RETURNING id`,
      [taskId, authorType, authorId, authorName ?? authorType, message.trim(), anchorJson],
    );

    // Единое событие для центра уведомлений (внутри приложения, без рассылок).
    const excerpt = message.trim().slice(0, 140);
    await c.query(
      `INSERT INTO task_events (task_id, actor_type, actor_id, event_type, payload)
       VALUES ($1, $2, $3, 'comment_added', $4::jsonb)`,
      [
        taskId,
        authorType,
        authorId,
        JSON.stringify({
          commentId: ins.rows[0].id,
          authorType,
          authorName: authorName ?? authorType,
          excerpt,
          anchorQuote: anchor?.quote ? String(anchor.quote).slice(0, 200) : null,
        }),
      ],
    );
    return taskId;
  });
  return getTaskById(id);
}

export async function addAssignee(taskId, userId, { actorId = null } = {}) {
  if (!userId) throw new HttpError(400, 'userId required');
  const id = await withTransaction(async (c) => {
    const task = await c.query('SELECT 1 FROM tasks WHERE id = $1', [taskId]);
    if (task.rowCount === 0) throw new HttpError(404, 'Task not found');

    const user = await c.query('SELECT name FROM users WHERE id = $1', [userId]);
    if (user.rowCount === 0) throw new HttpError(404, 'User not found');

    const res = await c.query(
      `INSERT INTO task_assignees (task_id, user_id) VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [taskId, userId],
    );
    if (res.rowCount > 0) {
      await logHistory(c, taskId, `Назначен исполнитель: ${user.rows[0].name}`, 'pm', actorId);
    }
    return taskId;
  });
  return getTaskById(id);
}

/** Запрос материалов у клиента: status → waiting, генерируется magic_link_token. */
export async function requestClientContent(taskId, { actorId = null } = {}) {
  const id = await withTransaction(async (c) => {
    const cur = await c.query('SELECT status FROM tasks WHERE id = $1 FOR UPDATE', [taskId]);
    if (cur.rowCount === 0) throw new HttpError(404, 'Task not found');
    const fromStatus = cur.rows[0].status;

    if (!canTransitionStatus(fromStatus, 'waiting')) {
      throw new HttpError(409, `Cannot request client from status ${fromStatus}`);
    }

    const token = randomUUID();
    // 7 дней — чтобы покрыть весь жизненный цикл каскада уведомлений (5 раб. дней)
    // и оставить буфер на выходные.
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await c.query(
      `UPDATE tasks
         SET status = 'waiting',
             magic_link_token = $1,
             magic_link_expires_at = $2,
             updated_at = now()
       WHERE id = $3`,
      [token, expiresAt, taskId],
    );
    await c.query(
      `INSERT INTO task_events (task_id, actor_type, actor_id, event_type, payload)
       VALUES ($1, 'pm', $2, 'magic_link_issued', $3::jsonb)`,
      [taskId, actorId, JSON.stringify({ expires_at: expiresAt.toISOString() })],
    );
    await logHistory(c, taskId, 'Запрос отправлен клиенту', 'pm', actorId);

    return taskId;
  });
  return getTaskById(id);
}

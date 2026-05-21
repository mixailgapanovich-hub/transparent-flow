// Сборка DTO задач в форме, ожидаемой текущим фронтом (см. INITIAL_TASKS в src/data/mockData.js).
// Для read-only этапа держим 5–6 коротких запросов и собираем объект в JS — это проще
// читать и отлаживать, чем один монструозный SELECT с json_agg.

import { pool } from '../db/pool.js';

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
      `SELECT id, task_id, author_type, author_name, message, created_at
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

/** Список задач. Если задан projectSlug — фильтруем по нему. */
export async function listTasks({ projectSlug } = {}) {
  const params = [];
  let where = '';
  if (projectSlug) {
    params.push(projectSlug);
    where = `WHERE p.slug = $${params.length}`;
  }

  const tasksRes = await pool.query(
    `SELECT t.id, t.title, t.description, t.status, t.tag, t.deadline,
            t.magic_link_token, t.created_at, t.updated_at,
            p.slug AS project_slug
     FROM tasks t
     JOIN projects p ON p.id = t.project_id
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
            p.slug AS project_slug
     FROM tasks t
     JOIN projects p ON p.id = t.project_id
     WHERE t.id = $1`,
    [id],
  );
  if (tasksRes.rows.length === 0) return null;

  const relations = await fetchRelations([id]);
  return buildTaskDto(tasksRes.rows[0], relations);
}

// DTO проектов в форме, ожидаемой фронтом (см. MOCK_PROJECTS в src/data/mockProjects.js).
// tasksTotal/tasksDone/progress считаем из БД, чтобы не дрейфовать от реального состояния.

import { pool } from '../db/pool.js';
import { HttpError } from './taskService.js';

const PROJECT_STATUSES = ['active', 'paused', 'waiting', 'completed'];
const PROJECT_PRIORITIES = ['high', 'medium', 'low'];

// Транслитерация кириллицы для генерации слага из названия.
const TRANSLIT = {
  а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',
  н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'ts',ч:'ch',ш:'sh',щ:'sch',
  ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya',
};

function slugify(name) {
  const base = (name || '')
    .toLowerCase()
    .split('')
    .map((ch) => (ch in TRANSLIT ? TRANSLIT[ch] : ch))
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return base || 'project';
}

/** Возвращает уникальный слаг на основе name (или предложенного slug). */
async function uniqueSlug(desired, name) {
  const base = slugify(desired || name);
  let candidate = base;
  let n = 1;
  // Цикл с защитой — на практике 1–2 итерации.
  while (n < 100) {
    const r = await pool.query('SELECT 1 FROM projects WHERE slug = $1', [candidate]);
    if (r.rowCount === 0) return candidate;
    n += 1;
    candidate = `${base}-${n}`;
  }
  return `${base}-${Date.now()}`;
}

export async function listProjects() {
  const res = await pool.query(
    `SELECT
        p.id,
        p.slug,
        p.name,
        p.category,
        p.status,
        p.priority,
        p.deadline,
        p.client_view_token,
        p.client_view_enabled,
        c.id            AS client_id,
        c.company_name  AS client_name,
        c.email         AS client_email,
        c.telegram_chat_id,
        c.telegram_username,
        COUNT(t.id)::int                                              AS tasks_total,
        COUNT(t.id) FILTER (WHERE t.status = 'done')::int             AS tasks_done
     FROM projects p
     JOIN clients  c ON c.id = p.client_id
     LEFT JOIN tasks t ON t.project_id = p.id
     GROUP BY p.id, c.id
     ORDER BY p.name`,
  );

  return res.rows.map(mapProjectRow);
}

function mapProjectRow(row) {
  const total = row.tasks_total || 0;
  const done = row.tasks_done || 0;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    client: row.client_name,
    category: row.category,
    status: row.status,
    priority: row.priority,
    deadline: row.deadline?.toISOString?.().slice(0, 10) ?? row.deadline,
    tasksTotal: total,
    tasksDone: done,
    progress,
    clientViewToken: row.client_view_token,
    clientViewEnabled: row.client_view_enabled,
    clientId: row.client_id,
    clientEmail: row.client_email,
    telegramChatId: row.telegram_chat_id,
    telegramUsername: row.telegram_username,
  };
}

/** Один проект по id в той же DTO-форме, что и listProjects. */
export async function getProjectById(id) {
  const res = await pool.query(
    `SELECT p.id, p.slug, p.name, p.category, p.status, p.priority, p.deadline,
            p.client_view_token, p.client_view_enabled,
            c.id AS client_id, c.company_name AS client_name, c.email AS client_email,
            c.telegram_chat_id, c.telegram_username,
            COUNT(t.id)::int AS tasks_total,
            COUNT(t.id) FILTER (WHERE t.status = 'done')::int AS tasks_done
       FROM projects p
       JOIN clients c ON c.id = p.client_id
       LEFT JOIN tasks t ON t.project_id = p.id
      WHERE p.id = $1
      GROUP BY p.id, c.id`,
    [id],
  );
  if (res.rowCount === 0) throw new HttpError(404, 'Проект не найден');
  return mapProjectRow(res.rows[0]);
}

export async function createProject(input = {}) {
  const { name, slug, clientId, status, priority, category, deadline } = input;
  if (!name?.trim()) throw new HttpError(400, 'Название проекта обязательно');
  if (!clientId) throw new HttpError(400, 'Не выбран клиент');

  const client = await pool.query('SELECT 1 FROM clients WHERE id = $1', [clientId]);
  if (client.rowCount === 0) throw new HttpError(404, 'Клиент не найден');

  const st = PROJECT_STATUSES.includes(status) ? status : 'active';
  const pr = PROJECT_PRIORITIES.includes(priority) ? priority : 'medium';
  const finalSlug = await uniqueSlug(slug, name);

  const res = await pool.query(
    `INSERT INTO projects (slug, client_id, name, status, priority, category, deadline)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [finalSlug, clientId, name.trim(), st, pr, category?.trim() || null, deadline || null],
  );
  return getProjectById(res.rows[0].id);
}

export async function updateProject(id, patch = {}) {
  const sets = [];
  const params = [];
  const push = (col, val) => { params.push(val); sets.push(`${col} = $${params.length}`); };

  if ('name' in patch) {
    if (!patch.name?.trim()) throw new HttpError(400, 'Название не может быть пустым');
    push('name', patch.name.trim());
  }
  if ('clientId' in patch && patch.clientId) {
    const c = await pool.query('SELECT 1 FROM clients WHERE id = $1', [patch.clientId]);
    if (c.rowCount === 0) throw new HttpError(404, 'Клиент не найден');
    push('client_id', patch.clientId);
  }
  if ('status' in patch) {
    if (!PROJECT_STATUSES.includes(patch.status)) throw new HttpError(400, 'Недопустимый статус проекта');
    push('status', patch.status);
  }
  if ('priority' in patch) {
    if (!PROJECT_PRIORITIES.includes(patch.priority)) throw new HttpError(400, 'Недопустимый приоритет');
    push('priority', patch.priority);
  }
  if ('category' in patch) push('category', patch.category?.trim() || null);
  if ('deadline' in patch) push('deadline', patch.deadline || null);
  if ('slug' in patch && patch.slug?.trim()) push('slug', await uniqueSlug(patch.slug, patch.slug));

  if (sets.length === 0) return getProjectById(id);
  params.push(id);
  const res = await pool.query(
    `UPDATE projects SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING id`,
    params,
  );
  if (res.rowCount === 0) throw new HttpError(404, 'Проект не найден');
  return getProjectById(id);
}

/** Архивирование вместо удаления — задачи и история проекта сохраняются. */
export async function archiveProject(id) {
  const res = await pool.query(
    `UPDATE projects SET status = 'completed' WHERE id = $1 RETURNING id`,
    [id],
  );
  if (res.rowCount === 0) throw new HttpError(404, 'Проект не найден');
  return getProjectById(id);
}

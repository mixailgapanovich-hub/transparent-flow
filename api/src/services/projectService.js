// DTO проектов в форме, ожидаемой фронтом (см. MOCK_PROJECTS в src/data/mockProjects.js).
// tasksTotal/tasksDone/progress считаем из БД, чтобы не дрейфовать от реального состояния.

import { pool } from '../db/pool.js';

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

  return res.rows.map((row) => {
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
  });
}

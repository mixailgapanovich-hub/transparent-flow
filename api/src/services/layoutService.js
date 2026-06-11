// Раскладка майндмапа: позиции узлов на пару (задача, аудитория 'pm'|'client').
// Своя раскладка у PM и у клиента. Узлы без сохранённой позиции фронт раскладывает
// авто-алгоритмом (taskGraphLayout).

import { pool } from '../db/pool.js';
import { HttpError } from './taskService.js';

/** Позиции для аудитории. projectId (опц.) ограничивает выборку задачами проекта. */
export async function getLayout(audience, { projectId = null } = {}) {
  if (projectId) {
    const r = await pool.query(
      `SELECT l.task_id, l.x, l.y
         FROM task_layout l JOIN tasks t ON t.id = l.task_id
        WHERE l.audience = $1 AND t.project_id = $2`,
      [audience, projectId],
    );
    return r.rows.map((row) => ({ taskId: row.task_id, x: row.x, y: row.y }));
  }
  const r = await pool.query(
    `SELECT task_id, x, y FROM task_layout WHERE audience = $1`,
    [audience],
  );
  return r.rows.map((row) => ({ taskId: row.task_id, x: row.x, y: row.y }));
}

/**
 * Upsert позиций. positions: [{taskId, x, y}].
 * projectId (опц.) — гард: пишем только задачи этого проекта и не внутренние
 * (для клиентского сохранения).
 */
export async function savePositions(audience, positions, { projectId = null } = {}) {
  if (!Array.isArray(positions)) throw new HttpError(400, 'positions must be an array');
  let saved = 0;
  for (const p of positions) {
    if (!p?.taskId || typeof p.x !== 'number' || typeof p.y !== 'number') continue;
    if (projectId) {
      const r = await pool.query(
        `INSERT INTO task_layout (task_id, audience, x, y)
         SELECT $1, $2, $3, $4
          WHERE EXISTS (SELECT 1 FROM tasks WHERE id = $1 AND project_id = $5 AND NOT is_internal)
         ON CONFLICT (task_id, audience) DO UPDATE SET x = EXCLUDED.x, y = EXCLUDED.y, updated_at = now()`,
        [p.taskId, audience, p.x, p.y, projectId],
      );
      saved += r.rowCount;
    } else {
      await pool.query(
        `INSERT INTO task_layout (task_id, audience, x, y) VALUES ($1, $2, $3, $4)
         ON CONFLICT (task_id, audience) DO UPDATE SET x = EXCLUDED.x, y = EXCLUDED.y, updated_at = now()`,
        [p.taskId, audience, p.x, p.y],
      );
      saved += 1;
    }
  }
  return { saved };
}

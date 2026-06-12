// «О проекте»: описание, контакты, доступы. Один ряд на проект (JSONB-списки).
// PM видит и правит всё; клиент видит описание/контакты/ссылки и только те доступы,
// у которых visibleToClient=true (флаг вырезается из клиентского DTO).

import { pool } from '../db/pool.js';
import { HttpError } from './taskService.js';

const EMPTY = { description: '', siteUrl: '', driveUrl: '', contacts: [], credentials: [] };

function toDto(row, { forClient = false } = {}) {
  if (!row) return { ...EMPTY };
  let credentials = Array.isArray(row.credentials) ? row.credentials : [];
  if (forClient) {
    credentials = credentials
      .filter((c) => c?.visibleToClient)
      .map(({ visibleToClient, ...rest }) => rest); // флаг наружу не отдаём
  }
  return {
    description: row.description ?? '',
    siteUrl: row.site_url ?? '',
    driveUrl: row.drive_url ?? '',
    contacts: Array.isArray(row.contacts) ? row.contacts : [],
    credentials,
  };
}

export async function getProjectInfo(projectId, { forClient = false } = {}) {
  const r = await pool.query('SELECT * FROM project_info WHERE project_id = $1', [projectId]);
  return toDto(r.rows[0], { forClient });
}

export async function saveProjectInfo(projectId, data = {}) {
  const proj = await pool.query('SELECT 1 FROM projects WHERE id = $1', [projectId]);
  if (proj.rowCount === 0) throw new HttpError(404, 'Проект не найден');

  const str = (v) => (v ?? '').toString();
  const contacts = (Array.isArray(data.contacts) ? data.contacts : []).slice(0, 50).map((c) => ({
    name: str(c.name), role: str(c.role), email: str(c.email), phone: str(c.phone),
  }));
  const credentials = (Array.isArray(data.credentials) ? data.credentials : []).slice(0, 100).map((c) => ({
    label: str(c.label), link: str(c.link), login: str(c.login),
    password: str(c.password), comment: str(c.comment),
    visibleToClient: Boolean(c.visibleToClient),
  }));

  await pool.query(
    `INSERT INTO project_info (project_id, description, site_url, drive_url, contacts, credentials, updated_at)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, now())
     ON CONFLICT (project_id) DO UPDATE SET
       description = EXCLUDED.description, site_url = EXCLUDED.site_url, drive_url = EXCLUDED.drive_url,
       contacts = EXCLUDED.contacts, credentials = EXCLUDED.credentials, updated_at = now()`,
    [projectId, str(data.description), str(data.siteUrl).trim() || null, str(data.driveUrl).trim() || null,
     JSON.stringify(contacts), JSON.stringify(credentials)],
  );
  return getProjectInfo(projectId);
}

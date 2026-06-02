// Админ-CRUD клиентов агентства. Отдельно от кабинетного clientService.js
// (тот обслуживает публичный доступ по токену). Здесь — управление из раздела «Управление».

import { pool } from '../db/pool.js';
import { HttpError } from './taskService.js';

/** DTO клиента в camelCase + счётчик проектов (для блокировки удаления). */
function toDto(row) {
  return {
    id: row.id,
    companyName: row.company_name,
    contactName: row.contact_name ?? '',
    email: row.email ?? '',
    phone: row.phone ?? '',
    supportChatUrl: row.support_chat_url ?? '',
    telegramLinked: Boolean(row.telegram_chat_id),
    projectsCount: Number(row.projects_count ?? 0),
  };
}

export async function listClients() {
  const res = await pool.query(
    `SELECT c.id, c.company_name, c.contact_name, c.email, c.phone,
            c.support_chat_url, c.telegram_chat_id,
            COUNT(p.id)::int AS projects_count
       FROM clients c
       LEFT JOIN projects p ON p.client_id = c.id
      GROUP BY c.id
      ORDER BY c.company_name`,
  );
  return res.rows.map(toDto);
}

export async function createClient({ companyName, contactName, email, phone, supportChatUrl } = {}) {
  if (!companyName?.trim()) throw new HttpError(400, 'Название компании обязательно');
  const res = await pool.query(
    `INSERT INTO clients (company_name, contact_name, email, phone, support_chat_url)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [
      companyName.trim(),
      contactName?.trim() || null,
      email?.trim() || null,
      phone?.trim() || null,
      supportChatUrl?.trim() || null,
    ],
  );
  return getClient(res.rows[0].id);
}

export async function updateClient(id, patch = {}) {
  const map = {
    companyName: 'company_name',
    contactName: 'contact_name',
    email: 'email',
    phone: 'phone',
    supportChatUrl: 'support_chat_url',
  };
  const sets = [];
  const params = [];
  for (const [key, col] of Object.entries(map)) {
    if (key in patch) {
      params.push(typeof patch[key] === 'string' ? patch[key].trim() || null : patch[key]);
      sets.push(`${col} = $${params.length}`);
    }
  }
  if (sets.length === 0) return getClient(id);
  params.push(id);
  const res = await pool.query(
    `UPDATE clients SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING id`,
    params,
  );
  if (res.rowCount === 0) throw new HttpError(404, 'Клиент не найден');
  return getClient(id);
}

/** Удаление запрещено, если у клиента есть проекты (иначе каскадом снесло бы задачи). */
export async function deleteClient(id) {
  const proj = await pool.query('SELECT 1 FROM projects WHERE client_id = $1 LIMIT 1', [id]);
  if (proj.rowCount > 0) {
    throw new HttpError(409, 'Нельзя удалить клиента с проектами — сначала удалите/перенесите проекты');
  }
  const res = await pool.query('DELETE FROM clients WHERE id = $1', [id]);
  if (res.rowCount === 0) throw new HttpError(404, 'Клиент не найден');
}

async function getClient(id) {
  const res = await pool.query(
    `SELECT c.id, c.company_name, c.contact_name, c.email, c.phone,
            c.support_chat_url, c.telegram_chat_id,
            (SELECT COUNT(*)::int FROM projects p WHERE p.client_id = c.id) AS projects_count
       FROM clients c WHERE c.id = $1`,
    [id],
  );
  if (res.rowCount === 0) throw new HttpError(404, 'Клиент не найден');
  return toDto(res.rows[0]);
}

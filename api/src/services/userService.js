import { pool } from '../db/pool.js';
import { HttpError } from './taskService.js';
import { hashPassword } from './authService.js';

const ROLES = ['admin', 'pm', 'viewer'];

function initialsFrom(name) {
  if (!name) return '';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

function toDto(u) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    isActive: u.is_active,
    initials: initialsFrom(u.name),
  };
}

export async function listUsers() {
  const res = await pool.query(
    `SELECT id, name, email, role, is_active FROM users ORDER BY name`,
  );
  return res.rows.map(toDto);
}

async function getUser(id) {
  const res = await pool.query(
    `SELECT id, name, email, role, is_active FROM users WHERE id = $1`,
    [id],
  );
  if (res.rowCount === 0) throw new HttpError(404, 'Сотрудник не найден');
  return toDto(res.rows[0]);
}

export async function createUser({ name, email, role, password } = {}) {
  if (!name?.trim()) throw new HttpError(400, 'Имя обязательно');
  if (!email?.trim()) throw new HttpError(400, 'Email обязателен');
  if (!password || password.length < 6) throw new HttpError(400, 'Пароль не короче 6 символов');
  const r = ROLES.includes(role) ? role : 'pm';

  const dup = await pool.query('SELECT 1 FROM users WHERE email = $1', [email.toLowerCase().trim()]);
  if (dup.rowCount > 0) throw new HttpError(409, 'Сотрудник с таким email уже существует');

  const hash = await hashPassword(password);
  const res = await pool.query(
    `INSERT INTO users (name, email, role, password_hash)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [name.trim(), email.toLowerCase().trim(), r, hash],
  );
  return getUser(res.rows[0].id);
}

export async function updateUser(id, patch = {}) {
  const sets = [];
  const params = [];
  if ('name' in patch && patch.name?.trim()) { params.push(patch.name.trim()); sets.push(`name = $${params.length}`); }
  if ('role' in patch) {
    if (!ROLES.includes(patch.role)) throw new HttpError(400, 'Недопустимая роль');
    params.push(patch.role); sets.push(`role = $${params.length}`);
  }
  if ('isActive' in patch) { params.push(Boolean(patch.isActive)); sets.push(`is_active = $${params.length}`); }
  if (sets.length === 0) return getUser(id);
  params.push(id);
  const res = await pool.query(
    `UPDATE users SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING id`,
    params,
  );
  if (res.rowCount === 0) throw new HttpError(404, 'Сотрудник не найден');
  return getUser(id);
}

export async function resetPassword(id, password) {
  if (!password || password.length < 6) throw new HttpError(400, 'Пароль не короче 6 символов');
  const hash = await hashPassword(password);
  const res = await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2 RETURNING id', [hash, id]);
  if (res.rowCount === 0) throw new HttpError(404, 'Сотрудник не найден');
  return getUser(id);
}

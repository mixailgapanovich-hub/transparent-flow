import { pool } from '../db/pool.js';

function initialsFrom(name) {
  if (!name) return '';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export async function listUsers() {
  const res = await pool.query(
    `SELECT id, name, email, role FROM users ORDER BY name`,
  );
  return res.rows.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    initials: initialsFrom(u.name),
  }));
}

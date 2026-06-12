// Сервис аутентификации: проверка пароля + выдача JWT.
// Никакого session-store — токен сам в себе несёт payload (stateless auth).

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../db/pool.js';
import { HttpError } from './taskService.js';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_TTL = process.env.JWT_TTL || '24h';

if (!JWT_SECRET) {
  console.error('[auth] JWT_SECRET не задан в .env — авторизация работать не будет');
}

/** Имя cookie, в которой лежит JWT (httpOnly). */
export const AUTH_COOKIE = 'tflow_session';

/** Опции cookie для всех путей выдачи/удаления. Единая конфигурация. */
export const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 24 * 60 * 60 * 1000, // 24h
};

/** Хеширует пароль (cost=10, как в сиде). Используется при создании/сбросе пароля. */
export function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}

/** Подписывает JWT с минимальным payload (id + role). */
export function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: JWT_TTL });
}

/** Проверяет JWT, возвращает payload или null. */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

/** Логин по email+password. Возвращает {user, token}. */
export async function login(email, password) {
  if (!email || !password) throw new HttpError(400, 'Email и пароль обязательны');

  const res = await pool.query(
    `SELECT id, name, email, role, password_hash, is_active FROM users WHERE email = $1`,
    [email.toLowerCase().trim()],
  );
  // Одинаковая ошибка для «нет такого юзера» и «неверный пароль» —
  // чтобы не подсказывать атакующему, какие email зарегистрированы.
  if (res.rowCount === 0) throw new HttpError(401, 'Неверный email или пароль');

  const row = res.rows[0];
  const ok = await bcrypt.compare(password, row.password_hash);
  if (!ok) throw new HttpError(401, 'Неверный email или пароль');
  if (!row.is_active) throw new HttpError(403, 'Учётная запись деактивирована');

  const user = { id: row.id, name: row.name, email: row.email, role: row.role };
  return { user, token: signToken(user) };
}

/** По id из payload подтягивает текущего пользователя.
 *  Деактивированные не возвращаются — их сессия перестаёт действовать сразу. */
export async function getUserById(id) {
  const res = await pool.query(
    `SELECT id, name, email, role FROM users WHERE id = $1 AND is_active = true`,
    [id],
  );
  return res.rows[0] ?? null;
}

/** Самообновление имени профиля (текущий пользователь). */
export async function updateOwnProfile(userId, { name } = {}) {
  if (!name?.trim()) throw new HttpError(400, 'Имя не может быть пустым');
  const res = await pool.query(
    `UPDATE users SET name = $1 WHERE id = $2 AND is_active = true
     RETURNING id, name, email, role`,
    [name.trim(), userId],
  );
  if (res.rowCount === 0) throw new HttpError(404, 'Пользователь не найден');
  return res.rows[0];
}

/** Смена собственного пароля: проверяем текущий, затем ставим новый. */
export async function changeOwnPassword(userId, currentPassword, newPassword) {
  if (!currentPassword || !newPassword) throw new HttpError(400, 'Укажите текущий и новый пароль');
  if (String(newPassword).length < 6) throw new HttpError(400, 'Новый пароль слишком короткий (мин. 6)');

  const res = await pool.query('SELECT password_hash FROM users WHERE id = $1 AND is_active = true', [userId]);
  if (res.rowCount === 0) throw new HttpError(404, 'Пользователь не найден');

  const ok = await bcrypt.compare(currentPassword, res.rows[0].password_hash);
  if (!ok) throw new HttpError(400, 'Текущий пароль неверен');

  const hash = await hashPassword(newPassword);
  await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, userId]);
  return { ok: true };
}

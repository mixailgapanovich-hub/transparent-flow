// Сервис «Безбарьерной загрузки»: всё, что делает клиент по magic-ссылке.
// Никакой авторизации — только токен. Токен одноразовый: после успешной загрузки
// инвалидируется (magic_link_token = NULL), повторно открыть страницу нельзя.

import { mkdir, rename, unlink } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool, withTransaction } from '../db/pool.js';
import { HttpError, getTaskById } from './taskService.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
// api/src/services/ → api/storage/
export const STORAGE_ROOT = join(__dirname, '..', '..', 'storage');

/** Возвращает мини-DTO задачи для гостевой страницы, либо бросает HttpError. */
export async function getTaskByToken(token) {
  const res = await pool.query(
    `SELECT t.id, t.title, t.description, t.status, t.tag, t.deadline,
            t.magic_link_token, t.magic_link_expires_at,
            p.slug AS project_slug, p.name AS project_name
       FROM tasks t
       JOIN projects p ON p.id = t.project_id
      WHERE t.magic_link_token = $1`,
    [token],
  );
  if (res.rowCount === 0) throw new HttpError(404, 'Ссылка не найдена или уже использована');
  const row = res.rows[0];

  if (row.status !== 'waiting') {
    throw new HttpError(410, 'Ссылка больше не активна (статус задачи изменился)');
  }
  if (row.magic_link_expires_at && new Date(row.magic_link_expires_at) < new Date()) {
    throw new HttpError(410, 'Срок действия ссылки истёк');
  }

  return {
    taskId: row.id,
    title: row.title,
    description: row.description ?? '',
    deadline: row.deadline?.toISOString?.() ?? row.deadline,
    projectId: row.project_slug,
    projectName: row.project_name,
    expiresAt: row.magic_link_expires_at?.toISOString?.() ?? row.magic_link_expires_at,
  };
}

/**
 * Принимает уже сохранённые multer-ом файлы во временной директории.
 * Перемещает их в storage/<task_id>/, пишет в task_files, гасит токен,
 * переводит задачу в client-uploaded, логирует событие.
 *
 * `files` — массив объектов от multer: { path, originalname, size, mimetype, filename }.
 */
export async function applyGuestUpload(token, files, comment = '') {
  if (!Array.isArray(files) || files.length === 0) {
    throw new HttpError(400, 'Не передано ни одного файла');
  }

  // Получаем задачу (с теми же проверками, что и getTaskByToken)
  const taskRes = await pool.query(
    `SELECT id, status, magic_link_expires_at FROM tasks WHERE magic_link_token = $1`,
    [token],
  );
  if (taskRes.rowCount === 0) throw new HttpError(404, 'Ссылка не найдена');
  const { id: taskId, status, magic_link_expires_at } = taskRes.rows[0];
  if (status !== 'waiting') throw new HttpError(410, 'Задача больше не ожидает материалов');
  if (magic_link_expires_at && new Date(magic_link_expires_at) < new Date()) {
    throw new HttpError(410, 'Срок действия ссылки истёк');
  }

  return persistUpload(taskId, files, comment, { invalidateMagicLink: true });
}

/**
 * Загрузка контента к задаче в клиентском кабинете (по постоянному проектному токену).
 * Отличие от applyGuestUpload: нет одноразового magic-токена — авторизация уже выполнена
 * clientAuth + проверкой принадлежности задачи проекту в clientService.
 */
export async function applyProjectUpload(taskId, files, comment = '', { clientId = null } = {}) {
  if (!Array.isArray(files) || files.length === 0) {
    throw new HttpError(400, 'Не передано ни одного файла');
  }
  const taskRes = await pool.query('SELECT status FROM tasks WHERE id = $1', [taskId]);
  if (taskRes.rowCount === 0) throw new HttpError(404, 'Задача не найдена');
  if (taskRes.rows[0].status !== 'waiting') {
    throw new HttpError(409, 'Эта задача сейчас не ожидает материалов');
  }
  return persistUpload(taskId, files, comment, { invalidateMagicLink: false, clientId });
}

/** Общее ядро: перемещает файлы в storage/<task_id>/, пишет в БД, меняет статус. */
async function persistUpload(taskId, files, comment, { invalidateMagicLink, clientId = null }) {
  // Перемещаем файлы в storage/<task_id>/. Если что-то упадёт — чистим за собой.
  const finalDir = join(STORAGE_ROOT, taskId);
  await mkdir(finalDir, { recursive: true });

  const movedKeys = [];
  try {
    for (const f of files) {
      const finalPath = join(finalDir, f.filename);
      await rename(f.path, finalPath);
      movedKeys.push({
        storageKey: `${taskId}/${f.filename}`,
        filename: f.originalname,
        size: f.size,
      });
    }
  } catch (err) {
    // Откат: убираем уже перемещённые файлы из storage.
    for (const m of movedKeys) {
      await unlink(join(STORAGE_ROOT, m.storageKey)).catch(() => {});
    }
    // И тем + удаляем оставшиеся «временные» файлы multer
    for (const f of files) {
      await unlink(f.path).catch(() => {});
    }
    throw err;
  }

  // Атомарно: пишем строки task_files, опциональный комментарий, меняем статус,
  // гасим токен, логируем событие, добавляем строку истории.
  const id = await withTransaction(async (c) => {
    for (const m of movedKeys) {
      await c.query(
        `INSERT INTO task_files (task_id, filename, file_size, storage_key, uploaded_by)
         VALUES ($1, $2, $3, $4, 'client')`,
        [taskId, m.filename, m.size, m.storageKey],
      );
    }
    if (comment?.trim()) {
      await c.query(
        `INSERT INTO task_comments (task_id, author_type, author_id, author_name, message)
         VALUES ($1, 'client', $2, 'Клиент', $3)`,
        [taskId, clientId, comment.trim()],
      );
    }
    await c.query(
      `UPDATE tasks
          SET status = 'client-uploaded',
              magic_link_token = CASE WHEN $2 THEN NULL ELSE magic_link_token END,
              updated_at = now()
        WHERE id = $1`,
      [taskId, invalidateMagicLink],
    );
    await c.query(
      `INSERT INTO task_events (task_id, actor_type, actor_id, event_type, payload)
       VALUES ($1, 'client', $2, 'client_upload', $3::jsonb)`,
      [taskId, clientId, JSON.stringify({ files: movedKeys.length, hasComment: Boolean(comment?.trim()) })],
    );
    await c.query(
      `INSERT INTO task_events (task_id, actor_type, event_type, payload)
       VALUES ($1, 'system', 'history', $2::jsonb)`,
      [
        taskId,
        JSON.stringify({ text: `Клиент загрузил материалы (${movedKeys.length} файл(ов))` }),
      ],
    );
    return taskId;
  });

  return getTaskById(id);
}

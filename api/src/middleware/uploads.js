// Общая фабрика multer-аплоадеров. Раньше эта конфигурация дублировалась в
// routes/guest.js и routes/client.js — теперь единый источник, переиспользуется
// также в загрузке файлов к задаче PM (routes/tasks.js). Поведение 1:1 с прежним.

import multer from 'multer';
import { randomUUID } from 'node:crypto';
import { extname, join, dirname } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { HttpError } from '../services/taskService.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
// api/src/middleware/ → api/storage/.tmp/
const TMP_DIR = join(__dirname, '..', '..', 'storage', '.tmp');

// Расширения, которые принимаем. Всё, что вне списка — режется ещё до записи на диск.
export const ALLOWED_EXT = new Set([
  '.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.txt', '.csv', '.md',
  '.zip', '.7z', '.rar',
  '.mp4', '.mov',
]);
export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 МБ
export const MAX_FILES = 10;

const storage = multer.diskStorage({
  // Создаём .tmp/ при каждом запросе на всякий случай (если кто-то снёс storage/
  // на горячую). mkdir с recursive=true — no-op, если папка уже есть.
  destination: (_req, _file, cb) => {
    mkdir(TMP_DIR, { recursive: true })
      .then(() => cb(null, TMP_DIR))
      .catch(cb);
  },
  filename: (_req, file, cb) => {
    // Защита от path-traversal: храним под uuid+ext, оригинальное имя пойдёт в БД отдельно.
    const ext = extname(file.originalname).toLowerCase();
    cb(null, `${randomUUID()}${ext || ''}`);
  },
});

/** Возвращает настроенный multer-инстанс (limits + fileFilter по ALLOWED_EXT). */
export function makeUploader() {
  return multer({
    storage,
    limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES },
    fileFilter: (_req, file, cb) => {
      const ext = extname(file.originalname).toLowerCase();
      if (!ALLOWED_EXT.has(ext)) {
        cb(new HttpError(415, `Тип файла ${ext || '(без расширения)'} не разрешён`));
        return;
      }
      cb(null, true);
    },
  });
}

/** Express error-handler для MulterError (limits) → 413. Монтируется до глобального. */
export function multerErrorHandler(err, _req, res, next) {
  if (err && err.name === 'MulterError') {
    const msg = err.code === 'LIMIT_FILE_SIZE'
      ? 'Файл слишком большой (максимум 50 МБ)'
      : err.code === 'LIMIT_FILE_COUNT'
        ? `Слишком много файлов (максимум ${MAX_FILES})`
        : `Ошибка загрузки: ${err.message}`;
    return res.status(413).json({ error: msg });
  }
  next(err);
}

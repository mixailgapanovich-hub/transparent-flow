// Публичный роутер клиентского кабинета. Авторизация — проектный токен (clientAuth).
// Всё read-only, кроме: комментарии, загрузка контента, предложения задач, вопросы.

import { Router } from 'express';
import multer from 'multer';
import { randomUUID } from 'node:crypto';
import { extname, join, dirname } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { clientAuth } from '../middleware/clientAuth.js';
import { HttpError } from '../services/taskService.js';
import {
  getProjectView,
  addClientComment,
  applyClientUpload,
  suggestTask,
  askQuestion,
  getClientNotifications,
  markClientRead,
} from '../services/clientService.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TMP_DIR = join(__dirname, '..', '..', 'storage', '.tmp');

const ALLOWED_EXT = new Set([
  '.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.txt', '.csv', '.md',
  '.zip', '.7z', '.rar',
  '.mp4', '.mov',
]);
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const MAX_FILES = 10;

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    mkdir(TMP_DIR, { recursive: true })
      .then(() => cb(null, TMP_DIR))
      .catch(cb);
  },
  filename: (_req, file, cb) => {
    const ext = extname(file.originalname).toLowerCase();
    cb(null, `${randomUUID()}${ext || ''}`);
  },
});

const upload = multer({
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

const router = Router();
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// Все маршруты проходят clientAuth — токен в :token.
router.use('/:token', clientAuth);

// Полный DTO проекта.
router.get('/:token', wrap(async (req, res) => {
  res.json(await getProjectView(req.clientCtx));
}));

// Комментарий клиента к задаче (опционально с anchor на выделение).
router.post('/:token/tasks/:taskId/comments', wrap(async (req, res) => {
  const { message, anchor } = req.body ?? {};
  const updated = await addClientComment(req.clientCtx, req.params.taskId, { message, anchor });
  res.status(201).json(updated);
}));

// Загрузка контента к задаче.
router.post('/:token/tasks/:taskId/upload', upload.array('files', MAX_FILES), wrap(async (req, res) => {
  const updated = await applyClientUpload(
    req.clientCtx,
    req.params.taskId,
    req.files ?? [],
    req.body?.comment ?? '',
  );
  res.status(201).json(updated);
}));

// Предложить задачу.
router.post('/:token/suggest-task', wrap(async (req, res) => {
  const { title, description } = req.body ?? {};
  res.status(201).json(await suggestTask(req.clientCtx, { title, description }));
}));

// Задать вопрос.
router.post('/:token/question', wrap(async (req, res) => {
  const { text } = req.body ?? {};
  res.status(201).json(await askQuestion(req.clientCtx, { text }));
}));

// Лента уведомлений клиента.
router.get('/:token/notifications', wrap(async (req, res) => {
  const { category, unread, limit, offset } = req.query;
  res.json(await getClientNotifications(req.clientCtx, {
    category: category || null,
    unread: unread === 'true',
    limit: Math.min(Number(limit) || 30, 100),
    offset: Number(offset) || 0,
  }));
}));

// Отметить уведомления клиента прочитанными.
router.post('/:token/notifications/read', wrap(async (req, res) => {
  const { eventIds } = req.body ?? {};
  res.json(await markClientRead(req.clientCtx, eventIds ?? []));
}));

// Локальный обработчик ошибок multer (до глобального).
router.use((err, _req, res, next) => {
  if (err && err.name === 'MulterError') {
    const msg = err.code === 'LIMIT_FILE_SIZE'
      ? 'Файл слишком большой (максимум 50 МБ)'
      : err.code === 'LIMIT_FILE_COUNT'
        ? `Слишком много файлов (максимум ${MAX_FILES})`
        : `Ошибка загрузки: ${err.message}`;
    return res.status(413).json({ error: msg });
  }
  next(err);
});

export default router;

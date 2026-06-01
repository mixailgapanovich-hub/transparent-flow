// Публичный роутер клиентского кабинета. Авторизация — проектный токен (clientAuth).
// Всё read-only, кроме: комментарии, загрузка контента, предложения задач, вопросы,
// и решения по согласованию (одобрить / вернуть на доработку).

import { Router } from 'express';
import { join } from 'node:path';
import { clientAuth } from '../middleware/clientAuth.js';
import { makeUploader, MAX_FILES, multerErrorHandler } from '../middleware/uploads.js';
import { STORAGE_ROOT } from '../services/guestService.js';
import {
  getProjectView,
  addClientComment,
  applyClientUpload,
  suggestTask,
  askQuestion,
  getClientNotifications,
  markClientRead,
  approveTaskReview,
  requestTaskChanges,
  getClientFile,
} from '../services/clientService.js';

const router = Router();
const upload = makeUploader();
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

// Решение по согласованию: одобрить (→ done + акт).
router.post('/:token/tasks/:taskId/approval/approve', wrap(async (req, res) => {
  res.json(await approveTaskReview(req.clientCtx, req.params.taskId));
}));

// Решение по согласованию: вернуть на доработку (→ in-progress). comment обязателен.
router.post('/:token/tasks/:taskId/approval/changes', wrap(async (req, res) => {
  const { comment } = req.body ?? {};
  res.json(await requestTaskChanges(req.clientCtx, req.params.taskId, comment));
}));

// Скачивание файла клиентом (только файлы задач его проекта, не внутренних).
router.get('/:token/files/:fileId/download', wrap(async (req, res) => {
  const { storage_key, filename } = await getClientFile(req.clientCtx, req.params.fileId);
  res.download(join(STORAGE_ROOT, storage_key), filename);
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
router.use(multerErrorHandler);

export default router;

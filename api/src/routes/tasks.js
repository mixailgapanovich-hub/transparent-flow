import { Router } from 'express';
import {
  listTasks,
  getTaskById,
  transitionStatus,
  updateTaskFields,
  createTask,
  deleteTask,
  addComment,
  addAssignee,
  requestClientContent,
  HttpError,
} from '../services/taskService.js';

const router = Router();

/** Универсальный обёрточный wrapper для async-handler-ов. */
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// ── Чтение ────────────────────────────────────────────────────────────────

router.get('/', wrap(async (req, res) => {
  const projectSlug = req.query.projectSlug?.toString() || undefined;
  res.json(await listTasks({ projectSlug }));
}));

router.get('/:id', wrap(async (req, res) => {
  const task = await getTaskById(req.params.id);
  if (!task) throw new HttpError(404, 'Task not found');
  res.json(task);
}));

// ── Запись ────────────────────────────────────────────────────────────────

// Создание новой задачи
router.post('/', wrap(async (req, res) => {
  const created = await createTask(req.body ?? {});
  res.status(201).json(created);
}));

// Частичное обновление полей
router.patch('/:id', wrap(async (req, res) => {
  res.json(await updateTaskFields(req.params.id, req.body ?? {}));
}));

// Удаление — проверка прав (admin или исполнитель) внутри сервиса
router.delete('/:id', wrap(async (req, res) => {
  await deleteTask(req.params.id, { actor: req.user });
  res.status(204).end();
}));

// Смена статуса с проверкой FSM.
// isAdmin берём ИСКЛЮЧИТЕЛЬНО из req.user.role — тело запроса игнорируется,
// иначе любой PM мог бы написать isAdmin:true и откатывать done.
router.post('/:id/transition', wrap(async (req, res) => {
  const { toStatus } = req.body ?? {};
  if (!toStatus) throw new HttpError(400, 'toStatus required');
  const isAdmin = req.user?.role === 'admin';
  res.json(await transitionStatus(req.params.id, toStatus, { isAdmin, actorId: req.user?.id }));
}));

// Добавить комментарий
router.post('/:id/comments', wrap(async (req, res) => {
  const { message, authorType = 'pm', authorName } = req.body ?? {};
  res.json(await addComment(req.params.id, { message, authorType, authorName }));
}));

// Назначить исполнителя
router.post('/:id/assignees', wrap(async (req, res) => {
  const { userId } = req.body ?? {};
  res.json(await addAssignee(req.params.id, userId));
}));

// Запросить контент у клиента (status → waiting + magic link)
router.post('/:id/request-client', wrap(async (req, res) => {
  res.json(await requestClientContent(req.params.id));
}));

export default router;

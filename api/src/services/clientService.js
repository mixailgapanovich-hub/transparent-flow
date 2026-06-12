// Сервис клиентского кабинета: всё, что делает клиент по проектному токену.
// Авторизация — middleware clientAuth (req.clientCtx). Здесь только бизнес-логика,
// строго в рамках одного проекта из контекста.

import { pool, withTransaction } from '../db/pool.js';
import { HttpError, listTasks, addComment } from './taskService.js';
import { telegramState } from './channels/telegram.js';

/** Полный DTO клиентского вида: проект, клиент, задачи (без внутренних). */
export async function getProjectView(ctx) {
  const tasks = await listTasks({ projectSlug: ctx.project.slug, excludeInternal: true });

  // Команду собираем из исполнителей видимых задач — клиенту не нужен весь штат агентства.
  const teamMap = new Map();
  for (const t of tasks) {
    for (const a of t.assignees ?? []) {
      if (!teamMap.has(a.id)) teamMap.set(a.id, { id: a.id, name: a.name, initials: a.initials });
    }
  }

  return {
    project: ctx.project,
    client: {
      companyName: ctx.client.companyName,
      contactName: ctx.client.contactName,
      telegramLinked: ctx.client.telegramLinked,
    },
    supportChatUrl: ctx.client.supportChatUrl ?? null,
    telegramBotConfigured: Boolean(telegramState.botUsername || process.env.TELEGRAM_BOT_USERNAME),
    team: [...teamMap.values()],
    tasks,
  };
}

/** Проверяет, что задача принадлежит проекту токена и не внутренняя. Возвращает task_id. */
async function assertTaskInProject(ctx, taskId) {
  const { rows } = await pool.query(
    `SELECT id FROM tasks WHERE id = $1 AND project_id = $2 AND NOT is_internal`,
    [taskId, ctx.project.id],
  );
  if (rows.length === 0) throw new HttpError(404, 'Задача не найдена в этом проекте');
  return rows[0].id;
}

/** Комментарий клиента к задаче (опционально с якорем на выделенный текст). */
export async function addClientComment(ctx, taskId, { message, anchor }) {
  await assertTaskInProject(ctx, taskId);
  const authorName = ctx.client.contactName || ctx.client.companyName || 'Клиент';
  return addComment(taskId, {
    authorType: 'client',
    authorId: ctx.client.id,
    authorName,
    message,
    anchor,
  });
}

/** Загрузка контента клиентом к конкретной задаче (по проектному токену, не magic-link). */
export async function applyClientUpload(ctx, taskId, files, comment = '') {
  await assertTaskInProject(ctx, taskId);
  // Переиспользуем общий аплоадер, но авторизация — по проектному токену.
  const { applyProjectUpload } = await import('./guestService.js');
  return applyProjectUpload(taskId, files, comment, { clientId: ctx.client.id });
}

/** Клиент одобряет результат на согласовании. */
export async function approveTaskReview(ctx, taskId) {
  await assertTaskInProject(ctx, taskId);
  const { approveReview } = await import('./approvalService.js');
  return approveReview(taskId, { clientId: ctx.client.id });
}

/** Клиент возвращает результат на доработку (комментарий обязателен). */
export async function requestTaskChanges(ctx, taskId, comment) {
  await assertTaskInProject(ctx, taskId);
  const { requestChanges } = await import('./approvalService.js');
  return requestChanges(taskId, { clientId: ctx.client.id, comment });
}

/** Метаданные файла для скачивания клиентом: файл должен быть в проекте токена и не внутренний. */
export async function getClientFile(ctx, fileId) {
  const { rows } = await pool.query(
    `SELECT f.storage_key, f.filename
       FROM task_files f
       JOIN tasks t ON t.id = f.task_id
      WHERE f.id = $1 AND t.project_id = $2 AND NOT t.is_internal`,
    [fileId, ctx.project.id],
  );
  if (rows.length === 0) throw new HttpError(404, 'Файл не найден');
  return rows[0];
}

/** Предложение задачи от клиента → строка task_suggestions + проектное событие. */
export async function suggestTask(ctx, { title, description }) {
  if (!title?.trim()) throw new HttpError(400, 'Укажите название задачи');

  return withTransaction(async (c) => {
    const ins = await c.query(
      `INSERT INTO task_suggestions (project_id, client_id, title, description)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [ctx.project.id, ctx.client.id, title.trim(), (description ?? '').trim()],
    );
    const suggestionId = ins.rows[0].id;
    await c.query(
      `INSERT INTO task_events (project_id, actor_type, actor_id, event_type, payload)
       VALUES ($1, 'client', $2, 'task_suggested', $3::jsonb)`,
      [ctx.project.id, ctx.client.id, JSON.stringify({ suggestionId, title: title.trim() })],
    );
    return { ok: true, suggestionId };
  });
}

/** Лента уведомлений клиента (только события его проекта, релевантные клиенту). */
export async function getClientNotifications(ctx, opts) {
  const { listForClient, clientUnreadCounts } = await import('./notificationsFeed.js');
  const [items, counts] = await Promise.all([
    listForClient(ctx, opts),
    clientUnreadCounts(ctx),
  ]);
  return { items, counts };
}

/** Отметить уведомления клиента прочитанными. */
export async function markClientRead(ctx, eventIds) {
  const { markRead } = await import('./notificationsFeed.js');
  return markRead({ type: 'client', id: ctx.client.id }, eventIds);
}

/** Вопрос клиента (общий по проекту) → проектное событие client_question. */
export async function askQuestion(ctx, { text }) {
  if (!text?.trim()) throw new HttpError(400, 'Введите текст вопроса');

  await pool.query(
    `INSERT INTO task_events (project_id, actor_type, actor_id, event_type, payload)
     VALUES ($1, 'client', $2, 'client_question', $3::jsonb)`,
    [ctx.project.id, ctx.client.id, JSON.stringify({ text: text.trim().slice(0, 4000) })],
  );
  return { ok: true };
}

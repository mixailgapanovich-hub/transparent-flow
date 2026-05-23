// Admin-роут: ручной trigger каскада и метрики уведомлений.
// Все эндпоинты требуют role=admin (проверка локальная, поверх requireAuth).

import { Router } from 'express';
import { pool } from '../db/pool.js';
import { tick } from '../services/notificationService.js';
import { HttpError } from '../services/taskService.js';

const router = Router();
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

function requireAdmin(req, _res, next) {
  if (req.user?.role !== 'admin') return next(new HttpError(403, 'Только для администраторов'));
  next();
}

// Ручной запуск каскада. ?virtualNow=ISO даёт «фейковое сейчас» для демо.
router.post('/trigger-notifications', requireAdmin, wrap(async (req, res) => {
  const virtual = req.query.virtualNow;
  const now = virtual ? new Date(virtual) : new Date();
  if (Number.isNaN(now.getTime())) throw new HttpError(400, 'Invalid virtualNow');
  const summary = await tick({ now });
  res.json({ now: now.toISOString(), ...summary });
}));

// Лента системных событий для PM (для NotificationsDropdown).
// Доступно любому залогиненному PM, не только админу.
router.get('/notifications', wrap(async (_req, res) => {
  const r = await pool.query(`
    SELECT
      e.id, e.task_id, e.event_type, e.payload, e.created_at,
      t.title  AS task_title,
      p.name   AS project_name,
      p.slug   AS project_slug
    FROM task_events e
    JOIN tasks t    ON t.id = e.task_id
    JOIN projects p ON p.id = t.project_id
    WHERE e.event_type IN (
      'notification_sent','notification_failed','cascade_exhausted',
      'verification_email_sent','verification_email_failed','client_upload'
    )
    ORDER BY e.created_at DESC
    LIMIT 30
  `);
  res.json(r.rows);
}));

// Метрики за последние 24ч. Удобно для скриншота в дипломе.
router.get('/health/metrics', requireAdmin, wrap(async (_req, res) => {
  const result = await pool.query(`
    WITH window AS (
      SELECT now() - interval '24 hours' AS since
    ),
    notifs AS (
      SELECT
        event_type,
        payload->>'level' AS level,
        COUNT(*)::int AS count
      FROM task_events, window
      WHERE created_at > window.since
        AND event_type IN ('notification_sent', 'notification_failed',
                           'cascade_exhausted',
                           'verification_email_sent', 'verification_email_failed')
      GROUP BY event_type, payload->>'level'
      ORDER BY event_type, level
    )
    SELECT json_agg(notifs.*) AS rows FROM notifs
  `);
  res.json({ windowHours: 24, events: result.rows[0].rows ?? [] });
}));

export default router;

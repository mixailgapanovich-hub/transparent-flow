import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { listProjects, createProject, updateProject, archiveProject } from '../services/projectService.js';
import { getProjectInfo, saveProjectInfo } from '../services/projectInfoService.js';
import { requireAdmin } from '../middleware/auth.js';
import { pool } from '../db/pool.js';

const router = Router();
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// ── «О проекте»: описание/контакты/доступы (PM видит и правит) ────────────────
router.get('/:id/info', wrap(async (req, res) => {
  res.json(await getProjectInfo(req.params.id));
}));
router.put('/:id/info', wrap(async (req, res) => {
  res.json(await saveProjectInfo(req.params.id, req.body ?? {}));
}));

router.get('/', async (_req, res, next) => {
  try {
    const items = await listProjects();
    res.json(items);
  } catch (err) {
    next(err);
  }
});

// ── Админ: создание/редактирование/архивирование проектов ────────────────────
router.post('/', requireAdmin, wrap(async (req, res) => {
  res.status(201).json(await createProject(req.body ?? {}));
}));

router.patch('/:id', requireAdmin, wrap(async (req, res) => {
  res.json(await updateProject(req.params.id, req.body ?? {}));
}));

router.post('/:id/archive', requireAdmin, wrap(async (req, res) => {
  res.json(await archiveProject(req.params.id));
}));

/**
 * POST /api/projects/:id/client-link
 * Генерирует или перевыпускает постоянный токен клиентского доступа.
 * Перевыпуск убивает старую ссылку (UNIQUE-токен меняется) и заново включает доступ.
 */
router.post('/:id/client-link', async (req, res, next) => {
  try {
    const token = randomUUID();
    const { rowCount } = await pool.query(
      `UPDATE projects
          SET client_view_token = $1, client_view_enabled = true
        WHERE id = $2`,
      [token, req.params.id],
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Проект не найден' });
    res.json({ token, url: `/client/${token}`, enabled: true });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/projects/:id/client-link
 * Управление существующей ссылкой: отзыв/включение (enabled) и/или смена supportChatUrl.
 */
router.patch('/:id/client-link', async (req, res, next) => {
  try {
    const { enabled, supportChatUrl } = req.body ?? {};

    if (typeof enabled === 'boolean') {
      const r = await pool.query(
        `UPDATE projects SET client_view_enabled = $1 WHERE id = $2 RETURNING client_id`,
        [enabled, req.params.id],
      );
      if (r.rowCount === 0) return res.status(404).json({ error: 'Проект не найден' });
    }

    if (typeof supportChatUrl === 'string') {
      const r = await pool.query(
        `UPDATE clients SET support_chat_url = $1
          WHERE id = (SELECT client_id FROM projects WHERE id = $2)`,
        [supportChatUrl.trim() || null, req.params.id],
      );
      if (r.rowCount === 0) return res.status(404).json({ error: 'Проект не найден' });
    }

    const cur = await pool.query(
      `SELECT p.client_view_token, p.client_view_enabled, c.support_chat_url
         FROM projects p JOIN clients c ON c.id = p.client_id
        WHERE p.id = $1`,
      [req.params.id],
    );
    if (cur.rowCount === 0) return res.status(404).json({ error: 'Проект не найден' });
    const row = cur.rows[0];
    res.json({
      token: row.client_view_token,
      url: row.client_view_token ? `/client/${row.client_view_token}` : null,
      enabled: row.client_view_enabled,
      supportChatUrl: row.support_chat_url ?? null,
    });
  } catch (err) {
    next(err);
  }
});

export default router;

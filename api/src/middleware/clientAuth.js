// Middleware клиентского доступа по токену проекта.
// Резолвит /api/client/:token → projects.client_view_token, грузит проект+клиента
// в req.clientCtx. Никакого JWT — токен сам по себе является «ключом» к одному проекту.

import { pool } from '../db/pool.js';

export async function clientAuth(req, res, next) {
  try {
    const { token } = req.params;
    if (!token) return res.status(404).json({ error: 'Ссылка не найдена' });

    const { rows } = await pool.query(
      `SELECT p.id   AS project_id,
              p.slug AS project_slug,
              p.name AS project_name,
              p.client_view_enabled,
              c.id   AS client_id,
              c.company_name,
              c.contact_name,
              c.support_chat_url,
              c.telegram_chat_id AS client_telegram_chat_id
         FROM projects p
         JOIN clients  c ON c.id = p.client_id
        WHERE p.client_view_token = $1`,
      [token],
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Ссылка не найдена или отозвана' });
    }
    if (!rows[0].client_view_enabled) {
      return res.status(403).json({ error: 'Доступ к проекту закрыт' });
    }

    const row = rows[0];
    req.clientCtx = {
      token,
      project: { id: row.project_id, slug: row.project_slug, name: row.project_name },
      client: {
        id: row.client_id,
        companyName: row.company_name,
        contactName: row.contact_name,
        supportChatUrl: row.support_chat_url,
        telegramLinked: Boolean(row.client_telegram_chat_id),
      },
    };
    next();
  } catch (err) {
    next(err);
  }
}

// Глобальные настройки приложения (app_settings, migration 012).
// Сейчас: имя агентства + ссылка на сайт (для «молнии»-логотипа).

import { pool } from '../db/pool.js';

const ALLOWED = {
  agencyName: 'agency_name',
  agencySiteUrl: 'agency_site_url',
};

export async function getSettings() {
  const res = await pool.query('SELECT key, value FROM app_settings');
  const map = Object.fromEntries(res.rows.map((r) => [r.key, r.value]));
  return {
    agencyName: map.agency_name ?? 'Adena Digital',
    agencySiteUrl: map.agency_site_url ?? 'https://adena.by',
  };
}

/** Частичное обновление (admin). Принимает {agencyName?, agencySiteUrl?}. */
export async function updateSettings(patch = {}) {
  for (const [field, col] of Object.entries(ALLOWED)) {
    if (field in patch) {
      const value = patch[field] == null ? '' : String(patch[field]).trim();
      await pool.query(
        `INSERT INTO app_settings (key, value, updated_at) VALUES ($1, $2, now())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
        [col, value],
      );
    }
  }
  return getSettings();
}

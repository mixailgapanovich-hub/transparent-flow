-- Глобальные настройки приложения (итерация 7): имя агентства + ссылка на сайт
-- (логотип «молнии» в сайдбаре ведёт на этот сайт). Ключ-значение, чтобы легко
-- расширять. Дефолты — для текущего агентства «Adena Digital».

CREATE TABLE IF NOT EXISTS app_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO app_settings (key, value) VALUES
  ('agency_name', 'Adena Digital'),
  ('agency_site_url', 'https://adena.by')
ON CONFLICT (key) DO NOTHING;

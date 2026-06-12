-- Несколько Telegram-получателей на проект (итерация 5).
-- Раньше был ровно один chat_id на клиента (clients.telegram_chat_id, migration 003).
-- Теперь к проекту можно привязать несколько чатов, а привязка — self-serve из
-- кабинета клиента через одноразовый токен, ведущий на проект (а не на client_id).

CREATE TABLE IF NOT EXISTS project_telegram_recipients (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  chat_id     TEXT        NOT NULL,
  username    TEXT,
  label       TEXT,                 -- имя из Telegram (first_name) для отображения
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, chat_id)
);

CREATE INDEX IF NOT EXISTS idx_ptr_project ON project_telegram_recipients(project_id);

-- Onboarding-токены, привязанные к ПРОЕКТУ (параллельно client_telegram_onboarding).
CREATE TABLE IF NOT EXISTS project_telegram_onboarding (
  token      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  used_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_pto_project ON project_telegram_onboarding(project_id);

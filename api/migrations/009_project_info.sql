-- Итерация 3 «О проекте»: карточка проекта с описанием, контактами и доступами.
-- Один ряд на проект. Контакты и доступы — JSONB-списки (панель сохраняется целиком).
-- У каждого доступа флаг visibleToClient: видно ли его в клиентском кабинете.

CREATE TABLE project_info (
    project_id  UUID PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
    description TEXT,
    site_url    TEXT,
    drive_url   TEXT,
    contacts    JSONB NOT NULL DEFAULT '[]'::jsonb,  -- [{name, role, email, phone}]
    credentials JSONB NOT NULL DEFAULT '[]'::jsonb,  -- [{label, link, login, password, comment, visibleToClient}]
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Клиентский вид проекта (Этап 1 модуля «клиентский кабинет»).
-- Доступ по постоянному токену на ПРОЕКТ (а не одноразовый на задачу, как magic-link).

-- 1) Постоянный токен доступа клиента ко всему проекту.
--    Неугадываемый UUID, можно отзывать (enabled=false) и перевыпускать.
ALTER TABLE projects
    ADD COLUMN client_view_token   UUID UNIQUE,
    ADD COLUMN client_view_enabled BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX idx_projects_client_view_token
    ON projects(client_view_token)
    WHERE client_view_token IS NOT NULL;

-- 2) Ссылка на общий чат поддержки клиента (кнопка «Telegram-чат» в клиентском виде).
ALTER TABLE clients
    ADD COLUMN support_chat_url TEXT;

-- 3) Внутренние задачи — реализация тега «Внутренняя» (диплом, п. 3.1.2).
--    Скрыты от клиента: фильтр NOT is_internal в clientService.
ALTER TABLE tasks
    ADD COLUMN is_internal BOOLEAN NOT NULL DEFAULT false;

-- 4) Якорь выделения для комментариев в стиле Google Docs.
--    {start, end, quote} — офсеты в plaintext описания + сам выделенный текст.
--    NULL = комментарий ко всей задаче (как было раньше).
ALTER TABLE task_comments
    ADD COLUMN anchor JSONB;

-- 5) Предложения задач от клиента. PM может «Принять» (создаст реальную задачу).
CREATE TABLE task_suggestions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    client_id   UUID REFERENCES clients(id) ON DELETE SET NULL,
    title       VARCHAR(300) NOT NULL,
    description TEXT,
    status      VARCHAR(10) NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_task_suggestions_project ON task_suggestions(project_id);
CREATE INDEX idx_task_suggestions_status  ON task_suggestions(status);

-- 6) Проектные (не привязанные к задаче) события: предложения задач и вопросы клиента.
--    Делаем task_id опциональным и добавляем project_id — это нужно центру
--    уведомлений (Этап 2), чтобы единая лента включала событие без конкретной задачи.
ALTER TABLE task_events
    ALTER COLUMN task_id DROP NOT NULL,
    ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE CASCADE;

ALTER TABLE task_events
    ADD CONSTRAINT task_events_scope_chk
    CHECK (task_id IS NOT NULL OR project_id IS NOT NULL);

CREATE INDEX idx_task_events_project_id ON task_events(project_id)
    WHERE project_id IS NOT NULL;

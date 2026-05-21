-- Начальная схема БД проекта "Прозрачный поток".
-- Соответствует docs/database.sql (Этап 2 диплома).

-- Пользователи агентства
CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          VARCHAR(100) NOT NULL,
    email         VARCHAR(150) UNIQUE NOT NULL,
    role          VARCHAR(20) NOT NULL DEFAULT 'pm'
                  CHECK (role IN ('admin', 'pm', 'viewer')),
    password_hash TEXT NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Клиенты агентства
CREATE TABLE clients (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR(150) NOT NULL,
    contact_name VARCHAR(100),
    email        VARCHAR(150),
    phone        VARCHAR(30),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Проекты
CREATE TABLE projects (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug        VARCHAR(50) UNIQUE,
    client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    name        VARCHAR(200) NOT NULL,
    status      VARCHAR(20) NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'paused', 'waiting', 'completed')),
    priority    VARCHAR(10) NOT NULL DEFAULT 'medium'
                CHECK (priority IN ('high', 'medium', 'low')),
    category    VARCHAR(100),
    deadline    DATE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Задачи
CREATE TABLE tasks (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id            UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title                 VARCHAR(300) NOT NULL,
    description           TEXT,
    status                VARCHAR(20) NOT NULL DEFAULT 'backlog'
                          CHECK (status IN (
                              'backlog','to-do','in-progress',
                              'waiting','client-uploaded','done'
                          )),
    tag                   VARCHAR(20) NOT NULL DEFAULT 'Обычная'
                          CHECK (tag IN ('Блокирующая','Ключевая','Обычная')),
    deadline              TIMESTAMPTZ,
    magic_link_token      UUID UNIQUE,
    magic_link_expires_at TIMESTAMPTZ,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Зависимости между задачами
CREATE TABLE task_dependencies (
    task_id         UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    depends_on_id   UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, depends_on_id),
    CHECK (task_id <> depends_on_id)
);

-- Назначение исполнителей
CREATE TABLE task_assignees (
    task_id     UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (task_id, user_id)
);

-- Файлы, привязанные к задаче (загружают клиенты или PM)
CREATE TABLE task_files (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id     UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    filename    VARCHAR(255) NOT NULL,
    file_size   BIGINT,
    storage_key TEXT NOT NULL,
    uploaded_by VARCHAR(20) NOT NULL DEFAULT 'client'
                CHECK (uploaded_by IN ('client','pm')),
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Комментарии к задаче
CREATE TABLE task_comments (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id     UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    author_type VARCHAR(10) NOT NULL CHECK (author_type IN ('pm','client')),
    author_id   UUID,
    author_name VARCHAR(100) NOT NULL,
    message     TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Аудит-лог событий задачи (FSM-переходы, уведомления, загрузки)
CREATE TABLE task_events (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id    UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    actor_type VARCHAR(10) NOT NULL
               CHECK (actor_type IN ('pm','client','system')),
    actor_id   UUID,
    event_type VARCHAR(50) NOT NULL,
    payload    JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Индексы для производительности
CREATE INDEX idx_projects_slug       ON projects(slug);
CREATE INDEX idx_tasks_project_id    ON tasks(project_id);
CREATE INDEX idx_tasks_status        ON tasks(status);
CREATE INDEX idx_tasks_magic_token   ON tasks(magic_link_token)
    WHERE magic_link_token IS NOT NULL;
CREATE INDEX idx_task_events_task_id ON task_events(task_id);
CREATE INDEX idx_task_files_task_id  ON task_files(task_id);
CREATE INDEX idx_task_comments_task  ON task_comments(task_id);

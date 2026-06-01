-- Цикл согласования (Approval Loop) — глагол агентской работы «согласовать».
-- PM отправляет результат на согласование (status → review), клиент Одобряет
-- (→ done + акт приёмки) или Возвращает на доработку (→ in-progress, новый раунд).
-- Согласование — итеративная сущность (несколько раундов), а не флаг статуса:
-- это даёт честный аудит и привязывает акт к конкретному одобренному раунду.

-- 1) Новый статус 'review' в CHECK задач. Пересоздаём constraint
--    (имя tasks_status_check — дефолт Postgres, подтверждено pg_constraint).
ALTER TABLE tasks DROP CONSTRAINT tasks_status_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check
  CHECK (status IN (
    'backlog','to-do','in-progress',
    'waiting','client-uploaded','review','done'
  ));

-- 2) Раунды согласования. round растёт при каждой повторной отправке.
--    'withdrawn' = PM отозвал раунд до решения клиента (чистый аудит без удаления).
CREATE TABLE task_approvals (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id           UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    round             INT  NOT NULL DEFAULT 1,
    status            VARCHAR(20) NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','approved','changes_requested','withdrawn')),
    submitted_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    submitted_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    message           TEXT,                 -- что отправлено на согласование
    link              TEXT,                 -- внешняя ссылка (Figma/staging)
    decided_at        TIMESTAMPTZ,
    decision_comment  TEXT,                 -- комментарий клиента при возврате
    decided_by_client UUID REFERENCES clients(id) ON DELETE SET NULL
);

CREATE INDEX idx_task_approvals_task ON task_approvals(task_id);

-- 3) Привязка файлов к раунду согласования (NULL = обычный файл задачи).
ALTER TABLE task_files
    ADD COLUMN approval_id UUID REFERENCES task_approvals(id) ON DELETE SET NULL;

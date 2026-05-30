-- Центр уведомлений (Этап 2). Лента событий ВНУТРИ приложения, без рассылок.
-- Здесь только хранилище отметок «прочитано» — сами события уже пишутся в task_events.

-- Отметки прочитанного на субъекта (PM-пользователь или клиент).
-- subject_type='user'  → subject_id = users.id
-- subject_type='client'→ subject_id = clients.id
CREATE TABLE notification_reads (
    subject_type VARCHAR(10) NOT NULL CHECK (subject_type IN ('user', 'client')),
    subject_id   UUID NOT NULL,
    event_id     UUID NOT NULL REFERENCES task_events(id) ON DELETE CASCADE,
    read_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (subject_type, subject_id, event_id)
);

CREATE INDEX idx_notification_reads_subject
    ON notification_reads(subject_type, subject_id);

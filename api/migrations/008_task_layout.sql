-- Итерация 2 «Майндмап»: сохранение раскладки узлов графа зависимостей.
-- Позиция задаётся на пару (задача, аудитория): у PM и у клиента — своя раскладка.

CREATE TABLE task_layout (
    task_id    UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    audience   VARCHAR(10) NOT NULL CHECK (audience IN ('pm', 'client')),
    x          REAL NOT NULL,
    y          REAL NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (task_id, audience)
);

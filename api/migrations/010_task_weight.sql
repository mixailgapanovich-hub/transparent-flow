-- Итерация 4b: вес задачи (1–10) для расчёта готовности проекта по весу.
-- NULL = вес не задан (в расчёте считается как 1, в UI — плашка «вес не задан»).

ALTER TABLE tasks ADD COLUMN weight INT
    CHECK (weight IS NULL OR (weight BETWEEN 1 AND 10));

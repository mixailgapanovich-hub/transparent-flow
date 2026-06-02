-- Итерация 2 «Фундамент»: управление сущностями из UI.
-- Единственное изменение схемы — «мягкая» деактивация сотрудника.
-- Жёсткое удаление пользователя невозможно: на него ссылаются task_events.actor_id,
-- task_assignees.user_id, task_approvals.submitted_by. Поэтому деактивируем флагом.

ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;

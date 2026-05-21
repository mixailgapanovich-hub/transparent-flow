// Серверная копия FSM. Должна совпадать с src/utils/taskWorkflow.js на фронте.
// Сервер — последний рубеж: даже если фронт пропустит запрещённый переход,
// валидация на бэке остановит запись.

export const STATUS_TRANSITIONS = {
  backlog: ['to-do'],
  'to-do': ['in-progress', 'backlog'],
  'in-progress': ['waiting', 'done', 'to-do'],
  waiting: ['client-uploaded'],
  'client-uploaded': ['in-progress', 'done', 'waiting'],
  done: [],
};

function adminRollbackStatuses(fromStatus) {
  if (fromStatus !== 'done') return null;
  return ['backlog', 'to-do', 'in-progress', 'waiting', 'client-uploaded', 'done'];
}

export function canTransitionStatus(fromStatus, toStatus, options = {}) {
  const { isAdmin = false } = options;
  if (fromStatus === toStatus) return true;
  const adminRollback = adminRollbackStatuses(fromStatus);
  if (isAdmin && adminRollback) return adminRollback.includes(toStatus);
  const allowed = STATUS_TRANSITIONS[fromStatus] ?? [];
  return allowed.includes(toStatus);
}

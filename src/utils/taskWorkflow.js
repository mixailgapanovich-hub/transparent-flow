export const STATUS_TRANSITIONS = {
  backlog: ['to-do'],
  'to-do': ['in-progress', 'backlog'],
  'in-progress': ['waiting', 'review', 'done', 'to-do'],
  waiting: ['client-uploaded'],
  'client-uploaded': ['in-progress', 'review', 'done', 'waiting'],
  review: ['done', 'in-progress'],
  done: [],
};

function adminRollbackStatuses(fromStatus) {
  if (fromStatus !== 'done') return null;
  return ['backlog', 'to-do', 'in-progress', 'waiting', 'client-uploaded', 'review', 'done'];
}

export function canTransitionStatus(fromStatus, toStatus, options = {}) {
  const { isAdmin = false } = options;
  if (fromStatus === toStatus) return true;
  const adminRollback = adminRollbackStatuses(fromStatus);
  if (isAdmin && adminRollback) return adminRollback.includes(toStatus);
  const allowed = STATUS_TRANSITIONS[fromStatus] ?? [];
  return allowed.includes(toStatus);
}

export function getAllowedStatuses(fromStatus, options = {}) {
  const { isAdmin = false } = options;
  const adminRollback = adminRollbackStatuses(fromStatus);
  if (isAdmin && adminRollback) return adminRollback;
  const allowed = STATUS_TRANSITIONS[fromStatus] ?? [];
  return [fromStatus, ...allowed];
}

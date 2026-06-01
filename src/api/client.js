// Тонкий клиент над fetch. Все запросы идут на /api через vite-прокси (→ :3001).
// Никаких axios/react-query: на этом этапе достаточно нативного fetch.

async function request(path, options = {}) {
  const res = await fetch(path, {
    // credentials: 'include' — обязательно, чтобы браузер отправлял httpOnly cookie с JWT.
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
    ...options,
  });

  if (!res.ok) {
    let detail = '';
    try { detail = (await res.json())?.error ?? ''; } catch { /* ignore */ }
    const err = new Error(`API ${res.status} ${path} ${detail}`.trim());
    err.status = res.status;
    err.detail = detail;
    throw err;
  }

  if (res.status === 204) return null;
  return res.json();
}

const json = (method, path, body) =>
  request(path, { method, body: body !== undefined ? JSON.stringify(body) : undefined });

// POST multipart/form-data. НЕ ставим Content-Type руками — браузер сам выставит boundary.
async function postForm(path, fd) {
  const res = await fetch(path, { method: 'POST', body: fd, credentials: 'include' });
  if (!res.ok) {
    let detail = '';
    try { detail = (await res.json())?.error ?? ''; } catch { /* ignore */ }
    const err = new Error(`API ${res.status} ${detail}`.trim());
    err.status = res.status;
    err.detail = detail;
    throw err;
  }
  return res.json();
}

export const api = {
  // auth
  login: (email, password) => json('POST', '/api/auth/login', { email, password }),
  logout: () => json('POST', '/api/auth/logout'),
  me: () => request('/api/auth/me'),

  // health & lookups
  health: () => request('/api/health'),
  listUsers: () => request('/api/users'),
  listProjects: () => request('/api/projects'),

  // bot username для построения t.me/<bot>?start=<clientId> deep-link
  botInfo: async () => {
    const h = await request('/api/health');
    return h.channels?.telegram ?? null;
  },

  // tasks (read)
  listTasks: ({ projectSlug } = {}) => {
    const qs = projectSlug ? `?projectSlug=${encodeURIComponent(projectSlug)}` : '';
    return request(`/api/tasks${qs}`);
  },
  getTask: (id) => request(`/api/tasks/${id}`),

  // tasks (write)
  createTask: (body) => json('POST', '/api/tasks', body),
  updateTask: (id, patch) => json('PATCH', `/api/tasks/${id}`, patch),
  deleteTask: (id) => json('DELETE', `/api/tasks/${id}`),
  transitionTask: (id, toStatus, { isAdmin = false } = {}) =>
    json('POST', `/api/tasks/${id}/transition`, { toStatus, isAdmin }),
  addComment: (id, { message, authorType = 'pm', authorName }) =>
    json('POST', `/api/tasks/${id}/comments`, { message, authorType, authorName }),
  addAssignee: (id, userId) =>
    json('POST', `/api/tasks/${id}/assignees`, { userId }),
  requestClient: (id) =>
    json('POST', `/api/tasks/${id}/request-client`),
  acceptContent: (id) =>
    json('POST', `/api/tasks/${id}/transition`, { toStatus: 'done' }),

  // Цикл согласования (PM)
  submitForReview: (id, { message = '', link = '', files = [] } = {}) => {
    const fd = new FormData();
    if (message) fd.append('message', message);
    if (link) fd.append('link', link);
    for (const f of files) fd.append('files', f);
    return postForm(`/api/tasks/${id}/submit-review`, fd);
  },
  cancelReview: (id) => json('POST', `/api/tasks/${id}/cancel-review`),
  uploadTaskFiles: (id, files) => {
    const fd = new FormData();
    for (const f of files) fd.append('files', f);
    return postForm(`/api/tasks/${id}/files`, fd);
  },
  // Прямые ссылки на скачивание (открываем в новой вкладке / <a download>).
  taskFileDownloadUrl: (id, fileId) => `/api/tasks/${id}/files/${fileId}/download`,

  // Центр уведомлений (PM)
  notifications: {
    feed: ({ category, unread, limit = 30, offset = 0 } = {}) => {
      const qs = new URLSearchParams();
      if (category) qs.set('category', category);
      if (unread) qs.set('unread', 'true');
      qs.set('limit', limit);
      qs.set('offset', offset);
      return request(`/api/notifications?${qs.toString()}`);
    },
    unreadCounts: () => request('/api/notifications/unread-counts'),
    markRead: (eventIds) => json('POST', '/api/notifications/read', { eventIds }),
  },
  // Предложения задач от клиента (PM)
  acceptSuggestion: (id) => json('POST', `/api/suggestions/${id}/accept`),
  rejectSuggestion: (id) => json('POST', `/api/suggestions/${id}/reject`),

  // admin / notifications (старая лента — оставлена для совместимости)
  listNotifications: () => request('/api/admin/notifications'),
  triggerNotifications: ({ virtualNow } = {}) => {
    const qs = virtualNow ? `?virtualNow=${encodeURIComponent(virtualNow)}` : '';
    return json('POST', `/api/admin/trigger-notifications${qs}`);
  },
  healthMetrics: () => request('/api/admin/health/metrics'),

  // clients
  requestTelegramLink: (clientId) =>
    json('POST', `/api/clients/${clientId}/telegram-onboarding`),

  // PM: управление клиентской ссылкой на проект
  issueClientLink: (projectId) =>
    json('POST', `/api/projects/${projectId}/client-link`),
  updateClientLink: (projectId, patch) =>
    json('PATCH', `/api/projects/${projectId}/client-link`, patch),

  // Клиентский кабинет (доступ по проектному токену, без логина)
  client: {
    get: (token) => request(`/api/client/${token}`),
    comment: (token, taskId, { message, anchor = null }) =>
      json('POST', `/api/client/${token}/tasks/${taskId}/comments`, { message, anchor }),
    // Согласование: одобрить / вернуть на доработку.
    approve: (token, taskId) =>
      json('POST', `/api/client/${token}/tasks/${taskId}/approval/approve`),
    requestChanges: (token, taskId, comment) =>
      json('POST', `/api/client/${token}/tasks/${taskId}/approval/changes`, { comment }),
    fileDownloadUrl: (token, fileId) => `/api/client/${token}/files/${fileId}/download`,
    suggestTask: (token, { title, description }) =>
      json('POST', `/api/client/${token}/suggest-task`, { title, description }),
    question: (token, text) =>
      json('POST', `/api/client/${token}/question`, { text }),
    notifications: (token, { category, unread, limit = 30, offset = 0 } = {}) => {
      const qs = new URLSearchParams();
      if (category) qs.set('category', category);
      if (unread) qs.set('unread', 'true');
      qs.set('limit', limit);
      qs.set('offset', offset);
      return request(`/api/client/${token}/notifications?${qs.toString()}`);
    },
    markRead: (token, eventIds) =>
      json('POST', `/api/client/${token}/notifications/read`, { eventIds }),
    upload: (token, taskId, files, comment) => {
      const fd = new FormData();
      for (const f of files) fd.append('files', f);
      if (comment) fd.append('comment', comment);
      return fetch(`/api/client/${token}/tasks/${taskId}/upload`, {
        method: 'POST', body: fd, credentials: 'include',
      }).then(async (res) => {
        if (!res.ok) {
          let detail = '';
          try { detail = (await res.json())?.error ?? ''; } catch { /* ignore */ }
          const err = new Error(`API ${res.status} ${detail}`.trim());
          err.status = res.status;
          err.detail = detail;
          throw err;
        }
        return res.json();
      });
    },
  },

  // guest / magic-link
  getGuestTask: (token) => request(`/api/guest/${token}`),
  guestUpload: (token, files, comment) => {
    const fd = new FormData();
    for (const f of files) fd.append('files', f);
    if (comment) fd.append('comment', comment);
    // НЕ ставим Content-Type руками — браузер сам выставит boundary.
    return fetch(`/api/guest/${token}/upload`, { method: 'POST', body: fd, credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) {
          let detail = '';
          try { detail = (await res.json())?.error ?? ''; } catch { /* ignore */ }
          const err = new Error(`API ${res.status} ${detail}`.trim());
          err.status = res.status;
          err.detail = detail;
          throw err;
        }
        return res.json();
      });
  },
};

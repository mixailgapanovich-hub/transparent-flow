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

  // admin / notifications
  listNotifications: () => request('/api/admin/notifications'),
  triggerNotifications: ({ virtualNow } = {}) => {
    const qs = virtualNow ? `?virtualNow=${encodeURIComponent(virtualNow)}` : '';
    return json('POST', `/api/admin/trigger-notifications${qs}`);
  },
  healthMetrics: () => request('/api/admin/health/metrics'),

  // clients
  requestTelegramLink: (clientId) =>
    json('POST', `/api/clients/${clientId}/telegram-onboarding`),

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

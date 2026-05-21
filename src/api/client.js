// Тонкий клиент над fetch. Все запросы идут на /api через vite-прокси (→ :3001).
// Никаких axios/react-query: для read-only этапа достаточно нативного fetch.

async function request(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
    ...options,
  });

  if (!res.ok) {
    let detail = '';
    try { detail = (await res.json())?.error ?? ''; } catch { /* ignore */ }
    const err = new Error(`API ${res.status} ${path} ${detail}`.trim());
    err.status = res.status;
    throw err;
  }

  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  health: () => request('/api/health'),
  listProjects: () => request('/api/projects'),
  listTasks: ({ projectSlug } = {}) => {
    const qs = projectSlug ? `?projectSlug=${encodeURIComponent(projectSlug)}` : '';
    return request(`/api/tasks${qs}`);
  },
  getTask: (id) => request(`/api/tasks/${id}`),
};

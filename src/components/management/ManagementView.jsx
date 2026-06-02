// Раздел «Управление» (admin-only): CRUD проектов, клиентов и сотрудников.
// Загружает свои данные сам; после мутаций зовёт onDataChanged(), чтобы App
// обновил глобальные projects/team (их используют доска и выпадашка исполнителей).

import { useCallback, useEffect, useState } from 'react';
import { Plus, X, Pencil, Loader2, Building2, FolderKanban, Users, Archive, KeyRound, Link2 } from 'lucide-react';
import { api } from '../../api/client';
import { UI_BUTTON_STYLES } from '../../theme/taskStyles';

const PROJECT_STATUS = [
  ['active', 'Активный'], ['paused', 'Пауза'], ['waiting', 'Ждёт'], ['completed', 'Завершён'],
];
const PRIORITY = [['high', 'Высокий'], ['medium', 'Средний'], ['low', 'Низкий']];
const ROLES = [['admin', 'Администратор'], ['pm', 'Менеджер'], ['viewer', 'Наблюдатель']];
const labelOf = (pairs, v) => pairs.find(([k]) => k === v)?.[1] ?? v;

const SUBTABS = [
  { id: 'projects', label: 'Проекты', icon: FolderKanban },
  { id: 'clients', label: 'Клиенты', icon: Building2 },
  { id: 'users', label: 'Сотрудники', icon: Users },
];

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="text-base font-black text-slate-900">{title}</h3>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600" aria-label="Закрыть"><X size={18} /></button>
        </header>
        <div className="overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="mb-3 block">
      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-slate-500">{label}</span>
      {children}
    </label>
  );
}

const inputCls = 'w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#3C50B4] focus:ring-2 focus:ring-[#3C50B4]/20';

// ── Формы ─────────────────────────────────────────────────────────────────────

function ClientForm({ initial, onSubmit, busy }) {
  const [f, setF] = useState({
    companyName: initial?.companyName ?? '', contactName: initial?.contactName ?? '',
    email: initial?.email ?? '', phone: initial?.phone ?? '', supportChatUrl: initial?.supportChatUrl ?? '',
  });
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(f); }}>
      <Field label="Компания *"><input className={inputCls} value={f.companyName} onChange={set('companyName')} required /></Field>
      <Field label="Контактное лицо"><input className={inputCls} value={f.contactName} onChange={set('contactName')} /></Field>
      <Field label="Email"><input className={inputCls} type="email" value={f.email} onChange={set('email')} /></Field>
      <Field label="Телефон"><input className={inputCls} value={f.phone} onChange={set('phone')} /></Field>
      <Field label="Ссылка на чат поддержки"><input className={inputCls} value={f.supportChatUrl} onChange={set('supportChatUrl')} placeholder="https://t.me/…" /></Field>
      <button type="submit" disabled={busy} className={`${UI_BUTTON_STYLES.primary} mt-2 flex w-full items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold`}>
        {busy && <Loader2 size={15} className="animate-spin" />} Сохранить
      </button>
    </form>
  );
}

function ProjectForm({ initial, clients, onSubmit, busy }) {
  const [f, setF] = useState({
    name: initial?.name ?? '', clientId: initial?.clientId ?? (clients[0]?.id ?? ''),
    status: initial?.status ?? 'active', priority: initial?.priority ?? 'medium',
    category: initial?.category ?? '', deadline: initial?.deadline ?? '',
  });
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(f); }}>
      <Field label="Название *"><input className={inputCls} value={f.name} onChange={set('name')} required /></Field>
      <Field label="Клиент *">
        <select className={inputCls} value={f.clientId} onChange={set('clientId')} required>
          <option value="" disabled>Выберите клиента</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.companyName}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Статус">
          <select className={inputCls} value={f.status} onChange={set('status')}>
            {PROJECT_STATUS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </Field>
        <Field label="Приоритет">
          <select className={inputCls} value={f.priority} onChange={set('priority')}>
            {PRIORITY.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Категория"><input className={inputCls} value={f.category} onChange={set('category')} placeholder="web / smm / …" /></Field>
        <Field label="Дедлайн"><input className={inputCls} type="date" value={f.deadline ?? ''} onChange={set('deadline')} /></Field>
      </div>
      <button type="submit" disabled={busy || !f.clientId} className={`${UI_BUTTON_STYLES.primary} mt-2 flex w-full items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold`}>
        {busy && <Loader2 size={15} className="animate-spin" />} Сохранить
      </button>
    </form>
  );
}

function UserForm({ initial, onSubmit, busy }) {
  const isEdit = Boolean(initial);
  const [f, setF] = useState({
    name: initial?.name ?? '', email: initial?.email ?? '',
    role: initial?.role ?? 'pm', password: '',
  });
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(f); }}>
      <Field label="Имя *"><input className={inputCls} value={f.name} onChange={set('name')} required /></Field>
      <Field label="Email *"><input className={inputCls} type="email" value={f.email} onChange={set('email')} required disabled={isEdit} /></Field>
      <Field label="Роль">
        <select className={inputCls} value={f.role} onChange={set('role')}>
          {ROLES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </Field>
      {!isEdit && (
        <Field label="Пароль * (мин. 6 символов)"><input className={inputCls} type="text" value={f.password} onChange={set('password')} required minLength={6} /></Field>
      )}
      <button type="submit" disabled={busy} className={`${UI_BUTTON_STYLES.primary} mt-2 flex w-full items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold`}>
        {busy && <Loader2 size={15} className="animate-spin" />} Сохранить
      </button>
    </form>
  );
}

// ── Главный компонент ───────────────────────────────────────────────────────

export default function ManagementView({ onToast, onDataChanged }) {
  const [sub, setSub] = useState('projects');
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // { type:'client'|'project'|'user', entity?:obj }
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [c, p, u] = await Promise.all([api.admin.listClients(), api.listProjects(), api.listUsers()]);
      setClients(c); setProjects(p); setUsers(u);
    } catch (err) {
      onToast?.('error', 'Не удалось загрузить данные: ' + (err.detail || err.message));
    } finally {
      setLoading(false);
    }
  }, [onToast]);

  // Первичная загрузка: setState только после await (правило set-state-in-effect).
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [c, p, u] = await Promise.all([api.admin.listClients(), api.listProjects(), api.listUsers()]);
        if (!active) return;
        setClients(c); setProjects(p); setUsers(u);
      } catch (err) {
        if (active) onToast?.('error', 'Не удалось загрузить данные: ' + (err.detail || err.message));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [onToast]);

  const afterChange = async (msg) => {
    setModal(null);
    onToast?.('success', msg);
    await reload();
    onDataChanged?.();
  };

  const submit = async (fn, msg) => {
    setBusy(true);
    try { await fn(); await afterChange(msg); }
    catch (err) { onToast?.('error', err.detail || err.message); }
    finally { setBusy(false); }
  };

  const handleClient = (f) => submit(
    () => (modal.entity ? api.admin.updateClient(modal.entity.id, f) : api.admin.createClient(f)),
    modal.entity ? 'Клиент обновлён' : 'Клиент создан',
  );
  const handleProject = (f) => submit(
    () => (modal.entity ? api.admin.updateProject(modal.entity.id, f) : api.admin.createProject(f)),
    modal.entity ? 'Проект обновлён' : 'Проект создан',
  );
  const handleUser = (f) => submit(
    () => (modal.entity ? api.admin.updateUser(modal.entity.id, { name: f.name, role: f.role }) : api.admin.createUser(f)),
    modal.entity ? 'Сотрудник обновлён' : 'Сотрудник создан',
  );

  const deleteClient = (c) => {
    if (!window.confirm(`Удалить клиента «${c.companyName}»?`)) return;
    submit(() => api.admin.deleteClient(c.id), 'Клиент удалён');
  };
  const archiveProject = (p) => {
    if (!window.confirm(`Архивировать проект «${p.name}»? Задачи и история сохранятся.`)) return;
    submit(() => api.admin.archiveProject(p.id), 'Проект архивирован');
  };
  const toggleUser = (u) => submit(() => api.admin.updateUser(u.id, { isActive: !u.isActive }), u.isActive ? 'Деактивирован' : 'Активирован');
  const resetPwd = (u) => {
    const pwd = window.prompt(`Новый пароль для «${u.name}» (мин. 6 символов):`);
    if (!pwd) return;
    submit(() => api.admin.resetUserPassword(u.id, pwd), 'Пароль сброшен');
  };

  const Row = ({ children, onEdit }) => (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 transition hover:border-slate-200">
      <div className="min-w-0 flex-1">{children}</div>
      {onEdit && (
        <button onClick={onEdit} className={`${UI_BUTTON_STYLES.ghost} flex shrink-0 items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold`}>
          <Pencil size={13} /> Изм.
        </button>
      )}
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Шапка: суб-вкладки + кнопка создания */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-2xl border border-slate-200 bg-slate-50/90 p-1 shadow-sm">
          {SUBTABS.map((t) => (
            <button key={t.id} onClick={() => setSub(t.id)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-widest transition-colors ${
                sub === t.id ? 'bg-white text-[#3C50B4] shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
              <t.icon size={16} /> {t.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setModal({ type: sub === 'projects' ? 'project' : sub === 'clients' ? 'client' : 'user' })}
          className={`${UI_BUTTON_STYLES.primary} flex items-center gap-2 px-5 py-2.5 text-sm font-bold`}
        >
          <Plus size={18} /> Создать
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar pr-1">
        {loading ? (
          <div className="flex h-40 items-center justify-center text-slate-400 text-sm">Загружаем…</div>
        ) : (
          <div className="space-y-2.5">
            {/* Проекты */}
            {sub === 'projects' && projects.map((p) => (
              <Row key={p.id} onEdit={() => setModal({ type: 'project', entity: p })}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-800">{p.name}</p>
                    <p className="truncate text-xs text-slate-400">{p.client} · {labelOf(PROJECT_STATUS, p.status)} · {labelOf(PRIORITY, p.priority)} · {p.tasksDone}/{p.tasksTotal} задач</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {p.clientViewToken && <Link2 size={14} className="text-emerald-400" title="Клиентская ссылка выдана" />}
                    {p.status !== 'completed' && (
                      <button onClick={(e) => { e.stopPropagation(); archiveProject(p); }} className="p-1.5 text-slate-300 hover:text-amber-500" title="Архивировать"><Archive size={15} /></button>
                    )}
                  </div>
                </div>
              </Row>
            ))}

            {/* Клиенты */}
            {sub === 'clients' && clients.map((c) => (
              <Row key={c.id} onEdit={() => setModal({ type: 'client', entity: c })}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-800">{c.companyName}</p>
                    <p className="truncate text-xs text-slate-400">{[c.contactName, c.email, c.phone].filter(Boolean).join(' · ') || '—'} · проектов: {c.projectsCount}</p>
                  </div>
                  {c.projectsCount === 0 && (
                    <button onClick={(e) => { e.stopPropagation(); deleteClient(c); }} className="shrink-0 p-1.5 text-slate-300 hover:text-red-500" title="Удалить"><X size={15} /></button>
                  )}
                </div>
              </Row>
            ))}

            {/* Сотрудники */}
            {sub === 'users' && users.map((u) => (
              <Row key={u.id} onEdit={() => setModal({ type: 'user', entity: u })}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-800">{u.name} {!u.isActive && <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-400">деактивирован</span>}</p>
                    <p className="truncate text-xs text-slate-400">{u.email} · {labelOf(ROLES, u.role)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button onClick={(e) => { e.stopPropagation(); resetPwd(u); }} className="p-1.5 text-slate-300 hover:text-[#3C50B4]" title="Сбросить пароль"><KeyRound size={15} /></button>
                    <button onClick={(e) => { e.stopPropagation(); toggleUser(u); }} className={`rounded-lg px-2.5 py-1 text-[11px] font-bold ${u.isActive ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'}`}>
                      {u.isActive ? 'Деактивировать' : 'Активировать'}
                    </button>
                  </div>
                </div>
              </Row>
            ))}
          </div>
        )}
      </div>

      {/* Модалки форм */}
      {modal?.type === 'client' && (
        <Modal title={modal.entity ? 'Редактировать клиента' : 'Новый клиент'} onClose={() => setModal(null)}>
          <ClientForm initial={modal.entity} onSubmit={handleClient} busy={busy} />
        </Modal>
      )}
      {modal?.type === 'project' && (
        <Modal title={modal.entity ? 'Редактировать проект' : 'Новый проект'} onClose={() => setModal(null)}>
          {clients.length === 0
            ? <p className="text-sm text-slate-500">Сначала создайте хотя бы одного клиента во вкладке «Клиенты».</p>
            : <ProjectForm initial={modal.entity} clients={clients} onSubmit={handleProject} busy={busy} />}
        </Modal>
      )}
      {modal?.type === 'user' && (
        <Modal title={modal.entity ? 'Редактировать сотрудника' : 'Новый сотрудник'} onClose={() => setModal(null)}>
          <UserForm initial={modal.entity} onSubmit={handleUser} busy={busy} />
        </Modal>
      )}
    </div>
  );
}

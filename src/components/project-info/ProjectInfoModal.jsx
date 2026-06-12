// Панель «О проекте»: описание, контакты, доступы, ссылки сайт/диск.
// mode='pm' — редактирование (api.saveProjectInfo); mode='client' — только чтение
// (доступы уже отфильтрованы сервером по visibleToClient).

import { useEffect, useState } from 'react';
import {
  X, Plus, Trash2, Eye, EyeOff, Copy, Globe, HardDrive, KeyRound, Users, Loader2, Save, ExternalLink,
} from 'lucide-react';
import { api } from '../../api/client';
import { UI_BUTTON_STYLES } from '../../theme/taskStyles';

const EMPTY = { description: '', siteUrl: '', driveUrl: '', contacts: [], credentials: [] };
const inputCls = 'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-[#3C50B4] focus:ring-2 focus:ring-[#3C50B4]/20';

function copy(text) {
  navigator.clipboard?.writeText(text).catch(() => {});
}

function SectionTitle({ icon: Icon, children, action }) {
  return (
    <div className="mb-2 mt-6 flex items-center justify-between">
      <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
        {Icon ? <Icon size={14} /> : null} {children}
      </h3>
      {action}
    </div>
  );
}

function CredentialCard({ cred, editable, onChange, onRemove }) {
  const [show, setShow] = useState(false);
  if (editable) {
    return (
      <div className="space-y-2 rounded-xl border border-slate-200 p-3">
        <div className="flex items-center gap-2">
          <input className={inputCls} placeholder="Название (напр. Хостинг)" value={cred.label} onChange={(e) => onChange({ label: e.target.value })} />
          <button type="button" onClick={onRemove} className="shrink-0 p-1.5 text-slate-300 hover:text-red-500" aria-label="Удалить доступ"><Trash2 size={15} /></button>
        </div>
        <input className={inputCls} placeholder="Ссылка" value={cred.link} onChange={(e) => onChange({ link: e.target.value })} />
        <div className="grid grid-cols-2 gap-2">
          <input className={inputCls} placeholder="Логин" value={cred.login} onChange={(e) => onChange({ login: e.target.value })} />
          <div className="relative">
            <input className={inputCls} type={show ? 'text' : 'password'} placeholder="Пароль" value={cred.password} onChange={(e) => onChange({ password: e.target.value })} />
            <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" aria-label="Показать пароль">
              {show ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>
        <input className={inputCls} placeholder="Комментарий" value={cred.comment} onChange={(e) => onChange({ comment: e.target.value })} />
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          <input type="checkbox" checked={Boolean(cred.visibleToClient)} onChange={(e) => onChange({ visibleToClient: e.target.checked })} className="h-4 w-4 accent-[#3C50B4]" />
          Показывать клиенту
        </label>
      </div>
    );
  }
  // read-only
  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-slate-800">{cred.label || 'Доступ'}</p>
        {cred.link ? (
          <a href={cred.link} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs font-semibold text-[#3C50B4] hover:underline">
            Открыть <ExternalLink size={12} />
          </a>
        ) : null}
      </div>
      {(cred.login || cred.password) && (
        <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
          {cred.login ? (
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-1.5">
              <span className="truncate text-slate-700">{cred.login}</span>
              <button type="button" onClick={() => copy(cred.login)} className="text-slate-400 hover:text-[#3C50B4]" aria-label="Копировать логин"><Copy size={13} /></button>
            </div>
          ) : <span />}
          {cred.password ? (
            <div className="flex items-center justify-between gap-1 rounded-lg bg-slate-50 px-2.5 py-1.5">
              <span className="truncate font-mono text-slate-700">{show ? cred.password : '••••••••'}</span>
              <span className="flex shrink-0 items-center gap-1">
                <button type="button" onClick={() => setShow((s) => !s)} className="text-slate-400 hover:text-[#3C50B4]" aria-label="Показать пароль">{show ? <EyeOff size={13} /> : <Eye size={13} />}</button>
                <button type="button" onClick={() => copy(cred.password)} className="text-slate-400 hover:text-[#3C50B4]" aria-label="Копировать пароль"><Copy size={13} /></button>
              </span>
            </div>
          ) : <span />}
        </div>
      )}
      {cred.comment ? <p className="mt-2 text-xs text-slate-400">{cred.comment}</p> : null}
    </div>
  );
}

export default function ProjectInfoModal({ mode = 'client', projectId, token, projectName, onClose }) {
  const editable = mode === 'pm';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const p = editable ? api.getProjectInfo(projectId) : api.client.getInfo(token);
    p.then((d) => { if (!cancelled) { setData({ ...EMPTY, ...d }); setLoading(false); } })
      .catch((e) => { if (!cancelled) { setError(e.detail || e.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, [editable, projectId, token]);

  const set = (patch) => setData((d) => ({ ...d, ...patch }));
  const addContact = () => set({ contacts: [...data.contacts, { name: '', role: '', email: '', phone: '' }] });
  const updContact = (i, patch) => set({ contacts: data.contacts.map((c, idx) => (idx === i ? { ...c, ...patch } : c)) });
  const rmContact = (i) => set({ contacts: data.contacts.filter((_, idx) => idx !== i) });
  const addCred = () => set({ credentials: [...data.credentials, { label: '', link: '', login: '', password: '', comment: '', visibleToClient: false }] });
  const updCred = (i, patch) => set({ credentials: data.credentials.map((c, idx) => (idx === i ? { ...c, ...patch } : c)) });
  const rmCred = (i) => set({ credentials: data.credentials.filter((_, idx) => idx !== i) });

  const save = async () => {
    setSaving(true);
    try {
      const saved = await api.saveProjectInfo(projectId, data);
      setData({ ...EMPTY, ...saved });
      onClose?.('saved');
    } catch (e) {
      setError(e.detail || e.message);
    } finally {
      setSaving(false);
    }
  };

  const hasContacts = (data?.contacts ?? []).length > 0;
  const hasCreds = (data?.credentials ?? []).length > 0;

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center bg-slate-900/40 p-4" onClick={() => onClose?.()}>
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-base font-black text-slate-900">О проекте{projectName ? ` · ${projectName}` : ''}</h2>
            <p className="text-[11px] text-slate-400">{editable ? 'Описание, контакты и доступы — редактирование' : 'Информация и доступы по проекту'}</p>
          </div>
          <button onClick={() => onClose?.()} className="p-1.5 text-slate-400 hover:text-slate-600" aria-label="Закрыть"><X size={18} /></button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4 custom-scrollbar">
          {loading ? (
            <div className="flex h-32 items-center justify-center text-slate-400 text-sm">Загружаем…</div>
          ) : error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
          ) : (
            <>
              {/* Описание */}
              <SectionTitle>Описание</SectionTitle>
              {editable ? (
                <textarea rows={3} className={inputCls} placeholder="О чём проект, цели, особенности…" value={data.description} onChange={(e) => set({ description: e.target.value })} />
              ) : data.description ? (
                <p className="whitespace-pre-wrap text-sm text-slate-700">{data.description}</p>
              ) : <p className="text-sm text-slate-400">—</p>}

              {/* Ссылки */}
              <SectionTitle icon={Globe}>Ссылки</SectionTitle>
              {editable ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2"><Globe size={15} className="shrink-0 text-slate-400" /><input className={inputCls} placeholder="Ссылка на сайт" value={data.siteUrl} onChange={(e) => set({ siteUrl: e.target.value })} /></div>
                  <div className="flex items-center gap-2"><HardDrive size={15} className="shrink-0 text-slate-400" /><input className={inputCls} placeholder="Ссылка на диск (Google/Яндекс)" value={data.driveUrl} onChange={(e) => set({ driveUrl: e.target.value })} /></div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {data.siteUrl ? <a href={data.siteUrl} target="_blank" rel="noreferrer" className={`${UI_BUTTON_STYLES.secondary} flex items-center gap-1.5 px-3 py-2 text-xs font-semibold`}><Globe size={13} /> Сайт</a> : null}
                  {data.driveUrl ? <a href={data.driveUrl} target="_blank" rel="noreferrer" className={`${UI_BUTTON_STYLES.secondary} flex items-center gap-1.5 px-3 py-2 text-xs font-semibold`}><HardDrive size={13} /> Диск с файлами</a> : null}
                  {!data.siteUrl && !data.driveUrl ? <p className="text-sm text-slate-400">—</p> : null}
                </div>
              )}

              {/* Контакты */}
              <SectionTitle icon={Users} action={editable ? <button type="button" onClick={addContact} className="flex items-center gap-1 text-xs font-bold text-[#3C50B4]"><Plus size={13} /> Добавить</button> : null}>Контакты</SectionTitle>
              {editable ? (
                <div className="space-y-2">
                  {data.contacts.map((c, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input className={inputCls} placeholder="Имя" value={c.name} onChange={(e) => updContact(i, { name: e.target.value })} />
                      <input className={inputCls} placeholder="Роль" value={c.role} onChange={(e) => updContact(i, { role: e.target.value })} />
                      <input className={inputCls} placeholder="Контакт (email/тел)" value={c.email || c.phone} onChange={(e) => updContact(i, { email: e.target.value })} />
                      <button type="button" onClick={() => rmContact(i)} className="shrink-0 p-1.5 text-slate-300 hover:text-red-500" aria-label="Удалить контакт"><Trash2 size={15} /></button>
                    </div>
                  ))}
                  {!hasContacts ? <p className="text-xs text-slate-400">Контактов пока нет.</p> : null}
                </div>
              ) : hasContacts ? (
                <div className="space-y-1.5">
                  {data.contacts.map((c, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm">
                      <span className="font-semibold text-slate-700">{c.name || '—'} {c.role ? <span className="font-normal text-slate-400">· {c.role}</span> : null}</span>
                      <span className="text-slate-500">{c.email || c.phone}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-slate-400">—</p>}

              {/* Доступы */}
              <SectionTitle icon={KeyRound} action={editable ? <button type="button" onClick={addCred} className="flex items-center gap-1 text-xs font-bold text-[#3C50B4]"><Plus size={13} /> Добавить</button> : null}>Доступы</SectionTitle>
              <div className="space-y-2">
                {data.credentials.map((c, i) => (
                  <CredentialCard key={i} cred={c} editable={editable} onChange={(patch) => updCred(i, patch)} onRemove={() => rmCred(i)} />
                ))}
                {!hasCreds ? <p className="text-sm text-slate-400">{editable ? 'Доступов пока нет — добавьте первый.' : '—'}</p> : null}
              </div>
            </>
          )}
        </div>

        {editable && !loading && (
          <footer className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3">
            <button type="button" onClick={() => onClose?.()} className={`${UI_BUTTON_STYLES.secondary} px-4 py-2 text-sm font-semibold`}>Отмена</button>
            <button type="button" onClick={save} disabled={saving} className={`${UI_BUTTON_STYLES.primary} flex items-center gap-2 px-5 py-2 text-sm font-bold`}>
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Сохранить
            </button>
          </footer>
        )}
      </div>
    </div>
  );
}

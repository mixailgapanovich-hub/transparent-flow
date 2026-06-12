// Рабочие «Настройки»: профиль (имя), смена пароля и — для админа — настройки
// агентства (имя + ссылка на сайт, на которую ведёт «молния» в сайдбаре).

import { useState } from 'react';
import { X, User, Shield, Building2, LogOut, Loader2, Check } from 'lucide-react';
import { api } from '../api/client';

const NAV = [
  { id: 'profile', icon: User, label: 'Профиль' },
  { id: 'security', icon: Shield, label: 'Безопасность' },
  { id: 'agency', icon: Building2, label: 'Агентство', adminOnly: true },
];

function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-slate-400">{hint}</span>}
    </label>
  );
}

const inputCls = 'w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#3C50B4] focus:ring-2 focus:ring-[#3C50B4]/20';
const btnPrimary = 'flex items-center justify-center gap-2 rounded-xl bg-[#3C50B4] px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-95 disabled:opacity-60';

export default function SettingsModal({
  isOpen,
  onClose,
  currentUser,
  isAdmin = false,
  settings = { agencyName: '', agencySiteUrl: '' },
  onToast,
  onProfileUpdated,
  onSettingsUpdated,
  onLogout,
}) {
  const [tab, setTab] = useState('profile');
  const [name, setName] = useState(currentUser?.name ?? '');
  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' });
  const [agency, setAgency] = useState({ agencyName: settings.agencyName ?? '', agencySiteUrl: settings.agencySiteUrl ?? '' });
  const [busy, setBusy] = useState(false);

  if (!isOpen) return null;

  const toast = (type, msg) => onToast?.(type, msg);

  const saveProfile = async () => {
    if (!name.trim()) { toast('error', 'Имя не может быть пустым'); return; }
    setBusy(true);
    try {
      const { user } = await api.updateProfile(name.trim());
      onProfileUpdated?.(user);
      toast('success', 'Имя профиля обновлено');
    } catch (e) {
      toast('error', e.detail || e.message);
    } finally { setBusy(false); }
  };

  const savePassword = async () => {
    if (pwd.next.length < 6) { toast('error', 'Новый пароль слишком короткий (мин. 6)'); return; }
    if (pwd.next !== pwd.confirm) { toast('error', 'Пароли не совпадают'); return; }
    setBusy(true);
    try {
      await api.changePassword(pwd.current, pwd.next);
      setPwd({ current: '', next: '', confirm: '' });
      toast('success', 'Пароль изменён');
    } catch (e) {
      toast('error', e.detail || e.message);
    } finally { setBusy(false); }
  };

  const saveAgency = async () => {
    setBusy(true);
    try {
      const s = await api.updateSettings({ agencyName: agency.agencyName.trim(), agencySiteUrl: agency.agencySiteUrl.trim() });
      onSettingsUpdated?.(s);
      toast('success', 'Настройки агентства сохранены');
    } catch (e) {
      toast('error', e.detail || e.message);
    } finally { setBusy(false); }
  };

  const navItems = NAV.filter((n) => !n.adminOnly || isAdmin);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-6">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex h-full w-full flex-col overflow-hidden bg-white shadow-2xl md:h-auto md:max-h-[85vh] md:max-w-2xl md:rounded-3xl">
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-black text-slate-900 font-machine">Настройки</h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600" aria-label="Закрыть"><X size={18} /></button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          {/* Навигация */}
          <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-slate-100 p-3 md:w-52 md:flex-col md:overflow-visible md:border-b-0 md:border-r">
            {navItems.map((n) => {
              const active = tab === n.id;
              return (
                <button
                  key={n.id}
                  onClick={() => setTab(n.id)}
                  className={`flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-bold transition ${active ? 'bg-[#3C50B4] text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  <n.icon size={17} /> {n.label}
                </button>
              );
            })}
            {onLogout && (
              <button
                onClick={onLogout}
                className="mt-auto hidden items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-bold text-red-500 transition hover:bg-red-50 md:flex"
              >
                <LogOut size={17} /> Выйти
              </button>
            )}
          </nav>

          {/* Контент */}
          <div className="flex-1 space-y-5 overflow-y-auto p-5 custom-scrollbar">
            {tab === 'profile' && (
              <>
                <Field label="Email">
                  <input value={currentUser?.email ?? ''} disabled className={`${inputCls} bg-slate-50 text-slate-400`} />
                </Field>
                <Field label="Отображаемое имя">
                  <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Ваше имя" />
                </Field>
                <button onClick={saveProfile} disabled={busy} className={btnPrimary}>
                  {busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Сохранить имя
                </button>
              </>
            )}

            {tab === 'security' && (
              <>
                <Field label="Текущий пароль">
                  <input type="password" value={pwd.current} onChange={(e) => setPwd((p) => ({ ...p, current: e.target.value }))} className={inputCls} autoComplete="current-password" />
                </Field>
                <Field label="Новый пароль" hint="Минимум 6 символов">
                  <input type="password" value={pwd.next} onChange={(e) => setPwd((p) => ({ ...p, next: e.target.value }))} className={inputCls} autoComplete="new-password" />
                </Field>
                <Field label="Повторите новый пароль">
                  <input type="password" value={pwd.confirm} onChange={(e) => setPwd((p) => ({ ...p, confirm: e.target.value }))} className={inputCls} autoComplete="new-password" />
                </Field>
                <button onClick={savePassword} disabled={busy} className={btnPrimary}>
                  {busy ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />} Сменить пароль
                </button>
              </>
            )}

            {tab === 'agency' && isAdmin && (
              <>
                <p className="text-sm text-slate-500">Имя и сайт агентства. На сайт ведёт логотип-«молния» в боковой панели.</p>
                <Field label="Название агентства">
                  <input value={agency.agencyName} onChange={(e) => setAgency((a) => ({ ...a, agencyName: e.target.value }))} className={inputCls} placeholder="Adena Digital" />
                </Field>
                <Field label="Ссылка на сайт" hint="Например: https://adena.by">
                  <input value={agency.agencySiteUrl} onChange={(e) => setAgency((a) => ({ ...a, agencySiteUrl: e.target.value }))} className={inputCls} placeholder="https://adena.by" />
                </Field>
                <button onClick={saveAgency} disabled={busy} className={btnPrimary}>
                  {busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Сохранить
                </button>
              </>
            )}

            {/* Мобильный выход */}
            {onLogout && (
              <button onClick={onLogout} className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-bold text-red-500 md:hidden">
                <LogOut size={16} /> Выйти из аккаунта
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

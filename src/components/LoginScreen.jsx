import { useEffect, useState } from 'react';
import { LogIn, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { api } from '../api/client';

export default function LoginScreen({ onSuccess, flash = null, onFlashDismiss }) {
  const [email, setEmail] = useState('admin@adena.local');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [showFlash, setShowFlash] = useState(false);

  // Показываем плашку «Сессия завершена» 2.5 сек, потом плавно убираем
  useEffect(() => {
    if (flash !== 'logged-out') return undefined;
    setShowFlash(true);
    const id = setTimeout(() => {
      setShowFlash(false);
      onFlashDismiss?.();
    }, 2500);
    return () => clearTimeout(id);
  }, [flash, onFlashDismiss]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { user } = await api.login(email, password);
      onSuccess(user);
    } catch (err) {
      setError(err.detail || err.message || 'Не удалось войти');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-[#F8FAFC] flex items-center justify-center font-montserrat text-slate-800 px-4">
      {showFlash && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 bg-white border border-emerald-100 rounded-2xl shadow-lg shadow-emerald-50 animate-in fade-in slide-in-from-top-2 duration-300">
          <CheckCircle2 size={16} className="text-emerald-500" />
          <span className="text-xs font-black uppercase tracking-widest text-slate-700">Сессия завершена</span>
        </div>
      )}
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200/80 shadow-xl shadow-blue-50 p-10 space-y-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FFD700] flex items-center justify-center font-black text-[#3C50B4]">
            А
          </div>
          <div>
            <h1 className="font-black text-[#3C50B4] tracking-tight uppercase text-sm leading-none">
              АденаДиджитал
            </h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
              Прозрачный поток
            </p>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-black text-slate-900 font-machine">Вход для команды</h2>
          <p className="text-sm text-slate-400 mt-1">Используйте корпоративную почту и пароль.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-[#3C50B4]/30 transition"
              placeholder="name@adena.local"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">
              Пароль
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-[#3C50B4]/30 transition"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs font-bold">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={busy || !email || !password}
            className="w-full py-3 rounded-xl bg-[#3C50B4] text-white font-black text-sm tracking-wide flex items-center justify-center gap-2 transition hover:brightness-95 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
          >
            {busy
              ? <Loader2 size={16} className="animate-spin" />
              : <LogIn size={16} strokeWidth={2.5} />}
            {busy ? 'Входим…' : 'Войти'}
          </button>
        </form>

        <div className="text-[10px] text-slate-400 leading-relaxed border-t border-slate-100 pt-5">
          <p className="font-bold uppercase tracking-widest mb-2">Демо-аккаунты</p>
          <p><code className="text-slate-500">admin@adena.local</code> / <code className="text-slate-500">admin123</code> — админ (откатывает done)</p>
          <p><code className="text-slate-500">pm@adena.local</code> / <code className="text-slate-500">pm123</code> — обычный PM</p>
        </div>
      </div>
    </div>
  );
}

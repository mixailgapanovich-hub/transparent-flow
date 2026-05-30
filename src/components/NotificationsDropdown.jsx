import { useEffect, useRef, useState } from 'react';
import { X, ArrowRight, RefreshCw } from 'lucide-react';
import { api } from '../api/client';
import { describeEvent, eventDot, relativeTime } from './notifications/eventMeta';

// Быстрый превью последних уведомлений PM. Полная лента — в NotificationsPage.
export default function NotificationsDropdown({ onClose, isAdmin = false, onToast, onOpenAll }) {
  const ref = useRef(null);
  const [items, setItems] = useState([]);
  const [error, setError] = useState(null);
  const [triggerBusy, setTriggerBusy] = useState(false);

  const refresh = () =>
    api.notifications.feed({ limit: 5 })
      .then(setItems)
      .catch((err) => setError(err.detail || err.message));

  useEffect(() => {
    let cancelled = false;
    api.notifications.feed({ limit: 5 })
      .then((rows) => { if (!cancelled) setItems(rows); })
      .catch((err) => { if (!cancelled) setError(err.detail || err.message); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const handleTick = async () => {
    setTriggerBusy(true);
    try {
      const r = await api.triggerNotifications({});
      await refresh();
      onToast?.('success', `Тик: отправлено ${r.sent}, ошибок ${r.failed}, пропущено ${r.skipped}`);
    } catch (err) {
      onToast?.('error', 'Ошибка каскада: ' + (err.detail || err.message));
    } finally {
      setTriggerBusy(false);
    }
  };

  return (
    <div
      ref={ref}
      className="fixed left-2 right-2 top-14 md:absolute md:left-auto md:right-0 md:top-full md:mt-2 md:w-96 bg-white rounded-2xl shadow-xl border border-slate-100 z-[60] overflow-hidden"
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <span className="text-[11px] font-black uppercase tracking-widest text-slate-800">Уведомления</span>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
      </div>

      {error && <div className="px-5 py-4 text-xs text-red-500">Ошибка загрузки: {error}</div>}
      {!error && items.length === 0 && <div className="px-5 py-8 text-xs text-slate-400 text-center">Пока пусто.</div>}

      <ul className="divide-y divide-slate-50 max-h-80 overflow-y-auto custom-scrollbar">
        {items.map((ev) => (
          <li key={ev.id} className={`flex items-start gap-3 px-5 py-3 ${ev.read ? 'opacity-60' : ''}`}>
            <span className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${eventDot(ev)}`} />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-slate-700 leading-snug line-clamp-2">{describeEvent(ev)}</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                {ev.project_name ? `${ev.project_name} · ` : ''}{relativeTime(ev.created_at)}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <div className="border-t border-slate-100 p-2 flex items-center gap-2">
        {isAdmin && (
          <button
            disabled={triggerBusy}
            onClick={handleTick}
            className="flex items-center gap-1.5 rounded-lg bg-white border border-slate-200 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-100 disabled:opacity-50"
          >
            <RefreshCw size={12} /> Тик сейчас
          </button>
        )}
        <button
          onClick={() => { onClose(); onOpenAll?.(); }}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-[#3C50B4] text-white px-3 py-2 text-[11px] font-bold uppercase tracking-wider hover:brightness-110"
        >
          Все уведомления <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
}

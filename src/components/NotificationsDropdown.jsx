import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { api } from '../api/client';

// Карта event_type → как отрендерить плашку
const EVENT_STYLES = {
  notification_sent: { dot: 'bg-emerald-400', label: 'Уведомление отправлено' },
  notification_failed: { dot: 'bg-red-400', label: 'Уведомление не доставлено' },
  cascade_exhausted: { dot: 'bg-orange-500', label: 'Каскад исчерпан' },
  verification_email_sent: { dot: 'bg-[#3C50B4]', label: 'Акт принятия отправлен' },
  verification_email_failed: { dot: 'bg-red-400', label: 'Акт не отправлен' },
  client_upload: { dot: 'bg-teal-400', label: 'Клиент загрузил материалы' },
};

function relativeTime(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60_000);
  if (min < 1) return 'только что';
  if (min < 60) return `${min} мин назад`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} ч назад`;
  const d = Math.round(h / 24);
  return `${d} дн назад`;
}

function describe(ev) {
  switch (ev.event_type) {
    case 'notification_sent':
      return `${EVENT_STYLES.notification_sent.label}, уровень ${ev.payload?.level} — «${ev.task_title}»`;
    case 'notification_failed':
      return `${EVENT_STYLES.notification_failed.label}, уровень ${ev.payload?.level} — «${ev.task_title}»`;
    case 'cascade_exhausted':
      return `${EVENT_STYLES.cascade_exhausted.label} — «${ev.task_title}». Нужен ручной контакт.`;
    case 'verification_email_sent':
      return `${EVENT_STYLES.verification_email_sent.label} клиенту — «${ev.task_title}»`;
    case 'verification_email_failed':
      return `${EVENT_STYLES.verification_email_failed.label} — «${ev.task_title}»: ${ev.payload?.error || ''}`;
    case 'client_upload':
      return `${EVENT_STYLES.client_upload.label} — «${ev.task_title}»`;
    default:
      return `${ev.event_type} — «${ev.task_title}»`;
  }
}

/** Достаёт preview URL из payload разных типов событий (Ethereal-фолбек). */
function previewUrlOf(ev) {
  if (ev.payload?.previewUrl) return ev.payload.previewUrl; // verification_email_*
  return ev.payload?.deliveries?.email?.previewUrl ?? null; // notification_*
}

export default function NotificationsDropdown({ onClose, isAdmin = false }) {
  const ref = useRef(null);
  const [items, setItems] = useState([]);
  const [error, setError] = useState(null);
  const [triggerBusy, setTriggerBusy] = useState(false);

  const refresh = () => {
    return api.listNotifications()
      .then(setItems)
      .catch((err) => setError(err.detail || err.message));
  };

  useEffect(() => {
    let cancelled = false;
    api.listNotifications()
      .then((rows) => { if (!cancelled) setItems(rows); })
      .catch((err) => { if (!cancelled) setError(err.detail || err.message); });
    return () => { cancelled = true; };
  }, []);

  const handleTrigger = async (daysAhead) => {
    setTriggerBusy(true);
    try {
      const virtualNow = daysAhead
        ? new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000).toISOString()
        : undefined;
      const result = await api.triggerNotifications({ virtualNow });
      await refresh();
      const note = daysAhead
        ? `Прогон с виртуальной датой +${daysAhead}д: отправлено ${result.sent}, ошибок ${result.failed}, пропущено ${result.skipped}.`
        : `Прогон каскада: отправлено ${result.sent}, ошибок ${result.failed}, пропущено ${result.skipped}.`;
      window.alert(note);
    } catch (err) {
      window.alert('Ошибка: ' + (err.detail || err.message));
    } finally {
      setTriggerBusy(false);
    }
  };

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute top-full right-0 mt-2 w-96 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden"
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <span className="text-[11px] font-black uppercase tracking-widest text-slate-800">
          Системные события
        </span>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {error && (
        <div className="px-5 py-4 text-xs text-red-500">Ошибка загрузки: {error}</div>
      )}
      {!error && items.length === 0 && (
        <div className="px-5 py-8 text-xs text-slate-400 text-center">Пока пусто.</div>
      )}

      <ul className="divide-y divide-slate-50 max-h-96 overflow-y-auto custom-scrollbar">
        {items.map((ev) => {
          const style = EVENT_STYLES[ev.event_type] ?? { dot: 'bg-slate-300' };
          const preview = previewUrlOf(ev);
          return (
            <li
              key={ev.id}
              className="flex items-start gap-3.5 px-5 py-3 hover:bg-slate-50 transition-colors"
            >
              <span className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${style.dot}`} />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-slate-700 leading-snug">
                  {describe(ev)}
                </p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                  {ev.project_name} · {relativeTime(ev.created_at)}
                </p>
                {preview && (
                  <a
                    href={preview}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1.5 inline-block text-[10px] font-bold uppercase tracking-widest text-[#3C50B4] hover:underline"
                  >
                    📧 Открыть письмо в Ethereal →
                  </a>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {isAdmin && (
        <div className="border-t border-slate-100 px-5 py-3 bg-slate-50/50">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">
            Demo controls (admin)
          </p>
          <div className="flex gap-1.5 flex-wrap">
            <button
              disabled={triggerBusy}
              onClick={() => handleTrigger(0)}
              className="rounded-lg bg-white border border-slate-200 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-100 disabled:opacity-50"
            >
              Тик сейчас
            </button>
            <button
              disabled={triggerBusy}
              onClick={() => handleTrigger(3)}
              className="rounded-lg bg-white border border-slate-200 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-100 disabled:opacity-50"
            >
              +3 дня
            </button>
            <button
              disabled={triggerBusy}
              onClick={() => handleTrigger(5)}
              className="rounded-lg bg-white border border-slate-200 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-100 disabled:opacity-50"
            >
              +5 дней
            </button>
            <button
              disabled={triggerBusy}
              onClick={() => handleTrigger(8)}
              className="rounded-lg bg-white border border-slate-200 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-100 disabled:opacity-50"
            >
              +8 дней
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

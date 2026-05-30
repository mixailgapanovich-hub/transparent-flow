import { useCallback, useEffect, useState } from 'react';
import { X, Check, Inbox, RefreshCw } from 'lucide-react';
import { api } from '../../api/client';
import { CATEGORY_TABS, describeEvent, eventDot, relativeTime, previewUrlOf } from './eventMeta';

const LIMIT = 30;
// Вынесено из компонента: Date.now() нельзя вызывать в теле рендера (правило purity).
const futureISO = (days) => new Date(Date.now() + days * 86400000).toISOString();

// Полноэкранный центр уведомлений. Работает для PM и для клиента.
// source: { kind:'pm' } | { kind:'client', token }
export default function NotificationsPage({ source, onClose, isAdmin = false, onToast, onTaskCreated }) {
  const isClient = source.kind === 'client';
  const [category, setCategory] = useState('all');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [items, setItems] = useState([]);
  const [counts, setCounts] = useState({ total: 0, byCat: {} });
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [triggerBusy, setTriggerBusy] = useState(false);

  const fetchPage = useCallback(async (offset) => {
    const params = { category: category === 'all' ? null : category, unread: unreadOnly, limit: LIMIT, offset };
    if (isClient) {
      const res = await api.client.notifications(source.token, params);
      return { items: res.items, counts: res.counts };
    }
    const [list, cnts] = await Promise.all([
      api.notifications.feed(params),
      api.notifications.unreadCounts(),
    ]);
    return { items: list, counts: cnts };
  }, [category, unreadOnly, isClient, source.token]);

  // reset=true заменяет ленту (смена вкладки/фильтра), иначе дозагружает.
  const load = useCallback(async (reset = true, baseLen = 0) => {
    try {
      const offset = reset ? 0 : baseLen;
      const { items: page, counts: cnts } = await fetchPage(offset);
      setCounts(cnts ?? { total: 0, byCat: {} });
      setItems((prev) => (reset ? page : [...prev, ...page]));
      setHasMore(page.length === LIMIT);
    } catch (err) {
      onToast?.('error', 'Не удалось загрузить уведомления: ' + (err.detail || err.message));
    } finally {
      setLoading(false);
    }
  }, [fetchPage, onToast]);

  // Первичная загрузка и перезагрузка при смене вкладки/фильтра.
  // setState — внутри async-колбэка после await (правило set-state-in-effect это допускает).
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { items: page, counts: cnts } = await fetchPage(0);
        if (!active) return;
        setCounts(cnts ?? { total: 0, byCat: {} });
        setItems(page);
        setHasMore(page.length === LIMIT);
      } catch (err) {
        if (active) onToast?.('error', 'Не удалось загрузить уведомления: ' + (err.detail || err.message));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [fetchPage, onToast]);

  const markRead = async (ids) => {
    if (ids.length === 0) return;
    try {
      if (isClient) await api.client.markRead(source.token, ids);
      else await api.notifications.markRead(ids);
      setItems((prev) => prev.map((x) => (ids.includes(x.id) ? { ...x, read: true } : x)));
      setCounts((prev) => ({ ...prev, total: Math.max(0, prev.total - ids.length) }));
    } catch { /* тихо */ }
  };

  const markAllVisible = () => markRead(items.filter((x) => !x.read).map((x) => x.id));

  const handleTrigger = async (daysAhead) => {
    setTriggerBusy(true);
    try {
      const virtualNow = daysAhead ? futureISO(daysAhead) : undefined;
      const r = await api.triggerNotifications({ virtualNow });
      onToast?.('success', `Тик: отправлено ${r.sent}, ошибок ${r.failed}, пропущено ${r.skipped}`);
      await load(true);
    } catch (err) {
      onToast?.('error', 'Ошибка каскада: ' + (err.detail || err.message));
    } finally {
      setTriggerBusy(false);
    }
  };

  const acceptSuggestion = async (ev) => {
    try {
      const task = await api.acceptSuggestion(ev.payload.suggestionId);
      onToast?.('success', `Задача создана: «${task.title}»`);
      onTaskCreated?.(task);
      await load(true);
    } catch (err) {
      onToast?.('error', 'Не удалось принять: ' + (err.detail || err.message));
    }
  };
  const rejectSuggestion = async (ev) => {
    try {
      await api.rejectSuggestion(ev.payload.suggestionId);
      onToast?.('info', 'Предложение отклонено');
      await load(true);
    } catch (err) {
      onToast?.('error', 'Не удалось отклонить: ' + (err.detail || err.message));
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/40 md:p-4 font-montserrat" onClick={onClose}>
      <div
        className="flex flex-col bg-white w-full h-full md:max-h-[90vh] md:max-w-6xl md:rounded-3xl md:border md:border-slate-200 md:shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-5 md:px-7 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-black text-slate-900">Центр уведомлений</h2>
            {counts.total > 0 && (
              <span className="rounded-full bg-red-500 text-white text-[11px] font-black px-2 py-0.5">{counts.total}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={markAllVisible} className="text-xs font-bold text-[#3C50B4] hover:underline">Прочитать всё</button>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600" aria-label="Закрыть"><X size={18} /></button>
          </div>
        </header>

        {/* Вкладки категорий */}
        <div className="flex items-center gap-2 px-5 md:px-7 py-3 border-b border-slate-100 overflow-x-auto shrink-0">
          {CATEGORY_TABS.map((tab) => {
            const badge = tab.id === 'all' ? counts.total : (counts.byCat?.[tab.id] ?? 0);
            const active = category === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setCategory(tab.id)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  active ? 'bg-[#3C50B4] text-white' : 'bg-slate-50 text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.label}
                {badge > 0 && (
                  <span className={`min-w-[18px] text-[10px] font-black rounded-full px-1 ${active ? 'bg-white/25' : 'bg-red-100 text-red-600'}`}>{badge}</span>
                )}
              </button>
            );
          })}
          <label className="shrink-0 ml-auto flex items-center gap-2 text-xs font-bold text-slate-500 cursor-pointer pl-3">
            <input type="checkbox" checked={unreadOnly} onChange={(e) => setUnreadOnly(e.target.checked)} className="accent-[#3C50B4]" />
            Только непрочитанные
          </label>
        </div>

        {/* Лента */}
        <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
          {loading && items.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-slate-400 text-sm">Загружаем…</div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-300 gap-2">
              <Inbox size={40} strokeWidth={1.5} />
              <p className="text-sm font-semibold">Здесь пока пусто</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-50">
              {items.map((ev) => {
                const preview = previewUrlOf(ev);
                const isSuggestion = !isClient && ev.event_type === 'task_suggested';
                return (
                  <li
                    key={ev.id}
                    onClick={() => !ev.read && markRead([ev.id])}
                    className={`flex items-start gap-3.5 px-5 md:px-7 py-3.5 transition-colors cursor-default ${ev.read ? 'opacity-60' : 'bg-[#3C50B4]/[0.03]'} hover:bg-slate-50`}
                  >
                    <span className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${eventDot(ev)}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-slate-700 leading-snug">{describeEvent(ev)}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                        {ev.project_name ? `${ev.project_name} · ` : ''}{relativeTime(ev.created_at)}
                      </p>
                      {preview && (
                        <a href={preview} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
                          className="mt-1.5 inline-block text-[10px] font-bold uppercase tracking-widest text-[#3C50B4] hover:underline">
                          📧 Открыть письмо →
                        </a>
                      )}
                      {isSuggestion && (
                        <div className="mt-2 flex gap-2">
                          <button onClick={(e) => { e.stopPropagation(); acceptSuggestion(ev); }}
                            className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-700">
                            <Check size={12} /> Принять
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); rejectSuggestion(ev); }}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-bold text-slate-500 hover:bg-slate-50">
                            Отклонить
                          </button>
                        </div>
                      )}
                    </div>
                    {!ev.read && <span className="mt-1.5 w-2 h-2 rounded-full bg-[#3C50B4] shrink-0" title="Не прочитано" />}
                  </li>
                );
              })}
            </ul>
          )}

          {hasMore && (
            <div className="p-4 text-center">
              <button onClick={() => load(false, items.length)} className="text-xs font-bold text-[#3C50B4] hover:underline">Показать ещё</button>
            </div>
          )}
        </div>

        {/* Demo-контролы каскада — только админ в PM-режиме */}
        {isAdmin && !isClient && (
          <div className="border-t border-slate-100 px-5 md:px-7 py-3 bg-slate-50/60 shrink-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mr-1">Демо каскада:</span>
              {[['Тик сейчас', 0], ['+3 дня', 3], ['+5 дней', 5], ['+8 дней', 8]].map(([label, d]) => (
                <button key={label} disabled={triggerBusy} onClick={() => handleTrigger(d)}
                  className="flex items-center gap-1 rounded-lg bg-white border border-slate-200 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-100 disabled:opacity-50">
                  {d === 0 && <RefreshCw size={11} />}{label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

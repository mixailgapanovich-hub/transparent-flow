// Self-serve привязка Telegram к проекту (итерация 5). Клиент жмёт «Подключить»,
// получает deep-link + QR, открывает бота и нажимает Start — чат добавляется в
// получателей проекта. Можно привязать несколько чатов и удалять их.

import { useCallback, useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Send, X, Copy, Check, Trash2, RefreshCw, Plus, Loader2 } from 'lucide-react';
import { api } from '../../api/client';

export default function TelegramConnectModal({ token, botConfigured = true, onClose }) {
  const [recipients, setRecipients] = useState([]);
  const [link, setLink] = useState(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);
  const pollRef = useRef(null);

  const loadRecipients = useCallback(async () => {
    try {
      setRecipients(await api.client.telegramRecipients(token));
    } catch (e) {
      setError(e.detail || e.message);
    }
  }, [token]);

  // Первичная загрузка — промис-цепочкой (setState внутри .then, не синхронно в эффекте).
  useEffect(() => {
    let cancelled = false;
    api.client.telegramRecipients(token)
      .then((r) => { if (!cancelled) setRecipients(r); })
      .catch((e) => { if (!cancelled) setError(e.detail || e.message); });
    return () => { cancelled = true; };
  }, [token]);

  // Пока показан QR — опрашиваем получателей, чтобы увидеть привязку без перезагрузки.
  useEffect(() => {
    if (!link) return undefined;
    pollRef.current = setInterval(loadRecipients, 4000);
    return () => clearInterval(pollRef.current);
  }, [link, loadRecipients]);

  const generate = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await api.client.telegramOnboard(token);
      if (!res.botConfigured || !res.link) { setError('Бот не настроен на сервере.'); return; }
      setLink(res.link);
    } catch (e) {
      setError(e.detail || e.message);
    } finally {
      setBusy(false);
    }
  };

  const copy = () => {
    navigator.clipboard?.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => {});
  };

  const remove = async (id) => {
    try {
      await api.client.telegramRemove(token, id);
      setRecipients((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      setError(e.detail || e.message);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="flex items-center gap-2 text-base font-black text-slate-900">
            <Send size={18} className="text-[#229ED9]" /> Уведомления в Telegram
          </h3>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600" aria-label="Закрыть"><X size={18} /></button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto p-5 custom-scrollbar">
          {!botConfigured ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              Бот пока не настроен. Обратитесь к менеджеру проекта.
            </p>
          ) : (
            <>
              <p className="text-sm text-slate-500">
                Подключите Telegram, чтобы получать напоминания по задачам проекта.
                Можно подключить несколько устройств/людей.
              </p>

              {/* Список подключённых */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">Подключено</span>
                  <button onClick={loadRecipients} className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-[#3C50B4]" title="Обновить">
                    <RefreshCw size={13} /> Обновить
                  </button>
                </div>
                {recipients.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-200 px-4 py-3 text-center text-xs text-slate-400">Пока никто не подключён</p>
                ) : (
                  <div className="space-y-1.5">
                    {recipients.map((r) => (
                      <div key={r.id} className="flex items-center gap-2 rounded-xl border border-slate-100 bg-white px-3 py-2">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#229ED9]/10 text-[#229ED9]"><Send size={14} /></span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold text-slate-700">{r.label || r.username || 'Чат Telegram'}</span>
                          {r.username && <span className="block truncate text-[11px] text-slate-400">@{r.username}</span>}
                        </span>
                        <button onClick={() => remove(r.id)} className="p-1.5 text-slate-300 hover:text-red-500" aria-label="Отключить"><Trash2 size={15} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Привязка нового чата */}
              {link ? (
                <div className="rounded-2xl border border-[#229ED9]/20 bg-[#229ED9]/[0.04] p-4 text-center">
                  <p className="mb-3 text-xs font-semibold text-slate-500">Отсканируйте QR в Telegram или откройте ссылку и нажмите <b>Start</b>:</p>
                  <div className="mx-auto mb-3 w-fit rounded-xl border border-slate-200 bg-white p-3">
                    <QRCodeSVG value={link} size={148} />
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#229ED9] px-3 py-2.5 text-sm font-bold text-white transition hover:brightness-95"
                    >
                      <Send size={16} /> Открыть бота
                    </a>
                    <button
                      onClick={copy}
                      className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-bold transition ${copied ? 'bg-emerald-600 text-white' : 'border border-slate-200 text-slate-600 hover:border-[#3C50B4]'}`}
                    >
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
                  <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
                    <Loader2 size={12} className="animate-spin" /> Ждём подтверждения из Telegram…
                  </p>
                </div>
              ) : (
                <button
                  onClick={generate}
                  disabled={busy}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#3C50B4] px-4 py-3 text-sm font-bold text-white shadow-md shadow-blue-100 transition hover:brightness-95 disabled:opacity-60"
                >
                  {busy ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />} Подключить Telegram
                </button>
              )}

              {error && <p className="text-xs text-red-500">{error}</p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

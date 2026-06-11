// Панель «Ссылки клиенту»: задачи, ожидающие материалов (status='waiting'),
// с копированием magic-ссылки для отправки клиенту. Заменяет старую кнопку «Контент»
// (которая просто создавала задачу — создание осталось на хоткее «n» и кнопке доски).

import { useState } from 'react';
import { X, Copy, Check, Clock, ExternalLink, Link2 } from 'lucide-react';
import { PROJECT_BADGE_STYLES } from '../theme/taskStyles';

export default function ClientRequestsModal({ tasks = [], onClose, onOpenTask }) {
  const [copiedId, setCopiedId] = useState(null);
  const waiting = tasks.filter((t) => t.status === 'waiting' && t.magicLink);

  const copyLink = (t) => {
    navigator.clipboard?.writeText(t.magicLink)
      .then(() => { setCopiedId(t.id); setTimeout(() => setCopiedId(null), 1500); })
      .catch(() => {});
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="flex items-center gap-2 text-base font-black text-slate-900"><Link2 size={18} className="text-[#3C50B4]" /> Ссылки клиенту</h3>
            <p className="text-[11px] text-slate-400">Задачи, ожидающие материалов — скопируйте ссылку и отправьте клиенту</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600" aria-label="Закрыть"><X size={18} /></button>
        </header>

        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
          {waiting.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400">
              Сейчас нет задач, ожидающих материалов.<br />
              Запросите их кнопкой «Запросить у клиента» в карточке задачи.
            </div>
          ) : (
            <div className="space-y-2">
              {waiting.map((t) => {
                const proj = PROJECT_BADGE_STYLES[t.projectId];
                const copied = copiedId === t.id;
                return (
                  <div key={t.id} className="rounded-xl border border-slate-100 bg-white p-3">
                    <div className="flex items-start justify-between gap-2">
                      <button type="button" onClick={() => onOpenTask?.(t.id)} className="min-w-0 flex-1 text-left">
                        <p className="truncate text-sm font-bold text-slate-800 hover:text-[#3C50B4]">{t.title}</p>
                        <p className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
                          {proj && <span className={proj.text}>{proj.label}</span>}
                          {t.deadline && <span className="flex items-center gap-1"><Clock size={11} /> {new Date(t.deadline).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</span>}
                        </p>
                      </button>
                      <ExternalLink size={14} className="mt-1 shrink-0 cursor-pointer text-slate-300 hover:text-[#3C50B4]" onClick={() => onOpenTask?.(t.id)} />
                    </div>
                    <button
                      type="button"
                      onClick={() => copyLink(t)}
                      className={`mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition ${copied ? 'bg-emerald-600 text-white' : 'bg-[#3C50B4] text-white hover:brightness-95'}`}
                    >
                      {copied ? <><Check size={14} /> Скопировано</> : <><Copy size={14} /> Копировать ссылку</>}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

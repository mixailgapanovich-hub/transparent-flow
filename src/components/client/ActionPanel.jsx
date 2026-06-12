// Кабинет клиента: компактная плашка «Требует вашего внимания». Сама по себе — одна
// строка-кнопка со счётчиком (чтобы не забирать внимание с доски). Полный список
// задач, где ждут действия клиента (загрузить материалы / согласовать), открывается
// в мини-модалке. Данные берём из уже загруженного DTO (без запросов).

import { useState } from 'react';
import { CloudUpload, ShieldCheck, ChevronRight, Clock, AlertCircle, X } from 'lucide-react';

function deadlineLabel(deadline) {
  if (!deadline) return null;
  const d = new Date(deadline);
  if (Number.isNaN(d.getTime())) return null;
  const overdue = d < new Date();
  return { text: d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }), overdue };
}

export default function ActionPanel({ tasks, onUpload, onOpenTask }) {
  const [open, setOpen] = useState(false);

  const items = [];
  for (const t of tasks ?? []) {
    if (t.status === 'waiting') {
      items.push({ task: t, kind: 'upload', label: 'Загрузите материалы', cta: 'Прислать' });
    } else if (t.status === 'review' && t.currentApproval?.status === 'pending') {
      items.push({ task: t, kind: 'approve', label: 'Требуется ваше согласование', cta: 'Открыть' });
    }
  }

  // Ничего не требуется — не занимаем место над доской.
  if (items.length === 0) return null;

  const act = (it) => {
    setOpen(false);
    if (it.kind === 'upload') onUpload(it.task.id);
    else onOpenTask(it.task.id);
  };

  return (
    <>
      {/* Компактная строка-кнопка */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-4 flex w-full items-center gap-3 rounded-2xl border border-[#3C50B4]/20 bg-[#3C50B4]/[0.04] px-4 py-2.5 text-left transition hover:bg-[#3C50B4]/[0.08]"
      >
        <AlertCircle size={18} className="shrink-0 text-[#3C50B4]" />
        <span className="text-[11px] font-black uppercase tracking-widest text-[#3C50B4]">Требует вашего внимания</span>
        <span className="rounded-full bg-[#3C50B4] px-2 py-0.5 text-[10px] font-black text-white">{items.length}</span>
        <span className="ml-1 hidden min-w-0 flex-1 truncate text-sm text-slate-500 sm:block">
          — {items[0].task.title}{items.length > 1 ? ` и ещё ${items.length - 1}` : ''}
        </span>
        <span className="ml-auto flex shrink-0 items-center gap-1 text-xs font-bold text-[#3C50B4]">Показать <ChevronRight size={14} /></span>
      </button>

      {/* Мини-модалка со списком */}
      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setOpen(false)}>
          <div className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="flex items-center gap-2 text-base font-black text-slate-900">
                <AlertCircle size={18} className="text-[#3C50B4]" /> Требует вашего внимания
                <span className="rounded-full bg-[#3C50B4] px-2 py-0.5 text-[10px] text-white">{items.length}</span>
              </h3>
              <button onClick={() => setOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600" aria-label="Закрыть"><X size={18} /></button>
            </header>
            <div className="flex-1 space-y-2 overflow-y-auto p-5 custom-scrollbar">
              {items.map(({ task, kind, label, cta }) => {
                const Icon = kind === 'upload' ? CloudUpload : ShieldCheck;
                const dl = deadlineLabel(task.deadline);
                return (
                  <div key={task.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3">
                    <Icon size={18} className={`shrink-0 ${kind === 'upload' ? 'text-orange-500' : 'text-indigo-500'}`} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-800">{task.title}</p>
                      <p className="flex items-center gap-2 text-xs text-slate-400">
                        <span className={`font-semibold ${kind === 'upload' ? 'text-orange-600' : 'text-indigo-600'}`}>{label}</span>
                        {dl && (
                          <span className={`flex items-center gap-1 ${dl.overdue ? 'text-red-500' : ''}`}>
                            <Clock size={11} /> {dl.text}
                          </span>
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => act({ task, kind })}
                      className="flex shrink-0 items-center gap-1 rounded-lg bg-[#3C50B4] px-3 py-1.5 text-xs font-bold text-white transition hover:brightness-95"
                    >
                      {cta} <ChevronRight size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

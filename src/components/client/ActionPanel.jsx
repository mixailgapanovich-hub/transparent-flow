// Панель «Требует вашего внимания» в кабинете клиента: собирает задачи, где ждут
// действия именно клиента — загрузить материалы (waiting) или согласовать результат
// (review + pending approval). Данные берём из уже загруженного DTO (без запросов).

import { CloudUpload, ShieldCheck, CheckCircle2, ChevronRight, Clock } from 'lucide-react';

function deadlineLabel(deadline) {
  if (!deadline) return null;
  const d = new Date(deadline);
  if (Number.isNaN(d.getTime())) return null;
  const overdue = d < new Date();
  return { text: d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }), overdue };
}

export default function ActionPanel({ tasks, onUpload, onOpenTask }) {
  const items = [];
  for (const t of tasks ?? []) {
    if (t.status === 'waiting') {
      items.push({ task: t, kind: 'upload', label: 'Загрузите материалы', cta: 'Прислать' });
    } else if (t.status === 'review' && t.currentApproval?.status === 'pending') {
      items.push({ task: t, kind: 'approve', label: 'Требуется ваше согласование', cta: 'Открыть' });
    }
  }

  if (items.length === 0) {
    return (
      <div className="mb-5 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 px-4 py-3">
        <CheckCircle2 size={20} className="shrink-0 text-emerald-500" />
        <p className="text-sm font-semibold text-emerald-800">Всё в порядке — сейчас от вас ничего не требуется.</p>
      </div>
    );
  }

  return (
    <div className="mb-5 rounded-2xl border border-[#3C50B4]/20 bg-[#3C50B4]/[0.04] p-4">
      <h3 className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#3C50B4]">
        Требует вашего внимания
        <span className="rounded-full bg-[#3C50B4] px-2 py-0.5 text-[10px] text-white">{items.length}</span>
      </h3>
      {/* Плиткой — до 3 в ряд на широком экране, чтобы не занимать пол-экрана сверху */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {items.map(({ task, kind, label, cta }) => {
          const Icon = kind === 'upload' ? CloudUpload : ShieldCheck;
          const dl = deadlineLabel(task.deadline);
          return (
            <button
              key={task.id}
              type="button"
              onClick={() => (kind === 'upload' ? onUpload(task.id) : onOpenTask(task.id))}
              className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-white p-3 text-left transition hover:border-[#3C50B4]/40 hover:shadow-sm"
            >
              <div className="flex items-start gap-2">
                <Icon size={16} className={`mt-0.5 shrink-0 ${kind === 'upload' ? 'text-orange-500' : 'text-indigo-500'}`} />
                <p className="line-clamp-2 text-[13px] font-bold leading-snug text-slate-800">{task.title}</p>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className={`text-[11px] font-semibold ${kind === 'upload' ? 'text-orange-600' : 'text-indigo-600'}`}>{label}</span>
                {dl && (
                  <span className={`flex shrink-0 items-center gap-0.5 text-[11px] ${dl.overdue ? 'text-red-500' : 'text-slate-400'}`}>
                    <Clock size={10} /> {dl.text}
                  </span>
                )}
              </div>
              <span className="flex items-center gap-1 self-start rounded-lg bg-[#3C50B4] px-2.5 py-1 text-[11px] font-bold text-white">
                {cta} <ChevronRight size={12} />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

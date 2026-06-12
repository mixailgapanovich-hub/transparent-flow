// Главная страница PM: сводка по всем проектам + «Требует вашего внимания»
// (задачи, ждущие действия PM) + быстрый переход в проекты. Данные — из уже
// загруженных в App tasks/projects, без запросов.

import { useMemo, useState } from 'react';
import { CloudUpload, AlertTriangle, ShieldCheck, Clock, FolderKanban, CheckCircle2 } from 'lucide-react';
import { PROJECT_BADGE_STYLES } from '../theme/taskStyles';

const STAT_DEFS = [
  { key: 'inProgress', label: 'В работе', cls: 'text-violet-600' },
  { key: 'waiting', label: 'Ждём клиента', cls: 'text-orange-600' },
  { key: 'review', label: 'На согласовании', cls: 'text-indigo-600' },
  { key: 'done', label: 'Готово', cls: 'text-emerald-600' },
];

// Колонки «Требует вашего внимания» — по типу ожидаемого действия.
const ATTENTION_COLS = [
  { key: 'uploaded', title: 'Клиент загрузил', icon: CloudUpload, dot: 'bg-teal-400', accent: 'text-teal-600', border: 'border-teal-200', bg: 'bg-teal-50/50' },
  { key: 'review', title: 'На согласовании', icon: ShieldCheck, dot: 'bg-indigo-400', accent: 'text-indigo-600', border: 'border-indigo-200', bg: 'bg-indigo-50/50' },
  { key: 'waiting', title: 'Ждём от клиента', icon: Clock, dot: 'bg-orange-400', accent: 'text-orange-600', border: 'border-orange-200', bg: 'bg-orange-50/50' },
  { key: 'overdue', title: 'Просрочены', icon: AlertTriangle, dot: 'bg-red-400', accent: 'text-red-600', border: 'border-red-200', bg: 'bg-red-50/50' },
];

function projectName(projects, slug) {
  return projects.find((p) => p.slug === slug)?.name ?? PROJECT_BADGE_STYLES[slug]?.label ?? slug;
}

export default function DashboardView({ tasks = [], projects = [], onOpenProject, onOpenTask }) {
  // «Сейчас» фиксируем на момент монтирования (Date.now() нельзя в теле рендера — правило purity).
  const [now] = useState(() => Date.now());
  const { stats, buckets, attentionTotal } = useMemo(() => {
    const by = (s) => tasks.filter((t) => t.status === s).length;
    const b = { uploaded: [], review: [], waiting: [], overdue: [] };
    for (const t of tasks) {
      const overdue = t.status !== 'done' && t.deadline && new Date(t.deadline).getTime() < now;
      // Задача попадает максимум в одну колонку (приоритет: загрузил → согласование → ждём → просрочено).
      if (t.status === 'client-uploaded') b.uploaded.push(t);
      else if (t.status === 'review' && t.currentApproval?.status === 'pending') b.review.push(t);
      else if (t.status === 'waiting') b.waiting.push(t);
      else if (overdue) b.overdue.push(t);
    }
    return {
      stats: {
        projects: projects.length,
        inProgress: by('in-progress'),
        waiting: by('waiting'),
        review: by('review'),
        done: by('done'),
      },
      buckets: b,
      attentionTotal: b.uploaded.length + b.review.length + b.waiting.length + b.overdue.length,
    };
  }, [tasks, projects, now]);

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl md:text-3xl font-black text-slate-900 font-machine leading-none">Сводка агентства</h2>
        <p className="mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Все проекты на одном экране</p>
      </div>

      {/* Сводка */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5 md:gap-4">
        <div className="rounded-2xl border border-slate-200/70 bg-white p-4">
          <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400"><FolderKanban size={13} /> Проекты</p>
          <p className="mt-1 text-2xl font-black text-slate-800">{stats.projects}</p>
        </div>
        {STAT_DEFS.map((s) => (
          <div key={s.key} className="rounded-2xl border border-slate-200/70 bg-white p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{s.label}</p>
            <p className={`mt-1 text-2xl font-black ${s.cls}`}>{stats[s.key]}</p>
          </div>
        ))}
      </div>

      {/* Требует вашего внимания — по колонкам типа действия */}
      <div>
        <h3 className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
          Требует вашего внимания
          {attentionTotal > 0 && <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] text-white">{attentionTotal}</span>}
        </h3>
        {attentionTotal === 0 ? (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 px-4 py-3 text-sm font-semibold text-emerald-800">
            <CheckCircle2 size={18} className="shrink-0 text-emerald-500" />
            Всё под контролём — задач, требующих вашего вмешательства, нет.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {ATTENTION_COLS.map((col) => {
              const items = buckets[col.key];
              const Icon = col.icon;
              return (
                <div key={col.key} className={`rounded-2xl border ${col.border} ${col.bg} p-3`}>
                  <div className="mb-2 flex items-center gap-2 px-1">
                    <Icon size={15} className={col.accent} />
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-600">{col.title}</span>
                    <span className={`ml-auto h-5 min-w-[20px] rounded-full px-1.5 text-center text-[10px] font-black leading-5 text-white ${col.dot}`}>{items.length}</span>
                  </div>
                  {items.length === 0 ? (
                    <p className="px-1 py-3 text-center text-[11px] text-slate-300">пусто</p>
                  ) : (
                    <div className="space-y-1.5">
                      {items.map((task) => (
                        <button
                          key={task.id}
                          type="button"
                          onClick={() => onOpenTask?.(task.id)}
                          className="block w-full rounded-xl border border-slate-100 bg-white px-3 py-2 text-left transition hover:border-[#3C50B4]/30"
                        >
                          <span className="block truncate text-[13px] font-bold text-slate-800">{task.title}</span>
                          <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-400">
                            <span className="truncate">{projectName(projects, task.projectId)}</span>
                            {task.deadline && (
                              <span className={`flex shrink-0 items-center gap-0.5 ${col.key === 'overdue' ? 'text-red-500' : ''}`}>
                                <Clock size={10} /> {new Date(task.deadline).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                              </span>
                            )}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Проекты — быстрый переход */}
      {projects.length > 0 && (
        <div>
          <h3 className="mb-3 text-xs font-black uppercase tracking-widest text-slate-500">Проекты</h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onOpenProject?.(p.slug ?? p.id)}
                className="group rounded-2xl border border-slate-200/70 bg-white p-4 text-left transition hover:border-[#3C50B4]/30 hover:shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <p className="truncate text-sm font-black text-slate-800 group-hover:text-[#3C50B4]">{p.name}</p>
                  <span className="text-sm font-black text-[#3C50B4]">{p.progress}%</span>
                </div>
                <p className="mt-0.5 truncate text-xs text-slate-400">{p.client}</p>
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-[#3C50B4]" style={{ width: `${p.progress}%` }} />
                </div>
                <p className="mt-2 text-[11px] font-bold text-slate-400">{p.tasksDone}/{p.tasksTotal} задач</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Главная страница PM: сводка по всем проектам + «Требует вашего внимания»
// (задачи, ждущие действия PM) + быстрый переход в проекты. Данные — из уже
// загруженных в App tasks/projects, без запросов.

import { useMemo, useState } from 'react';
import { CloudUpload, AlertTriangle, ChevronRight, FolderKanban, Clock } from 'lucide-react';
import { PROJECT_BADGE_STYLES } from '../theme/taskStyles';

const STAT_DEFS = [
  { key: 'inProgress', label: 'В работе', cls: 'text-violet-600' },
  { key: 'waiting', label: 'Ждём клиента', cls: 'text-orange-600' },
  { key: 'review', label: 'На согласовании', cls: 'text-indigo-600' },
  { key: 'done', label: 'Готово', cls: 'text-emerald-600' },
];

function projectName(projects, slug) {
  return projects.find((p) => p.slug === slug)?.name ?? PROJECT_BADGE_STYLES[slug]?.label ?? slug;
}

export default function DashboardView({ tasks = [], projects = [], onOpenProject, onOpenTask }) {
  // «Сейчас» фиксируем на момент монтирования (Date.now() нельзя в теле рендера — правило purity).
  const [now] = useState(() => Date.now());
  const { stats, attention } = useMemo(() => {
    const by = (s) => tasks.filter((t) => t.status === s).length;
    const total = tasks.length;
    const done = by('done');
    const att = tasks
      .filter((t) => t.status === 'client-uploaded'
        || (t.status !== 'done' && t.deadline && new Date(t.deadline).getTime() < now))
      .map((t) => ({
        task: t,
        kind: t.status === 'client-uploaded' ? 'uploaded' : 'overdue',
      }))
      .sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'uploaded' ? -1 : 1));
    return {
      stats: {
        projects: projects.length,
        inProgress: by('in-progress'),
        waiting: by('waiting'),
        review: by('review'),
        done,
        progress: total > 0 ? Math.round((done / total) * 100) : 0,
      },
      attention: att,
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

      {/* Общий прогресс */}
      <div className="rounded-2xl border border-slate-200/70 bg-white p-5">
        <div className="mb-2 flex items-end justify-between">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Общая готовность</span>
          <span className="rounded-lg bg-[#3C50B4]/5 px-2 py-0.5 text-sm font-black text-[#3C50B4]">{stats.progress}%</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full border border-slate-200/50 bg-slate-100 p-px">
          <div className="h-full rounded-full bg-[#3C50B4] transition-all duration-1000" style={{ width: `${stats.progress}%` }} />
        </div>
      </div>

      {/* Требует вашего внимания */}
      <div>
        <h3 className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
          Требует вашего внимания
          {attention.length > 0 && <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] text-white">{attention.length}</span>}
        </h3>
        {attention.length === 0 ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 px-4 py-3 text-sm font-semibold text-emerald-800">
            Всё под контролём — задач, требующих вашего вмешательства, нет.
          </div>
        ) : (
          <div className="space-y-2">
            {attention.map(({ task, kind }) => (
              <button
                key={task.id}
                type="button"
                onClick={() => onOpenTask?.(task.id)}
                className="flex w-full items-center gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 text-left transition hover:border-[#3C50B4]/30"
              >
                {kind === 'uploaded'
                  ? <CloudUpload size={18} className="shrink-0 text-teal-500" />
                  : <AlertTriangle size={18} className="shrink-0 text-red-500" />}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-slate-800">{task.title}</span>
                  <span className="flex items-center gap-2 text-xs text-slate-400">
                    <span className={kind === 'uploaded' ? 'font-semibold text-teal-600' : 'font-semibold text-red-500'}>
                      {kind === 'uploaded' ? 'Клиент загрузил материалы' : 'Просрочена'}
                    </span>
                    <span className="text-slate-400">· {projectName(projects, task.projectId)}</span>
                    {task.deadline && (
                      <span className="flex items-center gap-1"><Clock size={11} /> {new Date(task.deadline).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</span>
                    )}
                  </span>
                </span>
                <ChevronRight size={16} className="shrink-0 text-slate-300" />
              </button>
            ))}
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

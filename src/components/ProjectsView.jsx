import React from 'react';
import { Calendar, Layers, Plus, ArrowUpRight, ExternalLink } from 'lucide-react';

const PRIORITY_LABEL = {
  high: 'Высокий',
  medium: 'Средний',
  low: 'Низкий',
};

const PRIORITY_STYLE = {
  high: 'bg-red-50 text-red-500 border border-red-100',
  medium: 'bg-amber-50 text-amber-500 border border-amber-100',
  low: 'bg-slate-50 text-slate-400 border border-slate-200',
};

const STATUS_DOT = {
  active: 'bg-green-400',
  paused: 'bg-orange-400',
  waiting: 'bg-amber-400',
};

const MAX_VISIBLE_MEMBERS = 3;

export default function ProjectsView({ projects = [], onOpenProject, onClientView }) {
  return (
    <div className="space-y-6 md:space-y-10 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 font-machine leading-none">Портфель проектов</h2>
          <p className="text-slate-400 text-[10px] font-black mt-2 md:mt-3 uppercase tracking-[0.2em]">Управление активными контрактами</p>
        </div>
        <button className="w-full md:w-auto bg-[#3C50B4] text-white px-6 py-3 md:py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-[#2e3e91] transition-all shadow-xl shadow-blue-100 hover:-translate-y-1">
          <Plus size={18} strokeWidth={3} />
          Новый проект
        </button>
      </div>

      {projects.length === 0 && (
        <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
          Проекты загружаются…
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-6">
        {projects.map((project) => {
          const members = project.members ?? [];
          const visibleMembers = members.slice(0, MAX_VISIBLE_MEMBERS);
          const extraCount = members.length - visibleMembers.length;
          const dotClass = STATUS_DOT[project.status] ?? 'bg-slate-300';

          return (
            <div
              key={project.id}
              onClick={() => onOpenProject?.(project.slug ?? project.id)}
              className="group bg-[#F4F9FF] border border-blue-100 rounded-2xl md:rounded-4xl hover:border-blue-300 hover:shadow-xl hover:shadow-blue-100/40 transition-all cursor-pointer relative"
            >
              {/* ── МОБИЛЬНАЯ карточка (< md) ─────────────────────────────── */}
              <div className="md:hidden p-4">
                {/* Строка 1: бейджи + статус-дот */}
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-blue-600 bg-blue-100/50 px-2 py-0.5 rounded-lg truncate max-w-[120px]">
                    {project.client}
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 bg-white px-1.5 py-0.5 rounded-lg border border-blue-50 shrink-0">
                    {project.category}
                  </span>
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotClass}`} />
                </div>

                {/* Строка 2: название */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h3 className="text-sm font-black text-slate-800 leading-snug group-hover:text-[#3C50B4] transition-colors line-clamp-2">
                    {project.name}
                  </h3>
                  <ArrowUpRight size={16} className="shrink-0 text-blue-300 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                {/* Строка 3: прогресс-бар инлайн */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex-1 h-1.5 bg-blue-100/40 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.4)] transition-all duration-1000"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-black text-blue-600 shrink-0">{project.progress}%</span>
                </div>

                {/* Строка 4: статистика + приоритет */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-slate-500">
                    <span className="flex items-center gap-1 text-[11px] font-bold">
                      <Layers size={11} />
                      {project.tasksDone}/{project.tasksTotal}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] font-bold">
                      <Calendar size={11} />
                      {new Date(project.deadline).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  <div className={`text-[9px] font-black uppercase tracking-[0.1em] px-2 py-1 rounded-lg shrink-0 ${PRIORITY_STYLE[project.priority] ?? PRIORITY_STYLE.low}`}>
                    {PRIORITY_LABEL[project.priority] ?? project.priority}
                  </div>
                </div>

                {onClientView && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onClientView(project); }}
                    className="mt-3 w-full flex items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest text-[#3C50B4] hover:bg-[#3C50B4] hover:text-white transition-colors"
                  >
                    <ExternalLink size={13} /> Клиентский вид
                  </button>
                )}
              </div>

              {/* ── ДЕСКТОПНАЯ карточка (≥ md) ────────────────────────────── */}
              <div className="hidden md:flex flex-col p-7 h-full">
                <div className="absolute top-6 right-6 w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-400 opacity-0 group-hover:opacity-100 transition-all group-hover:rotate-12">
                  <ArrowUpRight size={20} />
                </div>

                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-[9px] font-black uppercase tracking-widest text-blue-600 bg-blue-100/50 px-2.5 py-1 rounded-lg">
                      {project.client}
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 bg-white px-2 py-1 rounded-lg border border-blue-50">
                      {project.category}
                    </span>
                    <span className={`w-2 h-2 rounded-full shrink-0 ${dotClass}`} />
                  </div>
                  <h3 className="text-xl font-black text-slate-800 leading-tight group-hover:text-[#3C50B4] transition-colors pr-8">
                    {project.name}
                  </h3>
                </div>

                <div className="bg-white/60 p-5 rounded-2xl border border-blue-50 mb-8">
                  <div className="flex justify-between items-end mb-3">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Прогресс</span>
                    <span className="text-sm font-black text-blue-600">{project.progress}%</span>
                  </div>
                  <div className="h-3 w-full bg-blue-100/30 rounded-full overflow-hidden p-0.5">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-1000 shadow-[0_0_12px_rgba(59,130,246,0.5)]"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 mb-8 flex-1">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Layers size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Задачи</span>
                    </div>
                    <p className="text-sm font-black text-slate-700 pl-5">
                      {project.tasksDone} <span className="text-slate-300">/</span> {project.tasksTotal}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Calendar size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Срок</span>
                    </div>
                    <p className="text-sm font-black text-slate-700 pl-5">
                      {new Date(project.deadline).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-blue-100/50">
                  <div className="flex -space-x-3">
                    {visibleMembers.map((m, idx) => (
                      <div
                        key={idx}
                        className="w-9 h-9 rounded-xl bg-[#FFD700] border-4 border-[#F4F9FF] flex items-center justify-center text-[10px] font-black text-[#3C50B4] shadow-sm"
                      >
                        {m.name}
                      </div>
                    ))}
                    {extraCount > 0 && (
                      <div className="w-9 h-9 rounded-xl bg-white border-4 border-[#F4F9FF] flex items-center justify-center text-[10px] font-black text-blue-300 shadow-sm">
                        +{extraCount}
                      </div>
                    )}
                  </div>
                  <div className={`text-[9px] font-black uppercase tracking-[0.15em] px-3 py-1.5 rounded-lg ${PRIORITY_STYLE[project.priority] ?? PRIORITY_STYLE.low}`}>
                    {PRIORITY_LABEL[project.priority] ?? project.priority}
                  </div>
                </div>

                {onClientView && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onClientView(project); }}
                    className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-[#3C50B4] hover:bg-[#3C50B4] hover:text-white transition-colors"
                  >
                    <ExternalLink size={14} /> Открыть клиентский вид
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

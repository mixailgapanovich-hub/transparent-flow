import React from 'react';
import { Calendar, Layers, MoreVertical, Users, Plus, ArrowUpRight } from 'lucide-react';
import { MOCK_PROJECTS } from '../data/mockProjects';

export default function ProjectsView() {
  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      {/* Заголовок и кнопка создания */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-slate-900 font-machine leading-none">Портфель проектов</h2>
          <p className="text-slate-400 text-[10px] font-black mt-3 uppercase tracking-[0.2em]">Управление активными контрактами</p>
        </div>
        <button className="bg-[#3C50B4] text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-3 hover:bg-[#2e3e91] transition-all shadow-xl shadow-blue-100 hover:-translate-y-1">
          <Plus size={18} strokeWidth={3} />
          Новый проект
        </button>
      </div>

      {/* Сетка проектов */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {MOCK_PROJECTS.map((project) => (
          <div 
            key={project.id} 
            // НОВЫЙ СТИЛЬ: Нежно-голубой фон и синяя обводка
            className="group bg-[#F4F9FF] border border-blue-100 p-7 rounded-[32px] hover:border-blue-300 hover:shadow-2xl hover:shadow-blue-100/50 transition-all cursor-pointer relative flex flex-col h-full"
          >
            {/* Кнопка перехода (появляется при ховере) */}
            <div className="absolute top-6 right-6 w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-400 opacity-0 group-hover:opacity-100 transition-all group-hover:rotate-12">
              <ArrowUpRight size={20} />
            </div>

            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-[9px] font-black uppercase tracking-widest text-blue-600 bg-blue-100/50 px-2.5 py-1 rounded-lg">
                  {project.client}
                </span>
                <span className={`w-2 h-2 rounded-full ${
                  project.status === 'paused' ? 'bg-orange-400' : 'bg-green-400'
                }`} />
              </div>
              
              <h3 className="text-xl font-black text-slate-800 leading-tight group-hover:text-[#3C50B4] transition-colors pr-8">
                {project.name}
              </h3>
            </div>

            {/* Прогресс с кастомным дизайном */}
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

            {/* Статистика */}
            <div className="grid grid-cols-2 gap-6 mb-8 flex-1">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Layers size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Задачи</span>
                </div>
                <p className="text-sm font-black text-slate-700 pl-5">{project.tasksDone} <span className="text-slate-300">/</span> {project.tasksTotal}</p>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Calendar size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Срок</span>
                </div>
                <p className="text-sm font-black text-slate-700 pl-5">{project.deadline}</p>
              </div>
            </div>

            {/* Команда и Приоритет */}
            <div className="flex items-center justify-between pt-6 border-t border-blue-100/50">
              <div className="flex -space-x-3">
                {project.members.map((m, idx) => (
                  <div key={idx} className="w-9 h-9 rounded-xl bg-[#FFD700] border-4 border-[#F4F9FF] flex items-center justify-center text-[10px] font-black text-[#3C50B4] shadow-sm">
                    {m.name}
                  </div>
                ))}
                <div className="w-9 h-9 rounded-xl bg-white border-4 border-[#F4F9FF] flex items-center justify-center text-[10px] font-black text-blue-300 shadow-sm">
                  +2
                </div>
              </div>
              
              <div className={`text-[9px] font-black uppercase tracking-[0.15em] px-3 py-1.5 rounded-lg ${
                project.priority === 'high' 
                ? 'bg-red-50 text-red-500 border border-red-100' 
                : 'bg-white text-slate-400 border border-blue-50'
              }`}>
                {project.priority} priority
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
import React from 'react';
import { Send, BookOpen, PlusCircle, MessageCircle, HelpCircle } from 'lucide-react';

export default function RightPanel() {
  const actions = [
    { id: 'add', icon: PlusCircle, label: 'Контент', color: 'text-[#3C50B4]' },
    { id: 'tg', icon: Send, label: 'Чат в TG', color: 'text-[#229ED9]' },
    { id: 'kb', icon: BookOpen, label: 'Инструкции', color: 'text-[#FFD700]' },
  ];

  return (
    <aside className="w-20 lg:w-64 border-l border-slate-100 bg-white flex flex-col p-4 gap-4">
      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 hidden lg:block">Быстрые действия</h4>
      
      {actions.map((act) => (
        <button 
          key={act.id}
          className="flex items-center gap-3 p-3 lg:p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-all group"
        >
          <act.icon size={22} className={`${act.color} group-hover:scale-110 transition-transform`} />
          <span className="text-sm font-bold text-slate-700 hidden lg:block">{act.label}</span>
        </button>
      ))}

      <div className="mt-auto p-4 bg-[#3C50B4]/5 rounded-2xl hidden lg:block">
        <HelpCircle size={20} className="text-[#3C50B4] mb-2" />
        <p className="text-[11px] text-[#3C50B4] font-medium leading-tight">Нужна помощь с потоком?</p>
        <button className="text-[10px] font-black uppercase mt-2 text-[#3C50B4] underline">Написать куратору</button>
      </div>
    </aside>
  );
}
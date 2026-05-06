import React from 'react';
import { Search, Book, FileText, ArrowRight } from 'lucide-react';

export default function KnowledgeBase() {
  const articles = [
    { title: 'Как работать с клиентом в Прозрачном потоке', category: 'Обучение' },
    { title: 'Правила оформления ТЗ', category: 'Стандарты' },
    { title: 'Настройка каскадных уведомлений', category: 'Техническое' },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h1 className="text-4xl font-black mb-8 font-machine text-slate-900">База знаний</h1>
      <div className="relative mb-12 max-w-2xl">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input 
          className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-[#3C50B4] font-montserrat" 
          placeholder="Поиск по инструкциям и шаблонам..." 
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {articles.map((art, i) => (
          <div key={i} className="p-6 bg-white border border-slate-100 rounded-3xl hover:shadow-xl transition-all group cursor-pointer">
            <div className="w-12 h-12 bg-[#3C50B4]/5 text-[#3C50B4] rounded-xl flex items-center justify-center mb-4">
              <FileText size={24} />
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">{art.category}</p>
            <h3 className="text-lg font-bold text-slate-800 mb-4 font-montserrat">{art.title}</h3>
            <div className="flex items-center text-[#3C50B4] font-bold text-sm">
              Читать статью <ArrowRight size={16} className="ml-2 group-hover:translate-x-2 transition-transform" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
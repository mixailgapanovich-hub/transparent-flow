import React, { useState } from 'react';
import { 
  Search, Book, Clock, ChevronRight, UserPlus, Cpu, Layout, 
  ShoppingBag, PenTool, LifeBuoy, BadgeDollarSign, ArrowRight 
} from 'lucide-react';
import { KNOWLEDGE_SECTIONS, KNOWLEDGE_CATEGORIES, KNOWLEDGE_ARTICLES } from '../data/mockKnowledge';

const iconMap = { UserPlus, Cpu, Layout, ShoppingBag, PenTool, LifeBuoy, BadgeDollarSign };

export default function KnowledgeBase() {
  const [activeSection, setActiveSection] = useState('agency');
  const [activeCategory, setActiveCategory] = useState('all');

  const filteredCategories = KNOWLEDGE_CATEGORIES.filter(c => c.section === activeSection);
  const filteredArticles = KNOWLEDGE_ARTICLES.filter(a => {
    const category = KNOWLEDGE_CATEGORIES.find(c => c.id === a.category);
    return category?.section === activeSection && (activeCategory === 'all' || a.category === activeCategory);
  });

  return (
    <div className="flex flex-col h-full space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
      
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 font-machine leading-none">База знаний</h2>
          <div className="flex gap-3 mt-5">
            {KNOWLEDGE_SECTIONS.map(section => (
              <button
                key={section.id}
                onClick={() => { setActiveSection(section.id); setActiveCategory('all'); }}
                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeSection === section.id 
                  ? 'bg-[#3C50B4] text-white shadow-lg shadow-blue-100' 
                  : 'bg-white text-slate-400 hover:text-slate-600 border border-slate-100'
                }`}
              >
                {section.title}
              </button>
            ))}
          </div>
        </div>
        
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Поиск по базе..." 
            className="pl-12 pr-6 py-4 bg-slate-50 border-none rounded-2xl w-full lg:w-96 text-sm font-medium focus:ring-2 focus:ring-[#3C50B4]/20"
          />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Sidebar Категории */}
        <aside className="lg:w-64 flex-shrink-0 space-y-2">
          <button 
            onClick={() => setActiveCategory('all')}
            className={`w-full flex items-center justify-between p-3.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${
              activeCategory === 'all' ? 'bg-[#3C50B4] text-white' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            Все темы
          </button>
          {filteredCategories.map(cat => {
            const Icon = iconMap[cat.icon];
            return (
              <button 
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`w-full flex items-center justify-between p-3.5 rounded-xl text-[11px] font-bold transition-all group ${
                  activeCategory === cat.id ? 'bg-[#3C50B4]/5 text-[#3C50B4]' : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon size={16} className={activeCategory === cat.id ? 'text-[#3C50B4]' : 'text-slate-300 group-hover:text-slate-400'} />
                  {cat.title}
                </div>
                <span className={`text-[9px] px-2 py-0.5 rounded-full font-black ${
                  activeCategory === cat.id ? 'bg-[#3C50B4] text-white' : 'bg-slate-100 text-slate-400'
                }`}>
                  {cat.count}
                </span>
              </button>
            );
          })}
        </aside>

        {/* Сетка статей с "нежным фиолетовым" стилем */}
        <div className="flex-1">
          {filteredArticles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredArticles.map(article => (
                <div 
                  key={article.id} 
                  // ПРИМЕНЯЕМ НОВЫЙ ЦВЕТ И ОБВОДКУ ТУТ
                  className="bg-[#F8F7FF] border border-violet-100 p-7 rounded-[28px] hover:border-violet-300 hover:shadow-xl hover:shadow-violet-100/50 transition-all cursor-pointer group flex flex-col h-full"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[9px] font-black uppercase tracking-widest text-violet-500 bg-violet-100/50 px-2.5 py-1 rounded-lg">
                      {KNOWLEDGE_CATEGORIES.find(c => c.id === article.category)?.title}
                    </span>
                    <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                      <Clock size={12} /> {article.time}
                    </div>
                  </div>

                  <h4 className="text-lg font-black text-slate-800 leading-tight group-hover:text-[#3C50B4] transition-colors mb-3">
                    {article.title}
                  </h4>
                  
                  <p className="text-sm text-slate-500/80 leading-relaxed mb-6 flex-1 font-medium">
                    {article.description}
                  </p>

                  <div className="flex items-center justify-between pt-5 border-t border-violet-100/50">
                    <div className="flex flex-wrap gap-2">
                      {article.tags.map(tag => (
                        <span key={tag} className="text-[10px] font-bold text-violet-300 group-hover:text-violet-400">#{tag}</span>
                      ))}
                    </div>
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-violet-200 group-hover:bg-[#3C50B4] group-hover:text-white transition-all">
                      <ArrowRight size={16} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 bg-slate-50 rounded-[40px] border-2 border-dashed border-slate-200">
              <Book size={48} className="text-slate-200 mb-4" />
              <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Раздел наполняется...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
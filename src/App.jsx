import React, { useState } from 'react';
import { Bell, Search } from 'lucide-react';
import Sidebar from './components/Sidebar';
import KanbanBoard from './components/KanbanBoard';
import RightPanel from './components/RightPanel';
import { INITIAL_TASKS } from './data/mockData';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [tasks, setTasks] = useState(INITIAL_TASKS);
  const [activeId, setActiveId] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);

  return (
    // Главный контейнер на весь экран без прокрутки самого окна
    <div className="flex h-screen w-screen bg-white text-slate-800 font-montserrat overflow-hidden">
      
      {/* 1. Левый сайдбар — теперь он просто занимает свои 96 пикселей, ни на что не наступая */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* 2. Основной контент (Центр + Право) */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        
        {/* Header — зафиксирован сверху */}
        <header className="h-20 border-b border-slate-100 flex items-center justify-between px-8 bg-white z-10">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-black text-slate-900 font-machine tracking-tighter">Прозрачный поток</h1>
            <div className="px-3 py-1 bg-[#3C50B4]/5 text-[#3C50B4] text-[10px] font-black rounded-lg uppercase tracking-widest border border-[#3C50B4]/10">
              Agency Mode
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative hidden xl:block">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
              <input className="bg-slate-50 border-none rounded-xl pl-10 pr-4 py-2 text-sm w-80 focus:ring-2 focus:ring-[#3C50B4]/20 transition-all" placeholder="Поиск по проектам и задачам..." />
            </div>

            <button className="relative p-2 text-slate-400 hover:text-[#3C50B4] transition-colors">
              <Bell size={22} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>

            <div className="flex items-center gap-3 pl-6 border-l border-slate-100">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-black text-slate-800 leading-none">Adena Admin</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest">Producer</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#FFD700] flex items-center justify-center font-black text-[#3C50B4] shadow-md shadow-yellow-100 border-2 border-white">
                AA
              </div>
            </div>
          </div>
        </header>

        {/* 3. Рабочее пространство (Ниже хедера) */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* КАНБАН-ЗОНА: Выделяем цветом и отступами */}
          <main className="flex-1 bg-[#F8FAFC] p-6 overflow-hidden flex flex-col">
            
            {/* Оболочка самого канбана — "белая доска" на сером фоне */}
            <div className="flex-1 bg-white rounded-[32px] border border-slate-200/60 shadow-sm flex flex-col overflow-hidden">
              
              {/* Внутренний скролл только для доски */}
              <div className="flex-1 overflow-x-auto p-8 custom-scrollbar">
                {activeTab === 'dashboard' ? (
                  <KanbanBoard 
                    tasks={tasks} 
                    setTasks={setTasks} 
                    onTaskClick={setSelectedTask}
                    activeId={activeId} 
                    setActiveId={setActiveId} 
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-300 font-machine text-2xl">
                    Раздел {activeTab}
                  </div>
                )}
              </div>
            </div>
          </main>

          {/* Правая панель (Utility Panel) */}
          <RightPanel />
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;900&display=swap');
        
        .font-machine { font-family: 'Montserrat', sans-serif; letter-spacing: -0.05em; text-transform: uppercase; }
        .font-montserrat { font-family: 'Montserrat', sans-serif; }
        
        /* Тонкий красивый скроллбар для рабочей зоны */
        .custom-scrollbar::-webkit-scrollbar { height: 10px; width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { 
          background: #E2E8F0; 
          border-radius: 20px; 
          border: 3px solid white; /* эффект отступа */
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #CBD5E1; }
      `}</style>
    </div>
  );
}
import React from 'react';
import { X, User, Moon, Bell, Globe, Shield, LogOut } from 'lucide-react';

export default function SettingsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 md:p-12">
      {/* Overlay с сильным блюром для эффекта глубины */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      {/* Контейнер модалки: max-w-5xl (около 1024px) и высота 85% от экрана */}
      <div className="relative bg-white w-full max-w-5xl h-[85vh] rounded-[48px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col md:flex-row">
        
        {/* Левое меню (Sidebar настроек) — сделаем чуть шире */}
        <div className="w-full md:w-80 bg-slate-50 p-10 border-r border-slate-100 flex flex-col justify-between">
          <div className="space-y-10">
            <div className="space-y-2">
              <h3 className="text-3xl font-black font-machine text-slate-900 leading-tight">Настройки</h3>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Конфигурация системы</p>
            </div>
            
            <nav className="space-y-3">
              {[
                { id: 'profile', icon: User, label: 'Профиль пользователя' },
                { id: 'ui', icon: Moon, label: 'Интерфейс и темы' },
                { id: 'notify', icon: Bell, label: 'Центр уведомлений' },
                { id: 'security', icon: Shield, label: 'Безопасность' },
              ].map((item) => (
                <button 
                  key={item.id}
                  className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${
                    item.id === 'profile' ? 'bg-[#3C50B4] text-white shadow-xl shadow-blue-200' : 'text-slate-400 hover:bg-white hover:text-[#3C50B4]'
                  }`}
                >
                  <item.icon size={18} />
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
          
          <button className="flex items-center gap-3 px-6 py-4 text-red-400 hover:text-red-500 text-xs font-black uppercase tracking-widest transition-all border border-transparent hover:border-red-100 rounded-2xl">
            <LogOut size={18} />
            Завершить сессию
          </button>
        </div>

        {/* Правая часть (Контент) — теперь тут много места */}
        <div className="flex-1 p-12 md:p-16 overflow-y-auto custom-scrollbar flex flex-col">
          <div className="flex justify-between items-start mb-12">
            <div>
              <h4 className="text-2xl font-black text-slate-800 font-machine">Личные данные</h4>
              <p className="text-slate-400 text-sm mt-1 font-medium">Управляйте тем, как вас видят коллеги и клиенты</p>
            </div>
            <button onClick={onClose} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all text-slate-400 hover:rotate-90">
              <X size={24} />
            </button>
          </div>

          <div className="space-y-12 max-w-2xl">
            {/* Аватар Секция */}
            <div className="flex items-center gap-8 p-8 bg-violet-50/50 rounded-[32px] border border-violet-100 relative overflow-hidden group">
              <div className="w-24 h-24 bg-[#FFD700] rounded-[24px] flex items-center justify-center text-3xl font-black text-[#3C50B4] shadow-xl border-4 border-white">
                AA
              </div>
              <div className="space-y-3">
                <h5 className="font-black text-slate-800 text-sm uppercase tracking-tight">Фото профиля</h5>
                <div className="flex gap-3">
                  <button className="bg-[#3C50B4] text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#2e3e91] transition-all">
                    Загрузить
                  </button>
                  <button className="bg-white text-slate-400 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-100 hover:text-red-400 transition-all">
                    Удалить
                  </button>
                </div>
              </div>
              <User size={120} className="absolute -right-8 -bottom-8 text-violet-200/20" />
            </div>

            {/* Сетка полей ввода — теперь в 2 колонки */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2 col-span-2 md:col-span-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Отображаемое имя</label>
                <input type="text" defaultValue="Adena Admin" className="w-full bg-slate-50 border-2 border-transparent focus:border-[#3C50B4]/10 rounded-2xl px-6 py-4 text-sm font-bold text-slate-700 focus:ring-0 transition-all outline-none" />
              </div>
              <div className="space-y-2 col-span-2 md:col-span-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Должность</label>
                <input type="text" defaultValue="Producer" className="w-full bg-slate-50 border-2 border-transparent focus:border-[#3C50B4]/10 rounded-2xl px-6 py-4 text-sm font-bold text-slate-700 focus:ring-0 transition-all outline-none" />
              </div>
              <div className="space-y-2 col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Email для уведомлений</label>
                <input type="email" defaultValue="admin@adena.agency" className="w-full bg-slate-50 border-2 border-transparent focus:border-[#3C50B4]/10 rounded-2xl px-6 py-4 text-sm font-bold text-slate-700 focus:ring-0 transition-all outline-none" />
              </div>
            </div>

            {/* Дополнительные опции */}
            <div className="space-y-4">
               <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Приватность и доступ</h5>
               <div className="flex items-center justify-between p-6 bg-blue-50/50 rounded-3xl border border-blue-100 group hover:bg-blue-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-500 shadow-sm">
                      <Globe size={20} />
                    </div>
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-tight text-slate-700">Публичный режим</p>
                      <p className="text-[10px] text-slate-400 font-medium">Клиенты смогут видеть ваш профиль в задачах</p>
                    </div>
                  </div>
                  <div className="w-12 h-6 bg-[#3C50B4] rounded-full relative cursor-pointer">
                    <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-md" />
                  </div>
               </div>
            </div>
          </div>

          {/* Кнопки внизу — теперь всегда видны при скролле (опционально) или просто в конце контента */}
          <div className="mt-auto pt-12 flex gap-4">
            <button className="bg-[#3C50B4] text-white px-10 py-5 rounded-[20px] font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl shadow-blue-200 hover:-translate-y-1 transition-all active:scale-95">
              Сохранить изменения
            </button>
            <button onClick={onClose} className="px-10 py-5 bg-slate-100 text-slate-400 rounded-[20px] font-black text-[11px] uppercase tracking-[0.2em] hover:bg-slate-200 transition-all">
              Закрыть без сохранения
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
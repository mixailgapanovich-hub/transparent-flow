import React from 'react';
import { X, ChevronLeft, User, Moon, Bell, Globe, Shield, LogOut } from 'lucide-react';

const NAV_ITEMS = [
  { id: 'profile',  icon: User,   label: 'Профиль' },
  { id: 'ui',       icon: Moon,   label: 'Интерфейс' },
  { id: 'notify',   icon: Bell,   label: 'Уведомления' },
  { id: 'security', icon: Shield, label: 'Безопасность' },
];

export default function SettingsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center md:p-6 md:p-12">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Контейнер: full-screen на мобилке, max-w-5xl 85vh на десктопе */}
      <div className="relative bg-white w-full h-full md:max-w-5xl md:h-[85vh] md:rounded-[48px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col md:flex-row">

        {/* ── Левая панель (Sidebar настроек) ─────────────────────────── */}
        <div className="w-full md:w-72 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-100 flex flex-col shrink-0">

          {/* Мобильный header с кнопкой Назад */}
          <div className="flex items-center gap-3 px-4 py-3 md:hidden border-b border-slate-100">
            <button
              onClick={onClose}
              className="p-1 -ml-1 text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="Закрыть настройки"
            >
              <ChevronLeft size={22} />
            </button>
            <span className="text-sm font-black text-slate-800 uppercase tracking-widest font-machine">Настройки</span>
          </div>

          {/* Десктопный заголовок */}
          <div className="hidden md:block px-8 pt-10 pb-6 space-y-1">
            <h3 className="text-2xl font-black font-machine text-slate-900 leading-tight">Настройки</h3>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Конфигурация системы</p>
          </div>

          {/* Навигация */}
          <nav className="flex flex-row md:flex-col gap-1 px-3 md:px-4 py-2 md:py-0 md:pb-4 overflow-x-auto md:overflow-x-visible">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                className={`flex items-center gap-2 md:gap-3 px-3 md:px-5 py-2 md:py-3.5 rounded-xl md:rounded-2xl text-[10px] md:text-[11px] font-black uppercase tracking-widest transition-all shrink-0 md:w-full
                  ${item.id === 'profile'
                    ? 'bg-[#3C50B4] text-white shadow-lg shadow-blue-200'
                    : 'text-slate-400 hover:bg-white hover:text-[#3C50B4]'
                  }`}
              >
                <item.icon size={15} />
                <span className="md:inline">{item.label}</span>
              </button>
            ))}
          </nav>

          {/* Кнопка выхода — только на десктопе */}
          <button className="hidden md:flex items-center gap-3 mx-4 mb-6 mt-auto px-5 py-3.5 text-red-400 hover:text-red-500 text-xs font-black uppercase tracking-widest transition-all border border-transparent hover:border-red-100 rounded-2xl">
            <LogOut size={16} />
            Завершить сессию
          </button>
        </div>

        {/* ── Правая часть (Контент) ───────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">

          {/* Заголовок секции */}
          <div className="flex justify-between items-start px-5 md:px-12 pt-5 md:pt-10 pb-4 md:pb-8">
            <div>
              <h4 className="text-base md:text-2xl font-black text-slate-800 font-machine">Личные данные</h4>
              <p className="text-slate-400 text-xs md:text-sm mt-0.5 font-medium">Управляйте тем, как вас видят коллеги</p>
            </div>
            {/* Кнопка закрыть — только на десктопе */}
            <button
              onClick={onClose}
              className="hidden md:flex p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all text-slate-400 hover:rotate-90"
            >
              <X size={20} />
            </button>
          </div>

          <div className="px-5 md:px-12 pb-6 md:pb-12 space-y-6 md:space-y-10 max-w-2xl">

            {/* Аватар */}
            <div className="flex items-center gap-4 md:gap-8 p-4 md:p-8 bg-violet-50/50 rounded-2xl md:rounded-[32px] border border-violet-100 relative overflow-hidden">
              <div className="w-14 h-14 md:w-24 md:h-24 bg-[#FFD700] rounded-2xl md:rounded-[24px] flex items-center justify-center text-xl md:text-3xl font-black text-[#3C50B4] shadow-xl border-4 border-white shrink-0">
                AA
              </div>
              <div className="space-y-2">
                <h5 className="font-black text-slate-800 text-xs md:text-sm uppercase tracking-tight">Фото профиля</h5>
                <div className="flex gap-2 md:gap-3">
                  <button className="bg-[#3C50B4] text-white px-3 md:px-5 py-2 md:py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#2e3e91] transition-all">
                    Загрузить
                  </button>
                  <button className="bg-white text-slate-400 px-3 md:px-5 py-2 md:py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-100 hover:text-red-400 transition-all">
                    Удалить
                  </button>
                </div>
              </div>
              <User size={80} className="absolute -right-4 -bottom-4 text-violet-200/20 hidden md:block" />
            </div>

            {/* Поля */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Отображаемое имя</label>
                <input
                  type="text"
                  defaultValue="Adena Admin"
                  className="w-full bg-slate-50 border-2 border-transparent focus:border-[#3C50B4]/10 rounded-xl md:rounded-2xl px-4 md:px-6 py-2.5 md:py-4 text-sm font-bold text-slate-700 focus:ring-0 transition-all outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Должность</label>
                <input
                  type="text"
                  defaultValue="Producer"
                  className="w-full bg-slate-50 border-2 border-transparent focus:border-[#3C50B4]/10 rounded-xl md:rounded-2xl px-4 md:px-6 py-2.5 md:py-4 text-sm font-bold text-slate-700 focus:ring-0 transition-all outline-none"
                />
              </div>
              <div className="space-y-1.5 col-span-1 md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Email для уведомлений</label>
                <input
                  type="email"
                  defaultValue="admin@adena.agency"
                  className="w-full bg-slate-50 border-2 border-transparent focus:border-[#3C50B4]/10 rounded-xl md:rounded-2xl px-4 md:px-6 py-2.5 md:py-4 text-sm font-bold text-slate-700 focus:ring-0 transition-all outline-none"
                />
              </div>
            </div>

            {/* Публичный режим */}
            <div>
              <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Приватность и доступ</h5>
              <div className="flex items-center justify-between p-4 md:p-6 bg-blue-50/50 rounded-2xl md:rounded-3xl border border-blue-100 hover:bg-blue-50 transition-colors">
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="w-8 h-8 md:w-10 md:h-10 bg-white rounded-xl flex items-center justify-center text-blue-500 shadow-sm shrink-0">
                    <Globe size={16} />
                  </div>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-tight text-slate-700">Публичный режим</p>
                    <p className="text-[10px] text-slate-400 font-medium">Клиенты смогут видеть ваш профиль</p>
                  </div>
                </div>
                <div className="w-10 md:w-12 h-5 md:h-6 bg-[#3C50B4] rounded-full relative cursor-pointer shrink-0">
                  <div className="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-md" />
                </div>
              </div>
            </div>
          </div>

          {/* Футер с кнопками */}
          <div className="mt-auto px-5 md:px-12 py-4 md:py-8 border-t border-slate-100 flex flex-col md:flex-row gap-2 md:gap-4">
            <button className="bg-[#3C50B4] text-white px-6 md:px-10 py-3 md:py-5 rounded-xl md:rounded-[20px] font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-blue-200 hover:-translate-y-0.5 transition-all active:scale-95 w-full md:w-auto">
              Сохранить изменения
            </button>
            <button onClick={onClose} className="px-6 md:px-10 py-3 md:py-5 bg-slate-100 text-slate-400 rounded-xl md:rounded-[20px] font-black text-[11px] uppercase tracking-[0.2em] hover:bg-slate-200 transition-all w-full md:w-auto">
              Отмена
            </button>
            {/* Выход — только на мобилке */}
            <button className="md:hidden flex items-center justify-center gap-2 px-6 py-3 text-red-400 border border-red-100 rounded-xl font-black text-[11px] uppercase tracking-widest">
              <LogOut size={15} />
              Завершить сессию
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

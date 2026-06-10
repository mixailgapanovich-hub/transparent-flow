import { Zap, LayoutDashboard, FolderOpen, CheckSquare, BookOpen, Settings, ShieldCheck } from 'lucide-react';

// Добавляем onSettingsClick в деструктуризацию пропсов
export default function Sidebar({ activeTab, setActiveTab, onSettingsClick, isAdmin = false }) {
  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Доска' },
    { id: 'projects', icon: FolderOpen, label: 'Проекты' },
    { id: 'tasks', icon: CheckSquare, label: 'Задачи' },
    { id: 'kb', icon: BookOpen, label: 'База' },
    ...(isAdmin ? [{ id: 'management', icon: ShieldCheck, label: 'Управл.' }] : []),
  ];

  return (
    // Убираем fixed, оставляем flex-col и фиксированную ширину
    <aside className="hidden md:flex w-24 h-full flex-col items-center py-8 bg-white border-r border-slate-100 flex-shrink-0">
      <div className="bg-[#3C50B4] p-3 rounded-2xl mb-10 shadow-lg shadow-blue-100">
        <Zap className="text-white" size={28} fill="currentColor" />
      </div>

      <nav className="flex flex-col gap-3 w-full px-2">
        {menuItems.map(item => {
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-1 py-2.5 rounded-2xl transition-all duration-200 ${
                active
                  ? 'bg-[#3C50B4] text-white shadow-lg shadow-blue-100'
                  : 'text-slate-400 hover:bg-[#3C50B4]/5 hover:text-[#3C50B4]'
              }`}
            >
              <item.icon size={22} strokeWidth={active ? 2.4 : 2} />
              <span className="text-[9px] font-black uppercase tracking-wider">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Настройки */}
      <button
        onClick={onSettingsClick}
        className="mt-auto flex flex-col items-center gap-1 py-2.5 px-3 rounded-2xl text-slate-400 hover:bg-[#3C50B4]/5 hover:text-[#3C50B4] transition-colors"
      >
        <Settings size={22} />
        <span className="text-[9px] font-black uppercase tracking-wider">Опции</span>
      </button>
    </aside>
  );
}
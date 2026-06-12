import { Zap, LayoutDashboard, FolderOpen, CheckSquare, BookOpen, Settings, ShieldCheck } from 'lucide-react';

// Цвет точки-индикатора по статусу проекта (совпадает с палитрой плашек проекта).
const STATUS_DOT = {
  active: 'bg-emerald-400',
  paused: 'bg-orange-400',
  waiting: 'bg-amber-400',
  completed: 'bg-slate-300',
};

// Расширенный левый сайдбар: навигация строками + список последних проектов + настройки.
// Правую панель убрали — действия переехали в шапку (см. App.jsx).
export default function Sidebar({
  activeTab,
  setActiveTab,
  onSettingsClick,
  isAdmin = false,
  projects = [],
  onOpenProject,
  currentSlug = null,
}) {
  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Доска' },
    { id: 'projects', icon: FolderOpen, label: 'Проекты' },
    { id: 'tasks', icon: CheckSquare, label: 'Задачи' },
    { id: 'kb', icon: BookOpen, label: 'База знаний' },
    ...(isAdmin ? [{ id: 'management', icon: ShieldCheck, label: 'Управление' }] : []),
  ];

  const recent = projects.slice(0, 5);

  return (
    <aside className="hidden md:flex w-48 h-full flex-col py-6 px-3 bg-white border-r border-slate-100 flex-shrink-0">
      {/* Логотип + вордмарк */}
      <div className="flex items-center gap-2.5 px-2 mb-8">
        <div className="bg-[#3C50B4] p-2 rounded-xl shadow-lg shadow-blue-100 shrink-0">
          <Zap className="text-white" size={20} fill="currentColor" />
        </div>
        <span className="text-sm font-black text-slate-900 font-machine leading-none">Поток</span>
      </div>

      {/* Навигация */}
      <nav className="flex flex-col gap-1">
        {menuItems.map((item) => {
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                active
                  ? 'bg-[#3C50B4] text-white shadow-lg shadow-blue-100'
                  : 'text-slate-500 hover:bg-[#3C50B4]/5 hover:text-[#3C50B4]'
              }`}
            >
              <item.icon size={18} strokeWidth={active ? 2.4 : 2} />
              <span className="text-[13px] font-bold">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Последние проекты */}
      {recent.length > 0 && (
        <div className="mt-7 min-h-0 flex-1 overflow-y-auto custom-scrollbar">
          <p className="px-2 mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Проекты</p>
          <div className="flex flex-col gap-0.5">
            {recent.map((p) => {
              const active = currentSlug && p.slug === currentSlug;
              return (
                <button
                  key={p.id}
                  onClick={() => onOpenProject?.(p.slug ?? p.id)}
                  title={p.name}
                  className={`group flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors ${
                    active ? 'bg-[#3C50B4]/[0.06]' : 'hover:bg-slate-50'
                  }`}
                >
                  <span className={`shrink-0 h-2 w-2 rounded-full ${STATUS_DOT[p.status] ?? 'bg-slate-300'}`} />
                  <span className={`min-w-0 flex-1 truncate text-[12px] font-semibold ${active ? 'text-[#3C50B4]' : 'text-slate-600 group-hover:text-slate-900'}`}>
                    {p.name}
                  </span>
                  <span className="shrink-0 text-[10px] font-black text-slate-400">{p.progress}%</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Настройки */}
      <button
        onClick={onSettingsClick}
        className={`mt-auto flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-500 hover:bg-[#3C50B4]/5 hover:text-[#3C50B4] transition-colors ${recent.length > 0 ? 'pt-3 border-t border-slate-100' : ''}`}
      >
        <Settings size={18} />
        <span className="text-[13px] font-bold">Настройки</span>
      </button>
    </aside>
  );
}

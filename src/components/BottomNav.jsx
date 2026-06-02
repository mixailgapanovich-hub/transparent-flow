import { LayoutDashboard, FolderOpen, CheckSquare, BookOpen, Settings, ShieldCheck } from 'lucide-react';

const BASE_TABS = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Доска' },
  { id: 'tasks',     icon: CheckSquare,      label: 'Задачи' },
  { id: 'projects',  icon: FolderOpen,       label: 'Проекты' },
  { id: 'kb',        icon: BookOpen,          label: 'База' },
  { id: 'settings',  icon: Settings,         label: 'Настройки', action: 'settings' },
];

export default function BottomNav({ activeTab, onTabChange, onOpenSettings, isAdmin = false }) {
  const TABS = isAdmin
    ? [...BASE_TABS.slice(0, 4), { id: 'management', icon: ShieldCheck, label: 'Упр.' }, BASE_TABS[4]]
    : BASE_TABS;
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-100 safe-bottom"
    >
      <div className="flex h-16">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id && tab.action !== 'settings';
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => tab.action === 'settings' ? onOpenSettings() : onTabChange(tab.id)}
              className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors
                ${isActive ? 'text-[#3C50B4]' : 'text-slate-400'}`}
            >
              <Icon
                size={22}
                strokeWidth={isActive ? 2.5 : 1.8}
                className="transition-all"
              />
              <span className="text-[9px] font-black uppercase tracking-widest leading-none">
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-[#3C50B4] rounded-t-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

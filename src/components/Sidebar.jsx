import React from 'react';
import { Zap, LayoutDashboard, FolderOpen, CheckSquare, BookOpen, Settings, ShieldCheck } from 'lucide-react';

// Добавляем onSettingsClick в деструктуризацию пропсов
export default function Sidebar({ activeTab, setActiveTab, onSettingsClick, isAdmin = false }) {
  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard },
    { id: 'projects', icon: FolderOpen },
    { id: 'tasks', icon: CheckSquare },
    { id: 'kb', icon: BookOpen },
    ...(isAdmin ? [{ id: 'management', icon: ShieldCheck }] : []),
  ];

  return (
    // Убираем fixed, оставляем flex-col и фиксированную ширину
    <aside className="hidden md:flex w-24 h-full flex-col items-center py-10 bg-white border-r border-slate-100 flex-shrink-0">
      <div className="bg-[#3C50B4] p-3 rounded-2xl mb-12 shadow-lg shadow-blue-100">
        <Zap className="text-white" size={28} fill="currentColor" />
      </div>
      
      <nav className="flex flex-col gap-8">
        {menuItems.map(item => (
          <button 
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`p-4 rounded-2xl transition-all duration-300 ${
              activeTab === item.id 
              ? 'bg-[#3C50B4]/5 text-[#3C50B4] shadow-inner' 
              : 'text-slate-300 hover:text-[#3C50B4]'
            }`}
          >
            <item.icon size={24} />
          </button>
        ))}
      </nav>

      {/* ПРИВЯЗЫВАЕМ ОНКЛИК ТУТ */}
      <button 
        onClick={onSettingsClick} 
        className="mt-auto p-4 text-slate-300 hover:text-[#3C50B4] transition-colors"
      >
        <Settings size={24} />
      </button>
    </aside>
  );
}
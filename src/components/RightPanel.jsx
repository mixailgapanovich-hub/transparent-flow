import { Send, Link2, Info } from 'lucide-react';

export default function RightPanel({ onContentRequests, onProjectInfo }) {
  const actions = [
    { id: 'links', icon: Link2, label: 'Ссылки клиенту', color: 'text-[#3C50B4]', onClick: onContentRequests },
    { id: 'tg', icon: Send, label: 'Чат в TG', color: 'text-[#229ED9]', onClick: () => window.open('https://t.me/transparent_flow_bot', '_blank') },
  ];

  return (
    <aside className="hidden md:flex w-20 lg:w-64 border-l border-slate-100 bg-white flex-col p-4 gap-4">
      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 hidden lg:block">Быстрые действия</h4>

      {actions.map((act) => (
        <button
          key={act.id}
          onClick={act.onClick}
          className="flex items-center gap-3 p-3 lg:p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-all group"
        >
          <act.icon size={22} className={`${act.color} group-hover:scale-110 transition-transform`} />
          <span className="text-sm font-bold text-slate-700 hidden lg:block">{act.label}</span>
        </button>
      ))}

      {/* «О проекте» — описание, контакты и доступы текущего проекта (PM правит) */}
      {onProjectInfo && (
        <button
          onClick={onProjectInfo}
          className="mt-auto flex items-center gap-3 rounded-2xl border border-[#3C50B4]/20 bg-[#3C50B4]/5 p-3 lg:p-4 text-left transition-all hover:bg-[#3C50B4]/10 group"
        >
          <Info size={22} className="text-[#3C50B4] group-hover:scale-110 transition-transform shrink-0" />
          <span className="hidden lg:block">
            <span className="block text-sm font-bold text-[#3C50B4]">О проекте</span>
            <span className="block text-[10px] text-[#3C50B4]/60">Доступы, контакты, описание</span>
          </span>
        </button>
      )}
    </aside>
  );
}
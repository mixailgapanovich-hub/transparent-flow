import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

const NOTIFICATIONS = [
  {
    id: 1,
    dot: 'bg-green-400',
    text: 'Клиент загрузил материалы — Согласование фотосессии',
    time: '2 ч назад',
  },
  {
    id: 2,
    dot: 'bg-yellow-400',
    text: 'Дедлайн через 24 часа — Финальный дизайн UI-кита',
    time: '5 ч назад',
  },
  {
    id: 3,
    dot: 'bg-[#3C50B4]',
    text: 'Новая задача назначена — Запуск рекламной кампании',
    time: 'вчера',
  },
  {
    id: 4,
    dot: 'bg-slate-300',
    text: 'Комментарий от клиента — Лендинг для летнего меню',
    time: '2 дня назад',
  },
];

export default function NotificationsDropdown({ onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute top-full right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden"
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <span className="text-[11px] font-black uppercase tracking-widest text-slate-800">
          Уведомления
        </span>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      <ul className="divide-y divide-slate-50">
        {NOTIFICATIONS.map((n) => (
          <li
            key={n.id}
            className="flex items-start gap-3.5 px-5 py-4 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <span className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${n.dot}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-700 leading-snug">{n.text}</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                {n.time}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <div className="px-5 py-3 border-t border-slate-100 text-center">
        <button
          onClick={onClose}
          className="text-[10px] font-black uppercase tracking-widest text-[#3C50B4] hover:opacity-70 transition-opacity"
        >
          Пометить всё как прочитанное
        </button>
      </div>
    </div>
  );
}

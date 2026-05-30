import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

/** useToast() → { show({tone, message, ttl?}) }. */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider/>');
  return ctx;
}

const TONE = {
  success: { icon: CheckCircle, ring: 'ring-emerald-200', accent: 'text-emerald-600', bar: 'bg-emerald-400' },
  error:   { icon: AlertCircle, ring: 'ring-red-200',     accent: 'text-red-600',     bar: 'bg-red-400'   },
  info:    { icon: Info,        ring: 'ring-slate-200',   accent: 'text-[#3C50B4]',   bar: 'bg-[#3C50B4]' },
};

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const counter = useRef(0);

  const dismiss = useCallback((id) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((toast) => {
    const id = ++counter.current;
    const ttl = toast.ttl ?? 4000;
    setItems((prev) => [...prev, { id, tone: toast.tone ?? 'info', message: toast.message }]);
    if (ttl > 0) setTimeout(() => dismiss(id), ttl);
    return id;
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ show, dismiss }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-none fixed bottom-6 right-6 z-[200] flex flex-col gap-2 w-80 max-w-full"
      >
        {items.map((t) => {
          const cfg = TONE[t.tone] ?? TONE.info;
          const Icon = cfg.icon;
          return (
            <div
              key={t.id}
              role="status"
              className={`pointer-events-auto relative flex items-start gap-3 rounded-2xl bg-white shadow-xl ring-1 ${cfg.ring} pl-4 pr-3 py-3 overflow-hidden animate-in slide-in-from-right-5 fade-in duration-300`}
            >
              <span className={`absolute top-0 left-0 h-full w-1 ${cfg.bar}`} />
              <Icon size={18} className={`mt-0.5 shrink-0 ${cfg.accent}`} />
              <div className="flex-1 min-w-0 text-sm leading-snug text-slate-700">
                {t.message}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                className="shrink-0 text-slate-300 hover:text-slate-500 transition-colors"
                aria-label="Закрыть уведомление"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

import { useCallback, useState } from 'react';

const TONES = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  error:   'border-red-200 bg-red-50 text-red-700',
  info:    'border-[#3C50B4]/20 bg-[#3C50B4]/5 text-[#3C50B4]',
};

function Toast({ tone = 'info', message }) {
  return (
    <div
      className={`rounded-xl border px-4 py-2.5 text-xs font-semibold shadow-md
        animate-in slide-in-from-bottom-2 duration-200
        ${TONES[tone] ?? TONES.info}`}
    >
      {message}
    </div>
  );
}

export function useToastState() {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((tone, message) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, tone, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  return { toasts, showToast };
}

export function ToastContainer({ toasts }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-20 md:bottom-5 right-4 md:right-5 z-[100] flex flex-col gap-2 items-end pointer-events-none">
      {toasts.map((t) => (
        <Toast key={t.id} tone={t.tone} message={t.message} />
      ))}
    </div>
  );
}

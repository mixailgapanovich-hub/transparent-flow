import { useEffect, useRef } from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import { UI_BUTTON_STYLES } from '../theme/taskStyles';

/**
 * Стилизованный диалог подтверждения — замена window.confirm().
 *
 * Props:
 *   isOpen      boolean
 *   title       string
 *   message     string | ReactNode — основной текст (можно вложить выделение)
 *   confirmText string (default «Подтвердить»)
 *   cancelText  string (default «Отмена»)
 *   tone        'default' | 'destructive'
 *   onConfirm   () => void
 *   onCancel    () => void
 */
export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Подтвердить',
  cancelText = 'Отмена',
  tone = 'default',
  onConfirm,
  onCancel,
}) {
  const confirmRef = useRef(null);

  // Esc → отмена, фокус на confirm-кнопке при открытии
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel?.();
      } else if (e.key === 'Enter' && document.activeElement === confirmRef.current) {
        // Enter на сфокусированной кнопке уже сработает сам — ничего не делаем
      }
    };
    window.addEventListener('keydown', onKey);
    // Микро-задержка чтобы анимация открытия не перебивала фокус
    const id = setTimeout(() => confirmRef.current?.focus(), 50);
    return () => {
      window.removeEventListener('keydown', onKey);
      clearTimeout(id);
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const isDestructive = tone === 'destructive';
  const Icon = isDestructive ? AlertTriangle : Info;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-7 flex flex-col gap-5 animate-in zoom-in-95 fade-in duration-200"
      >
        <div className="flex items-start gap-4">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0
              ${isDestructive ? 'bg-red-50 text-red-500' : 'bg-[#3C50B4]/10 text-[#3C50B4]'}`}
          >
            <Icon size={22} strokeWidth={2.2} />
          </div>
          <div className="flex-1 min-w-0 pt-1">
            <h3
              id="confirm-dialog-title"
              className="text-base font-black text-slate-900 font-machine leading-tight mb-2"
            >
              {title}
            </h3>
            <div className="text-sm text-slate-500 leading-relaxed font-medium">
              {message}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className={`${UI_BUTTON_STYLES.secondary} px-4 py-2 text-sm font-semibold`}
          >
            {cancelText}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            className={
              isDestructive
                ? 'rounded-xl bg-red-500 text-white px-5 py-2 text-sm font-semibold shadow-lg shadow-red-100 hover:bg-red-600 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300'
                : `${UI_BUTTON_STYLES.primary} px-5 py-2 text-sm font-semibold shadow-lg shadow-blue-100 active:scale-95`
            }
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

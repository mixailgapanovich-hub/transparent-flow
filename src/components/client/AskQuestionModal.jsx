import { useState } from 'react';
import { X, HelpCircle } from 'lucide-react';
import { UI_BUTTON_STYLES } from '../../theme/taskStyles';

export default function AskQuestionModal({ onClose, onSubmit }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    if (!text.trim()) { setError('Введите текст вопроса'); return; }
    setBusy(true); setError(null);
    try {
      await onSubmit(text.trim());
      setSent(true);
      setTimeout(onClose, 1200);
    } catch (err) {
      setError(err.detail || err.message || 'Не удалось отправить');
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/30 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-slate-200 p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="flex items-center gap-2 text-lg font-black text-slate-900">
            <HelpCircle size={18} className="text-[#3C50B4]" /> Задать вопрос
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="Закрыть"><X size={18} /></button>
        </div>

        {sent ? (
          <div className="py-8 text-center text-emerald-600 font-bold">Вопрос отправлен менеджеру!</div>
        ) : (
          <>
            <p className="text-xs text-slate-400 mb-4">Менеджер проекта получит ваш вопрос и ответит в ближайшее время.</p>
            <textarea
              value={text}
              onChange={(e) => { setText(e.target.value); if (error) setError(null); }}
              rows={5}
              placeholder="Ваш вопрос по проекту…"
              className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#3C50B4] focus:ring-2 focus:ring-[#3C50B4]/20"
            />
            {error && <p className="mt-3 text-xs font-semibold text-red-500">{error}</p>}
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={onClose} className={`${UI_BUTTON_STYLES.secondary} px-4 py-2 text-sm font-semibold`}>Отмена</button>
              <button onClick={submit} disabled={busy} className={`${UI_BUTTON_STYLES.primary} px-5 py-2 text-sm font-semibold disabled:opacity-60`}>
                {busy ? 'Отправка…' : 'Отправить'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

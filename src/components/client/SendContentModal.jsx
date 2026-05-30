import { useCallback, useRef, useState } from 'react';
import { X, CloudUpload, FileText, CheckCircle, ChevronLeft } from 'lucide-react';

// Загрузка контента клиентом. Шаг 1 — выбор задачи (из ожидающих материалы),
// шаг 2 — загрузка файлов. initialTaskId позволяет открыть сразу шаг 2.
export default function SendContentModal({ token, tasks, initialTaskId = null, onClose, onUploaded, api }) {
  const waiting = tasks.filter((t) => t.status === 'waiting');
  const [taskId, setTaskId] = useState(initialTaskId);
  const [staged, setStaged] = useState([]);
  const [comment, setComment] = useState('');
  const [state, setState] = useState('idle'); // idle | uploading | success | error
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const selectedTask = tasks.find((t) => t.id === taskId);

  const addFiles = useCallback((incoming) => {
    const list = Array.from(incoming);
    setStaged((prev) => {
      const names = new Set(prev.map((f) => f.name));
      return [...prev, ...list.filter((f) => !names.has(f.name))];
    });
  }, []);

  const submit = async () => {
    if (!taskId || staged.length === 0) return;
    setState('uploading'); setError(null);
    try {
      const updated = await api.client.upload(token, taskId, staged, comment);
      setState('success');
      setTimeout(() => onUploaded(updated), 1000);
    } catch (err) {
      setState('error');
      setError(err.detail || err.message || 'Не удалось отправить файлы');
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/30 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-slate-200 p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="flex items-center gap-2 text-lg font-black text-slate-900">
            {taskId && !initialTaskId && (
              <button onClick={() => setTaskId(null)} className="text-slate-400 hover:text-slate-600" aria-label="Назад"><ChevronLeft size={18} /></button>
            )}
            <CloudUpload size={18} className="text-[#3C50B4]" /> Прислать контент
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="Закрыть"><X size={18} /></button>
        </div>

        {state === 'success' ? (
          <div className="flex flex-col items-center gap-3 py-10 text-emerald-600">
            <CheckCircle size={48} strokeWidth={1.5} />
            <p className="font-black text-lg">Материалы отправлены!</p>
          </div>
        ) : !taskId ? (
          <>
            <p className="text-xs text-slate-400 mb-4">Выберите задачу, по которой хотите загрузить материалы.</p>
            {waiting.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400">
                Сейчас нет задач, ожидающих материалы.
              </div>
            ) : (
              <ul className="space-y-2">
                {waiting.map((t) => (
                  <li key={t.id}>
                    <button
                      onClick={() => setTaskId(t.id)}
                      className="w-full text-left rounded-xl border border-slate-200 px-4 py-3 hover:border-[#3C50B4] hover:bg-[#3C50B4]/5 transition-colors"
                    >
                      <p className="text-sm font-semibold text-slate-800">{t.title}</p>
                      <p className="text-[11px] text-orange-600 font-bold uppercase tracking-wide mt-0.5">Ждём материалы</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <>
            {selectedTask && <p className="text-sm font-semibold text-slate-700 mb-3">{selectedTask.title}</p>}
            <div
              onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => inputRef.current?.click()}
              className={`relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 cursor-pointer transition-all ${
                dragOver ? 'border-[#3C50B4] bg-[#3C50B4]/5' : 'border-slate-200 hover:border-[#3C50B4]/40 hover:bg-slate-50'
              }`}
            >
              <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
              <CloudUpload size={32} strokeWidth={1.5} className={dragOver ? 'text-[#3C50B4]' : 'text-slate-300'} />
              <p className="text-sm font-bold text-slate-600">Перетащите файлы или <span className="text-[#3C50B4]">выберите</span></p>
            </div>

            {staged.length > 0 && (
              <ul className="mt-4 space-y-2">
                {staged.map((f) => (
                  <li key={f.name} className="flex items-center gap-3 px-3 py-2 bg-slate-50 rounded-lg text-sm">
                    <FileText size={16} className="text-slate-400 shrink-0" />
                    <span className="flex-1 truncate text-slate-700 font-medium">{f.name}</span>
                    <span className="text-xs text-slate-400 shrink-0">{(f.size / (1024 * 1024)).toFixed(1)} MB</span>
                    <button onClick={(e) => { e.stopPropagation(); setStaged((p) => p.filter((x) => x.name !== f.name)); }} className="text-slate-300 hover:text-red-400"><X size={14} /></button>
                  </li>
                ))}
              </ul>
            )}

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              placeholder="Комментарий (необязательно)…"
              className="mt-4 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#3C50B4] focus:ring-2 focus:ring-[#3C50B4]/20"
            />

            {error && <div className="mt-3 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-red-600 text-xs font-bold">{error}</div>}

            <button
              onClick={submit}
              disabled={staged.length === 0 || state === 'uploading'}
              className="mt-4 w-full py-3 rounded-xl bg-[#3C50B4] text-white font-black text-sm transition hover:brightness-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {state === 'uploading' ? 'Загружаем…' : 'Отправить материалы'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

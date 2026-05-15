import { useCallback, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle, CloudUpload, FileText, X } from 'lucide-react';
import { PROJECT_BADGE_STYLES } from '../theme/taskStyles';

function DeadlineBadge({ deadline }) {
  if (!deadline) return null;
  const now = Date.now();
  const diff = new Date(deadline).getTime() - now;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor(diff / (1000 * 60 * 60));

  let label, colorClass;
  if (diff < 0) {
    label = 'Дедлайн истёк';
    colorClass = 'bg-red-100 text-red-700 border-red-200';
  } else if (hours < 24) {
    label = `Осталось ${hours} ч`;
    colorClass = 'bg-orange-100 text-orange-700 border-orange-200';
  } else {
    label = `До дедлайна ${days} дн.`;
    colorClass = 'bg-emerald-100 text-emerald-700 border-emerald-200';
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${colorClass}`}>
      {label}
    </span>
  );
}

export default function GuestUploadPage({ task, onClose, onUploaded }) {
  const [stagedFiles, setStagedFiles] = useState([]);
  const [comment, setComment] = useState('');
  const [uploadState, setUploadState] = useState('idle'); // idle | uploading | success
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const addFiles = useCallback((incoming) => {
    const list = Array.from(incoming);
    setStagedFiles((prev) => {
      const existingNames = new Set(prev.map((f) => f.name));
      return [...prev, ...list.filter((f) => !existingNames.has(f.name))];
    });
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setIsDragOver(false);
      addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const removeFile = (name) => setStagedFiles((prev) => prev.filter((f) => f.name !== name));

  const handleSubmit = () => {
    if (stagedFiles.length === 0 && !comment.trim()) return;
    setUploadState('uploading');
    setTimeout(() => {
      setUploadState('success');
      setTimeout(() => {
        onUploaded(stagedFiles, comment);
      }, 1200);
    }, 1500);
  };

  const badge = task?.projectId ? PROJECT_BADGE_STYLES[task.projectId] : null;
  const deadlineLabel = task?.deadline
    ? new Date(task.deadline).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
    : null;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-montserrat text-slate-800">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 px-4 sm:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#FFD700] flex items-center justify-center font-black text-[#3C50B4] text-sm">
            А
          </div>
          <span className="font-black text-[#3C50B4] text-sm tracking-tight uppercase">АденаДиджитал</span>
        </div>
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-slate-400 hover:text-[#3C50B4] text-sm font-bold transition-colors"
        >
          <ArrowLeft size={16} />
          Вернуться
        </button>
      </header>

      <main className="flex-1 w-full max-w-xl mx-auto px-4 py-8 flex flex-col gap-6">
        {/* Info block */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              {badge && (
                <div className="flex items-center gap-1.5 mb-2">
                  <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
                  <span className={`text-xs font-bold ${badge.text}`}>{badge.label}</span>
                </div>
              )}
              <h1 className="text-lg font-black text-slate-900 leading-snug">
                {task?.title ?? 'Задача не найдена'}
              </h1>
            </div>
            <DeadlineBadge deadline={task?.deadline} />
          </div>
          {task?.description && (
            <p className="text-sm text-slate-500 leading-relaxed">{task.description}</p>
          )}
          {deadlineLabel && (
            <p className="mt-3 text-xs text-slate-400">
              Дедлайн: <span className="font-bold text-slate-600">{deadlineLabel}</span>
            </p>
          )}
        </div>

        {/* Upload zone */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
          <h2 className="text-sm font-black text-slate-700 mb-4 uppercase tracking-wide">
            Загрузить материалы
          </h2>

          {uploadState === 'success' ? (
            <div className="flex flex-col items-center gap-3 py-8 text-emerald-600">
              <CheckCircle size={48} strokeWidth={1.5} />
              <p className="font-black text-lg">Материалы отправлены!</p>
              <p className="text-sm text-slate-400">Менеджер свяжется с вами в ближайшее время.</p>
            </div>
          ) : uploadState === 'uploading' ? (
            <div className="flex flex-col items-center gap-3 py-8 text-[#3C50B4]">
              <div className="w-12 h-12 rounded-full border-4 border-[#3C50B4]/20 border-t-[#3C50B4] animate-spin" />
              <p className="font-bold text-sm text-slate-600">Загружаем файлы…</p>
            </div>
          ) : (
            <>
              {/* Dropzone */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 cursor-pointer transition-all ${
                  isDragOver
                    ? 'border-[#3C50B4] bg-[#3C50B4]/5'
                    : 'border-slate-200 hover:border-[#3C50B4]/40 hover:bg-slate-50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => addFiles(e.target.files)}
                />
                <CloudUpload
                  size={36}
                  strokeWidth={1.5}
                  className={isDragOver ? 'text-[#3C50B4]' : 'text-slate-300'}
                />
                <div className="text-center">
                  <p className="text-sm font-bold text-slate-600">
                    Перетащите файлы или{' '}
                    <span className="text-[#3C50B4]">выберите с устройства</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-1">Фото, видео, документы — любые форматы</p>
                </div>
              </div>

              {/* Staged files list */}
              {stagedFiles.length > 0 && (
                <ul className="mt-4 space-y-2">
                  {stagedFiles.map((f) => (
                    <li
                      key={f.name}
                      className="flex items-center gap-3 px-3 py-2 bg-slate-50 rounded-lg text-sm"
                    >
                      <FileText size={16} className="text-slate-400 shrink-0" />
                      <span className="flex-1 truncate text-slate-700 font-medium">{f.name}</span>
                      <span className="text-xs text-slate-400 shrink-0">
                        {(f.size / (1024 * 1024)).toFixed(1)} MB
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeFile(f.name); }}
                        className="text-slate-300 hover:text-red-400 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {/* Comment */}
              <div className="mt-5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                  Комментарий (необязательно)
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Уточните детали или сообщите о сроках…"
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 placeholder-slate-300 resize-none focus:outline-none focus:ring-2 focus:ring-[#3C50B4]/20 transition"
                />
              </div>

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={stagedFiles.length === 0 && !comment.trim()}
                className="mt-4 w-full py-3 rounded-xl bg-[#3C50B4] text-white font-black text-sm tracking-wide transition hover:brightness-95 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Отправить материалы
              </button>
            </>
          )}
        </div>

        <p className="text-center text-xs text-slate-400">
          Защищённая страница · АденаДиджитал
        </p>
      </main>

      <style>{`
        .font-montserrat { font-family: 'Montserrat', sans-serif; }
      `}</style>
    </div>
  );
}

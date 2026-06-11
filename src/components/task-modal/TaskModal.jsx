import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, Check, ChevronLeft, CloudUpload, Download, FileUp, Link2, Loader2, MessageCircle, Quote, Send, ShieldCheck, Tag, Trash2, Undo2, Users, X } from 'lucide-react';
import { COLUMNS } from '../../data/mockData';
import { TASK_STATUS_BADGE, TASK_TAG_BADGE, TASK_STATUS_LABEL, UI_BUTTON_STYLES } from '../../theme/taskStyles';
import { getAllowedStatuses } from '../../utils/taskWorkflow';
import AnchoredDescription from './AnchoredDescription';

const TAG_OPTIONS = ['Блокирующая', 'Ключевая', 'Обычная'];

function normalizeDeadline(deadline) {
  if (!deadline) return '';
  const parsed = new Date(deadline);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 10);
}

function formatHistoryDate(date) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Команда теперь приходит как prop из App.jsx (загружается с /api/users).
// Если prop пустой (например, во время первичной загрузки), выпадашка
// просто покажет «нет доступных кандидатов».

function formatCommentDate(date) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function SectionTitle({ icon: Icon, title, subtitle }) {
  return (
    <div className="mb-3">
      <div className="flex items-center gap-2">
        {Icon ? <Icon size={14} className="text-slate-500" /> : null}
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">{title}</h3>
      </div>
      {subtitle ? <p className="mt-1 text-xs text-slate-400">{subtitle}</p> : null}
    </div>
  );
}

function Toast({ tone = 'success', message }) {
  const tones = {
    success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    error: 'border-red-200 bg-red-50 text-red-700',
    info: 'border-blue-200 bg-blue-50 text-blue-700',
  };
  return <div className={`rounded-xl border px-3 py-2 text-xs font-semibold ${tones[tone]}`}>{message}</div>;
}

const APPROVAL_STATUS = {
  pending:           { label: 'Ждёт клиента', cls: 'bg-indigo-100 text-indigo-700' },
  approved:          { label: 'Одобрено',     cls: 'bg-emerald-100 text-emerald-700' },
  changes_requested: { label: 'На доработку', cls: 'bg-amber-100 text-amber-700' },
  withdrawn:         { label: 'Отозвано',     cls: 'bg-slate-100 text-slate-500' },
};

// Карточка одного раунда согласования (используется на стороне PM и в клиентской панели).
function ApprovalRoundCard({ round, fileHref }) {
  const meta = APPROVAL_STATUS[round.status] ?? APPROVAL_STATUS.pending;
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-slate-600">Раунд {round.round}</span>
        <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${meta.cls}`}>{meta.label}</span>
      </div>
      {round.message ? <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{round.message}</p> : null}
      {round.link ? (
        <a href={round.link} target="_blank" rel="noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#3C50B4] hover:underline">
          <Link2 size={12} /> Открыть результат
        </a>
      ) : null}
      {(round.files ?? []).length > 0 && (
        <div className="mt-2 space-y-1">
          {round.files.map((f) => (
            <a key={f.id} href={fileHref(f.id)} download
              className="flex items-center justify-between rounded-lg border border-slate-100 bg-white px-3 py-2 text-xs text-slate-700 transition hover:border-[#3C50B4]/40">
              <span className="flex items-center gap-1.5 truncate"><Download size={12} className="shrink-0" /> {f.name}</span>
              <span className="shrink-0 text-slate-400">{f.size}</span>
            </a>
          ))}
        </div>
      )}
      {round.status === 'changes_requested' && round.decisionComment ? (
        <p className="mt-2 flex items-start gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-[12px] text-amber-800">
          <Quote size={12} className="mt-0.5 shrink-0" /> {round.decisionComment}
        </p>
      ) : null}
    </div>
  );
}

export default function TaskModal({ task, team = [], botUsername = null, onClose, onSave, onRequestClient, onRequestTelegramLink, onSendComment, onAddAssignee, onAcceptContent, onOpenGuestView, isAdmin = false, isSaving = false, canDelete = false, onDelete, clientMode = false, onClientUpload, onSubmitForReview, onCancelReview, onUploadFiles, onApproveReview, onRequestChanges, clientToken = null, initialReviewOpen = false }) {
  const initialDraft = {
    title: task?.title ?? '',
    description: task?.description ?? '',
    status: task?.status ?? 'backlog',
    deadline: normalizeDeadline(task?.deadline),
    tag: task?.tag ?? 'Обычная',
    isInternal: task?.isInternal ?? false,
    weight: task?.weight ?? '', // '' = вес не задан
  };

  const [draft, setDraft] = useState({
    ...initialDraft,
  });
  const [titleError, setTitleError] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [commentDraft, setCommentDraft] = useState('');
  const [activeAnchor, setActiveAnchor] = useState(null); // {start,end,quote} для анкорного комментария
  const commentInputRef = useRef(null);
  const [isRequestLoading, setIsRequestLoading] = useState(false);
  const [telegramLinkData, setTelegramLinkData] = useState(null);
  const [telegramLinkBusy, setTelegramLinkBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const commentsRef = useRef(null);

  // Цикл согласования (PM-сторона): форма отправки на согласование.
  const [reviewFormOpen, setReviewFormOpen] = useState(initialReviewOpen);
  const [reviewMsg, setReviewMsg] = useState('');
  const [reviewLink, setReviewLink] = useState('');
  const [reviewFiles, setReviewFiles] = useState([]);
  const [reviewBusy, setReviewBusy] = useState(false);
  const fileInputRef = useRef(null);
  // Клиентская сторона: форма «вернуть на доработку».
  const [changesOpen, setChangesOpen] = useState(false);
  const [changesComment, setChangesComment] = useState('');
  const [decisionBusy, setDecisionBusy] = useState(false);

  // Ссылка на скачивание файла: клиент — по проектному токену, PM — по id задачи.
  const fileHref = (fileId) =>
    clientMode
      ? `/api/client/${clientToken}/files/${fileId}/download`
      : `/api/tasks/${task?.id}/files/${fileId}/download`;

  const requestClose = () => {
    if (!isDirty || window.confirm('Есть несохранённые изменения. Закрыть без сохранения?')) {
      onClose();
    }
  };

  useEffect(() => {
    const frame = requestAnimationFrame(() => setIsOpen(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!task) return undefined;

    const handleEsc = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        requestClose();
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  });

  const isDirty =
    !!task &&
    (draft.title !== (task.title ?? '') ||
      draft.description !== (task.description ?? '') ||
      draft.status !== (task.status ?? 'backlog') ||
      draft.deadline !== normalizeDeadline(task.deadline) ||
      draft.tag !== (task.tag ?? 'Обычная') ||
      draft.isInternal !== (task.isInternal ?? false) ||
      (draft.weight === '' ? null : draft.weight) !== (task.weight ?? null));

  const allowedStatuses = useMemo(
    () => getAllowedStatuses(task?.status ?? 'backlog', { isAdmin }),
    [task?.status, isAdmin]
  );
  const availableAssignees = team.filter(
    (candidate) => !(task?.assignees ?? []).some((item) => item.id === candidate.id)
  );

  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!onDelete || isDeleting) return;
    const title = task?.title?.trim() || 'эту задачу';
    if (!window.confirm(`Удалить «${title}»? Это действие необратимо.`)) return;
    setIsDeleting(true);
    try {
      await onDelete();
      // Удаление само закрывает модалку в App.jsx — здесь ничего не делаем
    } catch {
      setIsDeleting(false);
    }
  };

  const handleSave = () => {
    if (!draft.title.trim()) {
      setTitleError('Заголовок обязателен.');
      return;
    }

    onSave({
      title: draft.title.trim(),
      description: draft.description.trim(),
      status: draft.status,
      deadline: draft.deadline,
      tag: draft.tag,
      isImportant: draft.tag === 'Ключевая',
      isInternal: draft.isInternal,
      weight: draft.weight === '' ? null : draft.weight,
    });
  };

  const handleSendComment = () => {
    if (!commentDraft.trim()) return;
    // 2-й аргумент (anchor) игнорируется PM-обработчиком, используется в clientMode.
    onSendComment?.(commentDraft.trim(), activeAnchor ?? null);
    setCommentDraft('');
    setActiveAnchor(null);
  };

  const startAnchoredComment = (anchor) => {
    setActiveAnchor(anchor);
    requestAnimationFrame(() => commentInputRef.current?.focus());
  };

  const handleRequestClient = async () => {
    setIsRequestLoading(true);
    try {
      await onRequestClient?.();
      setToast({ tone: 'success', message: 'Уведомление отправлено' });
      setDraft((prev) => ({ ...prev, status: 'waiting' }));
      setTimeout(() => setToast(null), 2400);
    } catch {
      setToast({ tone: 'error', message: 'Не удалось отправить уведомление' });
    } finally {
      setIsRequestLoading(false);
    }
  };

  useEffect(() => {
    if (!commentsRef.current) return;
    commentsRef.current.scrollTop = commentsRef.current.scrollHeight;
  }, [task?.comments]);

  const handleSubmitReview = async () => {
    if (!onSubmitForReview) return;
    setReviewBusy(true);
    try {
      await onSubmitForReview({ message: reviewMsg.trim(), link: reviewLink.trim(), files: reviewFiles });
      setReviewFormOpen(false);
      setReviewMsg(''); setReviewLink(''); setReviewFiles([]);
      setDraft((prev) => ({ ...prev, status: 'review' }));
      setToast({ tone: 'success', message: 'Отправлено клиенту на согласование' });
      setTimeout(() => setToast(null), 2400);
    } catch {
      setToast({ tone: 'error', message: 'Не удалось отправить на согласование' });
    } finally {
      setReviewBusy(false);
    }
  };

  const handleCancelReview = async () => {
    if (!onCancelReview) return;
    setReviewBusy(true);
    try {
      await onCancelReview();
      setDraft((prev) => ({ ...prev, status: 'in-progress' }));
      setToast({ tone: 'info', message: 'Снято с согласования' });
      setTimeout(() => setToast(null), 2400);
    } catch {
      setToast({ tone: 'error', message: 'Не удалось отозвать' });
    } finally {
      setReviewBusy(false);
    }
  };

  const handlePmFilePick = async (event) => {
    const picked = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (picked.length === 0 || !onUploadFiles) return;
    try {
      await onUploadFiles(picked);
      setToast({ tone: 'success', message: 'Файлы загружены' });
      setTimeout(() => setToast(null), 2400);
    } catch {
      setToast({ tone: 'error', message: 'Не удалось загрузить файлы' });
    }
  };

  const handleApprove = async () => {
    if (!onApproveReview) return;
    setDecisionBusy(true);
    try {
      await onApproveReview();
    } catch {
      setDecisionBusy(false);
    }
  };

  const handleRequestChanges = async () => {
    if (!onRequestChanges || !changesComment.trim()) return;
    setDecisionBusy(true);
    try {
      await onRequestChanges(changesComment.trim());
      setChangesOpen(false);
      setChangesComment('');
    } catch {
      setDecisionBusy(false);
    }
  };

  const handleRequestTelegramLink = async () => {
    if (!onRequestTelegramLink) return;
    setTelegramLinkBusy(true);
    try {
      const data = await onRequestTelegramLink();
      setTelegramLinkData(data);
      if (data?.link) {
        try {
          await navigator.clipboard.writeText(data.link);
          setToast({ tone: 'info', message: 'Telegram-ссылка скопирована' });
        } catch {
          setToast({ tone: 'info', message: 'Ссылка сгенерирована — скопируйте вручную' });
        }
        setTimeout(() => setToast(null), 2400);
      }
    } catch {
      setToast({ tone: 'error', message: 'Не удалось сгенерировать ссылку' });
      setTimeout(() => setToast(null), 2400);
    } finally {
      setTelegramLinkBusy(false);
    }
  };

  if (!task) return null;

  const statusBadgeClass = TASK_STATUS_BADGE[draft.status] ?? TASK_STATUS_BADGE.backlog;
  const tagBadgeClass = TASK_TAG_BADGE[draft.tag] ?? TASK_TAG_BADGE.Обычная;

  // ──────────────────────────────────────────────────────────────────────────
  // Клиентский режим: read-only детали + комментарии (в т.ч. на выделение).
  // ──────────────────────────────────────────────────────────────────────────
  if (clientMode) {
    const anchoredComments = (task.comments ?? []).filter((c) => c.anchor);
    return (
      <div
        className={`fixed inset-0 z-[60] transition-opacity duration-200
          md:flex md:items-center md:justify-center md:bg-slate-900/30 md:p-4
          ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
        aria-hidden="true"
      >
        <div
          role="dialog"
          aria-modal="true"
          className={`flex flex-col bg-white w-full h-full
            md:max-h-[90vh] md:max-w-3xl md:rounded-3xl md:border md:border-slate-200 md:shadow-2xl md:h-auto
            transition-all duration-200 ${isOpen ? 'opacity-100 translate-y-0 md:scale-100' : 'opacity-0 translate-y-4 md:scale-95'}`}
          onClick={(event) => event.stopPropagation()}
        >
          <header className="flex items-center border-b border-slate-100 px-4 md:px-6 py-3 md:py-4 gap-3 shrink-0">
            <button type="button" onClick={onClose} className="md:hidden p-1 -ml-1 text-slate-400" aria-label="Назад">
              <ChevronLeft size={22} />
            </button>
            <span className={`rounded-md px-2 py-1 text-xs font-bold ${statusBadgeClass}`}>
              {TASK_STATUS_LABEL[task.status]}
            </span>
            <span className={`rounded-md px-2 py-1 text-xs font-bold ${tagBadgeClass}`}>{task.tag}</span>
            <div className="flex-1" />
            <button type="button" onClick={onClose} className={`hidden md:flex p-2 ${UI_BUTTON_STYLES.ghost}`} aria-label="Закрыть">
              <X size={18} />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto p-4 md:p-6 min-h-0">
            <h2 className="text-lg font-black text-slate-900 leading-snug mb-4">{task.title}</h2>

            {/* Сводка: дедлайн, приоритет, ответственные — только для информации */}
            <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3">
                <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                  <CalendarDays size={13} /> Дедлайн
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-700">
                  {task.deadline
                    ? new Date(task.deadline).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
                    : 'Не задан'}
                </p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3">
                <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                  <Tag size={13} /> Приоритет
                </p>
                <span className={`mt-1 inline-block rounded-md px-2 py-1 text-xs font-bold ${tagBadgeClass}`}>{task.tag}</span>
              </div>
            </div>

            <div className="mb-6">
              <SectionTitle icon={Users} title="Ответственные" subtitle="К ним можно обратиться по этой задаче" />
              {(task.assignees ?? []).length === 0 ? (
                <p className="mt-2 rounded-xl border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-400">
                  Исполнитель пока не назначен.
                </p>
              ) : (
                <div className="mt-2 space-y-2">
                  {task.assignees.map((a) => (
                    <div key={a.id} className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FFD700] text-[11px] font-black text-[#3C50B4] shrink-0">
                        {a.initials}
                      </div>
                      <span className="text-sm font-semibold text-slate-700">{a.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <SectionTitle title="Описание" subtitle="Выделите текст, чтобы оставить комментарий" />
            <div className="mt-2 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
              <AnchoredDescription
                text={task.description}
                anchoredComments={anchoredComments}
                onStartComment={startAnchoredComment}
                onFocusComment={() => commentInputRef.current?.focus()}
              />
            </div>

            {/* Панель согласования — клиент одобряет или возвращает на доработку */}
            {task.currentApproval && task.status === 'review' && (
              <div className="mt-6 rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-indigo-600" />
                  <h3 className="text-sm font-black text-indigo-800">Требуется ваше согласование</h3>
                </div>
                {task.currentApproval.message ? (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{task.currentApproval.message}</p>
                ) : null}
                {task.currentApproval.link ? (
                  <a href={task.currentApproval.link} target="_blank" rel="noreferrer"
                    className={`mt-3 inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold ${UI_BUTTON_STYLES.secondary}`}>
                    <Link2 size={13} /> Открыть результат
                  </a>
                ) : null}
                {(task.currentApproval.files ?? []).length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {task.currentApproval.files.map((f) => (
                      <a key={f.id} href={fileHref(f.id)} download
                        className="flex items-center justify-between rounded-lg border border-indigo-100 bg-white px-3 py-2 text-xs text-slate-700 transition hover:border-indigo-300">
                        <span className="flex items-center gap-1.5 truncate"><Download size={12} className="shrink-0" /> {f.name}</span>
                        <span className="shrink-0 text-slate-400">{f.size}</span>
                      </a>
                    ))}
                  </div>
                )}

                {changesOpen ? (
                  <div className="mt-3">
                    <textarea
                      value={changesComment}
                      onChange={(e) => setChangesComment(e.target.value)}
                      rows={3}
                      placeholder="Опишите, что нужно поправить…"
                      className="w-full resize-y rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-[#3C50B4] focus:ring-2 focus:ring-[#3C50B4]/20"
                    />
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button type="button" disabled={!changesComment.trim() || decisionBusy} onClick={handleRequestChanges}
                        className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-amber-600 disabled:opacity-50">
                        <Undo2 size={15} /> Отправить на доработку
                      </button>
                      <button type="button" onClick={() => { setChangesOpen(false); setChangesComment(''); }}
                        className={`${UI_BUTTON_STYLES.secondary} px-4 py-2 text-sm font-semibold`}>
                        Отмена
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" disabled={decisionBusy} onClick={handleApprove}
                      className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50">
                      <Check size={15} /> Одобрить результат
                    </button>
                    <button type="button" disabled={decisionBusy} onClick={() => setChangesOpen(true)}
                      className="flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-700 transition hover:bg-amber-100 disabled:opacity-50">
                      <Undo2 size={15} /> Вернуть на доработку
                    </button>
                  </div>
                )}
              </div>
            )}

            {(task.files ?? []).length > 0 && (
              <div className="mt-6">
                <SectionTitle title="Файлы" />
                <div className="mt-2 space-y-2">
                  {task.files.map((file) => (
                    <a key={file.id} href={fileHref(file.id)} download
                      className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3 transition hover:border-[#3C50B4]/40">
                      <p className="flex items-center gap-1.5 truncate text-sm text-slate-700"><Download size={13} className="shrink-0 text-slate-400" /> {file.name}</p>
                      <p className="shrink-0 text-xs text-slate-400">{file.size}</p>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {task.status === 'waiting' && onClientUpload && (
              <button
                type="button"
                onClick={() => onClientUpload(task.id)}
                className={`mt-5 w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold ${UI_BUTTON_STYLES.primary}`}
              >
                <CloudUpload size={16} /> Прислать материалы по этой задаче
              </button>
            )}

            <div className="mt-6">
              <SectionTitle icon={MessageCircle} title="Комментарии" />
              <div ref={commentsRef} className="mt-2 max-h-56 space-y-2 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50 p-3">
                {(task.comments ?? []).length === 0 ? (
                  <p className="text-sm text-slate-400">Пока нет сообщений.</p>
                ) : (
                  (task.comments ?? []).map((comment) => (
                    <div
                      key={comment.id}
                      className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                        comment.author === 'client'
                          ? 'ml-auto bg-[#3C50B4] text-white'
                          : 'mr-auto bg-white text-slate-700 border border-slate-200'
                      }`}
                    >
                      <p className={`text-[11px] font-semibold ${comment.author === 'client' ? 'text-blue-100' : 'text-slate-500'}`}>
                        {comment.name} · {formatCommentDate(comment.at)}
                      </p>
                      {comment.anchor?.quote && (
                        <p className={`mt-1 flex items-start gap-1 text-[11px] italic ${comment.author === 'client' ? 'text-blue-100/90' : 'text-slate-400'}`}>
                          <Quote size={11} className="mt-0.5 shrink-0" />
                          <span className="line-clamp-2">{comment.anchor.quote}</span>
                        </p>
                      )}
                      <p className="mt-1">{comment.message}</p>
                    </div>
                  ))
                )}
              </div>

              {activeAnchor && (
                <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  <Quote size={13} className="mt-0.5 shrink-0" />
                  <span className="flex-1 italic line-clamp-2">«{activeAnchor.quote}»</span>
                  <button type="button" onClick={() => setActiveAnchor(null)} className="text-amber-500 hover:text-amber-700" aria-label="Убрать выделение">
                    <X size={13} />
                  </button>
                </div>
              )}

              <div className="mt-3 flex items-center gap-2">
                <input
                  ref={commentInputRef}
                  value={commentDraft}
                  onChange={(event) => setCommentDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') { event.preventDefault(); handleSendComment(); }
                  }}
                  placeholder={activeAnchor ? 'Комментарий к выделенному тексту…' : 'Написать комментарий…'}
                  className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-[#3C50B4] focus:ring-2 focus:ring-[#3C50B4]/20"
                />
                <button
                  type="button"
                  onClick={handleSendComment}
                  className={`${UI_BUTTON_STYLES.primary} p-2.5`}
                  aria-label="Отправить комментарий"
                >
                  <Send size={15} />
                </button>
              </div>
            </div>

            {(task.history ?? []).length > 0 && (
              <div className="mt-6">
                <SectionTitle title="История" subtitle="Что происходило по задаче" />
                <div className="mt-2 space-y-2">
                  {task.history.map((entry, index) => (
                    <div key={`${entry.date}-${index}`} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                      <p className="text-xs font-semibold text-slate-500">{formatHistoryDate(entry.date)}</p>
                      <p className="mt-1 text-sm text-slate-700">{entry.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    /* Backdrop: на десктопе — затемнение + центрирование; на мобилке — прозрачный */
    <div
      className={`fixed inset-0 z-[60] transition-opacity duration-200
        md:flex md:items-center md:justify-center md:bg-slate-900/30 md:p-4
        ${isOpen ? 'opacity-100' : 'opacity-0'}`}
      onClick={requestClose}
      aria-hidden="true"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-modal-title"
        className={`flex flex-col bg-white
          w-full h-full
          md:max-h-[90vh] md:max-w-6xl md:rounded-3xl md:border md:border-slate-200 md:shadow-2xl md:h-auto
          transition-all duration-200
          ${isOpen ? 'opacity-100 translate-y-0 md:scale-100' : 'opacity-0 translate-y-4 md:scale-95'}`}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center border-b border-slate-100 px-4 md:px-6 py-3 md:py-4 gap-3 shrink-0">
          {/* Кнопка назад — только на мобилке */}
          <button
            type="button"
            onClick={requestClose}
            className="md:hidden p-1 -ml-1 text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Назад"
          >
            <ChevronLeft size={22} />
          </button>

          {/* Бейджи статуса и приоритета */}
          <div className="flex items-center gap-2 flex-1 flex-wrap">
            <span className={`rounded-md px-2 py-1 text-xs font-bold ${statusBadgeClass}`}>
              {TASK_STATUS_LABEL[draft.status]}
            </span>
            <span className={`rounded-md px-2 py-1 text-xs font-bold ${tagBadgeClass}`}>
              {draft.tag}
            </span>
          </div>

          {/* Кнопка закрыть — только на десктопе */}
          <button
            type="button"
            onClick={requestClose}
            className={`hidden md:flex p-2 ${UI_BUTTON_STYLES.ghost}`}
            aria-label="Закрыть модальное окно"
          >
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 grid grid-cols-1 md:grid-cols-10 overflow-y-auto min-h-0">
          <section className="md:col-span-7 md:border-r border-slate-100 p-4 md:p-6">
            <SectionTitle title="Основные поля" subtitle="Редактируйте задачу без перехода на отдельный экран" />
            <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500">Заголовок</label>
            <input
              id="task-modal-title"
              value={draft.title}
              onChange={(event) => {
                setDraft((prev) => ({ ...prev, title: event.target.value }));
                if (titleError) setTitleError('');
              }}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-[#3C50B4] focus:ring-2 focus:ring-[#3C50B4]/20"
              placeholder="Название задачи"
            />
            {titleError ? <p className="mt-2 text-xs font-semibold text-red-500">{titleError}</p> : null}

            <label className="mb-2 mt-6 block text-xs font-bold uppercase tracking-widest text-slate-500">Описание</label>
            <textarea
              value={draft.description}
              onChange={(event) => setDraft((prev) => ({ ...prev, description: event.target.value }))}
              rows={5}
              className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#3C50B4] focus:ring-2 focus:ring-[#3C50B4]/20"
              placeholder="Опишите задачу..."
            />

            <div className="mt-8">
              <SectionTitle icon={MessageCircle} title="Коммуникация" subtitle="Комментарии внутри задачи" />
              <div ref={commentsRef} className="mt-3 max-h-44 space-y-2 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50 p-3">
                {(task.comments ?? []).length === 0 ? (
                  <p className="text-sm text-slate-400">Пока нет сообщений.</p>
                ) : (
                  (task.comments ?? []).map((comment) => (
                    <div
                      key={comment.id}
                      className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                        comment.author === 'pm'
                          ? 'ml-auto bg-[#3C50B4] text-white'
                          : 'mr-auto bg-white text-slate-700 border border-slate-200'
                      }`}
                    >
                      <p className={`text-[11px] font-semibold ${comment.author === 'pm' ? 'text-blue-100' : 'text-slate-500'}`}>
                        {comment.name} · {formatCommentDate(comment.at)}
                      </p>
                      <p className="mt-1">{comment.message}</p>
                    </div>
                  ))
                )}
              </div>
              {draft.status === 'client-uploaded' && (
                <div className="mt-3 rounded-xl border border-teal-200 bg-teal-50 px-3 py-3 text-xs font-semibold text-teal-700">
                  <p>Клиент загрузил материалы. Примите их — задача вернётся в работу, дальше можно доработать или отправить на согласование.</p>
                  <button
                    type="button"
                    onClick={() => onAcceptContent?.()}
                    className="mt-2 w-full rounded-lg bg-teal-600 px-3 py-2 text-xs font-bold uppercase tracking-wide text-white transition hover:bg-teal-700"
                  >
                    Принять материалы (в работу)
                  </button>
                </div>
              )}
              <div className="mt-3 flex items-center gap-2">
                <input
                  value={commentDraft}
                  disabled={draft.status === 'waiting'}
                  onChange={(event) => setCommentDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      handleSendComment();
                    }
                  }}
                  placeholder={
                    draft.status === 'waiting'
                      ? 'Ожидаем материалы от клиента'
                      : draft.status === 'client-uploaded'
                      ? 'Подтвердите получение или задайте вопрос...'
                      : 'Написать комментарий...'
                  }
                  className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-[#3C50B4] focus:ring-2 focus:ring-[#3C50B4]/20 disabled:bg-slate-100 disabled:text-slate-400"
                />
                <button
                  type="button"
                  disabled={draft.status === 'waiting'}
                  onClick={handleSendComment}
                  className={`${UI_BUTTON_STYLES.primary} p-2.5 disabled:bg-slate-300`}
                  aria-label="Отправить комментарий"
                >
                  <Send size={15} />
                </button>
              </div>
            </div>

            {/* Согласование с клиентом — отправка результата + история раундов */}
            <div className="mt-8">
              <SectionTitle icon={ShieldCheck} title="Согласование с клиентом" subtitle="Клиент одобрит результат или вернёт на доработку" />

              {(draft.status === 'in-progress' || draft.status === 'client-uploaded') && (
                reviewFormOpen ? (
                  <div className="mt-3 space-y-2 rounded-xl border border-indigo-200 bg-indigo-50/60 p-3">
                    <textarea
                      value={reviewMsg}
                      onChange={(e) => setReviewMsg(e.target.value)}
                      rows={3}
                      placeholder="Что отправляем на согласование…"
                      className="w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-[#3C50B4] focus:ring-2 focus:ring-[#3C50B4]/20"
                    />
                    <input
                      value={reviewLink}
                      onChange={(e) => setReviewLink(e.target.value)}
                      type="url"
                      placeholder="Ссылка (Figma / staging) — необязательно"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-[#3C50B4] focus:ring-2 focus:ring-[#3C50B4]/20"
                    />
                    <input
                      type="file"
                      multiple
                      onChange={(e) => setReviewFiles(Array.from(e.target.files ?? []))}
                      className="block w-full text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-slate-600"
                    />
                    {reviewFiles.length > 0 && (
                      <p className="text-[11px] font-semibold text-slate-500">Выбрано файлов: {reviewFiles.length}</p>
                    )}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        disabled={reviewBusy}
                        onClick={handleSubmitReview}
                        className={`${UI_BUTTON_STYLES.primary} flex items-center gap-1.5 px-4 py-2 text-sm font-semibold`}
                      >
                        {reviewBusy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Отправить
                      </button>
                      <button
                        type="button"
                        onClick={() => setReviewFormOpen(false)}
                        className={`${UI_BUTTON_STYLES.secondary} px-4 py-2 text-sm font-semibold`}
                      >
                        Отмена
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setReviewFormOpen(true)}
                    className={`mt-3 flex w-full items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold ${UI_BUTTON_STYLES.primary}`}
                  >
                    <ShieldCheck size={16} /> Отправить на согласование
                  </button>
                )
              )}

              {draft.status === 'review' && (
                <div className="mt-3 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-3 text-xs font-semibold text-indigo-700">
                  <p>Ждём решения клиента{task.currentApproval ? ` (раунд ${task.currentApproval.round})` : ''}.</p>
                  <button
                    type="button"
                    disabled={reviewBusy}
                    onClick={handleCancelReview}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-50"
                  >
                    <Undo2 size={13} /> Отозвать с согласования
                  </button>
                </div>
              )}

              {(task.approvals ?? []).length > 0 && (
                <div className="mt-3 space-y-2">
                  {[...task.approvals].reverse().map((round) => (
                    <ApprovalRoundCard key={round.id} round={round} fileHref={fileHref} />
                  ))}
                </div>
              )}
            </div>

            <div className="mt-8">
              <div className="flex items-start justify-between gap-2">
                <SectionTitle title="Файлы" subtitle="Материалы по задаче" />
                {onUploadFiles && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={`${UI_BUTTON_STYLES.ghost} flex shrink-0 items-center gap-1.5 px-3 py-1.5 text-xs font-semibold`}
                  >
                    <FileUp size={13} /> Загрузить
                  </button>
                )}
              </div>
              <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handlePmFilePick} />
              <div className="mt-3 space-y-2">
                {(task.files ?? []).length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-400">
                    Файлы не прикреплены.
                  </p>
                ) : (
                  (task.files ?? []).map((file) => (
                    <a
                      key={file.id}
                      href={fileHref(file.id)}
                      download
                      className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3 transition hover:border-[#3C50B4]/40"
                    >
                      <p className="flex items-center gap-1.5 truncate text-sm text-slate-700">
                        <Download size={13} className="shrink-0 text-slate-400" /> {file.name}
                      </p>
                      <p className="shrink-0 text-xs text-slate-400">{file.size}</p>
                    </a>
                  ))
                )}
              </div>
            </div>

            <div className="mt-8">
              <SectionTitle title="История" subtitle="Лог изменений по задаче" />
              <div className="mt-3 space-y-2">
                {(task.history ?? []).length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-400">
                    История пока пустая.
                  </p>
                ) : (
                  (task.history ?? []).map((entry, index) => (
                    <div key={`${entry.date}-${index}`} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                      <p className="text-xs font-semibold text-slate-500">{formatHistoryDate(entry.date)}</p>
                      <p className="mt-1 text-sm text-slate-700">{entry.text}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          <aside className="md:col-span-3 p-4 md:p-6 border-t md:border-t-0 border-slate-100">
            <SectionTitle title="Метаданные" subtitle="Управление статусом и атрибутами" />
            <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500">Статус</label>
            <select
              value={draft.status}
              onChange={(event) => setDraft((prev) => ({ ...prev, status: event.target.value }))}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#3C50B4] focus:ring-2 focus:ring-[#3C50B4]/20"
            >
              {COLUMNS.filter((column) => allowedStatuses.includes(column.id))
                .filter((column) => {
                  // 'review' управляется только кнопкой «Отправить на согласование»,
                  // а выход из review — одобрением клиента или кнопкой «Отозвать».
                  if (column.id === draft.status) return true;
                  if (column.id === 'review') return false;
                  if (draft.status === 'review') return false;
                  return true;
                })
                .map((column) => (
                  <option key={column.id} value={column.id}>
                    {TASK_STATUS_LABEL[column.id] ?? column.title}
                  </option>
                ))}
            </select>

            <label className="mb-2 mt-6 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
              <CalendarDays size={14} />
              Дедлайн
            </label>
            <input
              type="date"
              value={draft.deadline}
              onChange={(event) => setDraft((prev) => ({ ...prev, deadline: event.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#3C50B4] focus:ring-2 focus:ring-[#3C50B4]/20"
            />

            <label className="mb-2 mt-6 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
              <Tag size={14} />
              Приоритет
            </label>
            <select
              value={draft.tag}
              onChange={(event) => setDraft((prev) => ({ ...prev, tag: event.target.value }))}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#3C50B4] focus:ring-2 focus:ring-[#3C50B4]/20"
            >
              {TAG_OPTIONS.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>

            <label className="mt-6 flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-200 px-3 py-2.5">
              <input
                type="checkbox"
                checked={draft.isInternal}
                onChange={(event) => setDraft((prev) => ({ ...prev, isInternal: event.target.checked }))}
                className="mt-0.5 h-4 w-4 accent-[#3C50B4]"
              />
              <span>
                <span className="block text-xs font-bold text-slate-700">Внутренняя задача</span>
                <span className="block text-[11px] text-slate-400">Скрыта от клиента в его кабинете</span>
              </span>
            </label>

            <div className="mt-6">
              <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500">Вес задачи (1–10)</label>
              {draft.weight === '' || draft.weight == null ? (
                <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                  <span className="text-xs font-semibold text-amber-700">Вес не задан</span>
                  <button type="button" onClick={() => setDraft((p) => ({ ...p, weight: 5 }))} className="text-xs font-bold text-[#3C50B4] hover:underline">Задать</button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <input type="range" min="1" max="10" value={draft.weight} onChange={(e) => setDraft((p) => ({ ...p, weight: Number(e.target.value) }))} className="flex-1 accent-[#3C50B4]" />
                  <span className="w-6 text-center text-sm font-black text-[#3C50B4]">{draft.weight}</span>
                  <button type="button" onClick={() => setDraft((p) => ({ ...p, weight: '' }))} className="text-slate-300 hover:text-red-500" aria-label="Сбросить вес"><X size={14} /></button>
                </div>
              )}
            </div>

            <div className="mt-6">
              <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
                <Users size={14} />
                Ответственные
              </label>
              <div className="flex items-center gap-2">
                {(task.assignees ?? []).map((assignee) => (
                  <div
                    key={assignee.id}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-white bg-slate-200 text-[11px] font-bold text-slate-700 -ml-2 first:ml-0 transition hover:-translate-y-0.5"
                    title={assignee.name}
                  >
                    {assignee.initials}
                  </div>
                ))}
              </div>
              <select
                disabled={availableAssignees.length === 0}
                onChange={(event) => {
                  const assignee = team.find((item) => item.id === event.target.value);
                  if (!assignee) return;
                  onAddAssignee?.(assignee);
                  event.target.value = '';
                }}
                defaultValue=""
                className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#3C50B4] focus:ring-2 focus:ring-[#3C50B4]/20 disabled:bg-slate-100"
              >
                <option value="" disabled>
                  {availableAssignees.length === 0 ? 'Все добавлены' : 'Добавить участника'}
                </option>
                {availableAssignees.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleRequestClient}
              disabled={isRequestLoading}
              className={`mt-6 w-full px-4 py-2.5 text-sm font-semibold ${UI_BUTTON_STYLES.primary} disabled:cursor-wait`}
            >
              {isRequestLoading ? 'Отправка...' : 'Запросить у клиента'}
            </button>

            {task.magicLink ? (
              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="flex items-center gap-1 text-xs font-semibold text-slate-500">
                  <Link2 size={13} />
                  Ссылка для клиента
                </p>
                <p className="mt-1 break-all text-xs text-slate-700">{task.magicLink}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(task.magicLink);
                        setToast({ tone: 'info', message: 'Ссылка скопирована' });
                        setTimeout(() => setToast(null), 2400);
                      } catch {
                        setToast({ tone: 'error', message: 'Не удалось скопировать ссылку' });
                      }
                    }}
                    className={`px-3 py-1.5 text-xs font-semibold ${UI_BUTTON_STYLES.secondary}`}
                  >
                    Копировать
                  </button>
                  {task.magicLink && onOpenGuestView && (
                    <button
                      type="button"
                      onClick={() => onOpenGuestView(task.id)}
                      className={`px-3 py-1.5 text-xs font-semibold ${UI_BUTTON_STYLES.primary}`}
                    >
                      Открыть клиентский вид
                    </button>
                  )}
                </div>
              </div>
            ) : null}

            {/* Telegram-привязка клиента — показываем только если бот настроен */}
            {botUsername && task.clientId && (
              <div className="mt-3 rounded-xl border border-[#3C50B4]/20 bg-[#3C50B4]/5 p-3">
                {task.clientTelegramLinked ? (
                  <p className="text-xs font-semibold text-[#3C50B4]">
                    ✓ Telegram-чат клиента привязан. Уведомления уйдут туда автоматически.
                  </p>
                ) : (
                  <>
                    <p className="text-xs font-semibold text-[#3C50B4]">
                      Telegram клиента не привязан
                    </p>
                    <p className="mt-1 text-[11px] text-[#3C50B4]/70">
                      Сгенерируйте одноразовую ссылку и отправьте клиенту:
                    </p>
                    {telegramLinkData?.link ? (
                      <>
                        <p className="mt-2 break-all rounded bg-white px-2 py-1 text-xs text-slate-700 border border-[#3C50B4]/10">
                          {telegramLinkData.link}
                        </p>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(telegramLinkData.link);
                              setToast({ tone: 'info', message: 'Telegram-ссылка скопирована' });
                              setTimeout(() => setToast(null), 2400);
                            } catch {
                              setToast({ tone: 'error', message: 'Не удалось скопировать' });
                            }
                          }}
                          className={`mt-2 px-3 py-1.5 text-xs font-semibold ${UI_BUTTON_STYLES.secondary}`}
                        >
                          Копировать
                        </button>
                        <p className="mt-1 text-[10px] text-[#3C50B4]/50">Ссылка действительна 24 часа и может быть использована только один раз</p>
                      </>
                    ) : (
                      <button
                        type="button"
                        disabled={telegramLinkBusy || !onRequestTelegramLink}
                        onClick={handleRequestTelegramLink}
                        className={`mt-2 px-3 py-1.5 text-xs font-semibold ${UI_BUTTON_STYLES.primary} disabled:opacity-60 disabled:cursor-wait`}
                      >
                        {telegramLinkBusy ? 'Генерация...' : 'Сгенерировать ссылку'}
                      </button>
                    )}
                  </>
                )}
              </div>
            )}

            {toast ? <div className="mt-3"><Toast tone={toast.tone} message={toast.message} /></div> : null}
          </aside>
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-4 md:px-6 py-3 md:py-4 shrink-0">
          {/* Удаление — слева. Видна всегда (для существующих задач), но disabled
              если у пользователя нет прав. Tooltip объясняет почему. */}
          <div className="flex">
            {onDelete && task?.id && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting || !canDelete}
                className={`flex items-center gap-2 px-3 md:px-4 py-2 text-sm font-semibold rounded-xl border transition-colors active:scale-95
                  ${canDelete
                    ? 'border-red-100 text-red-500 hover:bg-red-50 hover:border-red-200'
                    : 'border-slate-100 text-slate-300 cursor-not-allowed'
                  }
                  ${isDeleting ? 'opacity-60 cursor-not-allowed' : ''}`}
                title={canDelete
                  ? 'Удалить задачу'
                  : 'Удалять задачу может только администратор или её исполнитель'}
              >
                {isDeleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                <span className="hidden md:inline">{isDeleting ? 'Удаляем…' : 'Удалить'}</span>
              </button>
            )}
          </div>

          {/* Отмена + Сохранить — справа */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={requestClose}
              className={`${UI_BUTTON_STYLES.secondary} px-4 py-2 text-sm font-semibold`}
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className={`${UI_BUTTON_STYLES.primary} px-5 py-2 text-sm font-semibold shadow-lg shadow-blue-100 flex items-center gap-2 transition-opacity ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isSaving && <Loader2 size={15} className="animate-spin" />}
              {isSaving ? 'Сохраняем…' : 'Сохранить'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

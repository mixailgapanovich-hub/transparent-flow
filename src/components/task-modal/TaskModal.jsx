import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, Link2, MessageCircle, Send, Tag, Users, X } from 'lucide-react';
import { COLUMNS } from '../../data/mockData';
import { TASK_STATUS_BADGE, TASK_TAG_BADGE, TASK_STATUS_LABEL, UI_BUTTON_STYLES } from '../../theme/taskStyles';
import { getAllowedStatuses } from '../../utils/taskWorkflow';

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

const TEAM_OPTIONS = [
  { id: 'pm-2', name: 'Nika PM', initials: 'NP' },
  { id: 'mentor-1', name: 'Ilya Mentor', initials: 'IM' },
  { id: 'pm-3', name: 'Dina PM', initials: 'DP' },
];

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

export default function TaskModal({ task, onClose, onSave, onRequestClient, onSendComment, onAddAssignee, onOpenGuestView, isAdmin = false }) {
  const initialDraft = {
    title: task?.title ?? '',
    description: task?.description ?? '',
    status: task?.status ?? 'backlog',
    deadline: normalizeDeadline(task?.deadline),
    tag: task?.tag ?? 'Обычная',
  };

  const [draft, setDraft] = useState({
    ...initialDraft,
  });
  const [titleError, setTitleError] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [commentDraft, setCommentDraft] = useState('');
  const [isRequestLoading, setIsRequestLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const commentsRef = useRef(null);

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
      draft.tag !== (task.tag ?? 'Обычная'));

  const allowedStatuses = useMemo(
    () => getAllowedStatuses(task?.status ?? 'backlog', { isAdmin }),
    [task?.status, isAdmin]
  );
  const availableAssignees = TEAM_OPTIONS.filter(
    (candidate) => !(task?.assignees ?? []).some((item) => item.id === candidate.id)
  );

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
    });
  };

  const handleSendComment = () => {
    if (!commentDraft.trim()) return;
    onSendComment?.(commentDraft.trim());
    setCommentDraft('');
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

  if (!task) return null;

  const statusBadgeClass = TASK_STATUS_BADGE[draft.status] ?? TASK_STATUS_BADGE.backlog;
  const tagBadgeClass = TASK_TAG_BADGE[draft.tag] ?? TASK_TAG_BADGE.Обычная;

  return (
    <div
      className={`fixed inset-0 z-40 flex items-center justify-center bg-slate-900/30 p-4 transition-opacity duration-200 ${
        isOpen ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={requestClose}
      role="presentation"
    >
      <div
        className={`max-h-[90vh] w-full max-w-6xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl transition-transform duration-200 ${
          isOpen ? 'scale-100' : 'scale-95'
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className={`rounded-md px-2 py-1 text-xs font-bold ${statusBadgeClass}`}>Статус: {TASK_STATUS_LABEL[draft.status]}</span>
            <span className={`rounded-md px-2 py-1 text-xs font-bold ${tagBadgeClass}`}>Приоритет: {draft.tag}</span>
          </div>
          <button
            type="button"
            onClick={requestClose}
            className={`p-2 ${UI_BUTTON_STYLES.ghost}`}
            aria-label="Закрыть модальное окно"
          >
            <X size={18} />
          </button>
        </header>

        <div className="grid max-h-[calc(90vh-140px)] grid-cols-1 overflow-y-auto md:grid-cols-10">
          <section className="md:col-span-7 border-r border-slate-100 p-6">
            <SectionTitle title="Основные поля" subtitle="Редактируйте задачу без перехода на отдельный экран" />
            <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500">Заголовок</label>
            <input
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
                <div className="mt-3 rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-700">
                  Клиент загрузил материалы — можно ответить или продолжить работу.
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

            <div className="mt-8">
              <SectionTitle title="Файлы" subtitle="Просмотр прикреплённых материалов" />
              <div className="mt-3 space-y-2">
                {(task.files ?? []).length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-400">
                    Файлы не прикреплены.
                  </p>
                ) : (
                  (task.files ?? []).map((file) => (
                    <div key={file.id} className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3">
                      <p className="text-sm text-slate-700">{file.name}</p>
                      <p className="text-xs text-slate-400">{file.size}</p>
                    </div>
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

          <aside className="md:col-span-3 p-6">
            <SectionTitle title="Метаданные" subtitle="Управление статусом и атрибутами" />
            <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500">Статус</label>
            <select
              value={draft.status}
              onChange={(event) => setDraft((prev) => ({ ...prev, status: event.target.value }))}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#3C50B4] focus:ring-2 focus:ring-[#3C50B4]/20"
            >
              {COLUMNS.filter((column) => allowedStatuses.includes(column.id)).map((column) => (
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
                  const assignee = TEAM_OPTIONS.find((item) => item.id === event.target.value);
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

            {toast ? <div className="mt-3"><Toast tone={toast.tone} message={toast.message} /></div> : null}
          </aside>
        </div>

        <footer className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
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
            className={`${UI_BUTTON_STYLES.primary} px-5 py-2 text-sm font-semibold shadow-lg shadow-blue-100`}
          >
            Сохранить
          </button>
        </footer>
      </div>
    </div>
  );
}

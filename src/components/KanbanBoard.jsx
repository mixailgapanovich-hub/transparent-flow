import { useMemo, useRef, useState } from 'react';
import {
  DndContext, closestCenter, pointerWithin, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragOverlay, useDroppable
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates,
  verticalListSortingStrategy, useSortable, arrayMove
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Clock, Plus, Edit2, Paperclip, Search, LayoutGrid, GitBranch, Flame, X, Smartphone } from 'lucide-react';
import { COLUMNS } from '../data/mockData';
import TasksMindMapView from './TasksMindMapView';
import { TASK_COLUMN_STYLES, TASK_TAG_BADGE, UI_BUTTON_STYLES, PROJECT_BADGE_STYLES } from '../theme/taskStyles';

function kanbanCollision(args) {
  const within = pointerWithin(args);
  return within.length > 0 ? within : closestCenter(args);
}

const Badge = ({ type }) => {
  const styles = TASK_TAG_BADGE;
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-tight ${styles[type]}`}>
      {type === 'Блокирующая' ? '🔴 ' : type === 'Ключевая' ? '🟡 ' : '⚪ '}{type}
    </span>
  );
};

const TAG_LEFT_BORDER = {
  'Блокирующая': 'border-l-red-500',
  'Ключевая':    'border-l-amber-400',
  'Обычная':     'border-l-slate-300',
};

const MobileTaskCard = ({ task, onClick, showProjectBadge }) => {
  const isOverdue = useMemo(() => new Date(task.deadline) < new Date(), [task.deadline]);
  const isUrgent = useMemo(() => {
    const diff = new Date(task.deadline) - new Date();
    return diff > 0 && diff < 24 * 60 * 60 * 1000;
  }, [task.deadline]);
  const projectStyle = showProjectBadge && task.projectId ? PROJECT_BADGE_STYLES[task.projectId] : null;
  const borderColor = TAG_LEFT_BORDER[task.tag] ?? 'border-l-slate-300';

  return (
    <div
      onClick={() => onClick(task.id)}
      className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-4 border-l-4 ${borderColor}
        active:scale-[0.98] transition-transform cursor-pointer`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <Badge type={task.tag} />
        {projectStyle && (
          <div className={`flex items-center gap-1 shrink-0 ${projectStyle.text}`}>
            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${projectStyle.dot}`} />
            <span className="text-[9px] font-bold uppercase tracking-wide">{projectStyle.label}</span>
          </div>
        )}
      </div>
      <h4 className="text-sm font-semibold text-slate-800 leading-snug mb-3 line-clamp-2">{task.title}</h4>
      <div className="flex items-center justify-between">
        <span className={`flex items-center gap-1 text-[11px] font-medium
          ${isOverdue ? 'text-red-500' : isUrgent ? 'text-amber-500' : 'text-slate-400'}`}
        >
          <Clock size={11} />
          {new Date(task.deadline).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
        </span>
        <div className="flex -space-x-1.5">
          {(task.assignees ?? []).slice(0, 3).map((a, i) => (
            <div
              key={i}
              className="w-6 h-6 rounded-lg bg-[#FFD700] border-2 border-white flex items-center justify-center text-[8px] font-black text-[#3C50B4]"
              title={a.name}
            >
              {a.initials}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const TaskCard = ({ task, onClick, isWaitingCol, isClientUploadedCol, isReviewCol, showProjectBadge, readOnly = false, reorderable = false }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.65 : 1,
    boxShadow: isDragging ? '0 16px 32px rgba(15, 23, 42, 0.16)' : undefined,
  };
  // Drag навешиваем, если карточка редактируемая (PM) ИЛИ разрешено переупорядочивание
  // в своей колонке (клиент). В чистом read-only без reorderable — только клик.
  const draggable = !readOnly || reorderable;
  const dragProps = draggable ? { ...attributes, ...listeners } : {};

  const isUrgent = useMemo(() => {
    const diff = new Date(task.deadline) - new Date();
    return diff > 0 && diff < 24 * 60 * 60 * 1000;
  }, [task.deadline]);
  const isOverdue = useMemo(() => new Date(task.deadline) < new Date(), [task.deadline]);

  const projectStyle = showProjectBadge && task.projectId ? PROJECT_BADGE_STYLES[task.projectId] : null;

  return (
    <div
      ref={setNodeRef} style={style} {...dragProps}
      onClick={() => onClick(task.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          onClick(task.id);
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`Открыть задачу: ${task.title}`}
      className={`group relative p-4 rounded-xl border transition-all ${draggable ? 'cursor-grab' : 'cursor-pointer'} mb-3
        ${isWaitingCol ? 'bg-orange-50/60 border-orange-200 border-l-4 border-l-orange-400 hover:border-orange-300' : isClientUploadedCol ? 'bg-teal-50/60 border-teal-200 border-l-4 border-l-teal-400 hover:border-teal-300' : isReviewCol ? 'bg-indigo-50/60 border-indigo-200 border-l-4 border-l-indigo-400 hover:border-indigo-300' : 'bg-white border-slate-100 shadow-sm hover:border-[#3C50B4]/30 hover:shadow-md'}
        focus:outline-none focus:ring-2 focus:ring-[#3C50B4]/20`}
    >
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button
          className={`p-1.5 ${UI_BUTTON_STYLES.ghost}`}
          aria-label={`Редактировать задачу: ${task.title}`}
          onClick={(e) => { e.stopPropagation(); onClick(task.id); }}
        >
          <Edit2 size={12} />
        </button>
      </div>
      <div className="flex justify-between items-start mb-2">
        <span className="flex items-center gap-1.5">
          <Badge type={task.tag} />
          {task.isImportant && <Flame size={13} className="text-orange-400 animate-pulse shrink-0" aria-label="Ключевая задача" />}
          {!readOnly && task.weight == null && (
            <span
              className="text-[9px] font-black uppercase tracking-wide text-amber-600 bg-amber-50 border border-amber-200 rounded px-1 py-0.5 shrink-0"
              title="Вес задачи не задан — в готовности считается как 1"
            >
              вес?
            </span>
          )}
        </span>
        {isWaitingCol && <span className="text-[10px] font-semibold uppercase tracking-wider text-orange-600">Ждём клиента</span>}
        {isClientUploadedCol && <span className="text-[10px] font-semibold uppercase tracking-wider text-teal-600">Контент готов</span>}
        {isReviewCol && <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600">На согласовании</span>}
      </div>
      <h4 className={`text-sm font-semibold mb-3 leading-tight ${isWaitingCol ? 'text-slate-500' : isClientUploadedCol ? 'text-teal-700' : isReviewCol ? 'text-indigo-700' : 'text-slate-800'}`}>{task.title}</h4>
      <div className="flex items-center justify-between mt-auto">
        <div className={`flex items-center text-[11px] font-medium ${isOverdue ? 'text-red-500 animate-[pulse_2.4s_ease-in-out_infinite]' : isUrgent ? 'text-red-500 font-bold' : 'text-slate-400'}`}>
          <Clock size={12} className="mr-1" />
          {new Date(task.deadline).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
        </div>
        {task.hasFiles && <Paperclip size={12} className="text-slate-300" />}
      </div>
      {projectStyle && (
        <div className={`flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-100 ${projectStyle.text}`}>
          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${projectStyle.dot}`} />
          <span className="text-[10px] font-bold uppercase tracking-wide truncate">{projectStyle.label}</span>
        </div>
      )}
    </div>
  );
};

const SortableColumn = ({ column, tasks, onTaskClick, showProjectBadge, readOnly = false, reorderable = false }) => {
  const { setNodeRef } = useDroppable({ id: column.id });
  const isWaiting = column.id === 'waiting';
  const isClientUploaded = column.id === 'client-uploaded';
  const isReview = column.id === 'review';
  const columnStyle = TASK_COLUMN_STYLES[column.id] ?? TASK_COLUMN_STYLES.backlog;

  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const visible = q ? tasks.filter((t) => t.title.toLowerCase().includes(q)) : tasks;

  return (
    <div className="flex h-full min-h-0 flex-col flex-1 min-w-[16rem]">
      <div className="flex items-center justify-between gap-2 mb-4 px-1">
        {searchOpen ? (
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по колонке…"
            className="flex-1 min-w-0 rounded-lg border border-slate-200 px-2 py-1 text-xs outline-none focus:border-[#3C50B4]"
          />
        ) : (
          <h3 className={`text-sm font-bold uppercase tracking-widest truncate ${columnStyle.headerText}`}>
            {column.title}
            <span className="ml-1.5 text-slate-300">{tasks.length}</span>
          </h3>
        )}
        <button
          type="button"
          onClick={() => { setSearchOpen((o) => !o); if (searchOpen) setQuery(''); }}
          className={`shrink-0 ${columnStyle.iconText}`}
          aria-label={`Поиск по колонке ${column.title}`}
        >
          {searchOpen ? <X size={15} /> : <Search size={16} />}
        </button>
      </div>
      <div ref={setNodeRef} className={`flex-1 min-h-0 overflow-y-auto rounded-2xl p-2 custom-scrollbar ${columnStyle.container}`}>
        <SortableContext items={visible.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {visible.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={onTaskClick}
              isWaitingCol={isWaiting}
              isClientUploadedCol={isClientUploaded}
              isReviewCol={isReview}
              showProjectBadge={showProjectBadge}
              readOnly={readOnly}
              reorderable={reorderable}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
};

const BoardProgress = ({ tasks }) => {
  const stats = useMemo(() => {
    // Готовность считаем по ВЕСУ задач; невыставленный вес = 1.
    const w = (t) => (Number.isInteger(t.weight) && t.weight >= 1 ? t.weight : 1);
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'done').length;
    const totalW = tasks.reduce((acc, t) => acc + w(t), 0);
    const doneW = tasks.filter(t => t.status === 'done').reduce((acc, t) => acc + w(t), 0);
    const percentage = totalW > 0 ? Math.round((doneW / totalW) * 100) : 0;
    const unset = tasks.filter(t => t.weight == null).length;
    return { percentage, completed, total, doneW, totalW, unset };
  }, [tasks]);

  return (
    <div className="flex-1 max-w-md px-10 group relative cursor-help">
      <div className="w-full space-y-2">
        <div className="flex justify-between items-end">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Статус проекта</span>
          <span className="text-sm font-black text-[#3C50B4] bg-[#3C50B4]/5 px-2 py-0.5 rounded-lg">{stats.percentage}%</span>
        </div>
        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden p-px border border-slate-200/50">
          <div
            className="h-full bg-[#3C50B4] rounded-full transition-all duration-1000 ease-out shadow-[0_0_12px_rgba(60,80,180,0.3)]"
            style={{ width: `${stats.percentage}%` }}
          />
        </div>
      </div>

      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 w-max opacity-0 group-hover:opacity-100 transition-all pointer-events-none transform -translate-y-2 group-hover:translate-y-0 z-100">
        <div className="bg-slate-900 text-white text-[11px] p-5 rounded-3xl shadow-2xl flex flex-col gap-3 border border-white/10 backdrop-blur-xl">
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-b-slate-900" />
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-green-400" />
            <span className="font-bold uppercase tracking-wider">Выполнено: {stats.completed} / {stats.total} задач</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-blue-400" />
            <span className="font-bold uppercase tracking-wider">По весу: {stats.doneW} / {stats.totalW}</span>
          </div>
          {stats.unset > 0 && (
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="font-bold uppercase tracking-wider">Вес не задан: {stats.unset}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default function KanbanBoard({
  tasks,
  setTasks,
  onTaskClick,
  activeId,
  setActiveId,
  onCreateTask,
  onChangeStatus,
  onSubmitForReview,
  onAddDependency,
  onRemoveDependency,
  onLoadLayout,
  onSaveLayout,
  columns: propColumns,
  showProjectBadge = false,
  showColumnFilter = false,
  projectFilterLabel = null,
  onClearProjectFilter = null,
  readOnly = false,
  reorderable = false,
  createLabel = null,
}) {
  const columns = propColumns ?? COLUMNS;
  const [boardView, setBoardView] = useState('kanban');
  const [hiddenColumnIds, setHiddenColumnIds] = useState([]);
  const [mobileActiveCol, setMobileActiveCol] = useState('in-progress');
  const swipeTouchStartX = useRef(null);

  const handleSwipeStart = (e) => {
    swipeTouchStartX.current = e.touches[0].clientX;
  };

  const handleSwipeEnd = (e) => {
    if (swipeTouchStartX.current === null) return;
    const diff = swipeTouchStartX.current - e.changedTouches[0].clientX;
    swipeTouchStartX.current = null;
    if (Math.abs(diff) < 60) return; // слишком короткий свайп — игнорируем
    const colIds = columns.map((c) => c.id);
    const idx = colIds.indexOf(mobileActiveCol);
    if (diff > 0 && idx < colIds.length - 1) {
      setMobileActiveCol(colIds[idx + 1]); // свайп влево → следующая вкладка
    } else if (diff < 0 && idx > 0) {
      setMobileActiveCol(colIds[idx - 1]); // свайп вправо → предыдущая вкладка
    }
  };

  const displayColumns = useMemo(
    () => showColumnFilter ? columns.filter(c => !hiddenColumnIds.includes(c.id)) : columns,
    [columns, hiddenColumnIds, showColumnFilter]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event) => setActiveId(event.active.id);
  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over) return;
    const overId = over.id;
    const activeTask = tasks.find((task) => task.id === active.id);
    if (!activeTask) return;
    const newStatus = columns.find(c => c.id === overId) ? overId : tasks.find(t => t.id === overId)?.status;
    if (!newStatus) {
      setActiveId(null);
      return;
    }
    // Клиентский режим: переупорядочивание разрешено ТОЛЬКО внутри своей колонки.
    // Межколоночный перенос игнорируем — карточка «отскакивает» обратно (нет смены state).
    if (reorderable) {
      if (newStatus === activeTask.status && over.id !== active.id && setTasks) {
        setTasks((prev) => {
          const from = prev.findIndex((t) => t.id === active.id);
          const to = prev.findIndex((t) => t.id === over.id);
          return from === -1 || to === -1 ? prev : arrayMove(prev, from, to);
        });
      }
      setActiveId(null);
      return;
    }
    // Колонка «На согласовании» — особый случай: голый перевод статуса создал бы
    // review без раунда. Перехватываем и открываем форму отправки (через App).
    // Перевод допустим только из in-progress / client-uploaded; из остальных — игнор.
    if (newStatus === 'review' && activeTask.status !== 'review') {
      if (onSubmitForReview && (activeTask.status === 'in-progress' || activeTask.status === 'client-uploaded')) {
        onSubmitForReview(active.id);
      }
      setActiveId(null);
      return;
    }
    if (onChangeStatus) {
      // Через App: API-вызов + FSM-проверка + откат при ошибке.
      onChangeStatus(active.id, newStatus);
    } else if (setTasks) {
      // Фоллбек на чисто локальное поведение (на случай, если кто-то использует борд без онлайна).
      setTasks(prev => prev.map(t => t.id === active.id ? { ...t, status: newStatus } : t));
    }
    setActiveId(null);
  };

  const activeTask = useMemo(() => tasks.find(t => t.id === activeId), [activeId, tasks]);

  const toggleColumn = (colId) => {
    setHiddenColumnIds(prev =>
      prev.includes(colId) ? prev.filter(id => id !== colId) : [...prev, colId]
    );
  };

  /* ─── МОБИЛЬНЫЙ VIEW (< md) ─────────────────────────────────────────── */
  const mobileView = (
    <div className="md:hidden flex flex-col h-full min-h-0">
      {/* Header мобильного вида */}
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap shrink-0">
        {onCreateTask && (
          <button
            type="button"
            onClick={onCreateTask}
            className={`${UI_BUTTON_STYLES.primary} px-5 py-3 rounded-2xl font-bold shadow-xl shadow-blue-100 flex items-center gap-2 shrink-0 text-sm touch-manipulation active:scale-95 transition-all`}
          >
            <Plus size={18} /> {createLabel ?? 'Задача'}
          </button>
        )}

        {projectFilterLabel && onClearProjectFilter && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#3C50B4]/5 border border-[#3C50B4]/20 rounded-xl text-[#3C50B4] shrink-0">
            <span className="text-[10px] font-black uppercase tracking-wider">{projectFilterLabel}</span>
            <button onClick={onClearProjectFilter} aria-label="Сбросить фильтр">
              <X size={12} strokeWidth={3} />
            </button>
          </div>
        )}
      </div>

      {boardView === 'mindmap' ? (
        /* Граф зависимостей недоступен на мобилке */
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400">
          <Smartphone size={40} strokeWidth={1.5} className="text-slate-300" />
          <p className="text-sm font-semibold">Mind Map — только на десктопе</p>
          <p className="text-[11px] text-slate-300 text-center px-6">Откройте приложение на компьютере для работы с графом зависимостей</p>
        </div>
      ) : (
        <>
          {/* Вкладки статусов — горизонтальный скролл с hint */}
          <div className="relative shrink-0 mb-3">
          <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
            {columns.map((col) => {
              const count = tasks.filter((t) => t.status === col.id).length;
              const isActive = mobileActiveCol === col.id;
              return (
                <button
                  key={col.id}
                  onClick={() => setMobileActiveCol(col.id)}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border
                    ${isActive
                      ? 'bg-[#3C50B4] text-white border-[#3C50B4] shadow-md'
                      : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                    }`}
                >
                  {col.title}
                  <span className={`min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[9px] font-black px-1
                    ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
          {/* Gradient hint → есть ещё вкладки */}
          <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none" />
          </div>

          {/* Список карточек — swipe left/right меняет вкладку */}
          <div
            className="flex-1 overflow-y-auto space-y-3 custom-scrollbar min-h-0"
            onTouchStart={handleSwipeStart}
            onTouchEnd={handleSwipeEnd}
          >
            {tasks.filter((t) => t.status === mobileActiveCol).length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-slate-300 gap-2">
                <p className="text-sm font-semibold">Нет задач</p>
                <p className="text-[11px]">в этой колонке</p>
              </div>
            ) : (
              tasks.filter((t) => t.status === mobileActiveCol).map((task) => (
                <MobileTaskCard
                  key={task.id}
                  task={task}
                  onClick={onTaskClick}
                  showProjectBadge={showProjectBadge}
                />
              ))
            )}
          </div>
        </>
      )}
    </div>
  );

  /* ─── ДЕСКТОПНЫЙ VIEW (≥ md) ─────────────────────────────────────────── */
  const desktopView = (
    <div className="hidden md:flex h-full min-h-0 flex-col">
      <div className="mb-4 flex w-full flex-wrap items-center justify-between gap-4">
        {onCreateTask && (
          <button
            type="button"
            onClick={onCreateTask}
            className={`${UI_BUTTON_STYLES.primary} px-8 py-4 rounded-2xl font-bold shadow-xl shadow-blue-100 flex items-center gap-2 shrink-0 active:scale-95 transition-all`}
          >
            <Plus size={20} /> {createLabel ?? 'Создать задачу'}
          </button>
        )}

        {/* Переключатели видимости колонок — компактно, в той же строке (экономит высоту) */}
        {showColumnFilter && boardView === 'kanban' && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {columns.map((col) => {
              const isHidden = hiddenColumnIds.includes(col.id);
              const style = TASK_COLUMN_STYLES[col.id] ?? TASK_COLUMN_STYLES.backlog;
              return (
                <button
                  key={col.id}
                  onClick={() => toggleColumn(col.id)}
                  title={isHidden ? `Показать «${col.title}»` : `Скрыть «${col.title}»`}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide border transition-all ${
                    isHidden
                      ? 'bg-slate-50 text-slate-300 border-slate-200 line-through'
                      : `bg-white ${style.headerText} border-slate-200 shadow-sm`
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isHidden ? 'bg-slate-300' : 'bg-current opacity-70'}`} />
                  {col.title}
                </button>
              );
            })}
          </div>
        )}

        {!showColumnFilter && <BoardProgress tasks={tasks} />}

        {projectFilterLabel && onClearProjectFilter && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#3C50B4]/5 border border-[#3C50B4]/20 rounded-xl text-[#3C50B4] shrink-0">
            <span className="text-[11px] font-black uppercase tracking-wider">Проект: {projectFilterLabel}</span>
            <button
              onClick={onClearProjectFilter}
              className="ml-1 hover:text-[#3C50B4]/60 transition-colors"
              aria-label="Сбросить фильтр по проекту"
            >
              <X size={13} strokeWidth={3} />
            </button>
          </div>
        )}

        <div
          className="flex rounded-2xl border border-slate-200 bg-slate-50/90 p-1 shadow-sm shrink-0"
          role="group"
          aria-label="Режим отображения доски"
        >
          <button
            type="button"
            onClick={() => setBoardView('kanban')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-widest transition-colors ${
              boardView === 'kanban' ? 'bg-white text-[#3C50B4] shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <LayoutGrid size={18} />
            Канбан
          </button>
          <button
            type="button"
            onClick={() => setBoardView('mindmap')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-widest transition-colors ${
              boardView === 'mindmap' ? 'bg-white text-[#3C50B4] shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <GitBranch size={18} />
            Mind map
          </button>
        </div>
      </div>

      {boardView === 'kanban' ? (
        <DndContext sensors={sensors} collisionDetection={kanbanCollision} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex-1 min-h-0">
            <div className="flex h-full min-h-0 items-stretch gap-5 overflow-x-auto pb-1 custom-scrollbar">
              {displayColumns.map((column) => (
                <SortableColumn
                  key={column.id}
                  column={column}
                  tasks={tasks.filter((t) => t.status === column.id)}
                  onTaskClick={onTaskClick}
                  showProjectBadge={showProjectBadge}
                  readOnly={readOnly}
                  reorderable={reorderable}
                />
              ))}
            </div>
          </div>
          <DragOverlay>
            {activeId && activeTask ? (
              <div className="scale-[1.02] rotate-1">
                <TaskCard task={activeTask} onClick={() => {}} showProjectBadge={showProjectBadge} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <TasksMindMapView
            tasks={tasks}
            onTaskClick={onTaskClick}
            editable={!readOnly}
            onAddDependency={onAddDependency}
            onRemoveDependency={onRemoveDependency}
            onLoadLayout={onLoadLayout}
            onSaveLayout={onSaveLayout}
          />
        </div>
      )}
    </div>
  );

  return (
    <div className="h-full min-h-0 flex flex-col">
      {mobileView}
      {desktopView}
    </div>
  );
}

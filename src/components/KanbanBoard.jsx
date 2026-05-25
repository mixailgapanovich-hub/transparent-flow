import { useMemo, useRef, useState } from 'react';
import {
  DndContext, closestCenter, pointerWithin, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragOverlay, useDroppable
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates,
  verticalListSortingStrategy, useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Clock, Plus, Edit2, Paperclip, Settings2, LayoutGrid, GitBranch, Flame, X, Smartphone } from 'lucide-react';
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

const MobileTaskCard = ({ task, onClick, showProjectBadge, isRemoving = false }) => {
  const isOverdue = useMemo(() => new Date(task.deadline) < new Date(), [task.deadline]);
  const isUrgent = useMemo(() => {
    const diff = new Date(task.deadline) - new Date();
    return diff > 0 && diff < 24 * 60 * 60 * 1000;
  }, [task.deadline]);
  const projectStyle = showProjectBadge && task.projectId ? PROJECT_BADGE_STYLES[task.projectId] : null;
  const borderColor = TAG_LEFT_BORDER[task.tag] ?? 'border-l-slate-300';

  return (
    <div
      onClick={() => !isRemoving && onClick(task.id)}
      style={{
        transitionTimingFunction: isRemoving
          ? 'cubic-bezier(0.4, 0, 1, 1)'   // ease-in: «выталкиваем» наружу
          : 'cubic-bezier(0.16, 1, 0.3, 1)' // ease-out-expo: мягкий приход
      }}
      className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-4 border-l-4 ${borderColor}
        transition-all duration-500
        ${isRemoving
          ? 'opacity-0 translate-x-16 scale-90 blur-[1px] pointer-events-none'
          : 'opacity-100 translate-x-0 scale-100 active:scale-[0.98] cursor-pointer animate-in fade-in slide-in-from-top-4 duration-500'}`}
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

const TaskCard = ({ task, onClick, isWaitingCol, isClientUploadedCol, showProjectBadge, isRemoving = false }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id, disabled: isRemoving });
  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.65 : undefined,
    boxShadow: isDragging ? '0 16px 32px rgba(15, 23, 42, 0.16)' : undefined,
  };

  const isUrgent = useMemo(() => {
    const diff = new Date(task.deadline) - new Date();
    return diff > 0 && diff < 24 * 60 * 60 * 1000;
  }, [task.deadline]);
  const isOverdue = useMemo(() => new Date(task.deadline) < new Date(), [task.deadline]);

  const projectStyle = showProjectBadge && task.projectId ? PROJECT_BADGE_STYLES[task.projectId] : null;

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        transitionTimingFunction: isRemoving
          ? 'cubic-bezier(0.4, 0, 1, 1)'
          : 'cubic-bezier(0.16, 1, 0.3, 1)',
        transitionDuration: isDragging ? undefined : '500ms',
      }}
      {...attributes} {...listeners}
      onClick={() => !isRemoving && onClick(task.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' && !isRemoving) {
          event.preventDefault();
          onClick(task.id);
        }
      }}
      tabIndex={isRemoving ? -1 : 0}
      role="button"
      aria-label={`Открыть задачу: ${task.title}`}
      className={`group relative p-4 rounded-xl border transition-all cursor-grab mb-3
        ${isRemoving ? 'opacity-0 translate-x-16 scale-90 blur-[1px] pointer-events-none' : 'opacity-100 animate-in fade-in slide-in-from-top-4 duration-500'}
        ${isWaitingCol ? 'bg-orange-50/60 border-orange-200 border-l-4 border-l-orange-400 hover:border-orange-300' : isClientUploadedCol ? 'bg-teal-50/60 border-teal-200 border-l-4 border-l-teal-400 hover:border-teal-300' : 'bg-white border-slate-100 shadow-sm hover:border-[#3C50B4]/30 hover:shadow-md'}
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
      {task.isImportant && (
        <Flame size={14} className="absolute right-3 top-3 text-orange-400 animate-pulse" aria-label="Важная задача" />
      )}
      <div className="flex justify-between items-start mb-2">
        <Badge type={task.tag} />
        {isWaitingCol && <span className="text-[10px] font-semibold uppercase tracking-wider text-orange-600">Ждём клиента</span>}
        {isClientUploadedCol && <span className="text-[10px] font-semibold uppercase tracking-wider text-teal-600">Контент готов</span>}
      </div>
      <h4 className={`text-sm font-semibold mb-3 leading-tight ${isWaitingCol ? 'text-slate-500' : isClientUploadedCol ? 'text-teal-700' : 'text-slate-800'}`}>{task.title}</h4>
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

const SortableColumn = ({ column, tasks, onTaskClick, showProjectBadge, removingTaskIds }) => {
  const { setNodeRef } = useDroppable({ id: column.id });
  const isWaiting = column.id === 'waiting';
  const isClientUploaded = column.id === 'client-uploaded';
  const columnStyle = TASK_COLUMN_STYLES[column.id] ?? TASK_COLUMN_STYLES.backlog;

  return (
    <div className="flex h-full min-h-0 flex-col w-72 min-w-70">
      <div className="flex items-center justify-between mb-4 px-1">
        <h3 className={`text-sm font-bold uppercase tracking-widest ${columnStyle.headerText}`}>{column.title}</h3>
        <div className="flex items-center gap-1.5">
          <button className={columnStyle.iconText} aria-label={`Настройки колонки ${column.title}`}>
            <Settings2 size={16} />
          </button>
          <button className={columnStyle.iconText} aria-label={`Добавить задачу в ${column.title}`}>
            <Plus size={18} />
          </button>
        </div>
      </div>
      <div ref={setNodeRef} className={`flex-1 min-h-0 overflow-y-auto rounded-2xl p-2 custom-scrollbar ${columnStyle.container}`}>
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={onTaskClick}
              isWaitingCol={isWaiting}
              isClientUploadedCol={isClientUploaded}
              showProjectBadge={showProjectBadge}
              isRemoving={removingTaskIds?.has(task.id)}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
};

const BoardProgress = ({ tasks }) => {
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'done').length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    const totalPoints = tasks.reduce((acc, t) => acc + (t.storyPoints || 1), 0);
    const completedPoints = tasks
      .filter(t => t.status === 'done')
      .reduce((acc, t) => acc + (t.storyPoints || 1), 0);
    const remainingPoints = totalPoints - completedPoints;

    return { percentage, completed, total, remainingPoints };
  }, [tasks]);

  return (
    <div className="flex-1 max-w-md px-10 group relative cursor-help">
      <div className="w-full space-y-2">
        <div className="flex justify-between items-end">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Статус спринта</span>
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
            <span className="font-bold uppercase tracking-wider">Осталось: {stats.remainingPoints} Story Points</span>
          </div>
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
  columns: propColumns,
  showProjectBadge = false,
  showColumnFilter = false,
  projectFilterLabel = null,
  onClearProjectFilter = null,
  removingTaskIds = new Set(),
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
        <button
          type="button"
          onClick={onCreateTask}
          className={`${UI_BUTTON_STYLES.primary} px-5 py-3 rounded-2xl font-bold shadow-xl shadow-blue-100 flex items-center gap-2 shrink-0 text-sm touch-manipulation active:scale-95 transition-all`}
        >
          <Plus size={18} /> Задача
        </button>

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
                  isRemoving={removingTaskIds?.has(task.id)}
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
        <button
          type="button"
          onClick={onCreateTask}
          className={`${UI_BUTTON_STYLES.primary} px-8 py-4 rounded-2xl font-bold shadow-xl shadow-blue-100 flex items-center gap-2 shrink-0 active:scale-95 transition-all`}
        >
          <Plus size={20} /> Создать задачу
        </button>

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

      {showColumnFilter && boardView === 'kanban' && (
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mr-1">Колонки:</span>
          {columns.map(col => {
            const isHidden = hiddenColumnIds.includes(col.id);
            const style = TASK_COLUMN_STYLES[col.id] ?? TASK_COLUMN_STYLES.backlog;
            return (
              <button
                key={col.id}
                onClick={() => toggleColumn(col.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all ${
                  isHidden
                    ? 'bg-slate-50 text-slate-300 border-slate-200'
                    : `bg-white ${style.headerText} border-slate-200 shadow-sm`
                }`}
              >
                {!isHidden && <div className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />}
                {col.title}
              </button>
            );
          })}
        </div>
      )}

      {boardView === 'kanban' ? (
        <DndContext sensors={sensors} collisionDetection={kanbanCollision} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex-1 min-h-0">
            <div className="flex h-full min-h-0 items-stretch gap-8 overflow-x-auto pb-6 custom-scrollbar pr-10">
              {displayColumns.map((column) => (
                <SortableColumn
                  key={column.id}
                  column={column}
                  tasks={tasks.filter((t) => t.status === column.id)}
                  onTaskClick={onTaskClick}
                  showProjectBadge={showProjectBadge}
                  removingTaskIds={removingTaskIds}
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
          <TasksMindMapView tasks={tasks} onTaskClick={onTaskClick} />
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

import { useMemo, useState } from 'react';
import { 
  DndContext, closestCorners, KeyboardSensor, PointerSensor, 
  useSensor, useSensors, DragOverlay 
} from '@dnd-kit/core';
import { 
  SortableContext, sortableKeyboardCoordinates, 
  verticalListSortingStrategy, useSortable 
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Clock, Plus, Edit2, Paperclip, Settings2, LayoutGrid, GitBranch, Flame } from 'lucide-react';
import { COLUMNS } from '../data/mockData';
import TasksMindMapView from './TasksMindMapView';
import { TASK_COLUMN_STYLES, TASK_TAG_BADGE, UI_BUTTON_STYLES } from '../theme/taskStyles';

const Badge = ({ type }) => {
  const styles = TASK_TAG_BADGE;
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-tight ${styles[type]}`}>
      {type === 'Блокирующая' ? '🔴 ' : type === 'Ключевая' ? '🟡 ' : '⚪ '}{type}
    </span>
  );
};

const TaskCard = ({ task, onClick, isWaitingCol }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.65 : 1,
    boxShadow: isDragging ? '0 16px 32px rgba(15, 23, 42, 0.16)' : undefined,
  };

  const isUrgent = useMemo(() => {
    const diff = new Date(task.deadline) - new Date();
    return diff > 0 && diff < 24 * 60 * 60 * 1000;
  }, [task.deadline]);
  const isOverdue = useMemo(() => new Date(task.deadline) < new Date(), [task.deadline]);

  return (
    <div
      ref={setNodeRef} style={style} {...attributes} {...listeners}
      onClick={() => onClick(task.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          onClick(task.id);
        }
      }}
      tabIndex={0}
      className={`group relative p-4 rounded-xl border transition-all cursor-grab mb-3 
        ${isWaitingCol ? 'bg-orange-50/60 border-orange-200 border-l-4 border-l-orange-400 hover:border-orange-300' : 'bg-white border-slate-100 shadow-sm hover:border-[#3C50B4]/30 hover:shadow-md'}
        focus:outline-none focus:ring-2 focus:ring-[#3C50B4]/20`}
    >
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button className={`p-1.5 ${UI_BUTTON_STYLES.ghost}`} aria-label="Открыть задачу для редактирования">
          <Edit2 size={12} />
        </button>
      </div>
      {task.isImportant && (
        <Flame size={14} className="absolute right-3 top-3 text-orange-400 animate-pulse" aria-label="Важная задача" />
      )}
      <div className="flex justify-between items-start mb-2">
        <Badge type={task.tag} />
        {isWaitingCol && <span className="text-[10px] font-semibold uppercase tracking-wider text-orange-600">Ждём клиента</span>}
      </div>
      <h4 className={`text-sm font-semibold mb-3 leading-tight ${isWaitingCol ? 'text-slate-500' : 'text-slate-800'}`}>{task.title}</h4>
      <div className="flex items-center justify-between mt-auto">
        <div className={`flex items-center text-[11px] font-medium ${isOverdue ? 'text-red-500 animate-[pulse_2.4s_ease-in-out_infinite]' : isUrgent ? 'text-red-500 font-bold' : 'text-slate-400'}`}>
          <Clock size={12} className="mr-1" />
          {new Date(task.deadline).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
        </div>
        {task.hasFiles && <Paperclip size={12} className="text-slate-300" />}
      </div>
    </div>
  );
};

const SortableColumn = ({ column, tasks, onTaskClick }) => {
  const { setNodeRef } = useSortable({ id: column.id });
  const isWaiting = column.id === 'waiting';
  const columnStyle = TASK_COLUMN_STYLES[column.id] ?? TASK_COLUMN_STYLES.backlog;

  return (
    <div className="flex h-full min-h-0 flex-col w-72 min-w-[280px]">
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
      <div ref={setNodeRef} className={`flex-1 min-h-0 rounded-2xl p-2 ${columnStyle.container}`}>
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map(task => <TaskCard key={task.id} task={task} onClick={onTaskClick} isWaitingCol={isWaiting} />)}
        </SortableContext>
      </div>
    </div>
  );
};

export default function KanbanBoard({ tasks, setTasks, onTaskClick, activeId, setActiveId, onCreateTask }) {
  const [boardView, setBoardView] = useState('kanban');

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
    const newStatus = COLUMNS.find(c => c.id === overId) ? overId : tasks.find(t => t.id === overId)?.status;
    if (!newStatus) {
      setActiveId(null);
      return;
    }
    setTasks(prev => prev.map(t => t.id === active.id ? { ...t, status: newStatus } : t));
    setActiveId(null);
  };

  const activeTask = useMemo(() => tasks.find(t => t.id === activeId), [activeId, tasks]);

  return (
    <div className="h-full min-h-0 flex flex-col">
      <div className="mb-8 flex w-full flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={onCreateTask}
          className={`${UI_BUTTON_STYLES.primary} px-8 py-4 rounded-2xl font-bold shadow-xl shadow-blue-100 flex items-center gap-2`}
        >
          <Plus size={20} /> Создать задачу
        </button>
        <div
          className="flex rounded-2xl border border-slate-200 bg-slate-50/90 p-1 shadow-sm"
          role="group"
          aria-label="Режим отображения доски"
        >
          <button
            type="button"
            onClick={() => setBoardView('kanban')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-widest transition-colors ${
              boardView === 'kanban'
                ? 'bg-white text-[#3C50B4] shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <LayoutGrid size={18} />
            Канбан
          </button>
          <button
            type="button"
            onClick={() => setBoardView('mindmap')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-widest transition-colors ${
              boardView === 'mindmap'
                ? 'bg-white text-[#3C50B4] shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <GitBranch size={18} />
            Mind map
          </button>
        </div>
      </div>

      {boardView === 'kanban' ? (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex-1 min-h-0">
            <div className="flex h-full min-h-0 items-stretch gap-8 overflow-x-auto pb-6 custom-scrollbar pr-10">
              {COLUMNS.map((column) => (
                <SortableColumn
                  key={column.id}
                  column={column}
                  tasks={tasks.filter((t) => t.status === column.id)}
                  onTaskClick={onTaskClick}
                />
              ))}
            </div>
          </div>
          <DragOverlay>
            {activeId && activeTask ? (
              <div className="scale-[1.02] rotate-1">
                <TaskCard task={activeTask} onClick={() => {}} />
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
}
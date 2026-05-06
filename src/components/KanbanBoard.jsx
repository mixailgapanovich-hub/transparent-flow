import React, { useMemo, useState } from 'react';
import { 
  DndContext, closestCorners, KeyboardSensor, PointerSensor, 
  useSensor, useSensors, DragOverlay 
} from '@dnd-kit/core';
import { 
  SortableContext, sortableKeyboardCoordinates, 
  verticalListSortingStrategy, useSortable 
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Clock, Plus, Edit2, Paperclip, Settings2, LayoutGrid, GitBranch } from 'lucide-react';
import { COLUMNS } from '../data/mockData';
import TasksMindMapView from './TasksMindMapView';

const COLUMN_STYLES = {
  backlog: {
    headerText: 'text-slate-600',
    iconText: 'text-slate-400 hover:text-slate-600',
    container: 'bg-slate-100/70 border border-slate-200/80',
  },
  'to-do': {
    headerText: 'text-blue-700',
    iconText: 'text-blue-300 hover:text-blue-600',
    container: 'bg-blue-50/70 border border-blue-100',
  },
  'in-progress': {
    headerText: 'text-violet-700',
    iconText: 'text-violet-300 hover:text-violet-600',
    container: 'bg-violet-50/60 border border-violet-100',
  },
  waiting: {
    headerText: 'text-orange-700',
    iconText: 'text-orange-400 hover:text-orange-600',
    container: 'bg-orange-50/70 border border-orange-200/80',
  },
  done: {
    headerText: 'text-emerald-700',
    iconText: 'text-emerald-300 hover:text-emerald-600',
    container: 'bg-emerald-50/60 border border-emerald-100',
  },
};

const Badge = ({ type }) => {
  const styles = {
    'Блокирующая': 'bg-red-500 text-white',
    'Ключевая': 'bg-[#FFD700] text-slate-900',
    'Обычная': 'bg-slate-100 text-slate-500',
  };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-tight ${styles[type]}`}>
      {type === 'Блокирующая' ? '🔴 ' : type === 'Ключевая' ? '🟡 ' : '⚪ '}{type}
    </span>
  );
};

const TaskCard = ({ task, onClick, isWaitingCol }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = { transform: CSS.Translate.toString(transform), transition, opacity: isDragging ? 0.3 : 1 };

  const isUrgent = useMemo(() => {
    const diff = new Date(task.deadline) - new Date();
    return diff > 0 && diff < 24 * 60 * 60 * 1000;
  }, [task.deadline]);

  return (
    <div
      ref={setNodeRef} style={style} {...attributes} {...listeners}
      onClick={() => onClick(task)}
      className={`group relative p-4 rounded-xl border transition-all cursor-grab mb-3 
        ${isWaitingCol ? 'bg-slate-50/80 border-slate-200' : 'bg-white border-slate-100 shadow-sm hover:border-[#3C50B4]/30'}`}
    >
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button className="p-1.5 bg-white border border-slate-200 rounded-md hover:text-[#3C50B4]"><Edit2 size={12} /></button>
      </div>
      <div className="flex justify-between items-start mb-2">
        <Badge type={task.tag} />
        {isWaitingCol && <Clock size={14} className="text-slate-400" />}
      </div>
      <h4 className={`text-sm font-semibold mb-3 leading-tight ${isWaitingCol ? 'text-slate-500' : 'text-slate-800'}`}>{task.title}</h4>
      <div className="flex items-center justify-between mt-auto">
        <div className={`flex items-center text-[11px] font-medium ${isUrgent ? 'text-red-500 font-bold' : 'text-slate-400'}`}>
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
  const columnStyle = COLUMN_STYLES[column.id] ?? COLUMN_STYLES.backlog;

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

export default function KanbanBoard({ tasks, setTasks, onTaskClick, activeId, setActiveId }) {
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
    const newStatus = COLUMNS.find(c => c.id === overId) ? overId : tasks.find(t => t.id === overId).status;
    setTasks(prev => prev.map(t => t.id === active.id ? { ...t, status: newStatus } : t));
    setActiveId(null);
  };

  const activeTask = useMemo(() => tasks.find(t => t.id === activeId), [activeId, tasks]);

  return (
    <div className="h-full min-h-0 flex flex-col">
      <div className="mb-8 flex w-full flex-wrap items-center justify-between gap-4">
        <button className="bg-[#3C50B4] text-white px-8 py-4 rounded-2xl font-bold shadow-xl shadow-blue-100 flex items-center gap-2">
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
              <div className="opacity-80 scale-105 rotate-2">
                <TaskCard task={activeTask} onClick={() => {}} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <TasksMindMapView tasks={tasks} />
        </div>
      )}
    </div>
  );
}
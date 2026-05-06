import React, { useMemo } from 'react';
import { 
  DndContext, closestCorners, KeyboardSensor, PointerSensor, 
  useSensor, useSensors, DragOverlay 
} from '@dnd-kit/core';
import { 
  SortableContext, sortableKeyboardCoordinates, 
  verticalListSortingStrategy, useSortable 
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Clock, Plus, Edit2, ArrowRightLeft, Paperclip } from 'lucide-react';
import { COLUMNS } from '../data/mockData';

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

  return (
    <div className="flex flex-col w-72 min-w-[280px]">
      <div className="flex items-center justify-between mb-4 px-1">
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">{column.title}</h3>
        <button className="text-slate-300 hover:text-[#3C50B4]"><Plus size={18} /></button>
      </div>
      <div ref={setNodeRef} className={`flex-1 rounded-2xl p-2 min-h-[500px] ${isWaiting ? 'bg-slate-100/50' : 'bg-slate-50/50'}`}>
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map(task => <TaskCard key={task.id} task={task} onClick={onTaskClick} isWaitingCol={isWaiting} />)}
        </SortableContext>
      </div>
    </div>
  );
};

export default function KanbanBoard({ tasks, setTasks, onTaskClick, activeId, setActiveId }) {
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
    <>
      <div className="mb-8 flex items-center gap-4">
        <button className="bg-[#3C50B4] text-white px-8 py-4 rounded-2xl font-bold shadow-xl shadow-blue-100 flex items-center gap-2">
          <Plus size={20} /> Создать задачу
        </button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-8 overflow-x-auto pb-12 custom-scrollbar pr-10">
          {COLUMNS.map(column => (
            <SortableColumn key={column.id} column={column} tasks={tasks.filter(t => t.status === column.id)} onTaskClick={onTaskClick} />
          ))}
        </div>
        <DragOverlay>
          {activeId ? <div className="opacity-80 scale-105 rotate-2"><TaskCard task={activeTask} onClick={() => {}} /></div> : null}
        </DragOverlay>
      </DndContext>
    </>
  );
}
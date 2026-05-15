import { useCallback, useEffect, useState } from 'react';
import { Bell, Search } from 'lucide-react';
import Sidebar from './components/Sidebar';
import KanbanBoard from './components/KanbanBoard';
import RightPanel from './components/RightPanel';
import TaskModal from './components/task-modal/TaskModal';
import GuestUploadPage from './components/GuestUploadPage';
import { INITIAL_TASKS } from './data/mockData';
import { canTransitionStatus } from './utils/taskWorkflow';
import ProjectsView from './components/ProjectsView';
import KnowledgeBase from './components/KnowledgeBase';
import SettingsModal from './components/SettingsModal';

export default function App() {
  const isAdmin = true;
  const [activeTab, setActiveTab] = useState('dashboard');
  const [tasks, setTasks] = useState(INITIAL_TASKS);
  const [activeId, setActiveId] = useState(null);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [guestTaskId, setGuestTaskId] = useState(null);

  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? null;

  const openTask = (taskId) => {
    setSelectedTaskId(taskId);
  };

  const closeTask = () => {
    setSelectedTaskId(null);
  };

  const createTask = useCallback(() => {
    const nextId = String(Math.max(...tasks.map((task) => Number(task.id)), 0) + 1);
    const newTask = {
      id: nextId,
      projectId: 'proj-eco',
      title: 'Новая задача',
      status: 'backlog',
      tag: 'Обычная',
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      description: '',
      hasFiles: false,
      history: [{ date: new Date().toISOString(), text: 'Задача создана вручную' }],
      dependsOn: [],
      files: [],
      comments: [],
      assignees: [{ id: 'pm-1', name: 'Adena Admin', initials: 'AA' }],
      magicLink: '',
      isImportant: false,
    };
    setTasks((prev) => [newTask, ...prev]);
    setSelectedTaskId(nextId);
  }, [tasks]);

  const updateTask = (taskId, patch) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) => {
        if (task.id !== taskId) return task;
        return {
          ...task,
          ...patch,
          history: [
            ...(task.history ?? []),
            {
              date: new Date().toISOString(),
              text: 'Обновлено из модального окна',
            },
          ],
        };
      })
    );
  };

  const updateTaskStatus = (taskId, nextStatus) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) => {
        if (task.id !== taskId) return task;
        if (!canTransitionStatus(task.status, nextStatus, { isAdmin })) return task;
        return {
          ...task,
          status: nextStatus,
          history: [
            ...(task.history ?? []),
            { date: new Date().toISOString(), text: `Статус изменён: ${nextStatus}` },
          ],
        };
      })
    );
  };

  const appendTaskComment = (taskId, message) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) => {
        if (task.id !== taskId) return task;
        return {
          ...task,
          comments: [
            ...(task.comments ?? []),
            {
              id: `${task.id}-c${(task.comments ?? []).length + 1}`,
              author: 'pm',
              name: 'PM',
              message,
              at: new Date().toISOString(),
            },
          ],
        };
      })
    );
  };

  const addTaskAssignee = (taskId, assignee) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) => {
        if (task.id !== taskId) return task;
        const exists = (task.assignees ?? []).some((item) => item.id === assignee.id);
        if (exists) return task;
        return { ...task, assignees: [...(task.assignees ?? []), assignee] };
      })
    );
  };

  const requestClientUpdate = async (taskId) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    setTasks((prevTasks) =>
      prevTasks.map((task) => {
        if (task.id !== taskId) return task;
        const magicLink = `https://client.transparent-flow.app/task/${task.id}?token=${crypto.randomUUID()}`;
        return {
          ...task,
          status: 'waiting',
          magicLink,
          history: [
            ...(task.history ?? []),
            { date: new Date().toISOString(), text: 'Запрос отправлен клиенту' },
          ],
        };
      })
    );
  };

  const handleGuestUpload = (taskId, uploadedFiles, comment) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) => {
        if (task.id !== taskId) return task;
        const newFiles = uploadedFiles.map((f, i) => ({
          id: `${task.id}-gf${i + 1}-${Date.now()}`,
          name: f.name,
          size: `${(f.size / (1024 * 1024)).toFixed(1)} MB`,
        }));
        const newComments = comment.trim()
          ? [
              ...(task.comments ?? []),
              {
                id: `${task.id}-gc-${Date.now()}`,
                author: 'client',
                name: 'Клиент',
                message: comment.trim(),
                at: new Date().toISOString(),
              },
            ]
          : task.comments ?? [];
        return {
          ...task,
          status: 'client-uploaded',
          files: [...(task.files ?? []), ...newFiles],
          comments: newComments,
          history: [
            ...(task.history ?? []),
            { date: new Date().toISOString(), text: `Клиент загрузил материалы (${uploadedFiles.length} файл(ов))` },
          ],
        };
      })
    );
    setGuestTaskId(null);
  };

  useEffect(() => {
    const handleHotkeys = (event) => {
      const target = event.target;
      const isTyping =
        target instanceof HTMLElement &&
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);

      if (isTyping) return;
      if (event.key.toLowerCase() === 'n') {
        event.preventDefault();
        createTask();
      }
    };

    window.addEventListener('keydown', handleHotkeys);
    return () => window.removeEventListener('keydown', handleHotkeys);
  }, [createTask]);

  if (guestTaskId !== null) {
    const guestTask = tasks.find((t) => t.id === guestTaskId) ?? null;
    return (
      <GuestUploadPage
        task={guestTask}
        onClose={() => setGuestTaskId(null)}
        onUploaded={(files, comment) => handleGuestUpload(guestTaskId, files, comment)}
      />
    );
  }

  return (
    // Главный контейнер на весь экран без прокрутки самого окна
    <div className="flex h-screen w-screen bg-white text-slate-800 font-montserrat overflow-hidden">
      
      {/* 1. Левый сайдбар — теперь он просто занимает свои 96 пикселей, ни на что не наступая */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} 
      onSettingsClick={() => setIsSettingsOpen(true)}
     
      />

      {/* 2. Основной контент (Центр + Право) */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        
        {/* Header — зафиксирован сверху */}
        <header className="h-20 border-b border-slate-100 flex items-center justify-between px-8 bg-white z-10">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-black text-slate-900 font-machine tracking-tighter">Прозрачный поток</h1>
            <div className="px-3 py-1 bg-[#3C50B4]/5 text-[#3C50B4] text-[10px] font-black rounded-lg uppercase tracking-widest border border-[#3C50B4]/10">
              Agency Mode
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative hidden xl:block">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
              <input className="bg-slate-50 border-none rounded-xl pl-10 pr-4 py-2 text-sm w-80 focus:ring-2 focus:ring-[#3C50B4]/20 transition-all" placeholder="Поиск по проектам и задачам..." />
            </div>

            <button className="relative p-2 text-slate-400 hover:text-[#3C50B4] transition-colors">
              <Bell size={22} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>

            <div className="flex items-center gap-3 pl-6 border-l border-slate-100">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-black text-slate-800 leading-none">Adena Admin</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest">Producer</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#FFD700] flex items-center justify-center font-black text-[#3C50B4] shadow-md shadow-yellow-100 border-2 border-white">
                AA
              </div>
            </div>
          </div>
        </header>

        {/* 3. Рабочее пространство (Ниже хедера) */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* КАНБАН-ЗОНА: Выделяем цветом и отступами */}
          <main className="flex-1 bg-[#F8FAFC] p-6 overflow-hidden flex flex-col">
            
            {/* Оболочка самого канбана — "белая доска" на сером фоне */}
            <div className="flex-1 bg-white rounded-4xl border border-slate-200/60 shadow-sm flex flex-col overflow-hidden">
              
              {/* Внутренний скролл только для доски */}
              <div className="flex-1 overflow-x-auto p-8 custom-scrollbar">
  {activeTab === 'dashboard' ? (
    <KanbanBoard
      tasks={tasks.filter(t => !t.projectId || t.projectId === 'proj-eco')}
      setTasks={setTasks}
      onTaskClick={openTask}
      onCreateTask={createTask}
      isAdmin={isAdmin}
      activeId={activeId}
      setActiveId={setActiveId}
    />
  ) : activeTab === 'tasks' ? (
    <KanbanBoard
      tasks={tasks}
      setTasks={setTasks}
      onTaskClick={openTask}
      onCreateTask={createTask}
      isAdmin={isAdmin}
      activeId={activeId}
      setActiveId={setActiveId}
      showProjectBadge
      showColumnFilter
    />
  ) : activeTab === 'projects' ? (
    <ProjectsView />
  ) : activeTab === 'kb' ? (
    <KnowledgeBase />
  ) : (
    <div className="flex items-center justify-center h-full text-slate-300 font-machine text-2xl">
      Раздел {activeTab} в разработке
    </div>
  )}
</div>
            </div>
          </main>

          {/* Правая панель (Utility Panel) */}
          <RightPanel />
        </div>
      </div>

      <TaskModal
        key={selectedTask?.id ?? 'empty-task-modal'}
        task={selectedTask}
        isAdmin={isAdmin}
        onClose={closeTask}
        onOpenGuestView={(taskId) => {
          setSelectedTaskId(null);
          setGuestTaskId(taskId);
        }}
        onRequestClient={async () => {
          if (!selectedTask) return null;
          await requestClientUpdate(selectedTask.id);
          return true;
        }}
        onSendComment={(message) => {
          if (!selectedTask) return;
          appendTaskComment(selectedTask.id, message);
        }}
        onAddAssignee={(assignee) => {
          if (!selectedTask) return;
          addTaskAssignee(selectedTask.id, assignee);
        }}
        onSave={(patch) => {
          if (!selectedTask) {
            window.alert('Не удалось сохранить: задача не найдена.');
            return;
          }
          if (patch.status && patch.status !== selectedTask.status) {
            updateTaskStatus(selectedTask.id, patch.status);
          }
          updateTask(selectedTask.id, patch);
          closeTask();
        }}
      />

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;900&display=swap');
        
        .font-machine { font-family: 'Montserrat', sans-serif; letter-spacing: -0.05em; text-transform: uppercase; }
        .font-montserrat { font-family: 'Montserrat', sans-serif; }
        
        /* Тонкий красивый скроллбар для рабочей зоны */
        .custom-scrollbar::-webkit-scrollbar { height: 10px; width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { 
          background: #E2E8F0; 
          border-radius: 20px; 
          border: 3px solid white; /* эффект отступа */
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #CBD5E1; }
      `}</style>
    </div>
  );
}
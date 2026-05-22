import { useCallback, useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import NotificationsDropdown from './components/NotificationsDropdown';
import Sidebar from './components/Sidebar';
import KanbanBoard from './components/KanbanBoard';
import RightPanel from './components/RightPanel';
import TaskModal from './components/task-modal/TaskModal';
import GuestUploadPage from './components/GuestUploadPage';
import { api } from './api/client';
import { PROJECT_BADGE_STYLES } from './theme/taskStyles';
import { canTransitionStatus } from './utils/taskWorkflow';
import ProjectsView from './components/ProjectsView';
import KnowledgeBase from './components/KnowledgeBase';
import SettingsModal from './components/SettingsModal';

export default function App() {
  const isAdmin = true;
  const [activeTab, setActiveTab] = useState('dashboard');
  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [tasksError, setTasksError] = useState(null);
  const [team, setTeam] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [guestToken, setGuestToken] = useState(null);
  const [projectFilter, setProjectFilter] = useState(null);

  // Подтягиваем задачи с бэка один раз при монтировании.
  // Мутации пока локальные (Итерация 2: read-only API).
  useEffect(() => {
    let cancelled = false;
    setTasksLoading(true);
    api.listTasks()
      .then((data) => {
        if (cancelled) return;
        setTasks(data);
        setTasksError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('[App] не удалось загрузить задачи:', err);
        setTasksError(err.message ?? 'Не удалось загрузить задачи');
      })
      .finally(() => {
        if (!cancelled) setTasksLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  // Команда — для выпадашки «назначить исполнителя» в TaskModal.
  useEffect(() => {
    api.listUsers()
      .then(setTeam)
      .catch((err) => console.error('[App] не удалось загрузить команду:', err));
  }, []);

  // Заменяет одну задачу в локальном state на свежий DTO с сервера.
  const replaceTask = useCallback((updatedTask) => {
    setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
  }, []);

  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? null;

  const openTask = (taskId) => {
    setSelectedTaskId(taskId);
  };

  const closeTask = () => {
    setSelectedTaskId(null);
  };

  const createTask = useCallback(async () => {
    try {
      const created = await api.createTask({
        projectSlug: 'proj-eco',
        title: 'Новая задача',
        description: '',
        tag: 'Обычная',
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
      setTasks((prev) => [created, ...prev]);
      setSelectedTaskId(created.id);
    } catch (err) {
      window.alert('Не удалось создать задачу: ' + (err.detail || err.message));
    }
  }, []);

  const updateTask = async (taskId, patch) => {
    try {
      const updated = await api.updateTask(taskId, patch);
      replaceTask(updated);
    } catch (err) {
      window.alert('Не удалось сохранить: ' + (err.detail || err.message));
    }
  };

  const updateTaskStatus = async (taskId, nextStatus) => {
    const before = tasks.find((t) => t.id === taskId);
    if (!before || before.status === nextStatus) return;
    if (!canTransitionStatus(before.status, nextStatus, { isAdmin })) return;

    // Оптимистично обновляем UI, чтобы drag-and-drop ощущался мгновенным.
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: nextStatus } : t)),
    );
    try {
      const updated = await api.transitionTask(taskId, nextStatus, { isAdmin });
      replaceTask(updated);
    } catch (err) {
      // Откатываем при ошибке (например, сервер вернул FSM violation).
      setTasks((prev) => prev.map((t) => (t.id === taskId ? before : t)));
      window.alert('Не удалось сменить статус: ' + (err.detail || err.message));
    }
  };

  const appendTaskComment = async (taskId, message) => {
    try {
      const updated = await api.addComment(taskId, {
        message,
        authorType: 'pm',
        authorName: 'PM',
      });
      replaceTask(updated);
    } catch (err) {
      window.alert('Не удалось отправить комментарий: ' + (err.detail || err.message));
    }
  };

  const addTaskAssignee = async (taskId, assignee) => {
    try {
      const updated = await api.addAssignee(taskId, assignee.id);
      replaceTask(updated);
    } catch (err) {
      window.alert('Не удалось назначить исполнителя: ' + (err.detail || err.message));
    }
  };

  const requestClientUpdate = async (taskId) => {
    try {
      const updated = await api.requestClient(taskId);
      replaceTask(updated);
    } catch (err) {
      window.alert('Не удалось запросить материалы: ' + (err.detail || err.message));
    }
  };

  // Колбэк от гостевой страницы: сервер уже принял файлы и сменил статус.
  // Здесь только обновляем локальный кэш задачи свежим DTO.
  const handleGuestUploaded = (updatedTask) => {
    replaceTask(updatedTask);
    setGuestToken(null);
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

  if (guestToken !== null) {
    return (
      <GuestUploadPage
        token={guestToken}
        onClose={() => setGuestToken(null)}
        onUploaded={handleGuestUploaded}
      />
    );
  }

  return (
    // Главный контейнер на весь экран без прокрутки самого окна
    <div className="flex h-screen w-screen bg-white text-slate-800 font-montserrat overflow-hidden">
      
      {/* 1. Левый сайдбар — теперь он просто занимает свои 96 пикселей, ни на что не наступая */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => { setActiveTab(tab); setProjectFilter(null); }}
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
            <div className="relative">
              <button
                onClick={() => setIsNotificationsOpen((v) => !v)}
                className="relative p-2 text-slate-400 hover:text-[#3C50B4] transition-colors"
              >
                <Bell size={22} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
              </button>
              {isNotificationsOpen && (
                <NotificationsDropdown onClose={() => setIsNotificationsOpen(false)} />
              )}
            </div>

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
  {(activeTab === 'dashboard' || activeTab === 'tasks') && tasksLoading ? (
    <div className="flex items-center justify-center h-full text-slate-400 font-machine text-sm">
      Загружаем задачи...
    </div>
  ) : (activeTab === 'dashboard' || activeTab === 'tasks') && tasksError ? (
    <div className="flex flex-col items-center justify-center h-full text-red-500 text-sm gap-3">
      <div className="font-machine text-base">Ошибка загрузки</div>
      <div className="text-slate-500">{tasksError}</div>
      <div className="text-[10px] text-slate-400 uppercase tracking-widest">
        Проверьте, что API запущен: <code>cd api && npm run dev</code>
      </div>
    </div>
  ) : activeTab === 'dashboard' ? (
    <KanbanBoard
      tasks={tasks.filter(t => !t.projectId || t.projectId === 'proj-eco')}
      setTasks={setTasks}
      onChangeStatus={updateTaskStatus}
      onTaskClick={openTask}
      onCreateTask={createTask}
      isAdmin={isAdmin}
      activeId={activeId}
      setActiveId={setActiveId}
    />
  ) : activeTab === 'tasks' ? (
    <KanbanBoard
      tasks={projectFilter ? tasks.filter(t => t.projectId === projectFilter) : tasks}
      setTasks={setTasks}
      onChangeStatus={updateTaskStatus}
      onTaskClick={openTask}
      onCreateTask={createTask}
      isAdmin={isAdmin}
      activeId={activeId}
      setActiveId={setActiveId}
      showProjectBadge
      showColumnFilter
      projectFilterLabel={projectFilter ? (PROJECT_BADGE_STYLES[projectFilter]?.label ?? projectFilter) : null}
      onClearProjectFilter={() => setProjectFilter(null)}
    />
  ) : activeTab === 'projects' ? (
    <ProjectsView onOpenProject={(id) => { setProjectFilter(id); setActiveTab('tasks'); }} />
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
          <RightPanel onCreateTask={createTask} onOpenKb={() => setActiveTab('kb')} />
        </div>
      </div>

      <TaskModal
        key={selectedTask?.id ?? 'empty-task-modal'}
        task={selectedTask}
        team={team}
        isAdmin={isAdmin}
        onClose={closeTask}
        onOpenGuestView={() => {
          // Извлекаем magic-токен из URL, который сервер положил в task.magicLink
          // (формат https://.../task/<id>?token=<uuid>). Если токена нет — кнопка
          // и так задизейблена в TaskModal, сюда мы не попадём.
          const link = selectedTask?.magicLink;
          if (!link) return;
          try {
            const token = new URL(link).searchParams.get('token');
            if (!token) return;
            setSelectedTaskId(null);
            setGuestToken(token);
          } catch {
            // ignore — некорректный URL
          }
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
        onSave={async (patch) => {
          if (!selectedTask) {
            window.alert('Не удалось сохранить: задача не найдена.');
            return;
          }
          // Сначала статус (если меняется) — отдельный эндпоинт с FSM-проверкой,
          // потом поля. Если статус упал — поля не трогаем.
          if (patch.status && patch.status !== selectedTask.status) {
            await updateTaskStatus(selectedTask.id, patch.status);
          }
          const { status, ...fieldsPatch } = patch;
          if (Object.keys(fieldsPatch).length > 0) {
            await updateTask(selectedTask.id, fieldsPatch);
          }
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
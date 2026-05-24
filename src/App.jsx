import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, LogOut } from 'lucide-react';
import NotificationsDropdown from './components/NotificationsDropdown';
import Sidebar from './components/Sidebar';
import KanbanBoard from './components/KanbanBoard';
import RightPanel from './components/RightPanel';
import TaskModal from './components/task-modal/TaskModal';
import GuestUploadPage from './components/GuestUploadPage';
import LoginScreen from './components/LoginScreen';
import { api } from './api/client';
import { PROJECT_BADGE_STYLES } from './theme/taskStyles';
import { useToastState, ToastContainer } from './components/Toast';
import { canTransitionStatus } from './utils/taskWorkflow';
import ProjectsView from './components/ProjectsView';
import KnowledgeBase from './components/KnowledgeBase';
import SettingsModal from './components/SettingsModal';
import BottomNav from './components/BottomNav';

export default function App() {
  // null = не проверяли, undefined = не залогинен, объект = авторизованный юзер
  const [currentUser, setCurrentUser] = useState(null);
  const isAdmin = currentUser?.role === 'admin';
  const [activeTab, setActiveTab] = useState('dashboard');
  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [tasksError, setTasksError] = useState(null);
  const [projects, setProjects] = useState([]);
  const [team, setTeam] = useState([]);
  const [botUsername, setBotUsername] = useState(null);
  const [activeId, setActiveId] = useState(null);
  // pendingByTaskId: Map<id, lastRequestedStatus> — защита от race в optimistic updates
  const pendingByTaskId = useRef(new Map());
  const { toasts, showToast } = useToastState();
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSavingTask, setIsSavingTask] = useState(false);
  const [guestToken, setGuestToken] = useState(null);
  const [projectFilter, setProjectFilter] = useState(null);

  // 1) Проверка сессии при загрузке: тянем /me. 401 → отрисуем LoginScreen.
  const [authChecked, setAuthChecked] = useState(false);
  useEffect(() => {
    api.me()
      .then(({ user }) => setCurrentUser(user))
      .catch(() => setCurrentUser(undefined))
      .finally(() => setAuthChecked(true));
  }, []);

  // 2) Когда юзер появился — грузим задачи и команду. Если разлогинились — чистим state.
  useEffect(() => {
    if (!currentUser) {
      setTasks([]);
      setTeam([]);
      setTasksLoading(false);
      return;
    }
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
    api.listUsers()
      .then((data) => { if (!cancelled) setTeam(data); })
      .catch((err) => console.error('[App] не удалось загрузить команду:', err));
    api.listProjects()
      .then((data) => { if (!cancelled) setProjects(data); })
      .catch((err) => console.error('[App] не удалось загрузить проекты:', err));
    api.botInfo()
      .then((info) => { if (!cancelled) setBotUsername(info?.configured ? info.botUsername : null); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [currentUser]);

  const handleLogout = async () => {
    try { await api.logout(); } catch { /* ignore — лучше всё равно выкинем */ }
    setCurrentUser(undefined);
  };

  // Заменяет одну задачу в локальном state на свежий DTO с сервера.
  const replaceTask = useCallback((updatedTask) => {
    setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
  }, []);

  // Временный ID черновика — никогда не попадёт в БД
  const DRAFT_ID = '__new_task_draft__';

  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? null;

  const openTask = (taskId) => {
    setSelectedTaskId(taskId);
  };

  const closeTask = useCallback(() => {
    // Если модалка закрыта без сохранения — выкидываем черновик из списка
    setTasks((prev) => prev.filter((t) => t.id !== DRAFT_ID));
    setSelectedTaskId(null);
  }, []);

  // Мгновенно открывает модалку с пустым черновиком — POST летит только при Save
  const createTask = useCallback(() => {
    const draft = {
      id: DRAFT_ID,
      projectId: 'proj-eco',
      title: '',
      status: 'backlog',
      tag: 'Обычная',
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      description: '',
      dependsOn: [],
      files: [],
      comments: [],
      assignees: [],
      history: [],
      magicLink: '',
      isImportant: false,
    };
    setTasks((prev) => [draft, ...prev]);
    setSelectedTaskId(DRAFT_ID);
  }, []);

  const updateTask = async (taskId, patch) => {
    try {
      const updated = await api.updateTask(taskId, patch);
      replaceTask(updated);
    } catch (err) {
      showToast('error', 'Не удалось сохранить: ' + (err.detail || err.message));
    }
  };

  const updateTaskStatus = async (taskId, nextStatus) => {
    const before = tasks.find((t) => t.id === taskId);
    if (!before || before.status === nextStatus) return;
    if (!canTransitionStatus(before.status, nextStatus, { isAdmin })) return;

    // Оптимистично обновляем UI, чтобы drag-and-drop ощущался мгновенным.
    pendingByTaskId.current.set(taskId, nextStatus);
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: nextStatus } : t)),
    );
    try {
      const updated = await api.transitionTask(taskId, nextStatus, { isAdmin });
      // Если пока летел запрос юзер снова перетащил карточку — игнорируем устаревший ответ.
      if (pendingByTaskId.current.get(taskId) !== nextStatus) return;
      pendingByTaskId.current.delete(taskId);
      replaceTask(updated);
    } catch (err) {
      if (pendingByTaskId.current.get(taskId) === nextStatus) {
        pendingByTaskId.current.delete(taskId);
        setTasks((prev) => prev.map((t) => (t.id === taskId ? before : t)));
        showToast('error', 'Не удалось сменить статус: ' + (err.detail || err.message));
      }
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
      showToast('error', 'Не удалось отправить комментарий: ' + (err.detail || err.message));
    }
  };

  const addTaskAssignee = async (taskId, assignee) => {
    try {
      const updated = await api.addAssignee(taskId, assignee.id);
      replaceTask(updated);
    } catch (err) {
      showToast('error', 'Не удалось назначить исполнителя: ' + (err.detail || err.message));
    }
  };

  const requestClientUpdate = async (taskId) => {
    try {
      const updated = await api.requestClient(taskId);
      replaceTask(updated);
    } catch (err) {
      showToast('error', 'Не удалось запросить материалы: ' + (err.detail || err.message));
    }
  };

  const acceptContent = async (taskId) => {
    try {
      const updated = await api.acceptContent(taskId);
      replaceTask(updated);
      showToast('success', 'Контент принят. Клиенту отправлено подтверждающее письмо.');
    } catch (err) {
      showToast('error', 'Не удалось принять контент: ' + (err.detail || err.message));
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

  // Гостевая страница доступна без логина — она по magic-токену.
  if (guestToken !== null) {
    return (
      <GuestUploadPage
        token={guestToken}
        onClose={() => setGuestToken(null)}
        onUploaded={handleGuestUploaded}
      />
    );
  }

  // Пока не выяснили, есть ли активная сессия — короткий блокирующий заглушка.
  if (!authChecked) {
    return (
      <div className="min-h-screen w-screen flex items-center justify-center bg-[#F8FAFC] text-slate-400 font-montserrat text-sm">
        Проверяем сессию…
      </div>
    );
  }

  // Не залогинен — отдаём экран входа.
  if (!currentUser) {
    return <LoginScreen onSuccess={setCurrentUser} />;
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
        
        {/* Header — адаптивный: h-14 на мобилке, h-20 на десктопе */}
        <header className="h-14 md:h-20 border-b border-slate-100 flex items-center justify-between px-4 md:px-8 bg-white z-10 shrink-0">
          <div className="flex items-center gap-2 md:gap-4">
            <h1 className="text-base md:text-2xl font-black text-slate-900 font-machine tracking-tighter">Прозрачный поток</h1>
            <div className="hidden md:block px-3 py-1 bg-[#3C50B4]/5 text-[#3C50B4] text-[10px] font-black rounded-lg uppercase tracking-widest border border-[#3C50B4]/10">
              Agency Mode
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-6">
            <div className="relative">
              <button
                onClick={() => setIsNotificationsOpen((v) => !v)}
                className="relative p-2 text-slate-400 hover:text-[#3C50B4] transition-colors"
                aria-label="Уведомления"
              >
                <Bell size={20} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
              </button>
              {isNotificationsOpen && (
                <NotificationsDropdown isAdmin={isAdmin} onClose={() => setIsNotificationsOpen(false)} onToast={showToast} />
              )}
            </div>

            <div className="flex items-center gap-2 md:gap-3 md:pl-6 md:border-l border-slate-100">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-black text-slate-800 leading-none">{currentUser.name}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest">
                  {currentUser.role === 'admin' ? 'Admin' : 'Producer'}
                </p>
              </div>
              <button
                onClick={() => setIsSettingsOpen(true)}
                title="Настройки"
                className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-[#FFD700] flex items-center justify-center font-black text-[#3C50B4] shadow-md shadow-yellow-100 border-2 border-white text-xs md:text-sm hover:scale-105 transition-transform active:scale-95"
              >
                {currentUser.name?.split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || '?'}
              </button>
              <button
                onClick={handleLogout}
                title="Выйти"
                className="hidden md:flex p-2 text-slate-400 hover:text-[#3C50B4] transition-colors"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </header>

        {/* 3. Рабочее пространство (Ниже хедера) */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* КАНБАН-ЗОНА: Выделяем цветом и отступами */}
          <main className="flex-1 bg-[#F8FAFC] p-2 md:p-6 overflow-hidden flex flex-col">

            {/* Оболочка самого канбана — "белая доска" на сером фоне */}
            <div className="flex-1 bg-white rounded-2xl md:rounded-4xl border border-slate-200/60 shadow-sm flex flex-col overflow-hidden">

              {/* Внутренний скролл только для доски */}
              <div className="flex-1 overflow-auto p-3 md:p-8 pb-20 md:pb-8 custom-scrollbar">
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
    <ProjectsView projects={projects} onOpenProject={(id) => { setProjectFilter(id); setActiveTab('tasks'); }} />
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
        isSaving={isSavingTask}
        team={team}
        botUsername={botUsername}
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
        onRequestTelegramLink={selectedTask?.clientId ? () => api.requestTelegramLink(selectedTask.clientId) : undefined}
        onSendComment={(message) => {
          if (!selectedTask) return;
          appendTaskComment(selectedTask.id, message);
        }}
        onAddAssignee={(assignee) => {
          if (!selectedTask) return;
          addTaskAssignee(selectedTask.id, assignee);
        }}
        onAcceptContent={() => {
          if (!selectedTask) return;
          acceptContent(selectedTask.id);
        }}
        onSave={async (patch) => {
          // Черновик — создаём задачу через POST
          if (selectedTaskId === DRAFT_ID) {
            setIsSavingTask(true);
            try {
              const created = await api.createTask({
                projectSlug: 'proj-eco',
                title: patch.title || 'Новая задача',
                description: patch.description ?? '',
                tag: patch.tag ?? 'Обычная',
                deadline: patch.deadline ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
              });
              // Заменяем черновик реальной задачей и закрываем без удаления
              setTasks((prev) => prev.map((t) => (t.id === DRAFT_ID ? created : t)));
              setSelectedTaskId(null);
            } catch (err) {
              showToast('error', 'Не удалось создать задачу: ' + (err.detail || err.message));
            } finally {
              setIsSavingTask(false);
            }
            return;
          }
          // Существующая задача — обновляем
          if (!selectedTask) {
            showToast('error', 'Не удалось сохранить: задача не найдена.');
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

      <ToastContainer toasts={toasts} />

      <BottomNav
        activeTab={activeTab}
        onTabChange={(tab) => { setActiveTab(tab); setProjectFilter(null); }}
        onOpenSettings={() => setIsSettingsOpen(true)}
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
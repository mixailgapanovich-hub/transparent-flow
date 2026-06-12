import { useCallback, useEffect, useState } from 'react';
import { CloudUpload, HelpCircle, Lightbulb, MessageCircle, BookOpen, LayoutGrid, Bell, Info } from 'lucide-react';
import { api } from '../../api/client';
import KanbanBoard from '../KanbanBoard';
import TaskModal from '../task-modal/TaskModal';
import KnowledgeBase from '../KnowledgeBase';
import SendContentModal from './SendContentModal';
import AskQuestionModal from './AskQuestionModal';
import SuggestTaskModal from './SuggestTaskModal';
import ActionPanel from './ActionPanel';
import ProjectInfoModal from '../project-info/ProjectInfoModal';
import NotificationsPage from '../notifications/NotificationsPage';
import { useToastState, ToastContainer } from '../Toast';

// Иконка-действие в шапке (как у PM-вида) — единый стиль с тултипом.
function HeaderAction({ icon: Icon, label, onClick, color = 'hover:text-[#3C50B4]' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`p-2 text-slate-400 transition-colors ${color}`}
    >
      <Icon size={20} />
    </button>
  );
}

export default function ClientApp({ token }) {
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [view, setView] = useState('board'); // 'board' | 'kb'
  const [modal, setModal] = useState(null); // 'send' | 'ask' | 'suggest'
  const [uploadTaskId, setUploadTaskId] = useState(null);
  const [activeId, setActiveId] = useState(null); // dnd: переупорядочивание в своей колонке
  const [notifOpen, setNotifOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { toasts, showToast } = useToastState();

  useEffect(() => {
    let cancelled = false;
    api.client.get(token)
      .then((d) => { if (!cancelled) { setData(d); setTasks(d.tasks ?? []); } })
      .catch((err) => { if (!cancelled) setLoadError(err.detail || err.message || 'Ошибка загрузки'); });
    return () => { cancelled = true; };
  }, [token]);

  // Бейдж непрочитанного на колокольчике клиента.
  useEffect(() => {
    let cancelled = false;
    api.client.notifications(token, { limit: 1 })
      .then((r) => { if (!cancelled) setUnreadCount(r.counts?.total ?? 0); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [token, notifOpen]);

  const selectedTask = tasks.find((t) => t.id === selectedTaskId) ?? null;
  const replaceTask = useCallback((updated) => {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  }, []);

  // Раскладка майндмапа клиента (audience='client') — стабильные ссылки.
  const loadLayout = useCallback(() => api.client.getLayout(token), [token]);
  const saveLayout = useCallback((positions) => api.client.saveLayout(token, positions), [token]);

  const sendComment = async (message, anchor) => {
    if (!selectedTask) return;
    try {
      const updated = await api.client.comment(token, selectedTask.id, { message, anchor });
      replaceTask(updated);
    } catch (err) {
      showToast('error', 'Не удалось отправить комментарий: ' + (err.detail || err.message));
    }
  };

  const approveReview = async () => {
    if (!selectedTask) return;
    try {
      const updated = await api.client.approve(token, selectedTask.id);
      replaceTask(updated);
      showToast('success', 'Вы одобрили результат — менеджеру отправлено подтверждение');
    } catch (err) {
      showToast('error', 'Не удалось одобрить: ' + (err.detail || err.message));
      throw err;
    }
  };

  const requestChanges = async (comment) => {
    if (!selectedTask) return;
    try {
      const updated = await api.client.requestChanges(token, selectedTask.id, comment);
      replaceTask(updated);
      showToast('info', 'Отправлено на доработку менеджеру');
    } catch (err) {
      showToast('error', 'Не удалось отправить: ' + (err.detail || err.message));
      throw err;
    }
  };

  const openUpload = (taskId) => { setUploadTaskId(taskId); setSelectedTaskId(null); setModal('send'); };

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] font-montserrat px-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 max-w-md text-center space-y-3">
          <h1 className="text-xl font-black text-slate-900">Доступ недоступен</h1>
          <p className="text-sm text-slate-500">{loadError}</p>
          <p className="text-xs text-slate-400">Запросите у менеджера новую ссылку доступа.</p>
        </div>
        <style>{`.font-montserrat{font-family:'Montserrat',sans-serif;}`}</style>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] text-slate-400 font-montserrat text-sm">
        Загружаем проект…
        <style>{`.font-montserrat{font-family:'Montserrat',sans-serif;}`}</style>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen bg-white text-slate-800 font-montserrat overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 md:h-20 border-b border-slate-100 flex items-center justify-between px-4 md:px-8 bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-[#FFD700] flex items-center justify-center font-black text-[#3C50B4] text-sm">А</div>
            <div>
              <h1 className="text-sm md:text-lg font-black text-slate-900 leading-none">{data.project.name}</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Кабинет клиента</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setView('board')}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-colors ${view === 'board' ? 'bg-[#3C50B4] text-white' : 'text-slate-500 hover:text-slate-800'}`}
            >
              <LayoutGrid size={16} /> <span className="hidden sm:inline">Доска</span>
            </button>
            <button
              onClick={() => setView('kb')}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-colors ${view === 'kb' ? 'bg-[#3C50B4] text-white' : 'text-slate-500 hover:text-slate-800'}`}
            >
              <BookOpen size={16} /> <span className="hidden sm:inline">База знаний</span>
            </button>

            {/* Действия — иконками (десктоп); на мобиле остаётся нижняя панель */}
            <div className="hidden md:flex items-center gap-0.5 md:pl-2 md:ml-1 md:border-l border-slate-100">
              <HeaderAction icon={Info} label="О проекте" onClick={() => setInfoOpen(true)} />
              <HeaderAction icon={CloudUpload} label="Прислать контент" onClick={() => { setUploadTaskId(null); setModal('send'); }} />
              {data.supportChatUrl && (
                <HeaderAction icon={MessageCircle} label="Telegram-чат" color="hover:text-[#229ED9]" onClick={() => window.open(data.supportChatUrl, '_blank', 'noopener')} />
              )}
              <HeaderAction icon={HelpCircle} label="Задать вопрос" onClick={() => setModal('ask')} />
              <HeaderAction icon={Lightbulb} label="Предложить задачу" onClick={() => setModal('suggest')} />
            </div>

            <button
              onClick={() => setNotifOpen(true)}
              className="relative p-2 text-slate-400 hover:text-[#3C50B4] transition-colors"
              aria-label="Уведомления"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-black rounded-full border-2 border-white flex items-center justify-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          <main className="flex-1 bg-[#F8FAFC] p-2 md:p-6 overflow-hidden flex flex-col">
            <div className="flex-1 bg-white rounded-2xl md:rounded-4xl border border-slate-200/60 shadow-sm flex flex-col overflow-hidden">
              <div className="flex-1 overflow-auto p-3 md:p-8 custom-scrollbar">
                {view === 'board' ? (
                  <>
                    {/* «Требует вашего внимания» — баннером над доской на всю ширину */}
                    <ActionPanel tasks={tasks} onUpload={openUpload} onOpenTask={setSelectedTaskId} />
                    <KanbanBoard
                      tasks={tasks}
                      setTasks={setTasks}
                      onTaskClick={setSelectedTaskId}
                      readOnly
                      reorderable
                      createLabel="Предложить задачу"
                      onCreateTask={() => setModal('suggest')}
                      onLoadLayout={loadLayout}
                      onSaveLayout={saveLayout}
                      activeId={activeId}
                      setActiveId={setActiveId}
                    />
                  </>
                ) : (
                  <KnowledgeBase clientFacingOnly />
                )}
              </div>
            </div>
          </main>
        </div>

        {/* Мобильная панель действий */}
        <div className="lg:hidden flex items-center gap-2 border-t border-slate-100 bg-white px-3 py-2 overflow-x-auto shrink-0">
          <button onClick={() => setInfoOpen(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 shrink-0"><Info size={15} /> О проекте</button>
          <button onClick={() => { setUploadTaskId(null); setModal('send'); }} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#3C50B4] text-white text-xs font-bold shrink-0"><CloudUpload size={15} /> Контент</button>
          {data.supportChatUrl && <button onClick={() => window.open(data.supportChatUrl, '_blank', 'noopener')} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 shrink-0"><MessageCircle size={15} /> Чат</button>}
          <button onClick={() => setModal('ask')} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 shrink-0"><HelpCircle size={15} /> Вопрос</button>
          <button onClick={() => setModal('suggest')} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 shrink-0"><Lightbulb size={15} /> Задача</button>
        </div>
      </div>

      {selectedTask && (
        <TaskModal
          key={selectedTask.id}
          task={selectedTask}
          clientMode
          clientToken={token}
          onClose={() => setSelectedTaskId(null)}
          onSendComment={sendComment}
          onClientUpload={openUpload}
          onApproveReview={approveReview}
          onRequestChanges={requestChanges}
        />
      )}

      {modal === 'send' && (
        <SendContentModal
          token={token}
          tasks={tasks}
          initialTaskId={uploadTaskId}
          api={api}
          onClose={() => { setModal(null); setUploadTaskId(null); }}
          onUploaded={(updated) => {
            replaceTask(updated);
            setModal(null);
            setUploadTaskId(null);
            showToast('success', 'Материалы отправлены менеджеру');
          }}
        />
      )}
      {modal === 'ask' && (
        <AskQuestionModal
          onClose={() => setModal(null)}
          onSubmit={(text) => api.client.question(token, text)}
        />
      )}
      {modal === 'suggest' && (
        <SuggestTaskModal
          onClose={() => setModal(null)}
          onSubmit={(payload) => api.client.suggestTask(token, payload)}
        />
      )}

      {notifOpen && (
        <NotificationsPage
          source={{ kind: 'client', token }}
          onToast={showToast}
          onClose={() => setNotifOpen(false)}
        />
      )}

      {infoOpen && (
        <ProjectInfoModal
          mode="client"
          token={token}
          projectName={data.project.name}
          onClose={() => setInfoOpen(false)}
        />
      )}

      <ToastContainer toasts={toasts} />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;900&display=swap');
        .font-machine { font-family: 'Montserrat', sans-serif; letter-spacing: -0.05em; text-transform: uppercase; }
        .font-montserrat { font-family: 'Montserrat', sans-serif; }
        .custom-scrollbar::-webkit-scrollbar { height: 10px; width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 20px; border: 3px solid white; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #CBD5E1; }
      `}</style>
    </div>
  );
}

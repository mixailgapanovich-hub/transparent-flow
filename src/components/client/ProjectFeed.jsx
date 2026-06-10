// Единая лента проекта: все комментарии PM↔клиент по всем (не внутренним) задачам
// собраны в карточки-беседы. Данные — из task.comments в уже загруженном DTO; ответ
// уходит через api.client.comment (ClientApp прокидывает onReply) и обновляет задачу.

import { useState } from 'react';
import { MessageSquare, Send, Quote, ChevronRight, Loader2 } from 'lucide-react';

function timeOf(at) {
  const d = new Date(at);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function TaskThread({ task, onOpenTask, onReply }) {
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const comments = task.comments ?? [];

  const send = async () => {
    const msg = draft.trim();
    if (!msg || busy) return;
    setBusy(true);
    try {
      await onReply(task.id, msg);
      setDraft('');
    } catch {
      /* тост покажет ClientApp; черновик оставляем для повтора */
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-4">
      <button
        type="button"
        onClick={() => onOpenTask(task.id)}
        className="mb-3 flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="truncate text-sm font-black text-slate-800">{task.title}</span>
        <span className="flex shrink-0 items-center gap-0.5 text-[11px] font-bold uppercase tracking-wider text-[#3C50B4]">
          Открыть <ChevronRight size={12} />
        </span>
      </button>

      <div className="space-y-2">
        {comments.map((c) => (
          <div
            key={c.id}
            className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
              c.author === 'client'
                ? 'ml-auto bg-[#3C50B4] text-white'
                : 'mr-auto border border-slate-200 bg-slate-50 text-slate-700'
            }`}
          >
            <p className={`text-[11px] font-semibold ${c.author === 'client' ? 'text-blue-100' : 'text-slate-500'}`}>
              {c.name} · {timeOf(c.at)}
            </p>
            {c.anchor?.quote && (
              <p className={`mt-1 flex items-start gap-1 text-[11px] italic ${c.author === 'client' ? 'text-blue-100/90' : 'text-slate-400'}`}>
                <Quote size={11} className="mt-0.5 shrink-0" />
                <span className="line-clamp-2">{c.anchor.quote}</span>
              </p>
            )}
            <p className="mt-1">{c.message}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); send(); } }}
          placeholder="Ответить…"
          className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-[#3C50B4] focus:ring-2 focus:ring-[#3C50B4]/20"
        />
        <button
          type="button"
          onClick={send}
          disabled={busy || !draft.trim()}
          className="rounded-xl bg-[#3C50B4] p-2.5 text-white transition hover:brightness-95 disabled:opacity-50"
          aria-label="Отправить"
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
        </button>
      </div>
    </div>
  );
}

export default function ProjectFeed({ tasks, onOpenTask, onReply }) {
  const threads = (tasks ?? [])
    .filter((t) => (t.comments ?? []).length > 0)
    .map((t) => ({ task: t, last: Math.max(...t.comments.map((c) => new Date(c.at).getTime() || 0)) }))
    .sort((a, b) => b.last - a.last);

  if (threads.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-300">
        <MessageSquare size={40} strokeWidth={1.5} />
        <p className="text-sm font-semibold">Пока нет сообщений</p>
        <p className="text-[11px] text-slate-400">Комментарии по задачам появятся здесь</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-3">
      {threads.map(({ task }) => (
        <TaskThread key={task.id} task={task} onOpenTask={onOpenTask} onReply={onReply} />
      ))}
    </div>
  );
}

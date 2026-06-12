// Общие метаданные событий для центра уведомлений (PM и клиент).

export const CATEGORY_TABS = [
  { id: 'all', label: 'Все' },
  { id: 'comments', label: 'Комментарии' },
  { id: 'approvals', label: 'Согласования' },
  { id: 'escalation', label: 'Эскалация' },
  { id: 'acts', label: 'Акты' },
  { id: 'content', label: 'Контент' },
  { id: 'inbox', label: 'Предложения и вопросы' },
  { id: 'movement', label: 'Движение' },
];

const DOTS = {
  comment_added: 'bg-[#3C50B4]',
  notification_sent: 'bg-emerald-400',
  notification_failed: 'bg-red-400',
  cascade_exhausted: 'bg-orange-500',
  status_change: 'bg-sky-400',
  verification_email_sent: 'bg-[#3C50B4]',
  verification_email_failed: 'bg-red-400',
  content_accepted: 'bg-emerald-500',
  client_upload: 'bg-teal-400',
  task_suggested: 'bg-amber-400',
  client_question: 'bg-violet-400',
  review_requested: 'bg-indigo-500',
  review_approved: 'bg-emerald-500',
  review_changes_requested: 'bg-amber-500',
};

export function eventDot(ev) {
  return DOTS[ev.event_type] ?? 'bg-slate-300';
}

export function relativeTime(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return 'только что';
  if (min < 60) return `${min} мин назад`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} ч назад`;
  const d = Math.round(h / 24);
  return `${d} дн назад`;
}

const STATUS_LABEL = {
  backlog: 'Бэклог', 'to-do': 'К выполнению', 'in-progress': 'В работе',
  waiting: 'Ждём клиента', 'client-uploaded': 'Контент готов', done: 'Готово',
};

export function describeEvent(ev) {
  const title = ev.task_title || ev.project_name || '—';
  const p = ev.payload ?? {};
  switch (ev.event_type) {
    case 'comment_added': {
      const who = p.authorType === 'client' ? 'Клиент' : (p.authorName || 'Менеджер');
      return `${who}: «${p.excerpt ?? ''}» — ${title}`;
    }
    case 'notification_sent':
      return `Напоминание клиенту отправлено (уровень ${p.level ?? '?'}) — «${title}»`;
    case 'notification_failed':
      return `Напоминание не доставлено (уровень ${p.level ?? '?'}) — «${title}»`;
    case 'cascade_exhausted':
      return `Каскад исчерпан — «${title}». Нужен ручной контакт.`;
    case 'status_change':
      return `Статус: ${STATUS_LABEL[p.from] ?? p.from} → ${STATUS_LABEL[p.to] ?? p.to} — «${title}»`;
    case 'verification_email_sent':
      return `Акт приёмки отправлен клиенту — «${title}»`;
    case 'verification_email_failed':
      return `Акт не отправлен — «${title}»: ${p.error || 'без сообщения'}`;
    case 'content_accepted':
      return `Контент принят — «${title}»`;
    case 'review_requested':
      return `Отправлено на согласование клиенту — «${title}»`;
    case 'review_approved':
      return `Клиент одобрил результат — «${title}»`;
    case 'review_changes_requested':
      return `Клиент вернул на доработку${p.comment ? `: «${p.comment}»` : ''} — «${title}»`;
    case 'client_upload':
      return `Клиент загрузил материалы — «${title}»`;
    case 'task_suggested':
      return `Клиент предложил задачу: «${p.title ?? ''}» (${ev.project_name ?? ''})`;
    case 'client_question':
      return `Вопрос от клиента: «${p.text ?? ''}» (${ev.project_name ?? ''})`;
    default:
      return `${ev.event_type} — «${title}»`;
  }
}

export function previewUrlOf(ev) {
  if (ev.payload?.previewUrl) return ev.payload.previewUrl;
  return ev.payload?.deliveries?.email?.previewUrl ?? null;
}

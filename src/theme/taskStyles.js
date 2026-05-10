export const TASK_COLUMN_STYLES = {
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

export const TASK_STATUS_RING = {
  backlog: 'ring-slate-200',
  'to-do': 'ring-blue-200',
  'in-progress': 'ring-violet-200',
  waiting: 'ring-orange-200',
  done: 'ring-emerald-200',
};

export const TASK_TAG_BADGE = {
  Блокирующая: 'bg-red-500 text-white',
  Ключевая: 'bg-[#FFD700] text-slate-900',
  Обычная: 'bg-slate-100 text-slate-500',
};

export const TASK_STATUS_BADGE = {
  backlog: 'bg-slate-100 text-slate-700',
  'to-do': 'bg-blue-100 text-blue-700',
  'in-progress': 'bg-violet-100 text-violet-700',
  waiting: 'bg-orange-100 text-orange-700',
  done: 'bg-emerald-100 text-emerald-700',
};

export const TASK_STATUS_LABEL = {
  backlog: 'Backlog',
  'to-do': 'To Do',
  'in-progress': 'In Progress',
  waiting: 'Waiting for Client',
  done: 'Done',
};

export const PROJECT_BADGE_STYLES = {
  'proj-eco': { dot: 'bg-emerald-400', text: 'text-emerald-700', label: 'ЭкоПродукт' },
  'proj-prima': { dot: 'bg-amber-400', text: 'text-amber-700', label: 'Кофейня Прима' },
  'proj-med': { dot: 'bg-sky-400', text: 'text-sky-700', label: 'МедСтарт' },
};

export const UI_BUTTON_STYLES = {
  primary:
    'rounded-xl bg-[#3C50B4] text-white transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3C50B4]/30 disabled:cursor-not-allowed disabled:opacity-70',
  secondary:
    'rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300',
  ghost:
    'rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-[#3C50B4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3C50B4]/20',
};

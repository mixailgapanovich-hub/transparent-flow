export const COLUMNS = [
  { id: 'backlog', title: 'Backlog' },
  { id: 'to-do', title: 'To Do' },
  { id: 'in-progress', title: 'In Progress' },
  { id: 'waiting', title: 'Waiting for Client' },
  { id: 'done', title: 'Done' },
];

const DEFAULT_TEAM = [
  { id: 'pm-1', name: 'Adena Admin', initials: 'AA' },
  { id: 'pm-2', name: 'Nika PM', initials: 'NP' },
  { id: 'mentor-1', name: 'Ilya Mentor', initials: 'IM' },
];

const RAW_TASKS = [
  {
    id: '1',
    title: 'Разработка SMM-стратегии для бренда «ЭкоПродукт»',
    status: 'backlog',
    tag: 'Обычная',
    deadline: '2026-06-15',
    description:
      'Контент-план на 3 месяца: конкуренты, сетка постов, KPI.',
    hasFiles: true,
    history: [{ date: '2026-05-01', text: 'Задача создана' }],
    dependsOn: ['9'],
  },
  {
    id: '2',
    title: 'Финальный дизайн UI-кита',
    status: 'to-do',
    tag: 'Ключевая',
    deadline: '2026-05-28',
    description: 'Состояния кнопок, инпутов и модалок для дизайн-системы.',
    hasFiles: false,
    history: [{ date: '2026-05-10', text: 'В очереди на выполнение' }],
    dependsOn: ['10'],
  },
  {
    id: '3',
    title: 'Согласование фотосессии (референсы)',
    status: 'waiting',
    tag: 'Блокирующая',
    deadline: new Date(Date.now() + 15 * 60 * 60 * 1000).toISOString(),
    description: 'Клиент присылает референсы по свету и моделям.',
    hasFiles: true,
    history: [{ date: '2026-05-12', text: 'Статус: ожидание клиента' }],
    dependsOn: [],
  },
  {
    id: '4',
    title: 'Карта страниц и URL сайта',
    status: 'done',
    tag: 'Ключевая',
    deadline: '2026-04-20',
    description: 'Инвентаризация всех страниц и черновых URL.',
    hasFiles: true,
    history: [{ date: '2026-04-18', text: 'Согласовано с PM' }],
    dependsOn: [],
  },
  {
    id: '5',
    title: 'Согласование структуры сайта с клиентом',
    status: 'done',
    tag: 'Обычная',
    deadline: '2026-04-25',
    description: 'Навигация, футер, разделы до старта контента.',
    hasFiles: false,
    history: [{ date: '2026-04-24', text: 'Подписано в письме' }],
    dependsOn: ['4'],
  },
  {
    id: '6',
    title: 'Запрос текстов и медиа для страниц сайта',
    status: 'in-progress',
    tag: 'Ключевая',
    deadline: '2026-05-20',
    description: 'Бриф копирайтеру и список страниц из карты сайта.',
    hasFiles: true,
    history: [{ date: '2026-05-14', text: 'В работе у копирайтера' }],
    dependsOn: ['5'],
  },
  {
    id: '7',
    title: 'Вёрстка ключевых шаблонов',
    status: 'to-do',
    tag: 'Обычная',
    deadline: '2026-06-01',
    description: 'Главная, каталог, карточка товара — после контента и UI.',
    hasFiles: false,
    history: [{ date: '2026-05-16', text: 'Ожидает контент и UI-кит' }],
    dependsOn: ['6', '2'],
  },
  {
    id: '8',
    title: 'Регрессия и приёмка на staging',
    status: 'backlog',
    tag: 'Обычная',
    deadline: '2026-06-10',
    description: 'Чек-лист по страницам и кросс-браузер.',
    hasFiles: false,
    history: [{ date: '2026-05-17', text: 'Запланировано после вёрстки' }],
    dependsOn: ['7'],
  },
  {
    id: '9',
    title: 'Брендбук и тон коммуникации',
    status: 'done',
    tag: 'Ключевая',
    deadline: '2026-04-10',
    description: 'Логотип, цвета, типографика, voice.',
    hasFiles: true,
    history: [{ date: '2026-04-08', text: 'Утверждено' }],
    dependsOn: [],
  },
  {
    id: '10',
    title: 'Дизайн-система: компоненты в Figma',
    status: 'in-progress',
    tag: 'Ключевая',
    deadline: '2026-05-22',
    description: 'Библиотека компонентов на базе брендбука.',
    hasFiles: true,
    history: [{ date: '2026-05-05', text: 'В разработке' }],
    dependsOn: ['9'],
  },
  {
    id: '11',
    title: 'Запуск рекламной кампании (Meta)',
    status: 'backlog',
    tag: 'Обычная',
    deadline: '2026-07-01',
    description: 'После утверждения SMM-стратегии и креативов.',
    hasFiles: false,
    history: [{ date: '2026-05-18', text: 'Черновик медиаплана' }],
    dependsOn: ['1'],
  },
  {
    id: '12',
    title: 'Обучение клиента CMS',
    status: 'waiting',
    tag: 'Обычная',
    deadline: '2026-06-15',
    description: 'Слот после приёмки вёрстки.',
    hasFiles: false,
    history: [{ date: '2026-05-19', text: 'Ждём дату от клиента' }],
    dependsOn: ['8'],
  },
];

export const INITIAL_TASKS = RAW_TASKS.map((task, index) => {
  const hasFiles = task.hasFiles ?? false;
  const files = hasFiles
    ? [
        { id: `${task.id}-f1`, name: `Бриф-${task.id}.pdf`, size: '1.2 MB' },
        { id: `${task.id}-f2`, name: `Материалы-${task.id}.zip`, size: '8.4 MB' },
      ]
    : [];

  const comments = [
    {
      id: `${task.id}-c1`,
      author: index % 2 === 0 ? 'pm' : 'client',
      name: index % 2 === 0 ? 'PM' : 'Клиент',
      message: index % 2 === 0 ? 'Проверяю текущий прогресс по задаче.' : 'Материалы подготовим к вечеру.',
      at: new Date(Date.now() - (index + 1) * 60 * 60 * 1000).toISOString(),
    },
  ];

  return {
    ...task,
    files,
    comments,
    assignees: index % 3 === 0 ? [DEFAULT_TEAM[0], DEFAULT_TEAM[2]] : [DEFAULT_TEAM[0]],
    magicLink: task.status === 'waiting' ? `https://client.transparent-flow.app/task/${task.id}` : '',
    isImportant: task.tag === 'Ключевая',
  };
});

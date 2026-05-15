// proj-eco:   20 задач (IDs 1–12, 20–27),  done: 4,5,9,24,25 = 5
// proj-prima: 13 задач (IDs 13–16, 28–36), done: 28,29,34    = 3
// proj-med:   10 задач (IDs 17–19, 37–43), done: 38,39       = 2
export const MOCK_PROJECTS = [
  {
    id: 'proj-eco',
    name: 'ЭкоПродукт',
    client: 'ЭкоПродукт',
    progress: 25,
    tasksTotal: 20,
    tasksDone: 5,
    deadline: '2026-07-15',
    status: 'active',
    category: 'SMM / Контент',
    priority: 'high',
    members: [{ id: 1, name: 'AA' }, { id: 2, name: 'NP' }, { id: 3, name: 'IM' }],
  },
  {
    id: 'proj-prima',
    name: 'Кофейня Прима',
    client: 'Кофейня Прима',
    progress: 23,
    tasksTotal: 13,
    tasksDone: 3,
    deadline: '2026-06-30',
    status: 'waiting',
    category: 'Дизайн / Бренд',
    priority: 'medium',
    members: [{ id: 1, name: 'AA' }, { id: 2, name: 'NP' }],
  },
  {
    id: 'proj-med',
    name: 'МедСтарт',
    client: 'МедСтарт',
    progress: 20,
    tasksTotal: 10,
    tasksDone: 2,
    deadline: '2026-08-01',
    status: 'active',
    category: 'SEO / Реклама',
    priority: 'low',
    members: [{ id: 2, name: 'NP' }, { id: 3, name: 'IM' }],
  },
];

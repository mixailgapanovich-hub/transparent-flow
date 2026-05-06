export const COLUMNS = [
  { id: 'backlog', title: 'Backlog' },
  { id: 'to-do', title: 'To Do' },
  { id: 'in-progress', title: 'In Progress' },
  { id: 'waiting', title: 'Waiting for Client' },
  { id: 'done', title: 'Done' },
];

export const INITIAL_TASKS = [
  { 
    id: '1', 
    title: 'Разработка SMM-стратегии для бренда "ЭкоПродукт"', 
    status: 'backlog', 
    tag: 'Обычная', 
    deadline: '2024-06-15',
    description: 'Необходимо подготовить контент-план на 3 месяца, включая анализ конкурентов и сетку постов.',
    hasFiles: true,
    history: [{ date: '2024-05-20', text: 'Задача создана' }]
  },
  { 
    id: '2', 
    title: 'Финальный дизайн UI-кита', 
    status: 'to-do', 
    tag: 'Ключевая', 
    deadline: '2024-05-28',
    description: 'Отрисовка всех состояний кнопок, инпутов и модальных окон для дизайн-системы.',
    hasFiles: false,
    history: [{ date: '2024-05-18', text: 'В очереди на выполнение' }]
  },
  { 
    id: '3', 
    title: 'Согласование фотосессии (Референсы)', 
    status: 'waiting', 
    tag: 'Блокирующая', 
    deadline: new Date(Date.now() + 15 * 60 * 60 * 1000).toISOString(),
    description: 'Клиент должен прислать референсы по освещению и моделям до конца недели.',
    hasFiles: true,
    history: [{ date: '2024-05-21', text: 'Статус: Ожидание клиента' }]
  }
];
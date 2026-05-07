export const KNOWLEDGE_SECTIONS = [
    { id: 'agency', title: 'Агентство', description: 'Внутренние стандарты' },
    { id: 'clients', title: 'Клиенты', description: 'Инструкции для заказчиков' }
  ];
  
  export const KNOWLEDGE_CATEGORIES = [
    { id: 'onboarding', section: 'agency', title: 'Онбординг', icon: 'UserPlus', count: 4 },
    { id: 'processes', section: 'agency', title: 'Процессы', icon: 'Cpu', count: 5 },
    { id: 'sales', section: 'agency', title: 'Продажи', icon: 'BadgeDollarSign', count: 3 },
    { id: 'cms', section: 'clients', title: 'Управление CMS', icon: 'Layout', count: 4 },
    { id: 'ecommerce', section: 'clients', title: 'Магазин', icon: 'ShoppingBag', count: 3 },
    { id: 'content', section: 'clients', title: 'Контент', icon: 'PenTool', count: 3 },
  ];
  
  export const KNOWLEDGE_ARTICLES = [
    // --- AGENCY SECTION ---
    {
      id: 1, title: 'Первый день в команде: чек-лист', category: 'onboarding',
      time: '5 мин', author: 'HR', tags: ['Welcome', 'FirstStep'],
      description: 'Где взять пароли, как зайти в Slack и где лежит кофе.'
    },
    {
      id: 2, title: 'Правила именования слоев в Figma', category: 'onboarding',
      time: '8 мин', author: 'Art Director', tags: ['Design', 'Standard'],
      description: 'Чтобы разработчики не проклинали нас, когда открывают макет.'
    },
    {
      id: 3, title: 'Статусы задач: что они значат на самом деле', category: 'processes',
      time: '3 мин', author: 'PM', tags: ['Flow', 'Kanban'],
      description: 'Разница между "Waiting" и "In Progress" в нашей системе.'
    },
    {
      id: 4, title: 'Как обрабатывать правки "поиграйте со шрифтами"', category: 'sales',
      time: '10 мин', author: 'Lead Sales', tags: ['Clients', 'Psychology'],
      description: 'Психологические приемы перевода странных правок в понятное ТЗ.'
    },
    {
      id: 5, title: 'Регламент созвонов в Google Meet', category: 'processes',
      time: '4 мин', author: 'System', tags: ['Meeting', 'Time'],
      description: 'Почему камера всегда должна быть включена и зачем нам Agenda.'
    },
  
    // --- CLIENT SECTION ---
    {
      id: 101, title: 'Как добавить товар и настроить скидку', category: 'ecommerce',
      time: '6 мин', author: 'Tech Lead', tags: ['WooCommerce', 'Price'],
      description: 'Инструкция по созданию вариативных товаров и сезонных распродаж.'
    },
    {
      id: 102, title: 'Оптимизация картинок перед загрузкой', category: 'content',
      time: '4 мин', author: 'SEO Specialist', tags: ['WebP', 'Speed'],
      description: 'Как сделать так, чтобы сайт не тормозил из-за фото весом в 10Мб.'
    },
    {
      id: 103, title: 'Управление пользователями сайта', category: 'cms',
      time: '5 мин', author: 'Dev Ops', tags: ['Security', 'Admin'],
      description: 'Как дать доступ новому менеджеру и не сломать настройки.'
    },
    {
      id: 104, title: 'Работа с виджетом "Обратный звонок"', category: 'cms',
      time: '3 мин', author: 'Support', tags: ['Leads', 'UI'],
      description: 'Где смотреть заявки и как изменить номер телефона для уведомлений.'
    },
    {
      id: 105, title: 'Создание постов в блоге через Gutenberg', category: 'content',
      time: '7 мин', author: 'Copywriter', tags: ['WordPress', 'Blog'],
      description: 'Использование блоков, вставка видео и настройка мета-тегов.'
    }
  ];
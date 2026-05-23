// Шаблоны каскадных уведомлений — реализация таблицы 3.12 диплома.
// Контекст для подстановки: { projectName, taskTitle, deadline, magicLink, clientName }.

function fmtDate(dateLike) {
  if (!dateLike) return 'не задан';
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return String(dateLike);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Уровень 1: день 0, дружелюбный. Telegram. */
function level1(ctx) {
  return (
    `Привет! 👋 По проекту «${ctx.projectName}» нам нужны материалы для задачи «${ctx.taskTitle}».\n\n` +
    `Загрузить можно за пару минут — без регистрации: ${ctx.magicLink}\n` +
    `Дедлайн: ${fmtDate(ctx.deadline)}.\n\n` +
    `Спасибо! 🙌`
  );
}

/** Уровень 2: +2 рабочих дня, деловой. Telegram + Email. */
function level2(ctx) {
  return (
    `Добрый день! Напоминаем, что для продолжения работы по проекту «${ctx.projectName}» нам необходимы ` +
    `материалы по задаче «${ctx.taskTitle}».\n\n` +
    `Дедлайн истекает ${fmtDate(ctx.deadline)}.\n` +
    `Ссылка для загрузки: ${ctx.magicLink}\n\n` +
    `Если возникли вопросы — ответьте на это сообщение.`
  );
}

/** Уровень 3: +4 рабочих дня, официальный + договорная норма. Telegram + Email. */
function level3(ctx) {
  const name = ctx.clientName || 'клиент';
  return (
    `Уважаемый(ая) ${name}!\n\n` +
    `Задача «${ctx.taskTitle}» по проекту «${ctx.projectName}» ожидает материалов с момента запроса. ` +
    `Согласно договору, при отсутствии ответа более 3 рабочих дней дедлайн проекта продлевается ` +
    `на соответствующий срок.\n\n` +
    `Просим предоставить материалы по ссылке: ${ctx.magicLink}\n` +
    `Либо свяжитесь с вашим менеджером для согласования дальнейших действий.`
  );
}

/** Внутреннее уведомление PM на день 5+. */
function cascadeExhaustedPm(ctx) {
  return (
    `Каскад уведомлений по задаче «${ctx.taskTitle}» (проект «${ctx.projectName}») исчерпан.\n` +
    `Клиент не предоставил материалы в течение 5 дней.\n\n` +
    `Рекомендуется прямой контакт. Автоматическая пролонгация дедлайна активирована.`
  );
}

/** Юридический акт: контент принят PM-ом, договорный момент передачи зафиксирован. */
function verificationAct(ctx) {
  return (
    `Здравствуйте, ${ctx.clientName || 'клиент'}!\n\n` +
    `Подтверждаем, что материалы по задаче «${ctx.taskTitle}» проекта «${ctx.projectName}» ` +
    `приняты ${fmtDate(ctx.acceptedAt)}.\n\n` +
    `Этот момент является договорным моментом передачи контента согласно п. 1 договора. ` +
    `Дальнейшие сроки производственного цикла отсчитываются с этой даты.\n\n` +
    `Спасибо!`
  );
}

/**
 * Сборка содержимого уведомления по уровню. Возвращает {subject, body} —
 * subject используется для email, body — для всех каналов.
 */
export function renderTemplate(level, ctx) {
  switch (level) {
    case 1:
      return { subject: `Запрос материалов: ${ctx.taskTitle}`, body: level1(ctx) };
    case 2:
      return { subject: `Напоминание: ${ctx.taskTitle}`, body: level2(ctx) };
    case 3:
      return {
        subject: `Уведомление о сдвиге сроков по проекту «${ctx.projectName}»`,
        body: level3(ctx),
      };
    default:
      throw new Error(`Unknown notification level: ${level}`);
  }
}

export function renderCascadeExhausted(ctx) {
  return { subject: `Каскад исчерпан: ${ctx.taskTitle}`, body: cascadeExhaustedPm(ctx) };
}

export function renderVerificationAct(ctx) {
  return {
    subject: `Подтверждение приёма контента: ${ctx.taskTitle}`,
    body: verificationAct(ctx),
  };
}

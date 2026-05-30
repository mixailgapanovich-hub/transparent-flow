// Шаблоны каскадных уведомлений — реализация таблицы 3.12 диплома.
// Контекст для подстановки: { projectName, taskTitle, deadline, magicLink, clientName, acceptedAt }.
//
// Каждый renderXxx() возвращает 4 поля:
//   - subject:        тема email
//   - telegramBody:   HTML-разметка Telegram Bot API (parse_mode='HTML'), все user-данные ЭКРАНИРОВАНЫ
//   - emailText:      plain text для нодов почты не понимающих HTML
//   - emailHtml:      простая HTML-обёртка с inline-стилями для основной массы email-клиентов

const AGENCY_NAME = 'ООО АденаДиджитал';
const AGENCY_EMAIL = 'support@adena.local';
const AGENCY_SITE = 'adena.local';

// ────────────────────────────────────────────────────────────────────────────
// Утилиты
// ────────────────────────────────────────────────────────────────────────────

/**
 * Экранирует HTML-метасимволы. ОБЯЗАТЕЛЬНО для любых строк, которые приходят
 * из БД и попадают в Telegram-сообщение с parse_mode='HTML' либо в email html.
 * Telegram при кривом HTML возвращает 400 и уведомление теряется.
 */
export function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fmtDate(dateLike) {
  if (!dateLike) return 'не задан';
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return String(dateLike);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ────────────────────────────────────────────────────────────────────────────
// Футеры
// ────────────────────────────────────────────────────────────────────────────

const TG_FOOTER = `\n\n—\n<i>${AGENCY_NAME}</i> · ${AGENCY_EMAIL}`;

const TEXT_FOOTER = `\n\n—\n${AGENCY_NAME}\n${AGENCY_EMAIL}\n${AGENCY_SITE}`;

const HTML_STYLES = {
  wrap: 'font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:560px;margin:0 auto;color:#1f2937;line-height:1.55;padding:24px;',
  h: 'font-size:18px;font-weight:700;color:#1f2937;margin:0 0 16px 0;',
  p: 'font-size:14px;color:#374151;margin:0 0 12px 0;',
  btn: 'display:inline-block;background:#3C50B4;color:#ffffff !important;text-decoration:none;padding:11px 22px;border-radius:10px;font-weight:600;font-size:14px;margin:6px 0;',
  footer: 'margin-top:28px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280;',
  legalBadge: 'display:inline-block;background:#fff7ed;color:#9a3412;border:1px solid #fed7aa;padding:6px 10px;border-radius:8px;font-size:12px;font-weight:600;margin-bottom:14px;',
};

function htmlShell(innerHtml) {
  return (
    `<div style="${HTML_STYLES.wrap}">` +
    innerHtml +
    `<div style="${HTML_STYLES.footer}">` +
    `<strong>${AGENCY_NAME}</strong><br/>` +
    `<a href="mailto:${AGENCY_EMAIL}" style="color:#3C50B4;text-decoration:none;">${AGENCY_EMAIL}</a> · ` +
    `<a href="https://${AGENCY_SITE}" style="color:#3C50B4;text-decoration:none;">${AGENCY_SITE}</a>` +
    `</div></div>`
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Уровни каскада
// ────────────────────────────────────────────────────────────────────────────

/** Уровень 1: день 0. Дружелюбный. Telegram. */
function level1(ctx) {
  const proj = escapeHtml(ctx.projectName);
  const task = escapeHtml(ctx.taskTitle);
  const deadline = escapeHtml(fmtDate(ctx.deadline));
  const link = ctx.magicLink; // URL, не экранируем (?, = безопасны в HTML-атрибутах)

  const telegramBody =
    `Привет! 👋\n\n` +
    `По проекту <b>«${proj}»</b> нам нужны материалы для задачи <b>«${task}»</b>.\n\n` +
    `<a href="${link}">📎 Загрузить материалы</a> — без регистрации, пара минут.\n` +
    `Дедлайн: <b>${deadline}</b>\n` +
    `Спасибо! 🙌` +
    TG_FOOTER;

  const emailText =
    `Здравствуйте!\n\n` +
    `По проекту «${ctx.projectName}» нам нужны материалы для задачи «${ctx.taskTitle}».\n\n` +
    `Ссылка для загрузки (без регистрации): ${ctx.magicLink}\n` +
    `Дедлайн: ${fmtDate(ctx.deadline)}` +
    TEXT_FOOTER;

  const emailHtml = htmlShell(
    `<h1 style="${HTML_STYLES.h}">Запрос материалов</h1>` +
    `<p style="${HTML_STYLES.p}">По проекту <strong>«${proj}»</strong> нам нужны материалы для задачи <strong>«${task}»</strong>.</p>` +
    `<p style="${HTML_STYLES.p}">Дедлайн: <strong>${deadline}</strong></p>` +
    `<p style="margin:16px 0;"><a href="${link}" style="${HTML_STYLES.btn}">Загрузить материалы</a></p>` +
    `<p style="${HTML_STYLES.p}">Без регистрации, занимает пару минут.</p>`
  );

  return { telegramBody, emailText, emailHtml };
}

/** Уровень 2: +2 рабочих дня. Деловой. Telegram + Email. */
function level2(ctx) {
  const proj = escapeHtml(ctx.projectName);
  const task = escapeHtml(ctx.taskTitle);
  const deadline = escapeHtml(fmtDate(ctx.deadline));
  const link = ctx.magicLink;

  const telegramBody =
    `Добрый день!\n\n` +
    `Напоминаем, что для продолжения работы по проекту <b>«${proj}»</b> нам необходимы ` +
    `материалы по задаче <b>«${task}»</b>.\n\n` +
    `<b>Дедлайн истекает ${deadline}.</b>\n\n` +
    `<a href="${link}">📎 Загрузить материалы</a>\n\n` +
    `Если возникли вопросы — ответьте на это сообщение.` +
    TG_FOOTER;

  const emailText =
    `Добрый день!\n\n` +
    `Напоминаем, что для продолжения работы по проекту «${ctx.projectName}» нам необходимы ` +
    `материалы по задаче «${ctx.taskTitle}».\n\n` +
    `Дедлайн истекает ${fmtDate(ctx.deadline)}.\n` +
    `Ссылка для загрузки: ${ctx.magicLink}\n\n` +
    `Если возникли вопросы — ответьте на это сообщение.` +
    TEXT_FOOTER;

  const emailHtml = htmlShell(
    `<h1 style="${HTML_STYLES.h}">Напоминание о материалах</h1>` +
    `<p style="${HTML_STYLES.p}">Для продолжения работы по проекту <strong>«${proj}»</strong> ` +
    `нам всё ещё необходимы материалы по задаче <strong>«${task}»</strong>.</p>` +
    `<p style="${HTML_STYLES.p}"><strong style="color:#b45309;">Дедлайн истекает ${deadline}.</strong></p>` +
    `<p style="margin:16px 0;"><a href="${link}" style="${HTML_STYLES.btn}">Загрузить материалы</a></p>` +
    `<p style="${HTML_STYLES.p}">Если возникли вопросы — ответьте на это письмо.</p>`
  );

  return { telegramBody, emailText, emailHtml };
}

/** Уровень 3: +4 рабочих дня. Официальный + договорная норма. Telegram + Email. */
function level3(ctx) {
  const proj = escapeHtml(ctx.projectName);
  const task = escapeHtml(ctx.taskTitle);
  const name = escapeHtml(ctx.clientName || 'клиент');
  const link = ctx.magicLink;

  const telegramBody =
    `<b>Уважаемый(ая) ${name}!</b>\n\n` +
    `Задача <b>«${task}»</b> по проекту <b>«${proj}»</b> ожидает материалов с момента запроса. ` +
    `<b>Согласно договору, при отсутствии ответа более 3 рабочих дней дедлайн проекта продлевается ` +
    `на соответствующий срок.</b>\n\n` +
    `<a href="${link}">📎 Предоставить материалы</a>\n\n` +
    `Либо свяжитесь с вашим менеджером для согласования дальнейших действий.` +
    TG_FOOTER;

  const emailText =
    `Уважаемый(ая) ${ctx.clientName || 'клиент'}!\n\n` +
    `Задача «${ctx.taskTitle}» по проекту «${ctx.projectName}» ожидает материалов с момента запроса. ` +
    `Согласно договору, при отсутствии ответа более 3 рабочих дней дедлайн проекта продлевается ` +
    `на соответствующий срок.\n\n` +
    `Просим предоставить материалы по ссылке: ${ctx.magicLink}\n` +
    `Либо свяжитесь с вашим менеджером.` +
    TEXT_FOOTER;

  const emailHtml = htmlShell(
    `<h1 style="${HTML_STYLES.h}">Уведомление о сдвиге сроков</h1>` +
    `<p style="${HTML_STYLES.p}"><strong>Уважаемый(ая) ${name}!</strong></p>` +
    `<p style="${HTML_STYLES.p}">Задача <strong>«${task}»</strong> по проекту <strong>«${proj}»</strong> ` +
    `ожидает материалов с момента запроса.</p>` +
    `<p style="${HTML_STYLES.p}"><strong>Согласно договору, при отсутствии ответа более 3 рабочих дней ` +
    `дедлайн проекта продлевается на соответствующий срок.</strong></p>` +
    `<p style="margin:16px 0;"><a href="${link}" style="${HTML_STYLES.btn}">Предоставить материалы</a></p>` +
    `<p style="${HTML_STYLES.p}">Либо свяжитесь с вашим менеджером для согласования дальнейших действий.</p>`
  );

  return { telegramBody, emailText, emailHtml };
}

/** Внутреннее уведомление PM на день 5+. Только in-app feed, ничего не отправляется наружу. */
function cascadeExhaustedPm(ctx) {
  const proj = escapeHtml(ctx.projectName);
  const task = escapeHtml(ctx.taskTitle);
  return {
    telegramBody:
      `<b>Каскад исчерпан</b> по задаче <b>«${task}»</b> (проект <b>«${proj}»</b>).\n` +
      `Клиент не предоставил материалы в течение 5 дней.\n\n` +
      `Рекомендуется прямой контакт. Автоматическая пролонгация дедлайна активирована.`,
    emailText:
      `Каскад исчерпан по задаче «${ctx.taskTitle}» (проект «${ctx.projectName}»).\n` +
      `Клиент не ответил в течение 5 дней. Рекомендуется прямой контакт.`,
    emailHtml: '',
  };
}

/** Юридический акт: контент принят PM-ом, договорный момент передачи зафиксирован. */
function verificationAct(ctx) {
  const proj = escapeHtml(ctx.projectName);
  const task = escapeHtml(ctx.taskTitle);
  const name = escapeHtml(ctx.clientName || 'клиент');
  const accepted = escapeHtml(fmtDate(ctx.acceptedAt));

  const telegramBody =
    `✅ <b>Контент принят</b>\n\n` +
    `Здравствуйте, ${name}!\n\n` +
    `Подтверждаем, что материалы по задаче <b>«${task}»</b> проекта <b>«${proj}»</b> ` +
    `приняты <b>${accepted}</b>.\n\n` +
    `Этот момент является <b>договорным моментом передачи контента</b> согласно п. 1 договора. ` +
    `Дальнейшие сроки производственного цикла отсчитываются с этой даты.\n\n` +
    `Спасибо!` +
    TG_FOOTER;

  const emailText =
    `📎 Юридически значимое подтверждение приёма контента\n\n` +
    `Здравствуйте, ${ctx.clientName || 'клиент'}!\n\n` +
    `Подтверждаем, что материалы по задаче «${ctx.taskTitle}» проекта «${ctx.projectName}» ` +
    `приняты ${fmtDate(ctx.acceptedAt)}.\n\n` +
    `Этот момент является договорным моментом передачи контента согласно п. 1 договора. ` +
    `Дальнейшие сроки производственного цикла отсчитываются с этой даты.\n\n` +
    `Спасибо!` +
    TEXT_FOOTER;

  const emailHtml = htmlShell(
    `<div style="${HTML_STYLES.legalBadge}">📎 Юридически значимое подтверждение</div>` +
    `<h1 style="${HTML_STYLES.h}">Контент принят</h1>` +
    `<p style="${HTML_STYLES.p}">Здравствуйте, ${name}!</p>` +
    `<p style="${HTML_STYLES.p}">Подтверждаем, что материалы по задаче <strong>«${task}»</strong> ` +
    `проекта <strong>«${proj}»</strong> приняты <strong>${accepted}</strong>.</p>` +
    `<p style="${HTML_STYLES.p}">Этот момент является <strong>договорным моментом передачи контента</strong> ` +
    `согласно п. 1 договора. Дальнейшие сроки производственного цикла отсчитываются с этой даты.</p>`
  );

  return { telegramBody, emailText, emailHtml };
}

// ────────────────────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────────────────────

/** Subject + 3 формы body для уровня каскада. */
export function renderTemplate(level, ctx) {
  const subjectBase = escapeHtml(ctx.taskTitle ?? '');
  let parts;
  let subject;
  switch (level) {
    case 1:
      parts = level1(ctx);
      subject = `Запрос материалов: ${ctx.taskTitle}`;
      break;
    case 2:
      parts = level2(ctx);
      subject = `Напоминание: ${ctx.taskTitle}`;
      break;
    case 3:
      parts = level3(ctx);
      subject = `Уведомление о сдвиге сроков по проекту «${ctx.projectName}»`;
      break;
    default:
      throw new Error(`Unknown notification level: ${level}`);
  }
  return { subject, ...parts };
  // (subjectBase нужен только если subject пуст; здесь не нужен — оставлен на будущее)
}

export function renderCascadeExhausted(ctx) {
  return {
    subject: `Каскад исчерпан: ${ctx.taskTitle}`,
    ...cascadeExhaustedPm(ctx),
  };
}

export function renderVerificationAct(ctx) {
  return {
    subject: `Подтверждение приёма контента: ${ctx.taskTitle}`,
    ...verificationAct(ctx),
  };
}

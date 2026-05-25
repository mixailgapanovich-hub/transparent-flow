// Шаблоны каскадных уведомлений — реализация таблицы 3.12 диплома.
// Контекст: { projectName, taskTitle, deadline, magicLink, clientName, acceptedAt }.
//
// Каждый renderXxx() возвращает { subject, telegramBody, emailText, emailHtml }.
// telegramBody — HTML для Telegram (parse_mode: 'HTML'), с <b>/<a> и escapeHtml.
// emailText    — plain text fallback.
// emailHtml    — HTML с inline-стилями и footer (null если канал не поддерживается).

function escapeHtml(s) {
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

const FOOTER_TEXT = '\n—\nООО АденаДиджитал\nsupport@adena.local';

const FOOTER_HTML = `<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px"/>
<div style="font-size:11px;color:#94a3b8;font-family:sans-serif">
  ООО АденаДиджитал · <a href="mailto:support@adena.local" style="color:#94a3b8;text-decoration:none">support@adena.local</a>
</div>`;

function htmlWrap(bodyHtml, { legalBadge = false } = {}) {
  const badge = legalBadge
    ? `<div style="border:2px solid #3C50B4;border-radius:8px;padding:12px 16px;margin-bottom:20px;background:#f0f4ff">
         <p style="margin:0;font-size:13px;font-weight:bold;color:#3C50B4">📎 Юридически значимое подтверждение приёма контента</p>
       </div>`
    : '';
  return `<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1e293b;line-height:1.6">
${badge}${bodyHtml}
${FOOTER_HTML}
</body>
</html>`;
}

function linkBtn(url, label = 'Загрузить материалы') {
  return `<a href="${url}" style="display:inline-block;background:#3C50B4;color:#ffffff;padding:10px 22px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px;margin:12px 0">${escapeHtml(label)}</a>`;
}

// ── Уровень 1: день 0, дружелюбный. Telegram only. ───────────────────────

function level1Telegram(ctx) {
  const p = escapeHtml(ctx.projectName);
  const t = escapeHtml(ctx.taskTitle);
  const d = escapeHtml(fmtDate(ctx.deadline));
  return (
    `👋 Привет! По проекту <b>«${p}»</b> нам нужны материалы для задачи <b>«${t}»</b>.\n\n` +
    `Загрузить можно за пару минут — без регистрации: <a href="${ctx.magicLink}">Загрузить материалы</a>\n` +
    `Дедлайн: <b>${d}</b>.\n\n` +
    `Спасибо! 🙌`
  );
}

function level1Text(ctx) {
  return (
    `Привет! По проекту «${ctx.projectName}» нам нужны материалы для задачи «${ctx.taskTitle}».\n\n` +
    `Загрузить можно за пару минут — без регистрации: ${ctx.magicLink}\n` +
    `Дедлайн: ${fmtDate(ctx.deadline)}.\n\n` +
    `Спасибо!${FOOTER_TEXT}`
  );
}

// ── Уровень 2: +2 рабочих дня, деловой. Telegram + Email. ────────────────

function level2Telegram(ctx) {
  const p = escapeHtml(ctx.projectName);
  const t = escapeHtml(ctx.taskTitle);
  const d = escapeHtml(fmtDate(ctx.deadline));
  return (
    `Добрый день! Напоминаем, что для продолжения работы по проекту <b>«${p}»</b> нам необходимы ` +
    `материалы по задаче <b>«${t}»</b>.\n\n` +
    `⏳ <b>Дедлайн истекает ${d}.</b>\n` +
    `<a href="${ctx.magicLink}">Загрузить материалы</a>\n\n` +
    `Если возникли вопросы — ответьте на это сообщение.`
  );
}

function level2Text(ctx) {
  return (
    `Добрый день! Напоминаем, что для продолжения работы по проекту «${ctx.projectName}» нам необходимы ` +
    `материалы по задаче «${ctx.taskTitle}».\n\n` +
    `Дедлайн истекает ${fmtDate(ctx.deadline)}.\n` +
    `Ссылка для загрузки: ${ctx.magicLink}\n\n` +
    `Если возникли вопросы — ответьте на это письмо.${FOOTER_TEXT}`
  );
}

function level2Html(ctx) {
  const body =
    `<p>Добрый день!</p>` +
    `<p>Напоминаем, что для продолжения работы по проекту <b>«${escapeHtml(ctx.projectName)}»</b> нам необходимы ` +
    `материалы по задаче <b>«${escapeHtml(ctx.taskTitle)}»</b>.</p>` +
    `<p>⏳ <b>Дедлайн истекает ${escapeHtml(fmtDate(ctx.deadline))}.</b></p>` +
    linkBtn(ctx.magicLink) +
    `<p style="color:#64748b;font-size:13px">Если возникли вопросы — ответьте на это письмо.</p>`;
  return htmlWrap(body);
}

// ── Уровень 3: +4 рабочих дня, официальный. Telegram + Email. ────────────

function level3Telegram(ctx) {
  const name = escapeHtml(ctx.clientName || 'клиент');
  const t = escapeHtml(ctx.taskTitle);
  const p = escapeHtml(ctx.projectName);
  return (
    `<b>Уважаемый(ая)</b> ${name}!\n\n` +
    `Задача <b>«${t}»</b> по проекту <b>«${p}»</b> ожидает материалов с момента запроса. ` +
    `Согласно договору, при отсутствии ответа более 3 рабочих дней дедлайн проекта продлевается ` +
    `на соответствующий срок.\n\n` +
    `Просим предоставить материалы: <a href="${ctx.magicLink}">Загрузить материалы</a>\n` +
    `Либо свяжитесь с вашим менеджером для согласования дальнейших действий.`
  );
}

function level3Text(ctx) {
  const name = ctx.clientName || 'клиент';
  return (
    `Уважаемый(ая) ${name}!\n\n` +
    `Задача «${ctx.taskTitle}» по проекту «${ctx.projectName}» ожидает материалов с момента запроса. ` +
    `Согласно договору, при отсутствии ответа более 3 рабочих дней дедлайн проекта продлевается ` +
    `на соответствующий срок.\n\n` +
    `Просим предоставить материалы по ссылке: ${ctx.magicLink}\n` +
    `Либо свяжитесь с вашим менеджером для согласования дальнейших действий.${FOOTER_TEXT}`
  );
}

function level3Html(ctx) {
  const name = escapeHtml(ctx.clientName || 'клиент');
  const body =
    `<p>Уважаемый(ая) ${name}!</p>` +
    `<p>Задача <b>«${escapeHtml(ctx.taskTitle)}»</b> по проекту <b>«${escapeHtml(ctx.projectName)}»</b> ` +
    `ожидает материалов с момента запроса.</p>` +
    `<p>Согласно договору, при отсутствии ответа более 3 рабочих дней дедлайн проекта продлевается ` +
    `на соответствующий срок.</p>` +
    linkBtn(ctx.magicLink) +
    `<p style="color:#64748b;font-size:13px">Либо свяжитесь с вашим менеджером для согласования дальнейших действий.</p>`;
  return htmlWrap(body);
}

// ── Каскад исчерпан (внутреннее, для PM) ─────────────────────────────────

function cascadeExhaustedText(ctx) {
  return (
    `Каскад уведомлений по задаче «${ctx.taskTitle}» (проект «${ctx.projectName}») исчерпан.\n` +
    `Клиент не предоставил материалы в течение 5 дней.\n\n` +
    `Рекомендуется прямой контакт. Автоматическая пролонгация дедлайна активирована.`
  );
}

// ── Юридический акт (email клиенту) ──────────────────────────────────────

function verificationActText(ctx) {
  const name = ctx.clientName || 'клиент';
  return (
    `Это юридически значимое подтверждение приёма контента.\n\n` +
    `Здравствуйте, ${name}!\n\n` +
    `Подтверждаем, что материалы по задаче «${ctx.taskTitle}» проекта «${ctx.projectName}» ` +
    `приняты ${fmtDate(ctx.acceptedAt)}.\n\n` +
    `Этот момент является договорным моментом передачи контента согласно п. 1 договора. ` +
    `Дальнейшие сроки производственного цикла отсчитываются с этой даты.\n\n` +
    `Спасибо!${FOOTER_TEXT}`
  );
}

function verificationActHtml(ctx) {
  const name = escapeHtml(ctx.clientName || 'клиент');
  const body =
    `<p>Здравствуйте, ${name}!</p>` +
    `<p>Подтверждаем, что материалы по задаче <b>«${escapeHtml(ctx.taskTitle)}»</b> проекта ` +
    `<b>«${escapeHtml(ctx.projectName)}»</b> приняты <b>${escapeHtml(fmtDate(ctx.acceptedAt))}</b>.</p>` +
    `<p>Этот момент является договорным моментом передачи контента согласно п. 1 договора. ` +
    `Дальнейшие сроки производственного цикла отсчитываются с этой даты.</p>` +
    `<p>Спасибо!</p>`;
  return htmlWrap(body, { legalBadge: true });
}

// ── Публичный API ─────────────────────────────────────────────────────────

/**
 * Сборка уведомления по уровню каскада.
 * Возвращает { subject, telegramBody, emailText, emailHtml }.
 */
export function renderTemplate(level, ctx) {
  switch (level) {
    case 1:
      return {
        subject: `Запрос материалов: ${ctx.taskTitle}`,
        telegramBody: level1Telegram(ctx),
        emailText: level1Text(ctx),
        emailHtml: null, // уровень 1 — только Telegram
      };
    case 2:
      return {
        subject: `Напоминание: ${ctx.taskTitle}`,
        telegramBody: level2Telegram(ctx),
        emailText: level2Text(ctx),
        emailHtml: level2Html(ctx),
      };
    case 3:
      return {
        subject: `Уведомление о сдвиге сроков по проекту «${ctx.projectName}»`,
        telegramBody: level3Telegram(ctx),
        emailText: level3Text(ctx),
        emailHtml: level3Html(ctx),
      };
    default:
      throw new Error(`Unknown notification level: ${level}`);
  }
}

export function renderCascadeExhausted(ctx) {
  return {
    subject: `Каскад исчерпан: ${ctx.taskTitle}`,
    telegramBody: null,
    emailText: cascadeExhaustedText(ctx),
    emailHtml: null,
  };
}

export function renderVerificationAct(ctx) {
  return {
    subject: `Подтверждение приёма контента: ${ctx.taskTitle}`,
    telegramBody: null,
    emailText: verificationActText(ctx),
    emailHtml: verificationActHtml(ctx),
  };
}

// Тонкий клиент Telegram Bot API через нативный fetch. Без сторонней либы.
// Документация: https://core.telegram.org/bots/api
//
// Канал хранит мутируемый стейт с метриками — health-эндпоинт показывает
// lastSendAt / lastError, чтобы диагностировать проблемы без чтения логов.

const API = 'https://api.telegram.org';

export const telegramState = {
  configured: false,
  mode: 'disabled', // 'webhook' | 'polling' | 'disabled'
  botUsername: null,
  lastSendAt: null,
  lastError: null,
};

function token() {
  return process.env.TELEGRAM_BOT_TOKEN || '';
}

async function tgCall(method, body) {
  if (!token()) throw new Error('TELEGRAM_BOT_TOKEN not set');
  const res = await fetch(`${API}/bot${token()}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!json.ok) {
    const err = new Error(`Telegram ${method} failed: ${json.description || res.status}`);
    err.code = json.error_code;
    throw err;
  }
  return json.result;
}

/**
 * Самотест при старте. Если токен валиден — заполняет telegramState и возвращает true.
 * Если токена нет — тихо отключает канал, false.
 */
export async function initTelegram() {
  if (!token()) {
    telegramState.configured = false;
    telegramState.mode = 'disabled';
    console.warn('[telegram] TELEGRAM_BOT_TOKEN не задан — канал отключён');
    return false;
  }
  try {
    const me = await tgCall('getMe');
    telegramState.configured = true;
    telegramState.botUsername = me.username;
    console.log(`[telegram] connected as @${me.username}`);
    return true;
  } catch (err) {
    telegramState.configured = false;
    telegramState.lastError = err.message;
    console.error(`[telegram] AUTH FAILED: ${err.message}`);
    return false;
  }
}

/** Регистрирует webhook URL (вызывается при наличии TELEGRAM_WEBHOOK_URL). */
export async function setWebhook(url) {
  await tgCall('setWebhook', { url, allowed_updates: ['message'] });
  telegramState.mode = 'webhook';
  console.log(`[telegram] webhook set to ${url}`);
}

/** Удаление webhook — используем для polling-режима. */
export async function deleteWebhook() {
  await tgCall('deleteWebhook');
}

// ─── Polling-режим ──────────────────────────────────────────────────────────
// Long-poll к getUpdates. Нужен когда у тебя нет публичного URL (ngrok и т.п.).
// Не использовать одновременно с setWebhook — Telegram запрещает оба сразу.

let pollingActive = false;
let lastUpdateId = 0;

export function isPolling() {
  return pollingActive;
}

/** Хэндлер апдейтов. Зарегистрировать через onUpdate(fn) — вызывается из routes/telegram.js. */
let updateHandler = null;
export function onUpdate(fn) {
  updateHandler = fn;
}

async function pollLoop() {
  while (pollingActive) {
    try {
      const updates = await tgCall('getUpdates', {
        offset: lastUpdateId + 1,
        timeout: 25,
        allowed_updates: ['message'],
      });
      for (const u of updates) {
        lastUpdateId = u.update_id;
        if (updateHandler) {
          try {
            await updateHandler(u);
          } catch (err) {
            console.error('[telegram] update handler error:', err);
          }
        }
      }
    } catch (err) {
      console.error('[telegram] poll error:', err.message);
      // Небольшая пауза перед ретраем, чтобы не молотить API в случае проблем.
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

/**
 * Запускает polling-loop. Перед запуском чистим webhook (Telegram не разрешает оба сразу).
 */
export async function startPolling() {
  if (!telegramState.configured) {
    console.warn('[telegram] polling запрошен, но канал не настроен');
    return;
  }
  if (pollingActive) return;
  try {
    await deleteWebhook();
  } catch (err) {
    console.warn('[telegram] deleteWebhook before polling failed:', err.message);
  }
  pollingActive = true;
  telegramState.mode = 'polling';
  console.log('[telegram] polling started');
  pollLoop().catch((err) => {
    console.error('[telegram] poll loop crashed:', err);
    pollingActive = false;
    telegramState.mode = 'disabled';
  });
}

export function stopPolling() {
  pollingActive = false;
}

/**
 * Отправка сообщения. chatId — int или строка из БД.
 * Возвращает {ok: true, messageId} или бросает ошибку.
 */
export async function send(chatId, text) {
  if (!telegramState.configured) {
    return { skipped: 'not-configured' };
  }
  if (!chatId) {
    return { skipped: 'no-chat-id' };
  }
  try {
    const result = await tgCall('sendMessage', {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: false,
    });
    telegramState.lastSendAt = new Date().toISOString();
    telegramState.lastError = null;
    return { ok: true, messageId: result.message_id };
  } catch (err) {
    telegramState.lastError = err.message;
    throw err;
  }
}

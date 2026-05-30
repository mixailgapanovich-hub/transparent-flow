// Webhook + общий обработчик апдейтов от Telegram.
//
// Обрабатываем команду /start <token> (deep-link от PM-а):
// клиент жмёт ссылку → бот видит /start <onboarding-token> →
// токен валидируется, гасится (single-use, TTL 24ч), сохраняется chat_id.
//
// Старая схема /start <clientId> убрана — это была уязвимость: любой кто знал
// UUID клиента мог перехватить его уведомления. См. clientService.js.

import { Router } from 'express';
import * as telegram from '../services/channels/telegram.js';
import { consumeTelegramOnboardingToken } from '../services/clientService.js';
import { escapeHtml } from '../services/notificationTemplates.js';

const SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || 'dev-webhook-secret';

/** Обработка одного update от Telegram. Используется и webhook, и polling. */
export async function handleUpdate(update) {
  const msg = update?.message;
  if (!msg) return;
  const text = (msg.text || '').trim();
  const chatId = String(msg.chat?.id ?? '');
  const username = msg.from?.username || null;

  if (!text.startsWith('/start')) return;
  const parts = text.split(/\s+/);
  const param = parts[1];

  if (!param) {
    await telegram.send(
      chatId,
      'Привет! Чтобы привязать этот чат к проекту, перейдите по ссылке-приглашению от менеджера.',
    );
    return;
  }

  const company = await consumeTelegramOnboardingToken(param, chatId, username);
  if (!company) {
    await telegram.send(
      chatId,
      'Ссылка-приглашение не найдена или уже использована. Запросите у менеджера новую.',
    );
    return;
  }
  await telegram.send(
    chatId,
    `✅ <b>Готово!</b> Чат привязан к проекту <b>«${escapeHtml(company)}»</b>.\n` +
      'Здесь будут приходить уведомления по задачам.',
  );
}

const router = Router();

router.post('/webhook/:secret', async (req, res) => {
  if (req.params.secret !== SECRET) return res.status(404).end();
  res.json({ ok: true }); // быстро отвечаем, чтобы Telegram не ретраил
  try {
    await handleUpdate(req.body);
  } catch (err) {
    console.error('[telegram] webhook error:', err);
  }
});

export default router;

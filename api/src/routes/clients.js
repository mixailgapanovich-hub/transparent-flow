import { Router } from 'express';
import { issueTelegramOnboardingToken } from '../services/clientService.js';
import { telegramState } from '../services/channels/telegram.js';

const router = Router();
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

/**
 * POST /api/clients/:clientId/telegram-onboarding
 * Возвращает свежий deep-link для привязки Telegram-чата к указанному клиенту.
 * Доступ — любой залогиненный PM.
 */
router.post('/:clientId/telegram-onboarding', wrap(async (req, res) => {
  const { token, expiresAt } = await issueTelegramOnboardingToken(
    req.params.clientId,
    { issuedBy: req.user?.id ?? null },
  );
  const link = telegramState.botUsername
    ? `https://t.me/${telegramState.botUsername}?start=${token}`
    : null; // если бот не настроен — фронт сам решит что показать
  res.status(201).json({ token, link, expiresAt: expiresAt.toISOString() });
}));

export default router;

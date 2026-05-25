import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { pool } from './db/pool.js';
import projectsRouter from './routes/projects.js';
import tasksRouter from './routes/tasks.js';
import usersRouter from './routes/users.js';
import guestRouter from './routes/guest.js';
import authRouter from './routes/auth.js';
import telegramRouter, { handleUpdate as handleTelegramUpdate } from './routes/telegram.js';
import adminRouter from './routes/admin.js';
import clientsRouter from './routes/clients.js';
import { attachUser, requireAuth } from './middleware/auth.js';
import {
  initTelegram,
  setWebhook,
  startPolling,
  onUpdate,
  telegramState,
} from './services/channels/telegram.js';
import { initEmail, emailState } from './services/channels/email.js';
import { startScheduler } from './scheduler.js';
import { schedulerState } from './services/notificationService.js';

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(morgan('dev'));

app.use('/api', attachUser);

// Расширенный health: одним GET-ом видно состояние БД, планировщика и каналов.
app.get('/api/health', async (_req, res) => {
  let db = false;
  try {
    const r = await pool.query('SELECT 1 AS ok');
    db = r.rows[0]?.ok === 1;
  } catch (err) {
    console.error('[health] db error:', err.message);
  }
  res.json({
    ok: true,
    db,
    service: 'transparent-flow-api',
    time: new Date().toISOString(),
    scheduler: {
      running: schedulerState.running,
      lastTickAt: schedulerState.lastTickAt,
      lastTickDurationMs: schedulerState.lastTickDurationMs,
      lastTickError: schedulerState.lastTickError,
      lastTickSummary: schedulerState.lastTickSummary,
    },
    channels: {
      telegram: {
        configured: telegramState.configured,
        mode: telegramState.mode,
        botUsername: telegramState.botUsername,
        lastSendAt: telegramState.lastSendAt,
        lastError: telegramState.lastError,
      },
      email: {
        configured: emailState.configured,
        provider: emailState.provider,
        lastSendAt: emailState.lastSendAt,
        lastError: emailState.lastError,
      },
    },
  });
});

// Публичные:
app.use('/api/auth', authRouter);
app.use('/api/guest', guestRouter);
app.use('/api/telegram', telegramRouter); // webhook от Telegram-серверов

// Закрытые:
app.use('/api/projects', requireAuth, projectsRouter);
app.use('/api/tasks',    requireAuth, tasksRouter);
app.use('/api/users',    requireAuth, usersRouter);
app.use('/api/clients',  requireAuth, clientsRouter);
app.use('/api/admin',    requireAuth, adminRouter); // role=admin проверяется внутри роута

app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', path: req.path });
});

app.use((err, _req, res, _next) => {
  if (err && typeof err.status === 'number') {
    return res.status(err.status).json({ error: err.message });
  }
  console.error('[api] unhandled:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

/** Стартовая sanity-проверка. В production — падаем на слабом JWT_SECRET. */
function sanityCheckEnv() {
  const isProd = process.env.NODE_ENV === 'production';

  if (isProd) {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret === 'dev-secret-change-me-please') {
      console.error('[startup] FATAL: слабый или отсутствующий JWT_SECRET в production — запуск невозможен');
      process.exit(1);
    }
    console.log('[startup] production mode: JWT_SECRET OK, cookie.secure=true');
  }

  if (process.env.TELEGRAM_BOT_TOKEN && !process.env.TELEGRAM_BOT_USERNAME) {
    console.warn('[startup] TELEGRAM_BOT_TOKEN задан, но TELEGRAM_BOT_USERNAME пуст — deep-link не сработает');
  }
  if (process.env.SMTP_HOST && !process.env.EMAIL_FROM && !process.env.SMTP_USER) {
    console.warn('[startup] SMTP_HOST задан, но EMAIL_FROM/SMTP_USER пусты — письма не отправятся');
  }
}

app.listen(PORT, async () => {
  console.log(`[api] listening on http://localhost:${PORT}`);
  console.log(`[api] cors origin: ${CORS_ORIGIN}`);

  sanityCheckEnv();

  // Каналы инициализируем параллельно — каждый сам логирует свой статус.
  await Promise.all([initTelegram(), initEmail()]);

  // Регистрируем общий обработчик апдейтов (используется и webhook, и polling)
  onUpdate(handleTelegramUpdate);

  // Выбор режима: webhook если задан публичный URL, иначе polling.
  if (telegramState.configured) {
    if (process.env.TELEGRAM_WEBHOOK_URL) {
      const secret = process.env.TELEGRAM_WEBHOOK_SECRET || 'dev-webhook-secret';
      const url = `${process.env.TELEGRAM_WEBHOOK_URL.replace(/\/$/, '')}/api/telegram/webhook/${secret}`;
      setWebhook(url).catch((err) => console.error('[telegram] setWebhook failed:', err.message));
    } else {
      startPolling().catch((err) => console.error('[telegram] startPolling failed:', err.message));
    }
  }

  startScheduler();
});

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
import { attachUser, requireAuth } from './middleware/auth.js';

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(morgan('dev'));

// На все /api/* пытаемся достать юзера из cookie — но 401 здесь не швыряем,
// это делают точечные requireAuth ниже. Публичные роуты (health, login, guest)
// просто работают без req.user.
app.use('/api', attachUser);

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
  });
});

// Публичные:
app.use('/api/auth', authRouter);     // login сам по себе публичный, /me опирается на attachUser
app.use('/api/guest', guestRouter);   // клиенту авторизация не нужна — он по magic-токену

// Закрытые (требуют сессии PM-а):
app.use('/api/projects', requireAuth, projectsRouter);
app.use('/api/tasks',    requireAuth, tasksRouter);
app.use('/api/users',    requireAuth, usersRouter);

// 404 fallback
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', path: req.path });
});

// error handler — пробрасывает HttpError со своим status, всё остальное → 500
app.use((err, _req, res, _next) => {
  if (err && typeof err.status === 'number') {
    return res.status(err.status).json({ error: err.message });
  }
  console.error('[api] unhandled:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`[api] listening on http://localhost:${PORT}`);
  console.log(`[api] cors origin: ${CORS_ORIGIN}`);
});

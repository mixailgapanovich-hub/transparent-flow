import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { pool } from './db/pool.js';
import projectsRouter from './routes/projects.js';
import tasksRouter from './routes/tasks.js';

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

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

app.use('/api/projects', projectsRouter);
app.use('/api/tasks', tasksRouter);

// 404 fallback
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', path: req.path });
});

// error handler
app.use((err, _req, res, _next) => {
  console.error('[api] unhandled:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`[api] listening on http://localhost:${PORT}`);
  console.log(`[api] cors origin: ${CORS_ORIGIN}`);
});

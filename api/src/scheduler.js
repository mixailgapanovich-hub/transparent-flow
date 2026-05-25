// node-cron планировщик. Запускается из server.js после app.listen.
// Тикает с интервалом NOTIFICATION_CRON (по умолчанию каждый час).

import cron from 'node-cron';
import { tick, schedulerState } from './services/notificationService.js';

const CRON_EXPR = process.env.NOTIFICATION_CRON || '0 * * * *';

let task = null;

export function startScheduler() {
  if (!cron.validate(CRON_EXPR)) {
    console.warn(`[scheduler] invalid NOTIFICATION_CRON="${CRON_EXPR}", fallback to "0 * * * *"`);
  }
  const expr = cron.validate(CRON_EXPR) ? CRON_EXPR : '0 * * * *';

  task = cron.schedule(expr, async () => {
    try { await tick(); } catch (err) { /* tick сам логирует */ }
  });
  schedulerState.running = true;
  console.log(`[scheduler] started, cron="${expr}"`);

  // Первый тик через 5 секунд после старта — на случай если в БД уже что-то висит
  // (например, после ребута сервера).
  setTimeout(() => {
    tick().catch(() => {});
  }, 5000);
}

export function stopScheduler() {
  if (task) task.stop();
  schedulerState.running = false;
}

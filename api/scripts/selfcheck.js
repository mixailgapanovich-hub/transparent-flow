// Pre-flight check: запускается отдельно от сервера и быстро говорит «зелёный/красный».
// npm run selfcheck.

import 'dotenv/config';
import nodemailer from 'nodemailer';

const RED = (s) => `\x1b[31m${s}\x1b[0m`;
const GREEN = (s) => `\x1b[32m${s}\x1b[0m`;
const YELLOW = (s) => `\x1b[33m${s}\x1b[0m`;

let failed = 0;

function ok(label) { console.log(`  ${GREEN('✓')} ${label}`); }
function fail(label, detail) { failed += 1; console.log(`  ${RED('✗')} ${label}${detail ? ' — ' + detail : ''}`); }
function warn(label, detail) { console.log(`  ${YELLOW('!')} ${label}${detail ? ' — ' + detail : ''}`); }

async function checkEnv() {
  console.log('\nENV:');
  const required = ['DATABASE_URL', 'JWT_SECRET'];
  for (const k of required) {
    if (process.env[k]) ok(k);
    else fail(k, 'required');
  }
  const optional = ['TELEGRAM_BOT_TOKEN', 'SMTP_HOST'];
  for (const k of optional) {
    if (process.env[k]) ok(`${k} (configured)`);
    else warn(`${k}`, 'fallback will be used');
  }
}

async function checkApi() {
  console.log('\nAPI /api/health:');
  try {
    const port = process.env.PORT || 3001;
    const res = await fetch(`http://localhost:${port}/api/health`);
    if (!res.ok) return fail('GET /api/health', `HTTP ${res.status}`);
    const json = await res.json();
    if (json.ok) ok('responds');
    else fail('responds', 'ok=false');
    if (json.db) ok('database connected');
    else fail('database', 'db=false');
    if (json.scheduler?.running) ok('scheduler running');
    else fail('scheduler', 'not running');
    if (json.channels?.telegram?.configured) ok(`telegram: @${json.channels.telegram.botUsername}`);
    else warn('telegram', 'not configured');
    if (json.channels?.email?.configured) ok(`email: ${json.channels.email.provider}`);
    else warn('email', 'not configured');
  } catch (err) {
    fail('GET /api/health', err.message + ' (запущен ли API?)');
  }
}

async function checkTelegram() {
  if (!process.env.TELEGRAM_BOT_TOKEN) return;
  console.log('\nTelegram:');
  try {
    const r = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getMe`);
    const json = await r.json();
    if (json.ok) ok(`getMe → @${json.result.username}`);
    else fail('getMe', json.description || `HTTP ${r.status}`);
  } catch (err) {
    fail('getMe', err.message);
  }
}

async function checkSmtp() {
  if (!process.env.SMTP_HOST) return;
  console.log('\nSMTP:');
  const t = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
  try {
    await t.verify();
    ok(`SMTP ready (${process.env.SMTP_HOST})`);
  } catch (err) {
    fail('SMTP', err.message);
  }
}

(async () => {
  console.log('Transparent Flow — selfcheck');
  await checkEnv();
  await checkApi();
  await checkTelegram();
  await checkSmtp();
  console.log('');
  if (failed > 0) {
    console.log(RED(`Failed: ${failed}`));
    process.exit(1);
  } else {
    console.log(GREEN('All green.'));
    process.exit(0);
  }
})();

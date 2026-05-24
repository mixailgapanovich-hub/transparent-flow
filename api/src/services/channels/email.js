// Email-канал. Если SMTP_* заданы — используем их. Иначе fallback на Ethereal,
// тестовый SMTP без регистрации — каждое письмо генерирует preview-URL в логе.
//
// nodemailer.createTestAccount() работает быстро при первом обращении, потом кэшируется.

import nodemailer from 'nodemailer';

export const emailState = {
  configured: false,
  provider: 'disabled', // 'smtp' | 'ethereal' | 'disabled'
  from: null,
  lastSendAt: null,
  lastError: null,
};

let transporter = null;

async function buildEtherealTransporter() {
  const acct = await nodemailer.createTestAccount();
  console.log('[email] using Ethereal fallback. Login:', acct.user, 'pass:', acct.pass);
  emailState.provider = 'ethereal';
  emailState.from = `Adena Notifier <${acct.user}>`;
  return nodemailer.createTransport({
    host: acct.smtp.host,
    port: acct.smtp.port,
    secure: acct.smtp.secure,
    auth: { user: acct.user, pass: acct.pass },
  });
}

function buildSmtpTransporter() {
  const port = Number(process.env.SMTP_PORT || 587);
  emailState.provider = 'smtp';
  emailState.from = process.env.EMAIL_FROM_NAME
    ? `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`
    : process.env.EMAIL_FROM || process.env.SMTP_USER;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
}

export async function initEmail() {
  try {
    if (process.env.SMTP_HOST) {
      transporter = buildSmtpTransporter();
      await transporter.verify();
      emailState.configured = true;
      console.log(`[email] SMTP ready via ${process.env.SMTP_HOST}`);
    } else {
      transporter = await buildEtherealTransporter();
      await transporter.verify();
      emailState.configured = true;
    }
    return true;
  } catch (err) {
    emailState.configured = false;
    emailState.lastError = err.message;
    console.error(`[email] init failed: ${err.message}`);
    return false;
  }
}

/**
 * Отправка письма. Принимает { to, subject, text, html? }.
 * html опциональный: если передан, клиенты получат HTML-версию, иначе только plain.
 * Возвращает {ok, messageId, previewUrl?} или skipped.
 * previewUrl выставляется только для Ethereal — пишется в логи для проверки.
 */
export async function send({ to, subject, text, html }) {
  if (!emailState.configured || !transporter) return { skipped: 'not-configured' };
  if (!to) return { skipped: 'no-recipient' };
  try {
    const info = await transporter.sendMail({
      from: emailState.from,
      to,
      subject,
      text,
      ...(html ? { html } : {}),
    });
    emailState.lastSendAt = new Date().toISOString();
    emailState.lastError = null;
    const previewUrl =
      emailState.provider === 'ethereal' ? nodemailer.getTestMessageUrl(info) : null;
    if (previewUrl) console.log(`[email] preview: ${previewUrl}`);
    return { ok: true, messageId: info.messageId, previewUrl };
  } catch (err) {
    emailState.lastError = err.message;
    throw err;
  }
}

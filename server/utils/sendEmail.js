// server/utils/sendEmail.js
const nodemailer = require('nodemailer');

function pickEnv(...keys) {
  for (const k of keys) {
    const v = process.env[k];
    if (v != null && String(v).trim() !== '') return v;
  }
  return undefined;
}

function stripHtml(s = '') {
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

async function sendEmail(options = {}) {
  // Accept both new and legacy call signatures
  const to       = options.to || options.email; // compatibility
  const subject  = options.subject || options.title || '(no subject)';
  const html     = options.html || options.messageHtml || undefined;
  const text     = options.text || (html ? stripHtml(html) : options.message || undefined);
  const replyTo  = options.replyTo || undefined;

  if (!to) throw new Error('sendEmail: no recipient provided (expected options.to or options.email)');

  // Prefer SMTP_* but fall back to EMAIL_* so your existing .env still works
  const host     = pickEnv('SMTP_HOST', 'EMAIL_HOST');
  const portRaw  = pickEnv('SMTP_PORT', 'EMAIL_PORT');
  const port     = Number(portRaw || 587);             // Mailtrap Sending uses 587 (STARTTLS)
  const user     = pickEnv('SMTP_USER', 'EMAIL_USER');
  const pass     = pickEnv('SMTP_PASS', 'EMAIL_PASS');
  const from     = pickEnv('MAIL_FROM', 'EMAIL_FROM') || 'POCUS World <support@pocusworld.com>';

  if (!host || !port || !user || !pass) {
    throw new Error('Email transport not configured: missing SMTP/EMAIL host/port/user/pass envs');
  }

  // Helpful guard: warn if someone wired Sandbox instead of Sending
  // Sandbox host is usually "smtp.mailtrap.io" (captures only, won’t deliver to Gmail).
  if (host.includes('smtp.mailtrap.io')) {
    console.warn('[MAIL] You are using Mailtrap *Sandbox* host. Messages will NOT deliver to Gmail.');
    console.warn('[MAIL] For real delivery, use Mailtrap *Sending*: host = send.smtp.mailtrap.io, port = 587.');
  }

  const secure = port === 465; // 465 = implicit SSL, 587 = STARTTLS

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    // Helps avoid weird TLS mismatches in some environments
    tls: { minVersion: 'TLSv1.2' },
  });

  // Optional verification in dev
  if (process.env.NODE_ENV !== 'production') {
    try {
      await transporter.verify();
      // console.log('[MAIL] SMTP transporter verified for', host, 'port', port);
    } catch (e) {
      console.error('[MAIL] transporter verify failed:', e?.message || e);
    }
  }

  const mail = { from, to, subject, replyTo };
  if (html) mail.html = html;
  if (text) mail.text = text;

  const info = await transporter.sendMail(mail);

  if (process.env.NODE_ENV !== 'production') {
    console.log('[MAIL] sent ->', info.messageId, 'to:', to);
  }
  return info;
}

module.exports = sendEmail;

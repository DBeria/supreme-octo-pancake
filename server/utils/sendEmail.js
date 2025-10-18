// server/utils/sendEmail.js
const nodemailer = require('nodemailer');

function pickEnv(...keys) {
  for (const k of keys) {
    const v = process.env[k];
    if (v != null && String(v).trim() !== '') return v;
  }
}

function stripHtml(s = '') {
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

async function sendEmail(options = {}) {
  // Accept both the new {to, html, text} and old {email, message}
  const to      = options.to || options.email;                  // <— compatibility
  const subject = options.subject || options.title || '(no subject)';
  const html    = options.html || options.messageHtml || undefined;
  // prefer explicit text, else derive from html, else from old 'message'
  const text    = options.text || (html ? stripHtml(html) : options.message || undefined);
  const replyTo = options.replyTo || undefined;

  if (!to) {
    throw new Error('sendEmail: no recipient provided (expected options.to or options.email)');
  }

  const host   = pickEnv('SMTP_HOST', 'EMAIL_HOST');
  const port   = Number(pickEnv('SMTP_PORT', 'EMAIL_PORT') || 587);
  const user   = pickEnv('SMTP_USER', 'EMAIL_USER');
  const pass   = pickEnv('SMTP_PASS', 'EMAIL_PASS');
  const from   = pickEnv('MAIL_FROM', 'EMAIL_FROM') || 'POCUS World <support@pocusworld.com>';

  if (!host || !port || !user || !pass) {
    throw new Error('Email transport not configured: missing host/port/user/pass envs');
  }

  const secure = port === 465; // SSL on 465; STARTTLS on 587

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

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

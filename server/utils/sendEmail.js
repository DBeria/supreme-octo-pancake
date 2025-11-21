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

/**
 * sendEmail(options)
 *
 * Supports both:
 *  - { to, subject, html, text, from, replyTo }
 *  - { email, subject, message }  // legacy usage
 *
 * Reads env in this order:
 *  SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / SMTP_FROM
 *  fallback to EMAIL_HOST / EMAIL_PORT / EMAIL_USER / EMAIL_PASS / EMAIL_FROM
 */
async function sendEmail(options = {}) {
  let {
    to,
    email,       // legacy
    subject,
    html,
    text,
    message,     // legacy (plain text)
    from,
    replyTo,
  } = options;

  // Normalize options
  to = to || email;
  if (!to) {
    throw new Error('sendEmail: "to" / "email" is required');
  }

  subject = subject || 'No subject';

  if (!text && message) {
    text = message;
  }

  if (!text && html) {
    text = stripHtml(html);
  }

  const host = pickEnv('SMTP_HOST', 'EMAIL_HOST') || 'smtp.gmail.com';
  const port = Number(pickEnv('SMTP_PORT', 'EMAIL_PORT') || 587);
  const user = pickEnv('SMTP_USER', 'EMAIL_USER');
  const pass = pickEnv('SMTP_PASS', 'EMAIL_PASS');

  if (!user || !pass) {
    console.warn(
      '[MAIL] SMTP/EMAIL user or pass not set. host=%s port=%s user=%s',
      host,
      port,
      user
    );
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false otherwise
    auth: user && pass ? { user, pass } : undefined,
    pool: true,
    connectionTimeout: 10000, // 10 seconds
    socketTimeout: 10000,
  });

  const fromAddress =
    from ||
    pickEnv('EMAIL_FROM', 'SMTP_FROM') ||
    (user ? `"POCUS World" <${user}>` : undefined);

  const mailOptions = {
    from: fromAddress,
    to,
    subject,
    text,
  };

  if (html) mailOptions.html = html;
  if (replyTo) mailOptions.replyTo = replyTo;

  const info = await transporter.sendMail(mailOptions);

  if (process.env.NODE_ENV !== 'production') {
    console.log('[MAIL] sent ->', info.messageId, 'to:', to);
  }

  return info;
}

module.exports = sendEmail;

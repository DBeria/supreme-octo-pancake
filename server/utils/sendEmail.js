// server/utils/sendEmail.js
const nodemailer = require('nodemailer');

// Try to get a fetch implementation
let fetchFn = global.fetch;
if (!fetchFn) {
  try {
    // If you're on Node < 18, install node-fetch: npm install node-fetch
    // and uncomment this line:
    fetchFn = require('node-fetch');
  } catch (e) {
    // Will handle missing fetch later in the code
  }
}

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
 * Primary entry point
 *
 * Supports both:
 *  - { to, subject, html, text, from, replyTo }
 *  - { email, subject, message }  // legacy usage
 *
 * Prefers HTTP provider (Resend) if RESEND_API_KEY is present.
 * Falls back to SMTP (Gmail / other) otherwise.
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

  const fromAddress =
    from ||
    pickEnv('EMAIL_FROM', 'SMTP_FROM') ||
    (pickEnv('SMTP_USER', 'EMAIL_USER')
      ? `"POCUS World" <${pickEnv('SMTP_USER', 'EMAIL_USER')}>`
      : undefined);

  // 1) If RESEND_API_KEY is set, use Resend HTTP API (good for Render)
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    return sendViaResend({
      to,
      subject,
      text,
      html,
      from: fromAddress,
    });
  }

  // 2) Otherwise fall back to SMTP via Nodemailer (good for localhost)
  return sendViaSmtp({
    to,
    subject,
    text,
    html,
    from: fromAddress,
    replyTo,
  });
}

/**
 * Send via HTTP provider (Resend)
 * Requires RESEND_API_KEY env variable.
 */
async function sendViaResend({ to, subject, text, html, from }) {
  if (!fetchFn) {
    throw new Error(
      'fetch is not available. On Node < 18, install node-fetch and enable it in sendEmail.js.'
    );
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not set in environment variables');
  }

  const fromAddress = from || 'POCUS World <no-reply@example.com>';

  const body = {
    from: fromAddress,
    to,
    subject,
    text: text || undefined,
    html: html || undefined,
  };

  const res = await fetchFn('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    throw new Error(
      `Resend API error: ${res.status} ${res.statusText} ${errorText}`
    );
  }

  const data = await res.json();
  if (process.env.NODE_ENV !== 'production') {
    console.log('[MAIL] Resend sent ->', data);
  }
  return data;
}

/**
 * Send via SMTP (Gmail or other)
 * Uses:
 *  SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / SMTP_FROM
 *  fallback to EMAIL_HOST / EMAIL_PORT / EMAIL_USER / EMAIL_PASS / EMAIL_FROM
 */
async function sendViaSmtp({ to, subject, text, html, from, replyTo }) {
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
    console.log('[MAIL] SMTP sent ->', info.messageId, 'to:', to);
  }

  return info;
}

module.exports = sendEmail;

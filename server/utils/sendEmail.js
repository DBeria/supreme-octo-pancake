// server/utils/sendEmail.js

// Use global fetch (Node 18+ / 20+). Render default is Node 18+.
const fetchFn = (...args) => fetch(...args);

function stripHtml(s = '') {
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * sendEmail(options)
 *
 * Supports:
 *  - { email, subject, message }   // your current usage
 *  - { to, subject, html, text }   // more flexible
 *
 * On Render you MUST set RESEND_API_KEY and EMAIL_FROM.
 * This does NOT use Nodemailer or SMTP at all.
 */
async function sendEmail(options = {}) {
  let {
    to,
    email,
    subject,
    html,
    text,
    message,
    from,
  } = options;

  // normalize
  to = to || email;
  if (!to) {
    throw new Error('sendEmail: "to" / "email" is required');
  }

  subject = subject || 'No subject';

  if (!text && message) text = message;
  if (!text && html) text = stripHtml(html);

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error(
      'RESEND_API_KEY is not set. On Render you must use an HTTP email API (Resend) instead of SMTP.'
    );
  }

  const fromAddress =
    from ||
    process.env.EMAIL_FROM ||
    'POCUS World <no-reply@example.com>';

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

module.exports = sendEmail;

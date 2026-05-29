// ─────────────────────────────────────────────────────────────────────────
// Nine Angels Villa — enquiry intake  (Vercel Serverless Function)
// ─────────────────────────────────────────────────────────────────────────
// Receives the quote form POST and sends two transactional emails via Resend:
//   1. Internal notification  → INBOX  (reply-to = the guest, so staff just
//      hit "Reply")
//   2. Auto-reply             → guest  (reply-to = INBOX) with a summary of
//      their enquiry, thanking them and saying we'll be in touch shortly.
//
// Security / hardening:
//   • API key lives ONLY in the RESEND_API_KEY env var — never shipped to the
//     browser.
//   • Server-side validation; the client summary is never trusted — we rebuild
//     it here from the raw fields.
//   • Honeypot field silently drops bots; body-size + per-field length caps.
//   • Best-effort in-memory rate limit (see note below for KV hardening).
//
// Required env:  RESEND_API_KEY
// Optional env:  ENQUIRY_FROM   e.g. "Nine Angels Villa <events@yourdomain.com>"
//                ENQUIRY_INBOX  internal recipient (default below)
//                ENQUIRY_BCC    optional archive address
//                ALLOWED_ORIGIN e.g. "https://nineangels.example" (CORS lock)
// ─────────────────────────────────────────────────────────────────────────

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

const CONFIG = {
  apiKey: process.env.RESEND_API_KEY,
  // The "from" address MUST be on a domain you've verified in Resend.
  // Until your domain is verified you can test with Resend's sandbox sender:
  //   "Nine Angels Villa <onboarding@resend.dev>"
  from:   process.env.ENQUIRY_FROM  || 'Nine Angels Villa <onboarding@resend.dev>',
  inbox:  process.env.ENQUIRY_INBOX || 'info@christianopropertymanagement.com',
  bcc:    process.env.ENQUIRY_BCC   || '',
  allowedOrigin: process.env.ALLOWED_ORIGIN || '',
};

const MAX_BODY_BYTES = 32 * 1024; // 32 KB request guard
const MAX_FIELD_LEN  = 4000;      // per-field cap
const MAX_EXTRAS     = 30;

// ── Tiny best-effort rate limiter ────────────────────────────────────────
// In-memory => per warm instance only. Good enough as a first line against
// bursts; for hard guarantees front this with Vercel KV / Upstash Redis.
const RL_WINDOW_MS = 60 * 1000;
const RL_MAX       = 5;
const rlBucket = new Map(); // ip -> { count, resetAt }
function rateLimited(ip) {
  const now = Date.now();
  const rec = rlBucket.get(ip);
  if (!rec || now > rec.resetAt) { rlBucket.set(ip, { count: 1, resetAt: now + RL_WINDOW_MS }); return false; }
  rec.count += 1;
  return rec.count > RL_MAX;
}

// ── Helpers ───────────────────────────────────────────────────────────────
const esc   = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const clean = (s = '') => String(s).slice(0, MAX_FIELD_LEN).trim();
const isEmail = (s = '') => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

function makeRef() {
  return 'NA-' + Math.random().toString(36).slice(2, 7).toUpperCase() +
         '-'   + Date.now().toString(36).slice(-3).toUpperCase();
}

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function summaryRows(d) {
  return [
    ['Event',            d.eventType],
    ['Preferred date',   fmtDate(d.eventDate)],
    ['Date flexibility', d.flexibility],
    ['Approx. guests',   d.guests],
    ['Package',          d.package],
    ['Catering',         d.catering],
    ['Extras',           d.extras],
    ['Notes',            d.notes],
  ].filter(([, v]) => v && String(v).trim());
}

// ── Email bodies ────────────────────────────────────────────────────────
const BRAND_INK   = '#2b2723';
const BRAND_MUTE  = '#8a8073';
const BRAND_CREAM = '#f6f1e7';
const BRAND_LINE  = '#e4dccd';

function rowsHtml(d) {
  return summaryRows(d).map(([k, v]) => `
    <tr>
      <td style="padding:9px 0;color:${BRAND_MUTE};font:500 12px/1.4 Arial,Helvetica,sans-serif;letter-spacing:.04em;text-transform:uppercase;vertical-align:top;white-space:nowrap;padding-right:24px;">${esc(k)}</td>
      <td style="padding:9px 0;color:${BRAND_INK};font:400 15px/1.5 Georgia,'Times New Roman',serif;border-bottom:1px solid ${BRAND_LINE};">${esc(v)}</td>
    </tr>`).join('');
}
function rowsText(d) {
  return summaryRows(d).map(([k, v]) => `${k}: ${v}`).join('\n');
}

function guestEmail(d, ref) {
  const first = (d.name || '').split(' ')[0] || 'there';
  const text =
`Hello ${first},

Thank you for getting in touch about Nine Angels Villa. We've received your enquiry and one of us will be in touch personally within 24 hours — usually much sooner.

Here's a summary of what you sent us:

${rowsText(d)}

Your reference: ${ref}

If you'd like to add anything or change a detail, just reply to this email and it will reach us.

Warmly,
The Nine Angels team
Madliena, Malta
${CONFIG.inbox}`;

  const html =
`<!doctype html><html><body style="margin:0;background:${BRAND_CREAM};padding:32px 0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#fff;border:1px solid ${BRAND_LINE};">
      <tr><td style="padding:40px 44px 28px;">
        <div style="font:italic 24px/1 Georgia,serif;color:${BRAND_INK};letter-spacing:.02em;">Nine&nbsp;Angels&nbsp;Villa</div>
        <div style="font:500 11px/1 Arial,sans-serif;letter-spacing:.24em;text-transform:uppercase;color:${BRAND_MUTE};margin-top:8px;">Madliena · Malta</div>
      </td></tr>
      <tr><td style="padding:0 44px;">
        <h1 style="font:400 30px/1.15 Georgia,serif;color:${BRAND_INK};margin:8px 0 14px;">Thank you, ${esc(first)}.<br><em style="color:${BRAND_MUTE};">We've got it from here.</em></h1>
        <p style="font:400 16px/1.6 Georgia,serif;color:#5b554d;margin:0 0 24px;">We've received your enquiry and one of us will be in touch personally within 24 hours — usually much sooner.</p>
      </td></tr>
      <tr><td style="padding:0 44px;">
        <div style="font:500 11px/1 Arial,sans-serif;letter-spacing:.24em;text-transform:uppercase;color:${BRAND_MUTE};margin-bottom:6px;">Your enquiry at a glance</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rowsHtml(d)}</table>
      </td></tr>
      <tr><td style="padding:26px 44px 0;">
        <div style="background:${BRAND_CREAM};border-left:2px solid #c9a98f;padding:16px 20px;">
          <div style="font:500 11px/1 Arial,sans-serif;letter-spacing:.24em;text-transform:uppercase;color:${BRAND_MUTE};">Your reference</div>
          <div style="font:500 17px/1 'Courier New',monospace;color:${BRAND_INK};margin-top:6px;letter-spacing:.04em;">${esc(ref)}</div>
        </div>
      </td></tr>
      <tr><td style="padding:28px 44px 40px;">
        <p style="font:400 14px/1.6 Georgia,serif;color:#5b554d;margin:0;">If you'd like to add anything or change a detail, just reply to this email and it will reach us.</p>
        <p style="font:400 14px/1.6 Georgia,serif;color:${BRAND_INK};margin:20px 0 0;">Warmly,<br>The Nine Angels team</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;

  return { text, html, subject: "We've got your enquiry — Nine Angels Villa" };
}

function internalEmail(d, ref) {
  const text =
`New enquiry — ${d.eventType || 'event'} — ${d.name}
Reference: ${ref}

${rowsText(d)}

— Contact —
Name:  ${d.name}
Email: ${d.email}
Phone: ${d.phone}
Source: ${d.source || '—'}

Reply directly to this email to respond to ${d.name}.`;

  const html =
`<!doctype html><html><body style="margin:0;background:${BRAND_CREAM};padding:28px 0;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#fff;border:1px solid ${BRAND_LINE};">
      <tr><td style="padding:32px 40px 16px;border-bottom:1px solid ${BRAND_LINE};">
        <div style="font:500 11px/1 Arial,sans-serif;letter-spacing:.24em;text-transform:uppercase;color:${BRAND_MUTE};">New enquiry · ${esc(ref)}</div>
        <h1 style="font:400 24px/1.2 Georgia,serif;color:${BRAND_INK};margin:10px 0 0;">${esc(d.eventType || 'Event')} — ${esc(d.name)}</h1>
      </td></tr>
      <tr><td style="padding:8px 40px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rowsHtml(d)}</table>
      </td></tr>
      <tr><td style="padding:24px 40px 32px;">
        <div style="font:500 11px/1 Arial,sans-serif;letter-spacing:.24em;text-transform:uppercase;color:${BRAND_MUTE};margin-bottom:10px;">Contact</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font:400 15px/1.6 Arial,sans-serif;color:${BRAND_INK};">
          <tr><td style="color:${BRAND_MUTE};width:64px;">Email</td><td><a href="mailto:${esc(d.email)}" style="color:${BRAND_INK};">${esc(d.email)}</a></td></tr>
          <tr><td style="color:${BRAND_MUTE};">Phone</td><td><a href="tel:${esc(d.phone)}" style="color:${BRAND_INK};">${esc(d.phone)}</a></td></tr>
          <tr><td style="color:${BRAND_MUTE};">Source</td><td>${esc(d.source || '—')}</td></tr>
        </table>
        <p style="font:400 13px/1.6 Arial,sans-serif;color:${BRAND_MUTE};margin:22px 0 0;">Reply directly to this email to respond to the guest.</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;

  return { text, html, subject: `New enquiry — ${d.eventType || 'event'} — ${d.name} (${ref})` };
}

// ── Resend call ───────────────────────────────────────────────────────────
async function sendEmail({ to, replyTo, subject, html, text, bcc }) {
  const payload = { from: CONFIG.from, to: [to], subject, html, text };
  if (replyTo) payload.reply_to = replyTo;
  if (bcc)     payload.bcc = [bcc];

  const res = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CONFIG.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let detail = '';
    try { detail = JSON.stringify(await res.json()); } catch { /* ignore */ }
    throw new Error(`Resend ${res.status}: ${detail}`);
  }
  return res.json();
}

// ── Body reader (works whether or not Vercel pre-parsed req.body) ──────────
async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch { return {}; } }
  return await new Promise((resolve) => {
    let raw = '', tooBig = false;
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > MAX_BODY_BYTES) { tooBig = true; req.destroy(); }
    });
    req.on('end',   () => { if (tooBig) return resolve(null); try { resolve(JSON.parse(raw || '{}')); } catch { resolve({}); } });
    req.on('error', () => resolve({}));
  });
}

// ── Handler ─────────────────────────────────────────────────────────────
module.exports = async (req, res) => {
  // CORS (only when an allowed origin is configured)
  if (CONFIG.allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', CONFIG.allowedOrigin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST')    return res.status(405).json({ ok: false, error: 'method_not_allowed' });

  if (!CONFIG.apiKey) {
    console.error('[enquiry] RESEND_API_KEY is not set');
    return res.status(500).json({ ok: false, error: 'server_misconfigured' });
  }

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (rateLimited(ip)) return res.status(429).json({ ok: false, error: 'rate_limited' });

  const body = await readBody(req);
  if (body === null) return res.status(413).json({ ok: false, error: 'payload_too_large' });

  // Honeypot — real users never fill "company". Silently accept & drop bots.
  if (clean(body.company)) {
    return res.status(200).json({ ok: true, id: makeRef() });
  }

  // Normalise + validate
  const extras = Array.isArray(body.extras)
    ? body.extras.slice(0, MAX_EXTRAS).map(clean).filter(Boolean).join(', ')
    : clean(body.extras);

  const d = {
    name:        clean(body.name),
    email:       clean(body.email).toLowerCase(),
    phone:       clean(body.phone),
    eventType:   clean(body.eventType),
    eventDate:   clean(body.eventDate),
    flexibility: clean(body.flexibility),
    guests:      clean(body.guests),
    package:     clean(body.package),
    catering:    clean(body.catering),
    extras,
    notes:       clean(body.notes),
    source:      clean(body.source),
  };

  const missing = [];
  if (!d.name)            missing.push('name');
  if (!isEmail(d.email))  missing.push('email');
  if (!d.phone)           missing.push('phone');
  if (!d.eventType)       missing.push('eventType');
  if (!d.eventDate)       missing.push('eventDate');
  if (!d.guests)          missing.push('guests');
  if (missing.length) {
    return res.status(400).json({ ok: false, error: 'validation', fields: missing });
  }

  const ref = makeRef();
  const guest    = guestEmail(d, ref);
  const internal = internalEmail(d, ref);

  // Send both, independently. The internal notification is the must-have:
  // staff always learn of the enquiry even if the guest auto-reply bounces.
  const [internalResult, guestResult] = await Promise.allSettled([
    sendEmail({ to: CONFIG.inbox, replyTo: d.email, bcc: CONFIG.bcc,
                subject: internal.subject, html: internal.html, text: internal.text }),
    sendEmail({ to: d.email, replyTo: CONFIG.inbox,
                subject: guest.subject, html: guest.html, text: guest.text }),
  ]);

  if (internalResult.status === 'rejected') {
    console.error('[enquiry] internal send failed:', internalResult.reason?.message);
    return res.status(502).json({ ok: false, error: 'send_failed' });
  }
  if (guestResult.status === 'rejected') {
    // Non-fatal: we have the enquiry; the guest just didn't get their copy.
    console.error('[enquiry] guest auto-reply failed:', guestResult.reason?.message);
    return res.status(200).json({ ok: true, id: ref, autoReply: false });
  }

  return res.status(200).json({ ok: true, id: ref, autoReply: true });
};

// Vercel serverless function — receives enquiry form POSTs and
// forwards to Formspree. Returns JSON so the client can distinguish
// success from error without depending on Formspree's CORS behaviour.

const FORMSPREE_ID = process.env.FORMSPREE_ID || 'xgoqaqzp';
const FORMSPREE_URL = `https://formspree.io/f/${FORMSPREE_ID}`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ ok: false, error: 'Invalid JSON' });
  }

  // Basic server-side validation
  const { name, email, eventType, eventDate, guests, consent } = body || {};
  if (!name || !email || !eventType || !eventDate || !guests || !consent) {
    return res.status(422).json({ ok: false, error: 'Missing required fields' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(422).json({ ok: false, error: 'Invalid email address' });
  }

  try {
    const upstream = await fetch(FORMSPREE_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        _replyto: email,
        _subject: `New enquiry — ${eventType || 'event'} — ${name}`,
        ...body,
        extras: Array.isArray(body.extras) ? body.extras.join(', ') : (body.extras || ''),
      }),
    });

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => '');
      console.error('Formspree error', upstream.status, text);
      return res.status(502).json({ ok: false, error: 'Delivery service unavailable' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Submit handler error:', err);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
}

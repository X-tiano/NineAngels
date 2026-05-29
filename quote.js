// Nine Angels — Quotation form logic
//

// ─────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────
// Email is sent server-side by the Vercel function at /api/enquiry, which
// talks to Resend using the RESEND_API_KEY env var. Nothing secret lives
// here. Every submission is also saved locally and visible at
// /submissions.html as a backstop.
// ─────────────────────────────────────────────────────────────────────

const CONFIG = {
  apiPath: '/api/enquiry',
  inboxEmail: 'info@christianopropertymanagement.com',
  storageKey: 'nine-angels-submissions',
};

// ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {

  const form     = document.getElementById('quoteForm');
  const panels   = [...document.querySelectorAll('.panel')];
  const steps    = [...document.querySelectorAll('.steps .step')];
  const btnBack  = document.getElementById('btnBack');
  const btnNext  = document.getElementById('btnNext');
  const btnSubmit= document.getElementById('btnSubmit');
  const stepLbl  = document.getElementById('stepLabel');
  const thanks   = document.getElementById('thanks');
  const formHead = document.getElementById('formHeader');

  let current = 1;
  const total = panels.length;

  function showStep(n) {
    current = Math.max(1, Math.min(total, n));
    panels.forEach(p => p.classList.toggle('active', +p.dataset.panel === current));
    steps.forEach(s => {
      const sn = +s.dataset.step;
      s.classList.toggle('active', sn === current);
      s.classList.toggle('done',   sn <  current);
    });
    btnBack.hidden   = current === 1;
    btnNext.hidden   = current === total;
    btnSubmit.hidden = current < total;
    stepLbl.textContent = `Step ${current} of ${total}`;
    // Scroll the active panel into view nicely
    panels.find(p => p.classList.contains('active'))?.focus?.();
  }

  // ── Validation ───────────────────────────────────────────────────
  function setErr(name, msg) {
    const el  = form.querySelector(`[name="${name}"]`);
    const box = form.querySelector(`[data-err="${name}"]`);
    if (box) box.textContent = msg || '';
    if (el && el.classList) el.classList.toggle('invalid', !!msg);
  }
  function clearErrs(panel) {
    panel.querySelectorAll('[data-err]').forEach(b => b.textContent = '');
    panel.querySelectorAll('.invalid').forEach(el => el.classList.remove('invalid'));
  }
  function validateStep(n) {
    const panel = panels.find(p => +p.dataset.panel === n);
    clearErrs(panel);
    let ok = true;

    if (n === 1) {
      const type   = form.eventType.value;
      const date   = form.eventDate.value;
      const guests = form.guests.value;
      if (!type)   { setErr('eventType', 'Please pick the type of event.'); ok = false; }
      if (!date)   { setErr('eventDate', 'A preferred date helps us check availability.'); ok = false; }
      if (!guests || +guests < 2) { setErr('guests', 'Roughly how many guests?'); ok = false; }
    }
    if (n === 3) {
      const name  = form.name.value.trim();
      const email = form.email.value.trim();
      const phone = form.phone.value.trim();
      const consent = form.consent.checked;
      if (!name)  { setErr('name', "What's your name?"); ok = false; }
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setErr('email', 'A valid email so we can reply.'); ok = false;
      }
      if (!phone) { setErr('phone', 'A phone number so we can reach you.'); ok = false; }
      if (!consent) { setErr('consent', 'We need your permission to email you back.'); ok = false; }
    }
    return ok;
  }

  // ── Step nav ─────────────────────────────────────────────────────
  btnNext.addEventListener('click', () => {
    if (validateStep(current)) showStep(current + 1);
  });
  btnBack.addEventListener('click', () => showStep(current - 1));

  // Allow Enter to advance instead of submitting prematurely
  form.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
      if (current < total) { e.preventDefault(); btnNext.click(); }
    }
  });

  // ── Gather data ──────────────────────────────────────────────────
  function collect() {
    const fd = new FormData(form);
    const extras = fd.getAll('extras');
    return {
      id: 'NA-' + Math.random().toString(36).slice(2, 7).toUpperCase() + '-' +
                  Date.now().toString(36).slice(-3).toUpperCase(),
      submittedAt: new Date().toISOString(),
      eventType:   fd.get('eventType') || '',
      eventDate:   fd.get('eventDate') || '',
      flexibility: fd.get('flexibility') || '',
      guests:      fd.get('guests') || '',
      package:     fd.get('package') || '',
      catering:    fd.get('catering') || '',
      extras:      extras,
      notes:       fd.get('notes') || '',
      name:        (fd.get('name')  || '').trim(),
      email:       (fd.get('email') || '').trim(),
      phone:       (fd.get('phone') || '').trim(),
      source:      fd.get('source') || '',
    };
  }

  // ── Human-readable summary (auto-reply body + on-screen recap) ───
  function fmtDate(iso) {
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    if (isNaN(d)) return iso;
    return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }
  function summaryRows(sub) {
    return [
      ['Event',            sub.eventType],
      ['Preferred date',   fmtDate(sub.eventDate)],
      ['Date flexibility', sub.flexibility],
      ['Approx. guests',   sub.guests],
      ['Package',          sub.package],
      ['Catering',         sub.catering],
      ['Extras',           (sub.extras || []).join(', ')],
      ['Notes',            sub.notes],
    ].filter(([, v]) => v && String(v).trim());
  }
  function buildSummary(sub) {
    return summaryRows(sub).map(([k, v]) => `${k}: ${v}`).join('\n');
  }
  function renderSummary(sub) {
    const box  = document.getElementById('thanksSummary');
    const list = document.getElementById('thanksSummaryList');
    if (!box || !list) return;
    const rows = summaryRows(sub);
    if (!rows.length) { box.hidden = true; return; }
    list.innerHTML = rows.map(([k, v]) =>
      `<dt>${k}</dt><dd>${String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;')}</dd>`).join('');
    box.hidden = false;
  }

  // ── Local storage ────────────────────────────────────────────────
  function saveLocal(sub) {
    try {
      const list = JSON.parse(localStorage.getItem(CONFIG.storageKey) || '[]');
      list.unshift(sub);
      localStorage.setItem(CONFIG.storageKey, JSON.stringify(list));
    } catch (e) { console.warn('Could not save locally:', e); }
  }

  // ── Send to our serverless function (Resend) ─────────────────────
  async function sendEnquiry(sub) {
    const payload = {
      name: sub.name, email: sub.email, phone: sub.phone,
      eventType: sub.eventType, eventDate: sub.eventDate, flexibility: sub.flexibility,
      guests: sub.guests, package: sub.package, catering: sub.catering,
      extras: sub.extras, notes: sub.notes, source: sub.source,
      company: (form.company && form.company.value) || '',   // honeypot
    };
    try {
      const res = await fetch(CONFIG.apiPath, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      let data = {};
      try { data = await res.json(); } catch { /* ignore */ }
      if (!res.ok || !data.ok) {
        return { ok: false, reason: data.error || `http_${res.status}`, fields: data.fields };
      }
      return { ok: true, id: data.id, autoReply: data.autoReply !== false };
    } catch (e) {
      return { ok: false, reason: 'network' };
    }
  }

  // ── Submit ───────────────────────────────────────────────────────
  const submitError = document.getElementById('submitError');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateStep(3)) return;

    if (submitError) submitError.hidden = true;
    btnSubmit.disabled = true;
    const originalLabel = btnSubmit.innerHTML;
    btnSubmit.innerHTML = 'Sending…';

    const sub = collect();
    saveLocal(sub);                       // local backstop — never lose an enquiry
    const result = await sendEnquiry(sub);

    if (!result.ok) {
      // Don't fake success — let them retry.
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = originalLabel;
      if (submitError) {
        submitError.innerHTML = result.reason === 'network'
          ? 'We couldn’t reach our server just now. Please check your connection and try again — or email us directly at <a href="mailto:' + CONFIG.inboxEmail + '">' + CONFIG.inboxEmail + '</a>.'
          : 'Something went wrong sending your enquiry. Please try again, or email us at <a href="mailto:' + CONFIG.inboxEmail + '">' + CONFIG.inboxEmail + '</a>.';
        submitError.hidden = false;
      }
      return;
    }

    // Use the authoritative reference issued by the server.
    if (result.id) sub.id = result.id;

    // Show thank-you
    document.getElementById('thanksName').textContent  = sub.name.split(' ')[0] || 'friend';
    document.getElementById('thanksEmail').textContent = sub.email;
    document.getElementById('thanksRef').textContent   = sub.id;
    renderSummary(sub);

    formHead.style.display = 'none';
    form.style.display = 'none';
    thanks.classList.add('show');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    btnSubmit.disabled = false;
    btnSubmit.innerHTML = originalLabel;
  });

  // ── Init ─────────────────────────────────────────────────────────
  showStep(1);
});

// ─────────────────────────────────────────────────────────────────────
// EMAIL DELIVERY — handled server-side by /api/enquiry.js via Resend.
// Both the internal notification and the guest auto-reply (with their
// enquiry summary) are composed and sent there.
//
// Deploy notes (Vercel):
//   • Set env var  RESEND_API_KEY  (Project → Settings → Environment Variables).
//   • Optional:  ENQUIRY_FROM  (a verified Resend domain sender, e.g.
//     "Nine Angels Villa <events@yourdomain.com>"),  ENQUIRY_INBOX,
//     ENQUIRY_BCC,  ALLOWED_ORIGIN.
//   • Verify your sending domain in Resend before going live; until then the
//     function falls back to Resend's onboarding@resend.dev sandbox sender.
// ─────────────────────────────────────────────────────────────────────

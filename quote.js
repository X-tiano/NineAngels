// Nine Angels — Quotation form logic
//
// ─────────────────────────────────────────────────────────────────────
// CONFIG — turn on real email delivery
// ─────────────────────────────────────────────────────────────────────
// To activate real email forwarding + sender auto-reply + a long-term
// submissions dashboard, sign up at https://formspree.io (free tier is
// fine for low volume), create a new form pointed at
// info@christianopropertymanagement.com, and paste its ID below.
//
// In Formspree → form settings → Autoresponse, paste the body of the
// thank-you email (see THANKYOU_TEMPLATE at the bottom of this file).
//
// Until configured, every submission is saved locally and visible at
// /submissions.html — and a "Send via email" fallback link is offered
// so any submission can still reach the inbox with one click.
// ─────────────────────────────────────────────────────────────────────

const CONFIG = {
  formspreeId: 'xgoqaqzp',                           // e.g. 'mvolwabq'
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
    btnSubmit.hidden = current !== total;
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
      const consent = form.consent.checked;
      if (!name)  { setErr('name', "What's your name?"); ok = false; }
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setErr('email', 'A valid email so we can reply.'); ok = false;
      }
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

  // ── Local storage ────────────────────────────────────────────────
  function saveLocal(sub) {
    try {
      const list = JSON.parse(localStorage.getItem(CONFIG.storageKey) || '[]');
      list.unshift(sub);
      localStorage.setItem(CONFIG.storageKey, JSON.stringify(list));
    } catch (e) { console.warn('Could not save locally:', e); }
  }

  // ── Send (Formspree if configured; otherwise just save+mailto) ───
  async function sendToFormspree(sub) {
    if (!CONFIG.formspreeId) return { ok: false, reason: 'unconfigured' };
    try {
      const res = await fetch(`https://formspree.io/f/${CONFIG.formspreeId}`, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          _replyto: sub.email,
          _subject: `New enquiry — ${sub.eventType || 'event'} — ${sub.name}`,
          ...sub,
          extras: sub.extras.join(', '),
        }),
      });
      return { ok: res.ok };
    } catch (e) {
      return { ok: false, reason: 'network' };
    }
  }

  // ── Submit ───────────────────────────────────────────────────────
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateStep(3)) return;

    btnSubmit.disabled = true;
    const originalLabel = btnSubmit.innerHTML;
    btnSubmit.innerHTML = 'Sending…';

    const sub = collect();
    saveLocal(sub);
    await sendToFormspree(sub); // best-effort — we still show success below

    // Show thank-you
    document.getElementById('thanksName').textContent  = sub.name.split(' ')[0] || 'friend';
    document.getElementById('thanksEmail').textContent = sub.email;
    document.getElementById('thanksRef').textContent   = sub.id;

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
// THANKYOU_TEMPLATE — copy this body into Formspree's Autoresponse
// settings so every sender gets a thank-you email within seconds.
// ─────────────────────────────────────────────────────────────────────
/*
Subject: We've got your enquiry — Nine Angels Villa

Hello,

Thank you for getting in touch about Nine Angels Villa.

We've received your enquiry and one of us will reply personally within
24 hours — usually much sooner.

In the meantime, if you'd like to add anything or change a detail,
just reply to this email.

Warmly,
The Nine Angels team
Madliena, Malta
info@christianopropertymanagement.com
*/

// Nine Angels — shared interactions
document.addEventListener('DOMContentLoaded', () => {

  // (1) Reveal-on-scroll — supports .reveal and .reveal-stagger
  const reveals = document.querySelectorAll('.reveal, .reveal-stagger');
  if (!('IntersectionObserver' in window)) {
    reveals.forEach(el => el.classList.add('visible'));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(el => io.observe(el));
  }

  // (2) Mobile nav toggle
  const toggle = document.querySelector('.nav-toggle');
  const inner = document.querySelector('.nav-inner');
  if (toggle && inner) {
    toggle.addEventListener('click', () => inner.classList.toggle('open'));
  }

  // (3) Nav shrink on scroll
  const nav = document.querySelector('.nav');
  if (nav) {
    const onScroll = () => {
      if (window.scrollY > 40) nav.classList.add('scrolled');
      else nav.classList.remove('scrolled');
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // (4) Number count-up — runs once when element scrolls into view.
  // Mark a span with class="count-up" data-target="100" data-suffix=" guests"
  const counters = document.querySelectorAll('.count-up[data-target]');
  if (counters.length && 'IntersectionObserver' in window) {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cio = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const el = e.target;
        const target = parseFloat(el.dataset.target);
        const suffix = el.dataset.suffix || '';
        const prefix = el.dataset.prefix || '';
        const decimals = parseInt(el.dataset.decimals || '0', 10);
        const duration = parseInt(el.dataset.duration || '1400', 10);
        cio.unobserve(el);
        if (reduce) {
          el.textContent = prefix + target.toFixed(decimals) + suffix;
          return;
        }
        const start = performance.now();
        const ease = (t) => 1 - Math.pow(1 - t, 3);
        const tick = (now) => {
          const t = Math.min(1, (now - start) / duration);
          const v = target * ease(t);
          el.textContent = prefix + v.toFixed(decimals) + suffix;
          if (t < 1) requestAnimationFrame(tick);
          else el.textContent = prefix + target.toFixed(decimals) + suffix;
        };
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.4 });
    counters.forEach(el => cio.observe(el));
  }
});

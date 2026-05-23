/* Nine Angels Villa — shared interactions */

document.addEventListener('DOMContentLoaded', () => {

  /* ─────────────────────────────────────────────────
     1. Service Worker registration (PWA)
  ──────────────────────────────────────────────────*/
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }

  /* ─────────────────────────────────────────────────
     2. Reveal on scroll — .reveal and .reveal-stagger
  ──────────────────────────────────────────────────*/
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
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
    reveals.forEach(el => io.observe(el));
  }

  /* ─────────────────────────────────────────────────
     3. Mobile nav toggle — with aria + close on link
  ──────────────────────────────────────────────────*/
  const toggle = document.querySelector('.nav-toggle');
  const inner  = document.querySelector('.nav-inner');
  const mobileMenu = document.querySelector('.mobile-menu');

  if (toggle && inner) {
    toggle.addEventListener('click', () => {
      const open = inner.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open);
      toggle.textContent = open ? '✕' : '☰';
    });
  }

  // Close mobile menu when a link inside it is clicked
  if (mobileMenu) {
    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        inner && inner.classList.remove('open');
        toggle && toggle.setAttribute('aria-expanded', 'false');
        toggle && (toggle.textContent = '☰');
      });
    });
  }

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (inner && inner.classList.contains('open')) {
      if (!inner.contains(e.target) && !mobileMenu.contains(e.target)) {
        inner.classList.remove('open');
        toggle && toggle.setAttribute('aria-expanded', 'false');
        toggle && (toggle.textContent = '☰');
      }
    }
  });

  /* ─────────────────────────────────────────────────
     4. Nav shrink on scroll
  ──────────────────────────────────────────────────*/
  const nav = document.querySelector('.nav');
  if (nav) {
    const onScroll = () => {
      nav.classList.toggle('scrolled', window.scrollY > 40);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ─────────────────────────────────────────────────
     5. Number count-up
  ──────────────────────────────────────────────────*/
  const counters = document.querySelectorAll('.count-up[data-target]');
  if (counters.length && 'IntersectionObserver' in window) {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cio = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const el = e.target;
        const target   = parseFloat(el.dataset.target);
        const suffix   = el.dataset.suffix   || '';
        const prefix   = el.dataset.prefix   || '';
        const decimals = parseInt(el.dataset.decimals || '0', 10);
        const duration = parseInt(el.dataset.duration || '1400', 10);
        cio.unobserve(el);
        if (reducedMotion) {
          el.textContent = prefix + target.toFixed(decimals) + suffix;
          return;
        }
        const start = performance.now();
        const ease = t => 1 - Math.pow(1 - t, 3);
        const tick = now => {
          const t = Math.min(1, (now - start) / duration);
          el.textContent = prefix + (target * ease(t)).toFixed(decimals) + suffix;
          if (t < 1) requestAnimationFrame(tick);
          else el.textContent = prefix + target.toFixed(decimals) + suffix;
        };
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.4 });
    counters.forEach(el => cio.observe(el));
  }

  /* ─────────────────────────────────────────────────
     6. Parallax engine
        - [data-parallax]:  background-position shift on .ph[data-img]
        - [data-parallax-float]: translateY on any element
        - .hero-bleed: special case for home hero
  ──────────────────────────────────────────────────*/
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobileSafari = /iP(hone|ad)/.test(navigator.userAgent) && /WebKit/.test(navigator.userAgent);

  if (!prefersReducedMotion) {
    const heroBleed   = document.querySelector('.hero-bleed');
    const parallaxBgs = document.querySelectorAll('[data-parallax]');
    const floatEls    = document.querySelectorAll('[data-parallax-float]');

    let ticking = false;

    const runParallax = () => {
      const scrollY = window.scrollY;
      const vh = window.innerHeight;

      // Home hero full-bleed — background drifts at 35% scroll speed
      if (heroBleed) {
        const speed = 0.35;
        const yBase = parseFloat(heroBleed.dataset.parallaxBase || 38);
        heroBleed.style.backgroundPositionY = `calc(${yBase}% + ${scrollY * speed}px)`;
      }

      // Interior hero images & mid-page images — parallax their background-position
      parallaxBgs.forEach(el => {
        const rect  = el.getBoundingClientRect();
        if (rect.bottom < -200 || rect.top > vh + 200) return;
        const speed = parseFloat(el.dataset.parallax || 0.2);
        const center = rect.top + rect.height / 2 - vh / 2;
        el.style.backgroundPositionY = `calc(var(--ph-vert, 50%) + ${center * -speed}px)`;
      });

      // Floating elements — subtle translateY
      floatEls.forEach(el => {
        const rect  = el.getBoundingClientRect();
        if (rect.bottom < -100 || rect.top > vh + 100) return;
        const speed = parseFloat(el.dataset.parallaxFloat || 0.08);
        const center = rect.top + rect.height / 2 - vh / 2;
        el.style.transform = `translateY(${center * speed}px)`;
      });

      ticking = false;
    };

    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(runParallax);
        ticking = true;
      }
    }, { passive: true });

    // Run once on load
    runParallax();
  }

  /* ─────────────────────────────────────────────────
     7. Image load shimmer — mark .ph[data-img] as loaded
        once the background image resolves
  ──────────────────────────────────────────────────*/
  document.querySelectorAll('.ph[data-img]').forEach(el => {
    const imgUrl = getComputedStyle(el).backgroundImage
      .replace(/^url\(["']?/, '').replace(/["']?\)$/, '');
    if (!imgUrl || imgUrl === 'none') return;
    const img = new Image();
    img.onload = () => el.classList.add('img-loaded');
    img.src = imgUrl;
  });

  /* ─────────────────────────────────────────────────
     8. Button ripple on click
  ──────────────────────────────────────────────────*/
  document.querySelectorAll('.btn').forEach(btn => {
    btn.addEventListener('click', function () {
      this.classList.remove('ripple');
      // Force reflow
      void this.offsetWidth;
      this.classList.add('ripple');
    });
  });

  /* ─────────────────────────────────────────────────
     9. WhatsApp floating action button (inject once)
  ──────────────────────────────────────────────────*/
  if (!document.querySelector('.whatsapp-fab')) {
    const fab = document.createElement('a');
    fab.className = 'whatsapp-fab';
    fab.href = 'https://wa.me/35679790202?text=Hello%2C%20I%27m%20interested%20in%20Nine%20Angels%20Villa.';
    fab.target = '_blank';
    fab.rel = 'noopener noreferrer';
    fab.setAttribute('aria-label', 'Chat on WhatsApp');
    fab.innerHTML = `
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
      <span class="wa-tooltip">WhatsApp us</span>
    `;
    document.body.appendChild(fab);
  }

  /* ─────────────────────────────────────────────────
     10. PWA install prompt
  ──────────────────────────────────────────────────*/
  let deferredInstallPrompt = null;
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredInstallPrompt = e;

    // Don't show if dismissed before
    if (sessionStorage.getItem('pwa-dismissed')) return;

    const banner = document.createElement('div');
    banner.className = 'pwa-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Install Nine Angels Villa app');
    banner.innerHTML = `
      <div class="pwa-banner-text">
        <strong>Add to your home screen</strong>
        <span>Quick access to Nine Angels Villa — no app store needed.</span>
      </div>
      <div class="pwa-banner-actions">
        <button class="pwa-dismiss-btn" aria-label="Dismiss">Not now</button>
        <button class="pwa-install-btn">Install</button>
      </div>
    `;
    document.body.appendChild(banner);

    // Animate in after brief delay
    requestAnimationFrame(() => {
      requestAnimationFrame(() => banner.classList.add('show'));
    });

    banner.querySelector('.pwa-install-btn').addEventListener('click', async () => {
      deferredInstallPrompt.prompt();
      const { outcome } = await deferredInstallPrompt.userChoice;
      banner.classList.remove('show');
      setTimeout(() => banner.remove(), 500);
      deferredInstallPrompt = null;
    });

    banner.querySelector('.pwa-dismiss-btn').addEventListener('click', () => {
      banner.classList.remove('show');
      setTimeout(() => banner.remove(), 500);
      sessionStorage.setItem('pwa-dismissed', '1');
    });
  });

});

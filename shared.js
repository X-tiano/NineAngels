/* Nine Angels Villa — shared interactions
   Game-changers: lazy-load · lightbox · scroll-progress · sticky-CTA
   back-to-top · page-transitions · cookie-consent · magnetic-buttons
   hero-text-split · active-section-nav · dark-mode · swipe-gestures
*/

document.addEventListener('DOMContentLoaded', () => {

  /* ─────────────────────────────────────────────────
     SERVICE WORKER (PWA)
  ──────────────────────────────────────────────────*/
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ─────────────────────────────────────────────────
     1. LAZY LOADING — CSS background-image via IO
        Defers off-screen .ph[data-img] images until
        they're 200px from the viewport
  ──────────────────────────────────────────────────*/
  const lazyImages = [];
  document.querySelectorAll('.ph[data-img]').forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.top <= window.innerHeight + 100) {
      el.classList.add('img-loaded');
      return;
    }
    const inlineStyle = el.getAttribute('style') || '';
    const match = inlineStyle.match(/--ph-img:\s*(url\([^)]+\))/);
    if (!match) return;
    el._lazyBg = match[1];
    el.setAttribute('style', inlineStyle.replace(/--ph-img:\s*url\([^)]+\);?\s*/g, '').trim());
    el.classList.add('lazy-pending');
    lazyImages.push(el);
  });

  if (lazyImages.length && 'IntersectionObserver' in window) {
    const lazyIO = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const el = e.target;
        const rawUrl = el._lazyBg.replace(/^url\(['"]?/, '').replace(/['"]?\)$/, '');
        const img = new Image();
        img.onload = () => {
          el.style.setProperty('--ph-img', el._lazyBg);
          el.classList.remove('lazy-pending');
          el.classList.add('lazy-loaded', 'img-loaded');
        };
        img.src = rawUrl;
        lazyIO.unobserve(el);
      });
    }, { rootMargin: '200px 0px' });
    lazyImages.forEach(el => lazyIO.observe(el));
  }

  /* ─────────────────────────────────────────────────
     2. SCROLL PROGRESS BAR
  ──────────────────────────────────────────────────*/
  const progressBar = document.createElement('div');
  progressBar.className = 'scroll-progress';
  document.body.prepend(progressBar);

  /* ─────────────────────────────────────────────────
     3. LIGHTBOX — for .gallery-grid .ph[data-img]
  ──────────────────────────────────────────────────*/
  const galleryPhotos = [...document.querySelectorAll('.gallery-grid .ph[data-img]')];
  let lightboxIndex = 0;

  if (galleryPhotos.length) {
    const overlay = document.createElement('div');
    overlay.className = 'lightbox-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Photo lightbox');
    overlay.innerHTML = `
      <button class="lightbox-close" aria-label="Close lightbox">✕</button>
      <button class="lightbox-prev" aria-label="Previous photo">‹</button>
      <img class="lightbox-img" src="" alt="Villa photo" decoding="async" />
      <button class="lightbox-next" aria-label="Next photo">›</button>
      <div class="lightbox-counter"></div>
    `;
    document.body.appendChild(overlay);

    const lbImg     = overlay.querySelector('.lightbox-img');
    const lbCounter = overlay.querySelector('.lightbox-counter');
    const lbClose   = overlay.querySelector('.lightbox-close');
    const lbPrev    = overlay.querySelector('.lightbox-prev');
    const lbNext    = overlay.querySelector('.lightbox-next');

    const getPhotoUrl = el => {
      const s = el.getAttribute('style') || '';
      const m = s.match(/--ph-img:\s*url\(['"]?([^'")\s]+)['"]?\)/);
      if (m) return m[1];
      return (el._lazyBg || '').replace(/^url\(['"]?/, '').replace(/['"]?\)$/, '');
    };

    const openLightbox = idx => {
      lightboxIndex = ((idx % galleryPhotos.length) + galleryPhotos.length) % galleryPhotos.length;
      lbImg.src = getPhotoUrl(galleryPhotos[lightboxIndex]);
      lbCounter.textContent = `${lightboxIndex + 1} / ${galleryPhotos.length}`;
      overlay.classList.add('open');
      document.body.style.overflow = 'hidden';
      lbClose.focus();
    };

    const closeLightbox = () => {
      overlay.classList.remove('open');
      document.body.style.overflow = '';
    };

    galleryPhotos.forEach((el, i) => {
      el.setAttribute('tabindex', '0');
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', `View photo ${i + 1} of ${galleryPhotos.length}`);
      el.addEventListener('click', () => openLightbox(i));
      el.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') openLightbox(i);
      });
    });

    lbClose.addEventListener('click', closeLightbox);
    lbPrev.addEventListener('click', () => openLightbox(lightboxIndex - 1));
    lbNext.addEventListener('click', () => openLightbox(lightboxIndex + 1));
    overlay.addEventListener('click', e => { if (e.target === overlay) closeLightbox(); });
    document.addEventListener('keydown', e => {
      if (!overlay.classList.contains('open')) return;
      if (e.key === 'Escape')      closeLightbox();
      if (e.key === 'ArrowLeft')   openLightbox(lightboxIndex - 1);
      if (e.key === 'ArrowRight')  openLightbox(lightboxIndex + 1);
    });
  }

  /* ─────────────────────────────────────────────────
     4. STICKY BOOKING CTA — slides in after hero
  ──────────────────────────────────────────────────*/
  const label = document.body.dataset.screenLabel || '';
  const stickyCta = document.createElement('div');
  stickyCta.className = 'sticky-cta';

  if (label.includes('Events')) {
    stickyCta.innerHTML = `<a href="quote.html">Enquire about your date <span class="arrow">→</span></a>`;
  } else if (label.includes('Stays')) {
    stickyCta.innerHTML = `<a href="https://nineangelsvilla.guestybookings.com/en" target="_blank" rel="noopener">Book your stay <span class="arrow">→</span></a>`;
  } else {
    stickyCta.innerHTML = `
      <a href="events.html">Host an event <span class="arrow">→</span></a>
      <a href="stays.html">Book a stay <span class="arrow">→</span></a>
    `;
  }
  document.body.appendChild(stickyCta);

  /* ─────────────────────────────────────────────────
     5. BACK-TO-TOP BUTTON
  ──────────────────────────────────────────────────*/
  const backTop = document.createElement('button');
  backTop.className = 'back-top';
  backTop.setAttribute('aria-label', 'Scroll to top');
  backTop.innerHTML = '↑';
  document.body.appendChild(backTop);
  backTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  /* ─────────────────────────────────────────────────
     6. UNIFIED SCROLL HANDLER
        nav shrink · scroll progress · sticky CTA · back-to-top
  ──────────────────────────────────────────────────*/
  const nav    = document.querySelector('.nav');
  const heroEl = document.querySelector('.hero-bleed, .hero-grid, .page-header');
  let scrollTick = false;

  const onScroll = () => {
    if (scrollTick) return;
    requestAnimationFrame(() => {
      const scrollY = window.scrollY;
      const docH    = document.documentElement.scrollHeight - window.innerHeight;

      if (nav) nav.classList.toggle('scrolled', scrollY > 40);

      progressBar.style.width = docH > 0 ? `${(scrollY / docH) * 100}%` : '0%';

      const threshold = heroEl ? heroEl.offsetHeight * 0.85 : window.innerHeight * 0.6;
      stickyCta.classList.toggle('visible', scrollY > threshold);
      backTop.classList.toggle('visible', scrollY > 400);

      scrollTick = false;
    });
    scrollTick = true;
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ─────────────────────────────────────────────────
     7. PARALLAX ENGINE
  ──────────────────────────────────────────────────*/
  if (!prefersReducedMotion) {
    const heroBleed   = document.querySelector('.hero-bleed');
    const parallaxBgs = document.querySelectorAll('[data-parallax]');
    const floatEls    = document.querySelectorAll('[data-parallax-float]');
    let pTick = false;

    const runParallax = () => {
      const scrollY = window.scrollY;
      const vh = window.innerHeight;

      if (heroBleed) {
        const base = parseFloat(heroBleed.dataset.parallaxBase || 38);
        heroBleed.style.backgroundPositionY = `calc(${base}% + ${scrollY * 0.35}px)`;
      }

      parallaxBgs.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.bottom < -200 || rect.top > vh + 200) return;
        const speed  = parseFloat(el.dataset.parallax || 0.2);
        const center = rect.top + rect.height / 2 - vh / 2;
        el.style.backgroundPositionY = `calc(var(--ph-vert, 50%) + ${center * -speed}px)`;
      });

      floatEls.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.bottom < -100 || rect.top > vh + 100) return;
        const speed  = parseFloat(el.dataset.parallaxFloat || 0.08);
        const center = rect.top + rect.height / 2 - vh / 2;
        el.style.transform = `translateY(${center * speed}px)`;
      });

      pTick = false;
    };

    window.addEventListener('scroll', () => {
      if (!pTick) { requestAnimationFrame(runParallax); pTick = true; }
    }, { passive: true });
    runParallax();
  }

  /* ─────────────────────────────────────────────────
     8. REVEAL ON SCROLL
  ──────────────────────────────────────────────────*/
  const reveals = document.querySelectorAll('.reveal, .reveal-stagger');
  if (!('IntersectionObserver' in window)) {
    reveals.forEach(el => el.classList.add('visible'));
  } else {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
    reveals.forEach(el => io.observe(el));
  }

  /* ─────────────────────────────────────────────────
     9. HERO SPLIT-TEXT ANIMATION
        Each word in the first h1 slides up staggered
  ──────────────────────────────────────────────────*/
  if (!prefersReducedMotion) {
    const heroH1 = document.querySelector('.hero-bleed h1, .hero-text h1');
    if (heroH1) {
      const walker = document.createTreeWalker(heroH1, NodeFilter.SHOW_TEXT);
      const textNodes = [];
      let n;
      while ((n = walker.nextNode())) textNodes.push(n);
      let wordIdx = 0;
      textNodes.forEach(tn => {
        if (!tn.textContent.trim()) return;
        const frag = document.createDocumentFragment();
        tn.textContent.split(/(\s+)/).forEach(part => {
          if (/^\s+$/.test(part)) {
            frag.appendChild(document.createTextNode(part));
          } else if (part) {
            const wrap  = document.createElement('span');
            wrap.className = 'split-word';
            const inner = document.createElement('span');
            inner.className = 'split-inner';
            inner.style.setProperty('--word-delay', `${wordIdx * 55 + 120}ms`);
            inner.textContent = part;
            wrap.appendChild(inner);
            frag.appendChild(wrap);
            wordIdx++;
          }
        });
        tn.parentNode.replaceChild(frag, tn);
      });
    }
  }

  /* ─────────────────────────────────────────────────
     10. NUMBER COUNT-UP
  ──────────────────────────────────────────────────*/
  const counters = document.querySelectorAll('.count-up[data-target]');
  if (counters.length && 'IntersectionObserver' in window) {
    const cio = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const el       = e.target;
        const target   = parseFloat(el.dataset.target);
        const suffix   = el.dataset.suffix   || '';
        const prefix   = el.dataset.prefix   || '';
        const decimals = parseInt(el.dataset.decimals  || '0', 10);
        const duration = parseInt(el.dataset.duration  || '1400', 10);
        cio.unobserve(el);
        if (prefersReducedMotion) {
          el.textContent = prefix + target.toFixed(decimals) + suffix; return;
        }
        const start = performance.now();
        const ease  = t => 1 - Math.pow(1 - t, 3);
        const tick  = now => {
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
     11. MAGNETIC BUTTONS (desktop/pointer: fine only)
  ──────────────────────────────────────────────────*/
  if (!prefersReducedMotion && window.matchMedia('(pointer: fine)').matches) {
    document.querySelectorAll('.btn-primary, .btn-outline, .nav-cta').forEach(btn => {
      btn.classList.add('btn-magnetic');
      btn.addEventListener('mousemove', e => {
        const r  = btn.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width  / 2)) / r.width  * 10;
        const dy = (e.clientY - (r.top  + r.height / 2)) / r.height * 8;
        btn.style.transform = `translate(${dx}px, ${dy}px) translateY(-2px)`;
      });
      btn.addEventListener('mouseleave', () => { btn.style.transform = ''; });
    });
  }

  /* ─────────────────────────────────────────────────
     12. PAGE TRANSITIONS — fade veil on navigation
  ──────────────────────────────────────────────────*/
  if (!prefersReducedMotion) {
    const veil = document.createElement('div');
    veil.className = 'page-veil';
    document.body.appendChild(veil);

    document.querySelectorAll('a[href]').forEach(a => {
      const href = a.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('http') ||
          href.startsWith('tel:') || href.startsWith('mailto:') ||
          a.target === '_blank' || !href.match(/\.html$/)) return;
      a.addEventListener('click', e => {
        e.preventDefault();
        veil.classList.add('fade-out');
        setTimeout(() => { window.location.href = href; }, 290);
      });
    });

    window.addEventListener('pageshow', () => veil.classList.remove('fade-out'));
  }

  /* ─────────────────────────────────────────────────
     13. MOBILE NAV TOGGLE + close on link / outside click
  ──────────────────────────────────────────────────*/
  const toggle     = document.querySelector('.nav-toggle');
  const inner      = document.querySelector('.nav-inner');
  const mobileMenu = document.querySelector('.mobile-menu');

  if (toggle && inner) {
    toggle.addEventListener('click', () => {
      const open = inner.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open);
      toggle.textContent = open ? '✕' : '☰';
    });
  }
  mobileMenu?.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      inner?.classList.remove('open');
      toggle?.setAttribute('aria-expanded', 'false');
      if (toggle) toggle.textContent = '☰';
    });
  });
  document.addEventListener('click', e => {
    if (!inner?.classList.contains('open')) return;
    if (!inner.contains(e.target) && !(mobileMenu?.contains(e.target))) {
      inner.classList.remove('open');
      toggle?.setAttribute('aria-expanded', 'false');
      if (toggle) toggle.textContent = '☰';
    }
  });

  /* ─────────────────────────────────────────────────
     14. SWIPE GESTURES — lightbox nav + mobile menu
  ──────────────────────────────────────────────────*/
  let touchStartX = 0, touchStartY = 0;
  document.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
  }, { passive: true });

  document.addEventListener('touchend', e => {
    const dx    = e.changedTouches[0].screenX - touchStartX;
    const dy    = e.changedTouches[0].screenY - touchStartY;
    const absDx = Math.abs(dx), absDy = Math.abs(dy);
    if (absDx < 40 && absDy < 40) return;

    const lb = document.querySelector('.lightbox-overlay.open');
    if (lb) {
      if (absDx > absDy && absDx > 60) {
        dx < 0
          ? document.querySelector('.lightbox-next')?.click()
          : document.querySelector('.lightbox-prev')?.click();
      } else if (dy > 80 && absDy > absDx) {
        document.querySelector('.lightbox-close')?.click();
      }
      return;
    }

    if (absDx > absDy && absDx > 80 && window.innerWidth <= 880) {
      if (dx < 0 && inner && !inner.classList.contains('open')) {
        inner.classList.add('open');
        toggle?.setAttribute('aria-expanded', 'true');
        if (toggle) toggle.textContent = '✕';
      } else if (dx > 0 && inner?.classList.contains('open')) {
        inner.classList.remove('open');
        toggle?.setAttribute('aria-expanded', 'false');
        if (toggle) toggle.textContent = '☰';
      }
    }
  }, { passive: true });

  /* ─────────────────────────────────────────────────
     15. BUTTON RIPPLE
  ──────────────────────────────────────────────────*/
  document.querySelectorAll('.btn').forEach(btn => {
    btn.addEventListener('click', function () {
      this.classList.remove('ripple');
      void this.offsetWidth;
      this.classList.add('ripple');
    });
  });

  /* ─────────────────────────────────────────────────
     16. WHATSAPP FAB
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
     17. COOKIE CONSENT (GDPR — Malta / EU)
  ──────────────────────────────────────────────────*/
  if (!localStorage.getItem('cookie-consent')) {
    const bar = document.createElement('div');
    bar.className = 'cookie-bar';
    bar.setAttribute('role', 'dialog');
    bar.setAttribute('aria-label', 'Cookie consent');
    bar.innerHTML = `
      <div>We use cookies to improve your experience. By continuing you agree to our
        <a href="info.html#privacy">privacy policy</a>.
      </div>
      <div class="cookie-bar-actions">
        <button class="cookie-decline">Decline</button>
        <button class="cookie-accept">Accept</button>
      </div>
    `;
    document.body.appendChild(bar);
    requestAnimationFrame(() => requestAnimationFrame(() => bar.classList.add('show')));
    bar.querySelector('.cookie-accept').addEventListener('click', () => {
      localStorage.setItem('cookie-consent', 'accepted');
      bar.classList.remove('show');
      setTimeout(() => bar.remove(), 500);
    });
    bar.querySelector('.cookie-decline').addEventListener('click', () => {
      localStorage.setItem('cookie-consent', 'declined');
      bar.classList.remove('show');
      setTimeout(() => bar.remove(), 500);
    });
  }

  /* ─────────────────────────────────────────────────
     18. PWA INSTALL PROMPT
  ──────────────────────────────────────────────────*/
  let deferredInstall = null;
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredInstall = e;
    if (sessionStorage.getItem('pwa-dismissed')) return;
    setTimeout(() => {
      const banner = document.createElement('div');
      banner.className = 'pwa-banner';
      banner.setAttribute('role', 'dialog');
      banner.innerHTML = `
        <div class="pwa-banner-text">
          <strong>Add to your home screen</strong>
          <span>Quick access to Nine Angels Villa — no app store needed.</span>
        </div>
        <div class="pwa-banner-actions">
          <button class="pwa-dismiss-btn">Not now</button>
          <button class="pwa-install-btn">Install</button>
        </div>
      `;
      document.body.appendChild(banner);
      requestAnimationFrame(() => requestAnimationFrame(() => banner.classList.add('show')));
      banner.querySelector('.pwa-install-btn').addEventListener('click', async () => {
        deferredInstall.prompt();
        await deferredInstall.userChoice;
        banner.classList.remove('show');
        setTimeout(() => banner.remove(), 500);
        deferredInstall = null;
      });
      banner.querySelector('.pwa-dismiss-btn').addEventListener('click', () => {
        banner.classList.remove('show');
        setTimeout(() => banner.remove(), 500);
        sessionStorage.setItem('pwa-dismissed', '1');
      });
    }, localStorage.getItem('cookie-consent') ? 4000 : 9000);
  });

  /* ─────────────────────────────────────────────────
     19. IMAGE SHIMMER cleanup on in-viewport images
  ──────────────────────────────────────────────────*/
  document.querySelectorAll('.ph[data-img]:not(.lazy-pending)').forEach(el => {
    if (el.classList.contains('img-loaded')) return;
    const style = el.getAttribute('style') || '';
    const m = style.match(/--ph-img:\s*url\(['"]?([^'")\s]+)['"]?\)/);
    if (!m) return;
    const img = new Image();
    img.onload = () => el.classList.add('img-loaded');
    img.src = m[1];
  });

});

// Nine Angels — shared interactions v2
(function () {
  'use strict';

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.addEventListener('DOMContentLoaded', () => {

    // ── (1) Reveal-on-scroll ──────────────────────────
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
      }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
      reveals.forEach(el => io.observe(el));
    }

    // ── (2) Mobile nav toggle ─────────────────────────
    const toggle = document.querySelector('.nav-toggle');
    const inner  = document.querySelector('.nav-inner');
    const mobileMenu = document.querySelector('.mobile-menu');

    if (toggle && inner) {
      toggle.addEventListener('click', () => {
        const open = inner.classList.toggle('open');
        toggle.setAttribute('aria-expanded', String(open));
        toggle.textContent = open ? '✕' : '☰';
      });
      // Close on outside click
      document.addEventListener('click', (e) => {
        if (!e.target.closest('.nav')) {
          inner.classList.remove('open');
          toggle.setAttribute('aria-expanded', 'false');
          toggle.textContent = '☰';
        }
      });
      // Close on link click
      if (mobileMenu) {
        mobileMenu.querySelectorAll('a').forEach(a => {
          a.addEventListener('click', () => {
            inner.classList.remove('open');
            toggle.setAttribute('aria-expanded', 'false');
            toggle.textContent = '☰';
          });
        });
      }
    }

    // ── (3) Nav shrink on scroll ──────────────────────
    const nav = document.querySelector('.nav');
    if (nav) {
      const onScroll = () => {
        nav.classList.toggle('scrolled', window.scrollY > 50);
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }

    // ── (4) Number count-up ───────────────────────────
    const counters = document.querySelectorAll('.count-up[data-target]');
    if (counters.length && 'IntersectionObserver' in window) {
      const cio = new IntersectionObserver((entries) => {
        entries.forEach(e => {
          if (!e.isIntersecting) return;
          const el       = e.target;
          const target   = parseFloat(el.dataset.target);
          const suffix   = el.dataset.suffix   || '';
          const prefix   = el.dataset.prefix   || '';
          const decimals = parseInt(el.dataset.decimals  || '0', 10);
          const duration = parseInt(el.dataset.duration  || '1400', 10);
          cio.unobserve(el);
          if (prefersReduced) {
            el.textContent = prefix + target.toFixed(decimals) + suffix;
            return;
          }
          const start = performance.now();
          const ease  
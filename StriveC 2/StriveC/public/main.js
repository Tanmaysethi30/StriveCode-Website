/**
 * StriveCode Unified Multi-Page Website Logic
 * - Smooth Page Load & Page Transition Fades
 * - IntersectionObserver Scroll Reveal with Sibling Stagger
 * - Parallax Drift on Dot-Matrix Layer (<20px)
 * - Mobile Navigation Toggle
 * - Full Accessibility (prefers-reduced-motion)
 */

(function () {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 1. PAGE LOAD FADE-IN
  function handlePageLoad() {
    document.body.classList.add('site-loaded');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', handlePageLoad);
  } else {
    handlePageLoad();
  }

  // Handle pageshow event (e.g., restored from bfcache on back/forward)
  window.addEventListener('pageshow', function (event) {
    document.body.classList.remove('site-unloading');
    document.body.classList.add('site-loaded');
  });

  // 2. PAGE TRANSITIONS (FADE OUT BEFORE NAVIGATING)
  const internalPages = [
    '/',
    '/product',
    '/services',
    '/courses',
    '/careers',
    '/mentorship',
    '/aboutus',
    '/contact',
    'Homepage.html',
    'Product.html',
    'Services.html',
    'Courses.html',
    'Careers.html',
    'Mentorship.html',
    'Aboutus.html',
    'Contact.html'
  ];

  document.addEventListener('click', function (e) {
    const link = e.target.closest('a');
    if (!link) return;

    // Do not intercept special clicks
    if (
      e.defaultPrevented ||
      e.button !== 0 ||
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey
    ) {
      return;
    }

    const target = link.getAttribute('target');
    if (target && target !== '_self') return;

    const href = link.getAttribute('href');
    if (!href) return;

    // Ignore anchor jumps, tel, mailto, javascript
    if (
      href.startsWith('#') ||
      href.startsWith('tel:') ||
      href.startsWith('mailto:') ||
      href.startsWith('javascript:')
    ) {
      return;
    }

    // Check if target is one of the internal pages
    let url;
    try {
      url = new URL(link.href, window.location.href);
    } catch (err) {
      return;
    }

    const isSameHost = url.origin === window.location.origin;
    const isInternalTarget = internalPages.some(function (page) {
      const cleanPath = url.pathname.replace(/\/$/, '') || '/';
      return cleanPath === page || url.pathname.endsWith(page);
    });

    if (!isSameHost || !isInternalTarget) return;

    // Same-page hash anchor jump (e.g. Courses.html#career-consultation from Courses.html)
    if (
      url.pathname === window.location.pathname &&
      url.search === window.location.search &&
      url.hash
    ) {
      return;
    }

    // Exact same page without hash - do not re-fade
    if (
      url.pathname === window.location.pathname &&
      url.search === window.location.search &&
      !url.hash
    ) {
      e.preventDefault();
      return;
    }

    // If user prefers reduced motion, navigate immediately without fade
    if (reducedMotion) return;

    // Trigger slow fade-out (~500ms) then navigate
    e.preventDefault();
    document.body.classList.add('site-unloading');

    setTimeout(function () {
      window.location.href = link.href;
    }, 480);
  });

  // 3. SCROLL REVEAL (INTERSECTION OBSERVER)
  document.addEventListener('DOMContentLoaded', function () {
    if (!('IntersectionObserver' in window) || reducedMotion) {
      return;
    }

    // Potential candidates for reveal
    const candidates = document.querySelectorAll(
      'section, main, .product-card, .program-card, #roles-grid > div, .grid > div, h2'
    );

    const toObserve = [];

    candidates.forEach(function (el) {
      // SKIP elements that already have entrance animation or exist inside already animated wrappers
      if (
        el.closest('header') ||
        el.closest('nav') ||
        el.closest('footer') ||
        el.closest('.reveal') ||
        el.classList.contains('reveal') ||
        el.classList.contains('revealed') ||
        el.closest('[data-reveal-card]') ||
        el.hasAttribute('data-reveal-card') ||
        el.closest('.team-card') ||
        el.classList.contains('team-card') ||
        el.closest('.team-gallery') ||
        el.classList.contains('team-gallery') ||
        el.closest('.syllabus-drawer') ||
        el.classList.contains('mobile-nav-drawer')
      ) {
        return; // SKIP
      }

      // If child is inside an element that already has .site-reveal, skip to avoid double animation
      if (el.closest('.site-reveal')) {
        return;
      }

      // Avoid tiny elements
      const rect = el.getBoundingClientRect();
      if (rect.height < 40 && rect.width < 40) return;

      el.classList.add('site-reveal');
      toObserve.push(el);
    });

    // Group siblings for 100-150ms stagger
    const groups = new Map();
    toObserve.forEach(function (el) {
      const parent = el.parentElement;
      if (!groups.has(parent)) {
        groups.set(parent, []);
      }
      groups.get(parent).push(el);
    });

    groups.forEach(function (siblings) {
      if (siblings.length > 1) {
        siblings.forEach(function (sibling, idx) {
          sibling.style.transitionDelay = Math.min(idx * 120, 480) + 'ms';
        });
      }
    });

    const observer = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('site-revealed');
            entry.target.addEventListener(
              'transitionend',
              function () {
                entry.target.style.willChange = 'auto';
              },
              { once: true }
            );
            obs.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.08,
        rootMargin: '0px 0px -30px 0px'
      }
    );

    toObserve.forEach(function (el) {
      observer.observe(el);
    });
  });

  // 4. PARALLAX DRIFT ON DOT-MATRIX LAYER (<20px)
  if (
    document.body.classList.contains('has-dot-matrix') &&
    !reducedMotion
  ) {
    let ticking = false;
    window.addEventListener(
      'scroll',
      function () {
        if (!ticking) {
          window.requestAnimationFrame(function () {
            // Very slow drift under 20px
            const maxDrift = 16;
            const drift = Math.min(window.scrollY * 0.015, maxDrift);
            document.body.style.setProperty('--dot-drift-y', drift.toFixed(1) + 'px');
            ticking = false;
          });
          ticking = true;
        }
      },
      { passive: true }
    );
  }

  // 5. MOBILE NAVIGATION TOGGLE
  document.addEventListener('DOMContentLoaded', function () {
    const mobileToggles = document.querySelectorAll(
      '#mobile-menu-toggle, #mobileMenuBtn, button[aria-label*="Navigation" i], button[aria-label*="Menu" i]'
    );

    mobileToggles.forEach(function (btn) {
      btn.addEventListener('click', function () {
        const header = btn.closest('header') || document.querySelector('header');
        if (!header) return;
        const drawer = header.querySelector(
          '#mobile-menu, #mobileMenu, .mobile-nav-drawer'
        );
        if (drawer) {
          const isHidden = drawer.classList.contains('hidden');
          drawer.classList.toggle('hidden', !isHidden);
          if (drawer.classList.contains('flex-col')) {
            drawer.classList.toggle('flex', isHidden);
          }
          btn.setAttribute('aria-expanded', String(isHidden));
          const menuIcon = btn.querySelector('#menu-icon, .material-symbols-outlined');
          if (menuIcon) {
            menuIcon.textContent = isHidden ? 'close' : 'menu';
          }
        }
      });
    });
  });
})();

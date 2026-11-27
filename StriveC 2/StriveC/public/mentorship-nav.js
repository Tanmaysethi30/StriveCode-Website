/**
 * StriveCode Mentorship — Dual-State Navbar Controller (Option A)
 * Prefix: sc-mnav-
 * Only active on /mentorship
 */
(function () {
  'use strict';

  function initMentorshipNavbar() {
    const header = document.querySelector('header');
    const hero = document.getElementById('heroSection');
    if (!header || !hero) return;

    header.classList.add('sc-mnav-header');

    let currentNavH = header.offsetHeight || 73;
    let observer = null;
    let currentState = null; // 'hero' | 'scrolled'

    function updateState(newState) {
      if (currentState === newState) return;
      currentState = newState;

      if (newState === 'hero') {
        header.classList.remove('sc-mnav-scrolled');
        header.classList.add('sc-mnav-hero');
      } else {
        header.classList.remove('sc-mnav-hero');
        header.classList.add('sc-mnav-scrolled');
      }

      // Clean up the initial head class once runtime state is active
      document.documentElement.classList.remove('sc-mnav-hero-initial');
    }

    // Determine initial state based on current scroll position
    const heroRect = hero.getBoundingClientRect();
    if (heroRect.bottom <= currentNavH) {
      updateState('scrolled');
    } else {
      updateState('hero');
    }

    // Setup IntersectionObserver on the hero section
    function setupObserver() {
      if (observer) observer.disconnect();
      currentNavH = header.offsetHeight || 73;

      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const bottom = entry.boundingClientRect.bottom;
            if (!entry.isIntersecting || bottom <= currentNavH) {
              updateState('scrolled');
            } else if (entry.isIntersecting && bottom > currentNavH + 16) {
              // 16px hysteresis zone prevents flickering on slow scrolling
              updateState('hero');
            }
          });
        },
        {
          root: null,
          rootMargin: `-${currentNavH}px 0px 0px 0px`,
          threshold: [0, 0.05, 0.1, 0.2]
        }
      );

      observer.observe(hero);
    }

    setupObserver();

    // Recalculate on window resize
    let resizeTimer;
    window.addEventListener(
      'resize',
      () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          setupObserver();
          const r = hero.getBoundingClientRect();
          if (r.bottom <= currentNavH) {
            updateState('scrolled');
          } else {
            updateState('hero');
          }
        }, 100);
      },
      { passive: true }
    );

    // Handle back/forward cache restore (bfcache)
    window.addEventListener('pageshow', (e) => {
      if (e.persisted) {
        const r = hero.getBoundingClientRect();
        if (r.bottom <= currentNavH) {
          updateState('scrolled');
        } else {
          updateState('hero');
        }
      }
    });

    // Mobile Menu Synchronization
    const toggleBtn = document.getElementById('mobile-menu-toggle');
    const mobileMenu = document.getElementById('mobile-menu');

    function syncMobileMenuState() {
      const isExpanded = toggleBtn && toggleBtn.getAttribute('aria-expanded') === 'true';
      const isVisible = mobileMenu && !mobileMenu.classList.contains('hidden');

      if (isExpanded || isVisible) {
        header.classList.add('sc-mnav-menu-open');
      } else {
        header.classList.remove('sc-mnav-menu-open');
      }
    }

    if (toggleBtn) {
      // MutationObserver to catch any aria-expanded change
      const mutObs = new MutationObserver(syncMobileMenuState);
      mutObs.observe(toggleBtn, { attributes: true, attributeFilter: ['aria-expanded'] });

      // Click listener as immediate backup
      toggleBtn.addEventListener('click', () => {
        setTimeout(syncMobileMenuState, 10);
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMentorshipNavbar);
  } else {
    initMentorshipNavbar();
  }
})();

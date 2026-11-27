/**
 * StriveCode Technology — Intern Testimonials Interactivity
 * Progressive enhancement, scroll reveal, single-listener rAF spotlight & 3D tilt.
 * Prefix: sc-testi-
 */
(function () {
  'use strict';

  function initTestimonials() {
    var section = document.querySelector('.sc-testi-section');
    if (!section) return;

    // 1. Progressive Enhancement: Arm reveal state only when JS runs
    section.classList.add('sc-testi-js');

    var headerReveal = section.querySelector('.sc-testi-header-reveal');
    var cardWraps = Array.prototype.slice.call(section.querySelectorAll('.sc-testi-card-wrap'));

    // 2. Scroll Reveal with IntersectionObserver
    if ('IntersectionObserver' in window) {
      var revealObserver = new IntersectionObserver(
        function (entries, observer) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add('sc-testi-revealed');
              observer.unobserve(entry.target);
            }
          });
        },
        {
          rootMargin: '0px 0px -40px 0px',
          threshold: 0.12
        }
      );

      if (headerReveal) revealObserver.observe(headerReveal);
      cardWraps.forEach(function (wrap) {
        revealObserver.observe(wrap);
      });
    } else {
      // Fallback if IntersectionObserver not supported
      if (headerReveal) headerReveal.classList.add('sc-testi-revealed');
      cardWraps.forEach(function (wrap) {
        wrap.classList.add('sc-testi-revealed');
      });
    }

    // 3. Back/Forward Cache Restore (bfcache)
    window.addEventListener('pageshow', function (event) {
      if (event.persisted) {
        if (headerReveal) headerReveal.classList.add('sc-testi-revealed');
        cardWraps.forEach(function (wrap) {
          wrap.classList.add('sc-testi-revealed');
        });
      }
    });

    // 4. Delegated 3D Tilt & Pointer Spotlight (Hover & Fine Pointer Only)
    var canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!canHover) return;

    var activeCard = null;
    var cardRect = null;
    var targetTiltX = 0;
    var targetTiltY = 0;
    var currentTiltX = 0;
    var currentTiltY = 0;
    var mouseX = 50;
    var mouseY = 50;
    var isTicking = false;
    var isSectionVisible = true;

    // Track section visibility to pause animation loops when off-screen
    if ('IntersectionObserver' in window) {
      var sectionVisibilityObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          isSectionVisible = entry.isIntersecting;
          if (!isSectionVisible && activeCard) {
            resetActiveCard();
          }
        });
      });
      sectionVisibilityObserver.observe(section);
    }

    function resetActiveCard() {
      if (activeCard) {
        activeCard.style.setProperty('--sc-tilt-x', '0deg');
        activeCard.style.setProperty('--sc-tilt-y', '0deg');
        activeCard.style.setProperty('--sc-mouse-x', '50%');
        activeCard.style.setProperty('--sc-mouse-y', '50%');
      }
      activeCard = null;
      cardRect = null;
      targetTiltX = 0;
      targetTiltY = 0;
      currentTiltX = 0;
      currentTiltY = 0;
    }

    function updateCardTransform() {
      if (!activeCard || !isSectionVisible || document.visibilityState === 'hidden') {
        isTicking = false;
        return;
      }

      // Smooth interpolation for subtle physics
      currentTiltX += (targetTiltX - currentTiltX) * 0.18;
      currentTiltY += (targetTiltY - currentTiltY) * 0.18;

      activeCard.style.setProperty('--sc-tilt-x', currentTiltX.toFixed(2) + 'deg');
      activeCard.style.setProperty('--sc-tilt-y', currentTiltY.toFixed(2) + 'deg');
      activeCard.style.setProperty('--sc-mouse-x', mouseX.toFixed(1) + '%');
      activeCard.style.setProperty('--sc-mouse-y', mouseY.toFixed(1) + '%');

      var delta = Math.abs(targetTiltX - currentTiltX) + Math.abs(targetTiltY - currentTiltY);
      if (delta > 0.02 || activeCard) {
        requestAnimationFrame(updateCardTransform);
      } else {
        isTicking = false;
      }
    }

    // Delegated pointer listener on section
    section.addEventListener('pointerover', function (e) {
      var card = e.target.closest('.sc-testi-card');
      if (card && card !== activeCard) {
        if (activeCard) resetActiveCard();
        activeCard = card;
        cardRect = card.getBoundingClientRect();
      }
    });

    section.addEventListener('pointermove', function (e) {
      if (!activeCard) {
        var card = e.target.closest('.sc-testi-card');
        if (card) {
          activeCard = card;
          cardRect = card.getBoundingClientRect();
        } else {
          return;
        }
      }

      if (!cardRect) {
        cardRect = activeCard.getBoundingClientRect();
      }

      var px = e.clientX - cardRect.left;
      var py = e.clientY - cardRect.top;

      // Spotlight coordinates in percentages
      mouseX = (px / cardRect.width) * 100;
      mouseY = (py / cardRect.height) * 100;

      // Calculate gentle 3D tilt: max 4 degrees toward pointer
      var normX = (px / cardRect.width) - 0.5; // -0.5 to +0.5
      var normY = (py / cardRect.height) - 0.5; // -0.5 to +0.5

      // Invert Y for rotateX (moving mouse down tilts card down)
      targetTiltX = -normY * 8.0; // clamp max 4 deg
      targetTiltY = normX * 8.0;  // clamp max 4 deg

      // Clamp to max 4 degrees
      targetTiltX = Math.max(-4, Math.min(4, targetTiltX));
      targetTiltY = Math.max(-4, Math.min(4, targetTiltY));

      if (!isTicking) {
        isTicking = true;
        requestAnimationFrame(updateCardTransform);
      }
    });

    section.addEventListener('pointerout', function (e) {
      var card = e.target.closest('.sc-testi-card');
      if (card && (!e.relatedTarget || !card.contains(e.relatedTarget))) {
        resetActiveCard();
      }
    });

    // Reset when tab is hidden or window blurred
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') {
        resetActiveCard();
      }
    });

    window.addEventListener('blur', resetActiveCard);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTestimonials);
  } else {
    initTestimonials();
  }
})();

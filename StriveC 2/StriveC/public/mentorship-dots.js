/**
 * StriveCode Mentorship Hero - Flowing Dots Background Animation
 * Namespace: sc-flow-
 * Pure vanilla JavaScript with zero external dependencies.
 */
(() => {
  'use strict';

  // --- Configuration Constants ---
  const CONFIG = {
    // Dot count scaling: 90-130 on desktop, 45-60 on mobile
    minDots: 45,
    maxDots: 130,
    areaPerDot: 8200,

    // Dot geometry & speed (pixels per second)
    minRadius: 1.0,
    maxRadius: 2.6,
    minSpeed: 8.5,
    maxSpeed: 17.5,

    // Soft edge wrap margin (pixels)
    edgeMargin: 36,

    // Colors
    accentChance: 1 / 12, // ~8.3% accent dots
    colorWhiteBlue: [
      { r: 215, g: 228, b: 255 }, // Pale blue
      { r: 235, g: 242, b: 255 }, // Soft crisp periwinkle
      { r: 255, g: 255, b: 255 }  // Pure white
    ],
    colorGold: { r: 240, g: 180, b: 60 },   // Matches logo gold orbit
    colorRed: { r: 215, g: 50, b: 45 },     // Matches logo red orbit

    // Subtle inter-dot connections
    connectDist: 95,
    maxConnectLines: 32,
    maxLineOpacity: 0.065,

    // Mouse / Touch Hover interaction
    hoverRadius: 160,
    maxPush: 36,
    hoverGrowth: 0.55,           // up to ~1.55x - 1.6x base radius
    hoverBrighten: 0.24,         // up to +0.24 alpha
    maxConstellationLines: 5,     // nearest 4-6 dots
    constellationOpacity: 0.12,   // cursor-to-dot line max opacity

    // Frame-rate independent timing parameters (seconds)
    hoverRiseTime: 0.10,         // ~100ms quick response
    hoverRelaxTime: 0.75,        // ~750ms slow relaxation
    mouseFadeTime: 0.80,         // ~800ms fadeout when cursor leaves
    mouseEase: 0.50              // Instantaneous pointer tracking ease
  };

  // --- Analytical Smooth Flow Field ---
  function getFlowAngle(x, y, t) {
    const nx = x * 0.0022;
    const ny = y * 0.0022;
    const nt = t * 0.16;
    // Drifts primarily left-to-right (slight diagonal angle around 0.18 rad) with smooth rolling wave vortices
    return 0.18 +
      0.45 * Math.sin(nx + ny * 0.75 + nt) +
      0.32 * Math.cos(nx * 1.25 - ny * 0.85 - nt * 0.7) +
      0.18 * Math.sin(nx * 0.55 + ny * 1.45 + nt * 0.5);
  }

  // --- Initializer ---
  function initFlowDots() {
    const hero = document.getElementById('heroSection');
    const canvas = document.getElementById('sc-flow-dots-canvas');
    if (!hero || !canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = 1;

    let dots = [];
    let isRunning = false;
    let isHeroVisible = true;
    let isTabVisible = !document.hidden;
    let lastTime = 0;
    let elapsedTime = 0;

    // Hover state
    let isPointerInHero = false;
    let targetMouseX = 0;
    let targetMouseY = 0;
    let curMouseX = 0;
    let curMouseY = 0;
    let mouseStrength = 0; // 0 to 1

    // Reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    // Create a single dot object
    function createDot(initX, initY) {
      const radius = CONFIG.minRadius + Math.random() * (CONFIG.maxRadius - CONFIG.minRadius);
      const radiusRatio = (radius - CONFIG.minRadius) / (CONFIG.maxRadius - CONFIG.minRadius);

      // Depth parallax: larger dots drift faster and are slightly brighter
      const speed = CONFIG.minSpeed + radiusRatio * (CONFIG.maxSpeed - CONFIG.minSpeed);
      const baseAlpha = 0.25 + radiusRatio * 0.20; // 0.25 to 0.45

      // Color selection
      let r, g, b;
      if (Math.random() < CONFIG.accentChance) {
        const accent = Math.random() < 0.5 ? CONFIG.colorGold : CONFIG.colorRed;
        r = accent.r;
        g = accent.g;
        b = accent.b;
      } else {
        const palette = CONFIG.colorWhiteBlue[Math.floor(Math.random() * CONFIG.colorWhiteBlue.length)];
        r = palette.r;
        g = palette.g;
        b = palette.b;
      }

      return {
        x: initX !== undefined ? initX : Math.random() * width,
        y: initY !== undefined ? initY : Math.random() * height,
        radius,
        speed,
        baseAlpha,
        r,
        g,
        b,
        // Individual twinkle cycle: 4 to 8 seconds with random phase
        twinkleCycle: 4.0 + Math.random() * 4.0,
        twinklePhase: Math.random() * Math.PI * 2,
        // Repulsion displacement offsets
        pushX: 0,
        pushY: 0,
        excitation: 0, // 0 to 1
        edgeAlpha: 1
      };
    }

    // Resize canvas and manage dot counts smoothly
    function handleResize() {
      const rect = hero.getBoundingClientRect();
      const newWidth = Math.max(300, Math.round(rect.width));
      const newHeight = Math.max(200, Math.round(rect.height));

      dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.round(newWidth * dpr);
      canvas.height = Math.round(newHeight * dpr);
      canvas.style.width = newWidth + 'px';
      canvas.style.height = newHeight + 'px';

      const oldWidth = width || newWidth;
      const oldHeight = height || newHeight;
      width = newWidth;
      height = newHeight;

      // Target dot count based on area
      const targetCount = Math.min(
        CONFIG.maxDots,
        Math.max(CONFIG.minDots, Math.round((width * height) / CONFIG.areaPerDot))
      );

      // Reposition existing dots proportionally to avoid jumping
      if (dots.length > 0 && (oldWidth !== width || oldHeight !== height)) {
        const scaleX = width / oldWidth;
        const scaleY = height / oldHeight;
        for (let i = 0; i < dots.length; i++) {
          dots[i].x = Math.max(0, Math.min(width, dots[i].x * scaleX));
          dots[i].y = Math.max(0, Math.min(height, dots[i].y * scaleY));
        }
      }

      // Add or prune dots
      if (dots.length < targetCount) {
        while (dots.length < targetCount) {
          dots.push(createDot());
        }
      } else if (dots.length > targetCount) {
        dots.length = targetCount;
      }

      // If reduced motion is requested, render once and return
      if (prefersReducedMotion.matches) {
        renderStatic();
      }
    }

    // Debounced resize handler
    let resizeTimer = null;
    function onWindowResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(handleResize, 120);
    }

    // Pointer events (passive)
    function onPointerMove(e) {
      const rect = hero.getBoundingClientRect();
      targetMouseX = e.clientX - rect.left;
      targetMouseY = e.clientY - rect.top;
      if (!isPointerInHero) {
        isPointerInHero = true;
        // Snap initial cursor coords on first entry
        if (mouseStrength < 0.05) {
          curMouseX = targetMouseX;
          curMouseY = targetMouseY;
        }
      }
    }

    function onPointerLeave() {
      isPointerInHero = false;
    }

    hero.addEventListener('pointerenter', onPointerMove, { passive: true });
    hero.addEventListener('pointermove', onPointerMove, { passive: true });
    hero.addEventListener('pointerdown', onPointerMove, { passive: true });
    hero.addEventListener('pointerleave', onPointerLeave, { passive: true });
    hero.addEventListener('pointercancel', onPointerLeave, { passive: true });
    window.addEventListener('resize', onWindowResize, { passive: true });

    // Static render for prefers-reduced-motion
    function renderStatic() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const len = dots.length;
      for (let i = 0; i < len; i++) {
        const p = dots[i];
        ctx.beginPath();
        ctx.arc(p.x * dpr, p.y * dpr, p.radius * dpr, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.r}, ${p.g}, ${p.b}, ${(p.baseAlpha * 0.85).toFixed(3)})`;
        ctx.fill();
      }
    }

    // Main animation loop
    function animate(currentTime) {
      if (!isRunning) return;

      if (!lastTime) lastTime = currentTime;
      const dt = Math.min((currentTime - lastTime) / 1000, 0.05); // cap at 50ms (20fps min) to prevent physics jumps
      lastTime = currentTime;
      elapsedTime += dt;

      // Update pointer strength (fade in ~100ms, fade out over ~800ms)
      if (isPointerInHero) {
        const riseFactor = 1 - Math.exp(-dt / CONFIG.hoverRiseTime);
        mouseStrength += (1 - mouseStrength) * riseFactor;
      } else {
        const fadeFactor = 1 - Math.exp(-dt / CONFIG.mouseFadeTime);
        mouseStrength -= mouseStrength * fadeFactor;
      }

      // Smooth cursor position tracking (almost instant ease)
      const easeFactor = 1 - Math.pow(1 - CONFIG.mouseEase, dt * 60);
      curMouseX += (targetMouseX - curMouseX) * easeFactor;
      curMouseY += (targetMouseY - curMouseY) * easeFactor;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const len = dots.length;
      const margin = CONFIG.edgeMargin;
      const hoverR = CONFIG.hoverRadius;
      const hoverRSq = hoverR * hoverR;

      const riseRate = 1 - Math.exp(-dt / CONFIG.hoverRiseTime);
      const relaxRate = 1 - Math.exp(-dt / CONFIG.hoverRelaxTime);

      // Temporary list of nearest dots to cursor for constellation lines
      const constellationCandidates = [];

      // Update dot physics and compute render states
      for (let i = 0; i < len; i++) {
        const p = dots[i];

        // 1. Flow field angle & gentle wave translation
        const angle = getFlowAngle(p.x, p.y, elapsedTime);
        p.x += Math.cos(angle) * p.speed * dt;
        p.y += Math.sin(angle) * p.speed * dt;

        // 2. Soft edge wrapping with fade out
        let edgeAlpha = 1;
        if (p.x < margin) {
          edgeAlpha = Math.min(edgeAlpha, Math.max(0, (p.x + 8) / (margin + 8)));
        } else if (p.x > width - margin) {
          edgeAlpha = Math.min(edgeAlpha, Math.max(0, (width + 8 - p.x) / (margin + 8)));
        }
        if (p.y < margin) {
          edgeAlpha = Math.min(edgeAlpha, Math.max(0, (p.y + 8) / (margin + 8)));
        } else if (p.y > height - margin) {
          edgeAlpha = Math.min(edgeAlpha, Math.max(0, (height + 8 - p.y) / (margin + 8)));
        }
        p.edgeAlpha = edgeAlpha;

        // Wrap around boundaries smoothly (dots are fully faded out before wrapping)
        if (p.x < -12) p.x = width + 6;
        else if (p.x > width + 12) p.x = -6;
        if (p.y < -12) p.y = height + 6;
        else if (p.y > height + 12) p.y = -6;

        // 3. Mouse repulsion & excitation
        let targetPushX = 0;
        let targetPushY = 0;
        let targetExcitation = 0;

        const effectiveX = p.x + p.pushX;
        const effectiveY = p.y + p.pushY;
        const dx = effectiveX - curMouseX;
        const dy = effectiveY - curMouseY;
        const distSq = dx * dx + dy * dy;

        if (distSq < hoverRSq && mouseStrength > 0.001) {
          const dist = Math.sqrt(distSq);
          const falloff = 1 - dist / hoverR;
          const smoothFactor = falloff * falloff * mouseStrength;

          const nx = dx / (dist || 1);
          const ny = dy / (dist || 1);

          targetPushX = nx * CONFIG.maxPush * smoothFactor;
          targetPushY = ny * CONFIG.maxPush * smoothFactor;
          targetExcitation = smoothFactor;

          if (mouseStrength > 0.05) {
            constellationCandidates.push({
              x: effectiveX,
              y: effectiveY,
              dist,
              smoothFactor
            });
          }
        }

        // Apply fast rise / slow relax easing
        const pushRateX = Math.abs(targetPushX) > Math.abs(p.pushX) ? riseRate : relaxRate;
        const pushRateY = Math.abs(targetPushY) > Math.abs(p.pushY) ? riseRate : relaxRate;
        p.pushX += (targetPushX - p.pushX) * pushRateX;
        p.pushY += (targetPushY - p.pushY) * pushRateY;

        const excitRate = targetExcitation > p.excitation ? riseRate : relaxRate;
        p.excitation += (targetExcitation - p.excitation) * excitRate;
      }

      // 4. Draw subtle inter-dot connection lines (light constellation mesh)
      let lineCount = 0;
      const maxConnect = CONFIG.maxConnectLines;
      const connectDist = CONFIG.connectDist;
      const connectDistSq = connectDist * connectDist;

      ctx.lineWidth = 0.75 * dpr;
      for (let i = 0; i < len && lineCount < maxConnect; i++) {
        const p1 = dots[i];
        if (p1.edgeAlpha < 0.15) continue;
        const x1 = p1.x + p1.pushX;
        const y1 = p1.y + p1.pushY;

        for (let j = i + 1; j < len && lineCount < maxConnect; j++) {
          const p2 = dots[j];
          if (p2.edgeAlpha < 0.15) continue;

          const dx = x1 - (p2.x + p2.pushX);
          const dy = y1 - (p2.y + p2.pushY);
          const dSq = dx * dx + dy * dy;

          if (dSq < connectDistSq) {
            const d = Math.sqrt(dSq);
            const lineAlpha = CONFIG.maxLineOpacity * (1 - d / connectDist) * p1.edgeAlpha * p2.edgeAlpha;
            if (lineAlpha > 0.005) {
              ctx.beginPath();
              ctx.moveTo(x1 * dpr, y1 * dpr);
              ctx.lineTo((p2.x + p2.pushX) * dpr, (p2.y + p2.pushY) * dpr);
              ctx.strokeStyle = `rgba(205, 222, 255, ${lineAlpha.toFixed(3)})`;
              ctx.stroke();
              lineCount++;
            }
          }
        }
      }

      // 5. Draw cursor-to-dot constellation lines
      if (constellationCandidates.length > 0 && mouseStrength > 0.02) {
        // Sort to find the nearest 4-6 dots
        constellationCandidates.sort((a, b) => a.dist - b.dist);
        const count = Math.min(CONFIG.maxConstellationLines, constellationCandidates.length);

        ctx.lineWidth = 0.85 * dpr;
        for (let i = 0; i < count; i++) {
          const c = constellationCandidates[i];
          const lineAlpha = CONFIG.constellationOpacity * (1 - c.dist / hoverR) * mouseStrength;
          if (lineAlpha > 0.008) {
            ctx.beginPath();
            ctx.moveTo(curMouseX * dpr, curMouseY * dpr);
            ctx.lineTo(c.x * dpr, c.y * dpr);
            ctx.strokeStyle = `rgba(225, 238, 255, ${lineAlpha.toFixed(3)})`;
            ctx.stroke();
          }
        }
      }

      // 6. Draw dots with breathing twinkle, growth, and brightness boost
      for (let i = 0; i < len; i++) {
        const p = dots[i];
        if (p.edgeAlpha < 0.01) continue;

        // Twinkle respiration (sinusoidal breathing)
        const twinkle = Math.sin(elapsedTime * (Math.PI * 2 / p.twinkleCycle) + p.twinklePhase) * 0.11;
        const baseAlpha = Math.max(0.12, p.baseAlpha + twinkle);

        // Hover growth & brightness boost
        const renderRadius = (p.radius * (1 + CONFIG.hoverGrowth * p.excitation)) * dpr;
        const currentAlpha = Math.min(0.85, (baseAlpha + CONFIG.hoverBrighten * p.excitation) * p.edgeAlpha);

        const renderX = (p.x + p.pushX) * dpr;
        const renderY = (p.y + p.pushY) * dpr;

        ctx.beginPath();
        ctx.arc(renderX, renderY, renderRadius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.r}, ${p.g}, ${p.b}, ${currentAlpha.toFixed(3)})`;
        ctx.fill();
      }

      requestAnimationFrame(animate);
    }

    // Lifecycle manager
    function start() {
      if (isRunning || prefersReducedMotion.matches) return;
      isRunning = true;
      lastTime = performance.now();
      requestAnimationFrame(animate);
    }

    function stop() {
      isRunning = false;
    }

    function checkActiveState() {
      if (isHeroVisible && isTabVisible && !prefersReducedMotion.matches) {
        start();
      } else {
        stop();
        if (prefersReducedMotion.matches) {
          renderStatic();
        }
      }
    }

    // IntersectionObserver to pause loop when hero is off-screen
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        const entry = entries[0];
        isHeroVisible = entry ? entry.isIntersecting : true;
        checkActiveState();
      }, { threshold: 0.01 });
      observer.observe(hero);
    }

    // Visibility change handler for browser tab switching
    document.addEventListener('visibilitychange', () => {
      isTabVisible = !document.hidden;
      checkActiveState();
    });

    // Listen for reduced motion changes
    if (typeof prefersReducedMotion.addEventListener === 'function') {
      prefersReducedMotion.addEventListener('change', () => {
        checkActiveState();
      });
    }

    // Initial setup
    handleResize();
    checkActiveState();
  }

  // Initialize once DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFlowDots);
  } else {
    initFlowDots();
  }
})();

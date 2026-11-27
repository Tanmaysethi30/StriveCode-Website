/**
 * StriveCode Interactive Grid Matrix Background (grid-matrix.js)
 * High-performance, ultra-responsive canvas grid matrix background.
 *
 * Requirements:
 * - Fixed full-screen canvas behind all content (position: fixed; inset: 0; z-index: -1; pointer-events: none;).
 * - Cell size: 48px, line width: 1px, half-pixel aligned for crisp retina display.
 * - Base state: lines are extremely light grey rgba(150, 160, 175, 0.16) with subtle ambient wave.
 * - Fast cursor tracking: glow center follows real mouse position with zero lag.
 * - Pointermove with getCoalescedEvents & path interpolation to prevent gaps/dots during quick movement.
 * - Frame-rate independent timing using delta-time (dt):
 *   - Fast rise: reaches target brightness in ~80-120ms (rise rate ~0.38/frame at 60Hz).
 *   - Soft fall: lingering trail decays in ~400-600ms (fall rate ~0.12/frame at 60Hz).
 * - Idle / leave: stationary mouse or leave window fades out in ~0.6-0.8s.
 * - Exact colors and styling preserved:
 *   - Grid lines brighten to navy tint rgba(11, 26, 107, 0.22) at center.
 *   - Cells fill with soft tint rgba(11, 26, 107, 0.05).
 *   - Grid line intersections show tiny soft dots/nodes (rgba(11, 26, 107, 0.35)).
 *   - Subtle red hint (rgba(200, 30, 30, 0.10)) on single cell under cursor.
 * - Touch support, visibilitychange pause, prefers-reduced-motion fallback (static grid).
 */

(function () {
  'use strict';

  // Constants
  const CELL_SIZE = 48;
  const RADIUS = 220;
  const RISE_TIME_S = 0.035;   // ~80-120ms rise to target brightness
  const FALL_TIME_S = 0.13;    // ~400-600ms decay
  const IDLE_TIMEOUT_MS = 150; // Delay before stationary mouse fade begins
  const FADE_OUT_DURATION_S = 0.7; // ~0.6-0.8s idle fade out

  function initGridMatrix() {
    if (window.__striveCodeGridMatrixInitialized) return;
    window.__striveCodeGridMatrixInitialized = true;

    // Apply class to body for CSS scoping
    if (document.body) {
      document.body.classList.add('has-grid-matrix');
    }

    // Ensure canvas exists in DOM
    let canvas = document.getElementById('sc-grid-matrix');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'sc-grid-matrix';
      canvas.setAttribute('aria-hidden', 'true');
      canvas.style.position = 'fixed';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.width = '100vw';
      canvas.style.height = '100vh';
      canvas.style.zIndex = '-1';
      canvas.style.pointerEvents = 'none';
      canvas.style.display = 'block';
      if (document.body) {
        document.body.insertBefore(canvas, document.body.firstChild);
      }
    }

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    // Accessibility check
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    let width = 0;
    let height = 0;
    let dpr = 1;
    let cols = 0;
    let rows = 0;

    // Map of active cells: key "c,r" -> intensity float [0, 1]
    const cellMap = new Map();

    // Interaction state
    let targetX = -1000;
    let targetY = -1000;
    let cursorX = -1000;
    let cursorY = -1000;
    let prevX = -1000;
    let prevY = -1000;
    let pendingPoints = [];

    let isHovering = false;
    let isPointerDown = false;
    let hoverStrength = 0; // [0, 1]
    let lastMoveTime = 0;
    let rafId = null;
    let lastTimestamp = 0;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;

      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      cols = Math.ceil(width / CELL_SIZE) + 1;
      rows = Math.ceil(height / CELL_SIZE) + 1;

      if (motionQuery.matches) {
        drawStaticGrid();
      }
    }

    // Static grid renderer for reduced motion preference
    function drawStaticGrid() {
      ctx.clearRect(0, 0, width, height);
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(150, 160, 175, 0.16)';
      ctx.beginPath();
      for (let c = 0; c <= cols; c++) {
        const px = Math.floor(c * CELL_SIZE) + 0.5;
        ctx.moveTo(px, 0);
        ctx.lineTo(px, height);
      }
      for (let r = 0; r <= rows; r++) {
        const py = Math.floor(r * CELL_SIZE) + 0.5;
        ctx.moveTo(0, py);
        ctx.lineTo(width, py);
      }
      ctx.stroke();
    }

    if (motionQuery.matches) {
      resize();
      window.addEventListener('resize', resize, { passive: true });
      motionQuery.addEventListener('change', function (e) {
        if (!e.matches) {
          startLoop();
        } else {
          stopLoop();
          drawStaticGrid();
        }
      });
      return;
    }

    // Process pointer movement with coalesced events
    function onPointerMove(e) {
      let pts = [];
      if (typeof e.getCoalescedEvents === 'function') {
        try {
          const coalesced = e.getCoalescedEvents();
          if (coalesced && coalesced.length > 0) {
            for (let i = 0; i < coalesced.length; i++) {
              pts.push({ x: coalesced[i].clientX, y: coalesced[i].clientY });
            }
          }
        } catch (err) {
          // ignore
        }
      }
      if (pts.length === 0) {
        pts.push({ x: e.clientX, y: e.clientY });
      }

      for (let i = 0; i < pts.length; i++) {
        pendingPoints.push(pts[i]);
      }
      if (pendingPoints.length > 25) {
        pendingPoints = pendingPoints.slice(-25);
      }

      const latest = pts[pts.length - 1];
      targetX = latest.x;
      targetY = latest.y;

      if (cursorX < -500) {
        cursorX = targetX;
        cursorY = targetY;
        prevX = cursorX;
        prevY = cursorY;
      }

      isHovering = true;
      lastMoveTime = performance.now();
      startLoop();
    }

    // Pointer events for mouse and stylus
    if (window.PointerEvent) {
      window.addEventListener('pointermove', onPointerMove, { passive: true });
      window.addEventListener('pointerdown', function (e) {
        isPointerDown = true;
        onPointerMove(e);
      }, { passive: true });
      window.addEventListener('pointerup', function () {
        isPointerDown = false;
        isHovering = false;
      }, { passive: true });
      window.addEventListener('pointercancel', function () {
        isPointerDown = false;
        isHovering = false;
      }, { passive: true });
    } else {
      window.addEventListener('mousemove', onPointerMove, { passive: true });
    }

    // Touch events fallback for mobile/tablets
    window.addEventListener('touchstart', function (e) {
      if (e.touches && e.touches.length > 0) {
        isPointerDown = true;
        onPointerMove(e.touches[0]);
      }
    }, { passive: true });

    window.addEventListener('touchmove', function (e) {
      if (e.touches && e.touches.length > 0) {
        onPointerMove(e.touches[0]);
      }
    }, { passive: true });

    window.addEventListener('touchend', function () {
      isPointerDown = false;
      isHovering = false;
    }, { passive: true });

    window.addEventListener('touchcancel', function () {
      isPointerDown = false;
      isHovering = false;
    }, { passive: true });

    document.addEventListener('mouseleave', function () {
      isHovering = false;
      isPointerDown = false;
    });

    window.addEventListener('blur', function () {
      isHovering = false;
      isPointerDown = false;
    });

    window.addEventListener('resize', resize, { passive: true });

    // Page visibility listener
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        stopLoop();
      } else {
        lastTimestamp = performance.now();
        startLoop();
      }
    });

    function startLoop() {
      if (!rafId) {
        lastTimestamp = performance.now();
        rafId = requestAnimationFrame(render);
      }
    }

    function stopLoop() {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    }

    // Distance from point to line segment
    function distToSegment(px, py, x0, y0, x1, y1) {
      const dx = x1 - x0;
      const dy = y1 - y0;
      const lenSq = dx * dx + dy * dy;
      if (lenSq === 0) return Math.hypot(px - x0, py - y0);
      let t = ((px - x0) * dx + (py - y0) * dy) / lenSq;
      if (t < 0) t = 0;
      else if (t > 1) t = 1;
      return Math.hypot(px - (x0 + t * dx), py - (y0 + t * dy));
    }

    // Render loop
    function render(timestamp) {
      rafId = requestAnimationFrame(render);

      const now = timestamp || performance.now();
      const dt = lastTimestamp ? Math.min((now - lastTimestamp) / 1000, 0.05) : 0.016;
      lastTimestamp = now;

      // Frame-rate independent rise and fall rates
      const riseRate = 1 - Math.exp(-dt / RISE_TIME_S);
      const fallRate = 1 - Math.exp(-dt / FALL_TIME_S);

      // Instant cursor tracking
      if (cursorX < -500 && targetX > -500) {
        cursorX = targetX;
        cursorY = targetY;
        prevX = cursorX;
        prevY = cursorY;
      }

      // Build waypoints across the movement frame
      const waypoints = [];
      if (prevX > -500) {
        waypoints.push({ x: prevX, y: prevY });
      }
      if (pendingPoints.length > 0) {
        for (let i = 0; i < pendingPoints.length; i++) {
          waypoints.push(pendingPoints[i]);
        }
        pendingPoints = [];
      }
      cursorX = targetX;
      cursorY = targetY;
      if (cursorX > -500) {
        waypoints.push({ x: cursorX, y: cursorY });
      }

      // Idle and hover strength fading (~0.6-0.8s)
      if (isHovering) {
        if (now - lastMoveTime > IDLE_TIMEOUT_MS && !isPointerDown) {
          hoverStrength = Math.max(0, hoverStrength - dt / FADE_OUT_DURATION_S);
        } else {
          hoverStrength = Math.min(1, hoverStrength + dt / 0.08);
        }
      } else {
        hoverStrength = Math.max(0, hoverStrength - dt / FADE_OUT_DURATION_S);
      }

      // Clear full canvas
      ctx.clearRect(0, 0, width, height);

      // Ambient wave: slow, calm wave with period ~14 seconds
      const ambientWave = Math.sin(now * 0.00045);
      const baseAlpha = 0.16 + ambientWave * 0.02; // oscillates 0.14 - 0.18

      // Compute cell targets along the interpolated path
      const cellTargets = new Map();

      if (hoverStrength > 0.005 && waypoints.length > 0) {
        if (waypoints.length === 1) {
          const pt = waypoints[0];
          const cMin = Math.max(0, Math.floor((pt.x - RADIUS) / CELL_SIZE));
          const cMax = Math.min(cols, Math.ceil((pt.x + RADIUS) / CELL_SIZE));
          const rMin = Math.max(0, Math.floor((pt.y - RADIUS) / CELL_SIZE));
          const rMax = Math.min(rows, Math.ceil((pt.y + RADIUS) / CELL_SIZE));

          for (let c = cMin; c <= cMax; c++) {
            const cx = (c + 0.5) * CELL_SIZE;
            for (let r = rMin; r <= rMax; r++) {
              const cy = (r + 0.5) * CELL_SIZE;
              const d = Math.hypot(cx - pt.x, cy - pt.y);
              if (d < RADIUS) {
                const target = Math.pow(1 - d / RADIUS, 1.5) * hoverStrength;
                cellTargets.set(c + ',' + r, target);
              }
            }
          }
        } else {
          // Walk consecutive segments of the path to eliminate gaps/dots
          for (let i = 0; i < waypoints.length - 1; i++) {
            const p0 = waypoints[i];
            const p1 = waypoints[i + 1];

            const cMin = Math.max(0, Math.floor((Math.min(p0.x, p1.x) - RADIUS) / CELL_SIZE));
            const cMax = Math.min(cols, Math.ceil((Math.max(p0.x, p1.x) + RADIUS) / CELL_SIZE));
            const rMin = Math.max(0, Math.floor((Math.min(p0.y, p1.y) - RADIUS) / CELL_SIZE));
            const rMax = Math.min(rows, Math.ceil((Math.max(p0.y, p1.y) + RADIUS) / CELL_SIZE));

            for (let c = cMin; c <= cMax; c++) {
              const cx = (c + 0.5) * CELL_SIZE;
              for (let r = rMin; r <= rMax; r++) {
                const cy = (r + 0.5) * CELL_SIZE;
                const d = distToSegment(cx, cy, p0.x, p0.y, p1.x, p1.y);
                if (d < RADIUS) {
                  const target = Math.pow(1 - d / RADIUS, 1.5) * hoverStrength;
                  const key = c + ',' + r;
                  const existing = cellTargets.get(key) || 0;
                  if (target > existing) {
                    cellTargets.set(key, target);
                  }
                }
              }
            }
          }
        }
      }

      // Update cells with fast rise and gentle decay
      const updatedKeys = new Set();

      cellTargets.forEach(function (target, key) {
        updatedKeys.add(key);
        const current = cellMap.get(key) || 0;
        let next;
        if (target > current) {
          next = current + (target - current) * riseRate;
        } else {
          next = current + (target - current) * fallRate;
        }
        if (next > 0.002) {
          cellMap.set(key, next);
        } else {
          cellMap.delete(key);
        }
      });

      // Decay lingering trail cells (soft ~400-600ms fade)
      cellMap.forEach(function (val, key) {
        if (!updatedKeys.has(key)) {
          const next = val + (0 - val) * fallRate;
          if (next > 0.002) {
            cellMap.set(key, next);
          } else {
            cellMap.delete(key);
          }
        }
      });

      prevX = cursorX;
      prevY = cursorY;

      // 1. Draw Cell Background Fills (soft navy tint + trail)
      cellMap.forEach(function (val, key) {
        if (val < 0.005) return;
        const comma = key.indexOf(',');
        const c = parseInt(key.substring(0, comma), 10);
        const r = parseInt(key.substring(comma + 1), 10);

        const x = c * CELL_SIZE;
        const y = r * CELL_SIZE;

        ctx.fillStyle = 'rgba(11, 26, 107, ' + (0.05 * val).toFixed(4) + ')';
        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
      });

      // 2. Subtle Red Hint on the single cell directly under cursor
      if (hoverStrength > 0.01 && cursorX >= 0 && cursorX <= width && cursorY >= 0 && cursorY <= height) {
        const curCol = Math.floor(cursorX / CELL_SIZE);
        const curRow = Math.floor(cursorY / CELL_SIZE);
        const cellIntensity = cellMap.get(curCol + ',' + curRow) || 0;
        const redAlpha = 0.10 * hoverStrength * Math.max(0.35, cellIntensity);
        ctx.fillStyle = 'rgba(200, 30, 30, ' + redAlpha.toFixed(4) + ')';
        ctx.fillRect(curCol * CELL_SIZE, curRow * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      }

      // 3. Base Grid Lines (Crisp 1px, half-pixel aligned)
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(150, 160, 175, ' + baseAlpha.toFixed(3) + ')';
      ctx.beginPath();
      for (let c = 0; c <= cols; c++) {
        const px = Math.floor(c * CELL_SIZE) + 0.5;
        ctx.moveTo(px, 0);
        ctx.lineTo(px, height);
      }
      for (let r = 0; r <= rows; r++) {
        const py = Math.floor(r * CELL_SIZE) + 0.5;
        ctx.moveTo(0, py);
        ctx.lineTo(width, py);
      }
      ctx.stroke();

      // 4. Hover & Trail Line Brightening (Navy Tint) & Dots
      if (hoverStrength > 0.005 || cellMap.size > 0) {
        const radiusWithMargin = RADIUS + CELL_SIZE;
        let minCol = Math.max(0, Math.floor((cursorX - radiusWithMargin) / CELL_SIZE));
        let maxCol = Math.min(cols, Math.ceil((cursorX + radiusWithMargin) / CELL_SIZE));
        let minRow = Math.max(0, Math.floor((cursorY - radiusWithMargin) / CELL_SIZE));
        let maxRow = Math.min(rows, Math.ceil((cursorY + radiusWithMargin) / CELL_SIZE));

        if (cellMap.size > 0) {
          cellMap.forEach(function (val, key) {
            if (val > 0.01) {
              const comma = key.indexOf(',');
              const c = parseInt(key.substring(0, comma), 10);
              const r = parseInt(key.substring(comma + 1), 10);
              if (c - 1 < minCol) minCol = Math.max(0, c - 1);
              if (c + 1 > maxCol) maxCol = Math.min(cols, c + 1);
              if (r - 1 < minRow) minRow = Math.max(0, r - 1);
              if (r + 1 > maxRow) maxRow = Math.min(rows, r + 1);
            }
          });
        }

        // Vertical line segments
        for (let c = minCol; c <= maxCol + 1; c++) {
          const px = Math.floor(c * CELL_SIZE) + 0.5;
          for (let r = minRow; r <= maxRow; r++) {
            const py1 = Math.floor(r * CELL_SIZE);
            const py2 = Math.floor((r + 1) * CELL_SIZE);
            const segY = (py1 + py2) * 0.5;
            const dist = Math.hypot(px - cursorX, segY - cursorY);

            let alpha = 0;
            if (dist < RADIUS && hoverStrength > 0.005) {
              alpha = 0.22 * Math.pow(1 - dist / RADIUS, 1.4) * hoverStrength;
            }

            // Include trail intensity from adjacent cells
            const leftVal = cellMap.get((c - 1) + ',' + r) || 0;
            const rightVal = cellMap.get(c + ',' + r) || 0;
            const trailVal = Math.max(leftVal, rightVal);
            if (trailVal > 0.02) {
              alpha = Math.max(alpha, 0.18 * trailVal);
            }

            if (alpha > 0.008) {
              ctx.strokeStyle = 'rgba(11, 26, 107, ' + alpha.toFixed(3) + ')';
              ctx.beginPath();
              ctx.moveTo(px, py1 + 0.5);
              ctx.lineTo(px, py2 + 0.5);
              ctx.stroke();
            }
          }
        }

        // Horizontal line segments
        for (let r = minRow; r <= maxRow + 1; r++) {
          const py = Math.floor(r * CELL_SIZE) + 0.5;
          for (let c = minCol; c <= maxCol; c++) {
            const px1 = Math.floor(c * CELL_SIZE);
            const px2 = Math.floor((c + 1) * CELL_SIZE);
            const segX = (px1 + px2) * 0.5;
            const dist = Math.hypot(segX - cursorX, py - cursorY);

            let alpha = 0;
            if (dist < RADIUS && hoverStrength > 0.005) {
              alpha = 0.22 * Math.pow(1 - dist / RADIUS, 1.4) * hoverStrength;
            }

            // Include trail intensity from adjacent cells
            const topVal = cellMap.get(c + ',' + (r - 1)) || 0;
            const btmVal = cellMap.get(c + ',' + r) || 0;
            const trailVal = Math.max(topVal, btmVal);
            if (trailVal > 0.02) {
              alpha = Math.max(alpha, 0.18 * trailVal);
            }

            if (alpha > 0.008) {
              ctx.strokeStyle = 'rgba(11, 26, 107, ' + alpha.toFixed(3) + ')';
              ctx.beginPath();
              ctx.moveTo(px1 + 0.5, py);
              ctx.lineTo(px2 + 0.5, py);
              ctx.stroke();
            }
          }
        }

        // 5. Intersection Dots/Nodes (Matrix feel)
        for (let c = minCol; c <= maxCol + 1; c++) {
          for (let r = minRow; r <= maxRow + 1; r++) {
            const ix = Math.floor(c * CELL_SIZE) + 0.5;
            const iy = Math.floor(r * CELL_SIZE) + 0.5;
            const dist = Math.hypot(ix - cursorX, iy - cursorY);

            let nodeAlpha = 0;
            if (dist < RADIUS && hoverStrength > 0.005) {
              nodeAlpha = 0.35 * Math.pow(1 - dist / RADIUS, 1.4) * hoverStrength;
            }

            // Check surrounding cells for trail effect
            const c1 = cellMap.get((c - 1) + ',' + (r - 1)) || 0;
            const c2 = cellMap.get(c + ',' + (r - 1)) || 0;
            const c3 = cellMap.get((c - 1) + ',' + r) || 0;
            const c4 = cellMap.get(c + ',' + r) || 0;
            const maxSurrounding = Math.max(c1, c2, c3, c4);
            if (maxSurrounding > 0.03) {
              nodeAlpha = Math.max(nodeAlpha, 0.28 * maxSurrounding);
            }

            if (nodeAlpha > 0.015) {
              ctx.fillStyle = 'rgba(11, 26, 107, ' + nodeAlpha.toFixed(3) + ')';
              ctx.beginPath();
              ctx.arc(ix, iy, 1.5, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
      }
    }

    // Initialize dimensions and start render loop
    resize();
    startLoop();
  }

  // Auto-init on load or immediate if DOM already ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGridMatrix);
  } else {
    initGridMatrix();
  }
})();

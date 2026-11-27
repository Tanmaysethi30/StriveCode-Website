/**
 * StriveCode About Us Hero 3D Robotic Arm Client Launcher
 * - Checks WebGL availability and network constraints (Save-Data, 2G).
 * - Defers loading until idle time after window.onload so Lighthouse & first paint are untouched.
 * - Dynamically imports the bundled Three.js scene module only when ready.
 * - Smooth fallback: keeps the static poster visible if WebGL is unsupported or connection is slow.
 */
(function() {
  function shouldSkip3D() {
    // 1. Connection check: data-saver or slow 2G
    var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (conn) {
      if (conn.saveData) return true;
      if (conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g') return true;
    }
    // 2. WebGL check
    try {
      var canvas = document.createElement('canvas');
      var gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) return true;
    } catch (e) {
      return true;
    }
    return false;
  }

  if (shouldSkip3D()) {
    // Keep poster only, do not load Three.js or download model
    return;
  }

  function launch() {
    import('/assets/scripts/three-scene.js').then(function(mod) {
      if (mod && typeof mod.initRobotScene === 'function') {
        mod.initRobotScene();
      }
    }).catch(function(err) {
      console.warn('3D robot script failed to load, retaining poster.', err);
    });
  }

  function onIdle() {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(launch, { timeout: 3500 });
    } else {
      setTimeout(launch, 1500);
    }
  }

  if (document.readyState === 'complete') {
    onIdle();
  } else {
    window.addEventListener('load', onIdle, { once: true });
  }
})();

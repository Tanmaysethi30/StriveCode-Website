import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export function initRobotScene() {
  const canvas = document.getElementById('sc-robot-canvas');
  const poster = document.getElementById('sc-robot-poster');
  const shadowEl = document.getElementById('sc-robot-shadow');
  const heroSection = document.getElementById('sc-about-hero');
  const container = canvas ? canvas.parentElement : null;

  if (!canvas || !container) return;

  // Configuration Constants
  const CONFIG = {
    modelUrl: '/assets/models/robot-arm.glb',
    fov: 36,
    neutralYaw: THREE.MathUtils.degToRad(-15),
    neutralPitch: THREE.MathUtils.degToRad(5),
    maxYaw: THREE.MathUtils.degToRad(30),
    maxPitch: THREE.MathUtils.degToRad(16),
    smoothing: 6.0,
    baseAnimSpeed: 0.5,
    slowAnimSpeed: 0.15,
    floatPeriod: 5.0,
    rollPeriod: 7.0,
    rollAmp: THREE.MathUtils.degToRad(1.5),
    idleTimeoutMs: 2500,
    swayYawAmp: THREE.MathUtils.degToRad(7),
    swayPitchAmp: THREE.MathUtils.degToRad(3.5),
  };

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Scene & Camera setup
  const scene = new THREE.Scene();

  let width = container.clientWidth || 400;
  let height = container.clientHeight || 500;

  const camera = new THREE.PerspectiveCamera(CONFIG.fov, width / height, 0.1, 100);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
      premultipliedAlpha: true
    });
  } catch (e) {
    // Keep fallback poster if WebGL fails
    return;
  }

  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height, true);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  // Environment & Lighting
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
  pmremGenerator.dispose();

  // Soft key light
  const keyLight = new THREE.DirectionalLight(0xfff5ea, 1.8);
  keyLight.position.set(3, 4, 3);
  scene.add(keyLight);

  // Cool rim light
  const rimLight = new THREE.DirectionalLight(0xd0e0ff, 0.7);
  rimLight.position.set(-3, 2, -2.5);
  scene.add(rimLight);

  // Soft ambient
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
  scene.add(ambientLight);

  // Hierarchical Groups:
  // scene -> rootGroup -> pivotGroup (yaw & pitch at visual center) -> floatGroup (bob & roll) -> model
  const rootGroup = new THREE.Group();
  const pivotGroup = new THREE.Group();
  const floatGroup = new THREE.Group();

  pivotGroup.add(floatGroup);
  rootGroup.add(pivotGroup);
  scene.add(rootGroup);

  let mixer = null;
  let action = null;
  let visualCenter = new THREE.Vector3(0, 1.027, 0.425);
  let sphereRadius = 1.82;
  let baseY = 0;
  let floatAmp = 0.05;

  let currentYaw = CONFIG.neutralYaw;
  let currentPitch = CONFIG.neutralPitch;
  let targetYaw = CONFIG.neutralYaw;
  let targetPitch = CONFIG.neutralPitch;

  let currentAnimSpeed = CONFIG.baseAnimSpeed;

  let isTouchMode = false;
  let isTouchDragging = false;
  let isHovering = false;
  let lastMoveTime = performance.now();
  let pointerClientX = window.innerWidth * 0.5;
  let pointerClientY = window.innerHeight * 0.5;

  let isHeroVisible = true;
  let isTabVisible = !document.hidden;
  let isLoopRunning = false;
  let clock = new THREE.Clock();
  let elapsedTime = 0;
  let lastFrameTime = performance.now();
  const minFrameInterval = 1000 / 60; // 60 FPS cap

  function fitCamera() {
    const w = container.clientWidth || 400;
    const h = container.clientHeight || 500;
    if (w === 0 || h === 0) return;

    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, true);

    const vFovRad = THREE.MathUtils.degToRad(camera.fov);
    const hFovRad = 2 * Math.atan(Math.tan(vFovRad / 2) * camera.aspect);
    const minHalfAngle = Math.min(vFovRad / 2, hFovRad / 2);

    // Responsive enlargement scale factor:
    // Desktop: 1.5x (roughly 1.4x-1.6x per user spec)
    // Tablet: 1.25x
    // Mobile: 1.15x
    const isDesktop = window.innerWidth >= 1024;
    const isTablet = window.innerWidth >= 640 && window.innerWidth < 1024;
    const scaleMultiplier = isDesktop ? 1.5 : (isTablet ? 1.25 : 1.15);

    // Fit bounding sphere scaled by scaleMultiplier
    const baseDist = (sphereRadius / Math.sin(minHalfAngle)) * 1.14;
    const dist = baseDist / scaleMultiplier;
    camera.position.set(0, 0, dist);
    camera.lookAt(0, 0, 0);

    // Initial shadow positioning
    updateShadowPosition();
  }

  function updateShadowPosition(bobNorm = 0) {
    if (!shadowEl) return;
    const baseWorld = new THREE.Vector3(0, baseY - visualCenter.y, 0);
    baseWorld.applyMatrix4(floatGroup.matrixWorld);

    const baseNdc = baseWorld.clone().project(camera);
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const baseScreenX = ((baseNdc.x + 1) / 2) * rect.width;
    const baseScreenY = ((-baseNdc.y + 1) / 2) * rect.height;

    // Scale shadow width proportionally with scaleMultiplier
    const isDesktop = window.innerWidth >= 1024;
    const shadowWidth = isDesktop ? 190 : 140;
    shadowEl.style.width = `${shadowWidth}px`;
    shadowEl.style.left = `${baseScreenX}px`;
    shadowEl.style.top = `${baseScreenY + 6}px`;
    shadowEl.style.transform = `translate(-50%, -50%) scale(${1 - bobNorm * 0.08})`;
    shadowEl.style.opacity = `${0.85 - bobNorm * 0.15}`;
  }

  // Load Model
  const loader = new GLTFLoader();
  loader.load(
    CONFIG.modelUrl,
    (gltf) => {
      const model = gltf.scene;

      // Setup Animation Mixer
      if (gltf.animations && gltf.animations.length > 0) {
        mixer = new THREE.AnimationMixer(model);
        const clip = gltf.animations.find((a) => a.name === 'Robotics') || gltf.animations[0];
        action = mixer.clipAction(clip);
        action.timeScale = CONFIG.baseAnimSpeed;
        action.play();

        // Sample animation union bounding box across 60 evenly spaced points
        const unionBox = new THREE.Box3();
        const numSamples = 60;
        const duration = clip.duration;

        for (let i = 0; i <= numSamples; i++) {
          const t = (i / numSamples) * duration;
          mixer.setTime(t);
          model.updateMatrixWorld(true);
          const sampleBox = new THREE.Box3().setFromObject(model);
          if (i === 0) unionBox.copy(sampleBox);
          else unionBox.union(sampleBox);
        }

        // Reset animation to 0
        mixer.setTime(0);
        model.updateMatrixWorld(true);

        unionBox.getCenter(visualCenter);
        const unionSize = new THREE.Vector3();
        unionBox.getSize(unionSize);

        const sphere = new THREE.Sphere();
        unionBox.getBoundingSphere(sphere);
        sphereRadius = sphere.radius;
        baseY = unionBox.min.y;
        floatAmp = unionSize.y * 0.03;
      }

      // Center model at its visual center inside floatGroup
      model.position.set(-visualCenter.x, -visualCenter.y, -visualCenter.z);
      floatGroup.add(model);

      // Initial orientation & camera framing
      pivotGroup.rotation.y = CONFIG.neutralYaw;
      pivotGroup.rotation.x = CONFIG.neutralPitch;

      fitCamera();

      // Render initial frame
      renderer.render(scene, camera);

      // Smooth cross-fade from poster to live canvas
      canvas.style.transition = 'opacity 0.8s ease';
      poster.style.transition = 'opacity 0.8s ease';
      requestAnimationFrame(() => {
        canvas.style.opacity = '1';
        poster.style.opacity = '0';
        setTimeout(() => {
          poster.style.display = 'none';
        }, 850);
      });

      // If user prefers reduced motion, do not start loop
      if (prefersReducedMotion) {
        return;
      }

      // Start render loop
      isLoopRunning = true;
      clock.start();
      requestAnimationFrame(renderLoop);
    },
    undefined,
    (err) => {
      console.warn('3D robot model failed to load, retaining poster.', err);
    }
  );

  // Pointer & Touch Listeners
  function onPointerMove(e) {
    lastMoveTime = performance.now();
    pointerClientX = e.clientX;
    pointerClientY = e.clientY;

    if (e.pointerType === 'touch') {
      isTouchMode = true;
    } else {
      isTouchMode = false;
      isHovering = true;
    }
  }

  function onPointerDown(e) {
    if (e.pointerType === 'touch') {
      isTouchMode = true;
      isTouchDragging = true;
      pointerClientX = e.clientX;
      pointerClientY = e.clientY;
      lastMoveTime = performance.now();
    }
  }

  function onPointerEnd(e) {
    if (e.pointerType === 'touch') {
      isTouchDragging = false;
    }
  }

  function onPointerLeave() {
    isHovering = false;
  }

  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerdown', onPointerDown, { passive: true });
  window.addEventListener('pointerup', onPointerEnd, { passive: true });
  window.addEventListener('pointercancel', onPointerEnd, { passive: true });
  document.addEventListener('mouseleave', onPointerLeave, { passive: true });

  // ResizeObserver for reliable container-aware resizing
  const resizeObserver = new ResizeObserver(() => {
    fitCamera();
  });
  resizeObserver.observe(container);
  window.addEventListener('resize', fitCamera, { passive: true });

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      fitCamera();
    });
  }

  // IntersectionObserver on hero section
  if (heroSection) {
    const observer = new IntersectionObserver(
      (entries) => {
        isHeroVisible = entries[0].isIntersecting;
        if (isHeroVisible && isTabVisible && !isLoopRunning && !prefersReducedMotion) {
          isLoopRunning = true;
          clock.start();
          requestAnimationFrame(renderLoop);
        }
      },
      { threshold: 0.05 }
    );
    observer.observe(heroSection);
  }

  // Visibility change
  document.addEventListener('visibilitychange', () => {
    isTabVisible = !document.hidden;
    if (isTabVisible && isHeroVisible && !isLoopRunning && !prefersReducedMotion) {
      isLoopRunning = true;
      clock.start();
      requestAnimationFrame(renderLoop);
    }
  });

  // Soft curve mapping (sine curve)
  function softCurve(v) {
    return Math.sign(v) * Math.sin(Math.abs(v) * (Math.PI / 2));
  }

  // Render Loop
  function renderLoop(now) {
    if (!isLoopRunning || !isHeroVisible || !isTabVisible) {
      isLoopRunning = false;
      return;
    }

    requestAnimationFrame(renderLoop);

    // 60 FPS cap
    const elapsedSinceLast = now - lastFrameTime;
    if (elapsedSinceLast < minFrameInterval) {
      return;
    }
    lastFrameTime = now - (elapsedSinceLast % minFrameInterval);

    const delta = Math.min(clock.getDelta(), 0.1);
    elapsedTime += delta;

    // 1. Advance embedded animation with speed modulation
    const isPointerActive = (isHovering || isTouchDragging) && (now - lastMoveTime < 1500);
    const targetSpeed = isPointerActive ? CONFIG.slowAnimSpeed : CONFIG.baseAnimSpeed;
    currentAnimSpeed += (targetSpeed - currentAnimSpeed) * (1 - Math.exp(-delta * 4));

    if (mixer) {
      if (action) action.timeScale = currentAnimSpeed;
      mixer.update(delta);
    }

    // 2. Idle vertical bob & faint roll
    const bob = Math.sin(elapsedTime * (2 * Math.PI / CONFIG.floatPeriod)) * floatAmp;
    floatGroup.position.y = bob;

    const roll = Math.sin(elapsedTime * (2 * Math.PI / CONFIG.rollPeriod) + 1.2) * CONFIG.rollAmp;
    floatGroup.rotation.z = roll;

    const bobNorm = bob / floatAmp;
    updateShadowPosition(bobNorm);

    // 3. Pointer follow & Touch sway
    if (isTouchMode && !isTouchDragging) {
      // Gentle autonomous sway for touch
      const swayYaw = Math.sin(elapsedTime * 0.8) * CONFIG.swayYawAmp;
      const swayPitch = Math.cos(elapsedTime * 0.6) * CONFIG.swayPitchAmp;
      targetYaw = CONFIG.neutralYaw + swayYaw;
      targetPitch = CONFIG.neutralPitch + swayPitch;
    } else if (isHovering || (isTouchMode && isTouchDragging)) {
      // Recompute pivot screen coordinates dynamically (handles scrolling and resizing)
      const rect = canvas.getBoundingClientRect();
      const pivotNdc = new THREE.Vector3(0, 0, 0).project(camera);
      const pivotScreenX = rect.left + ((pivotNdc.x + 1) / 2) * rect.width;
      const pivotScreenY = rect.top + ((-pivotNdc.y + 1) / 2) * rect.height;

      const dx = pointerClientX - pivotScreenX;
      const dy = pointerClientY - pivotScreenY;

      // Normalize by half viewport
      const halfW = window.innerWidth * 0.5;
      const halfH = window.innerHeight * 0.5;
      const nx = THREE.MathUtils.clamp(dx / halfW, -1, 1);
      const ny = THREE.MathUtils.clamp(dy / halfH, -1, 1);

      const curNx = softCurve(nx);
      const curNy = softCurve(ny);

      // Check for idle return after 2.5s resting
      if (!isTouchMode && (now - lastMoveTime > CONFIG.idleTimeoutMs)) {
        targetYaw = CONFIG.neutralYaw;
        targetPitch = CONFIG.neutralPitch;
      } else {
        // Cursor directions:
        // dx > 0 (right) -> yaw increases (turns right)
        // dx < 0 (left)  -> yaw decreases (turns left)
        // dy > 0 (below) -> pitch increases (tilts down)
        // dy < 0 (above) -> pitch decreases (tilts up)
        targetYaw = CONFIG.neutralYaw + curNx * CONFIG.maxYaw;
        targetPitch = CONFIG.neutralPitch + curNy * CONFIG.maxPitch;
      }
    } else {
      // Not hovering -> return to neutral pose
      targetYaw = CONFIG.neutralYaw;
      targetPitch = CONFIG.neutralPitch;
    }

    // Exponential dampening smoothing (factor: 1 - exp(-dt * 6))
    const damp = 1 - Math.exp(-delta * CONFIG.smoothing);
    currentYaw += (targetYaw - currentYaw) * damp;
    currentPitch += (targetPitch - currentPitch) * damp;

    pivotGroup.rotation.y = currentYaw;
    pivotGroup.rotation.x = currentPitch;

    // Render frame
    renderer.render(scene, camera);
  }

  // Cleanup on leave
  function dispose() {
    isLoopRunning = false;
    resizeObserver.disconnect();
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('pointerup', onPointerEnd);
    window.removeEventListener('pointercancel', onPointerEnd);
    document.removeEventListener('mouseleave', onPointerLeave);
    window.removeEventListener('resize', fitCamera);

    scene.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });

    if (renderer) renderer.dispose();
  }

  window.addEventListener('beforeunload', dispose, { once: true });
  document.addEventListener('astro:before-swap', dispose, { once: true });
}

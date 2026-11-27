const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const sharp = require('sharp');

async function renderPoster() {
  console.log('Rendering new matching static poster (1.5x scaled) using Three.js and headless browser...');
  const browser = await chromium.launch({
    executablePath: '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    headless: true,
    args: ['--allow-file-access-from-files', '--disable-web-security']
  });

  const page = await browser.newPage({ viewport: { width: 600, height: 700, deviceScaleFactor: 1 } });

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body, html { margin: 0; padding: 0; overflow: hidden; background: transparent; width: 600px; height: 700px; }
    canvas { width: 600px; height: 700px; display: block; }
  </style>
  <script type="importmap">
  {
    "imports": {
      "three": "/node_modules/three/build/three.module.js",
      "three/addons/": "/node_modules/three/examples/jsm/"
    }
  }
  </script>
</head>
<body>
  <div id="container"></div>
  <script type="module">
    import * as THREE from 'three';
    import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
    import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

    const width = 600;
    const height = 700;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1);
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    document.body.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;

    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 100);

    // Key light and rim light
    const keyLight = new THREE.DirectionalLight(0xfff5ea, 1.8);
    keyLight.position.set(3, 4, 3);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xd0e0ff, 0.7);
    rimLight.position.set(-3, 2, -2.5);
    scene.add(rimLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    scene.add(ambientLight);

    const loader = new GLTFLoader();
    loader.load('/public/assets/models/robot-arm.glb', (gltf) => {
      const model = gltf.scene;

      const mixer = new THREE.AnimationMixer(model);
      const clip = gltf.animations.find((a) => a.name === 'Robotics') || gltf.animations[0];
      const action = mixer.clipAction(clip);
      action.play();

      // Sample union
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

      mixer.setTime(0);
      model.updateMatrixWorld(true);

      const visualCenter = new THREE.Vector3();
      unionBox.getCenter(visualCenter);

      const sphere = new THREE.Sphere();
      unionBox.getBoundingSphere(sphere);
      const sphereRadius = sphere.radius;

      model.position.set(-visualCenter.x, -visualCenter.y, -visualCenter.z);

      const pivot = new THREE.Group();
      pivot.add(model);
      scene.add(pivot);

      pivot.rotation.y = THREE.MathUtils.degToRad(-15);
      pivot.rotation.x = THREE.MathUtils.degToRad(5);

      const vFovRad = THREE.MathUtils.degToRad(camera.fov);
      const hFovRad = 2 * Math.atan(Math.tan(vFovRad / 2) * camera.aspect);
      const minHalfAngle = Math.min(vFovRad / 2, hFovRad / 2);

      const baseDist = (sphereRadius / Math.sin(minHalfAngle)) * 1.14;
      const dist = baseDist / 1.5; // 1.5x scale multiplier
      camera.position.set(0, 0, dist);
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
      window.__MODEL_RENDERED__ = true;
    }, undefined, (err) => {
      console.error(err);
      window.__MODEL_ERROR__ = err.message;
    });
  </script>
</body>
</html>
  `;

  const distDir = path.resolve('.');
  await page.route('**/*', async (route) => {
    const reqUrl = route.request().url();
    let relativePath = '';
    if (reqUrl.startsWith('file:///')) {
      relativePath = reqUrl.replace('file://', '');
    } else if (reqUrl.startsWith('http://') || reqUrl.startsWith('https://')) {
      const u = new URL(reqUrl);
      relativePath = u.pathname;
    }

    if (relativePath) {
      let testPath = path.join(distDir, relativePath.startsWith('/') ? relativePath.slice(1) : relativePath);
      if (fs.existsSync(testPath) && fs.statSync(testPath).isFile()) {
        const ext = path.extname(testPath).toLowerCase();
        return route.fulfill({
          status: 200,
          contentType: ext === '.glb' ? 'model/gltf-binary' : (ext === '.js' ? 'application/javascript' : 'application/octet-stream'),
          body: fs.readFileSync(testPath)
        });
      }
    }
    return route.continue();
  });

  const tempHtmlPath = path.resolve('scratch/temp_poster.html');
  fs.writeFileSync(tempHtmlPath, htmlContent);

  await page.goto('file://' + tempHtmlPath, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__MODEL_RENDERED__ || window.__MODEL_ERROR__, { timeout: 15000 });

  const err = await page.evaluate(() => window.__MODEL_ERROR__);
  if (err) {
    throw new Error('Model failed to render: ' + err);
  }

  const canvas = await page.$('canvas');
  const pngBuffer = await canvas.screenshot({ omitBackground: true });

  await browser.close();

  // Convert PNG screenshot to WebP under 60 KB
  const posterWebpPath = path.resolve('public/assets/models/robot-arm-poster.webp');
  await sharp(pngBuffer)
    .resize(600, 700)
    .webp({ quality: 82, effort: 6 })
    .toFile(posterWebpPath);

  const stats = fs.statSync(posterWebpPath);
  console.log(`Poster re-rendered at ${posterWebpPath}, size: ${(stats.size / 1024).toFixed(1)} KB`);
}

renderPoster().catch(err => {
  console.error(err);
  process.exit(1);
});

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

async function verifyAboutUsRobot() {
  console.log('--- Starting Comprehensive Headless Browser Verification ---');

  const browser = await chromium.launch({
    executablePath: '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    headless: true,
    args: ['--allow-file-access-from-files', '--disable-web-security']
  });

  const distDir = path.resolve('dist');

  async function setupPage(viewport, options = {}) {
    const context = await browser.newContext({
      viewport,
      deviceScaleFactor: 1,
      reducedMotion: options.reducedMotion ? 'reduce' : 'no-preference'
    });

    if (options.saveData) {
      await context.addInitScript(() => {
        Object.defineProperty(navigator, 'connection', {
          get: () => ({ saveData: true, effectiveType: '4g' })
        });
      });
    }

    const page = await context.newPage();

    const consoleLogs = [];
    const consoleErrors = [];

    page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();
      consoleLogs.push(`[${type}] ${text}`);
      if (type === 'error') {
        consoleErrors.push(text);
      }
    });

    page.on('pageerror', (err) => {
      consoleErrors.push(err.message);
    });

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
        if (fs.existsSync(testPath) && fs.statSync(testPath).isDirectory()) {
          testPath = path.join(testPath, 'index.html');
        }
        if (fs.existsSync(testPath) && fs.statSync(testPath).isFile()) {
          const ext = path.extname(testPath).toLowerCase();
          const mimeTypes = {
            '.html': 'text/html',
            '.js': 'application/javascript',
            '.css': 'text/css',
            '.webp': 'image/webp',
            '.glb': 'model/gltf-binary',
            '.jpg': 'image/jpeg',
            '.png': 'image/png',
            '.svg': 'image/svg+xml'
          };
          return route.fulfill({
            status: 200,
            contentType: mimeTypes[ext] || 'application/octet-stream',
            body: fs.readFileSync(testPath)
          });
        }
      }
      return route.continue();
    });

    return { context, page, consoleLogs, consoleErrors };
  }

  // 1. Verify Standard Desktop Load & 3D Initialization
  console.log('\n1. Verifying Standard Desktop (1440x900) Load & 3D Interaction...');
  {
    const { context, page, consoleErrors } = await setupPage({ width: 1440, height: 900 });
    await page.goto('file://' + path.join(distDir, 'aboutus/index.html'), { waitUntil: 'networkidle' });

    // Wait for idle load of Three.js
    await page.waitForTimeout(2000);

    // Check poster and canvas visibility
    const posterDisplay = await page.$eval('#sc-robot-poster', (el) => ({
      display: window.getComputedStyle(el).display,
      opacity: window.getComputedStyle(el).opacity
    }));
    console.log('Poster state after load:', posterDisplay);

    const canvasOpacity = await page.$eval('#sc-robot-canvas', (el) => window.getComputedStyle(el).opacity);
    console.log('Canvas opacity after load:', canvasOpacity);

    // Verify Credit Line
    const creditHtml = await page.$eval('p:has-text("3D model:")', (el) => el.innerHTML);
    console.log('Credit line found:', creditHtml);

    const creditLinks = await page.$$eval('p:has-text("3D model:") a', (links) =>
      links.map((a) => ({ href: a.href, text: a.innerText, target: a.target, rel: a.rel }))
    );
    console.log('Credit links:', creditLinks);

    // Verify left alignment of hero text vs stats card
    const layoutCoords = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      const card = document.querySelector('.dark-blueprint-grid');
      const canvas = document.querySelector('#sc-robot-canvas');
      const h1Rect = h1.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      const canvasRect = canvas.getBoundingClientRect();
      return {
        h1Left: h1Rect.left,
        cardLeft: cardRect.left,
        cardRight: cardRect.right,
        canvasRight: canvasRect.right,
        cardWidth: cardRect.width,
        h1Align: window.getComputedStyle(h1).textAlign
      };
    });
    console.log('Desktop layout alignment check:', layoutCoords);

    // Pointer move interaction check
    await page.mouse.move(200, 300);
    await page.waitForTimeout(300);
    await page.mouse.move(1200, 400);
    await page.waitForTimeout(300);

    // Capture screenshot
    await page.screenshot({ path: '/Users/avinesh_shukla/.gemini/antigravity/brain/0bb5ff4e-72a2-4bd0-b97c-6cc433440f57/aboutus-hero-desktop.png' });
    console.log('Saved screenshot: aboutus-hero-desktop.png');

    if (consoleErrors.length > 0) {
      console.error('Console errors encountered:', consoleErrors);
    } else {
      console.log('Zero console errors on desktop load!');
    }
    await context.close();
  }

  // 2. Responsive Viewport Checks (320, 375, 414, 768, 1024, 1280, 1440, 1920, 2560)
  console.log('\n2. Verifying Responsive Viewports...');
  const viewports = [320, 375, 414, 768, 1024, 1280, 1440, 1920, 2560];
  for (const w of viewports) {
    const { context, page } = await setupPage({ width: w, height: 900 });
    await page.goto('file://' + path.join(distDir, 'aboutus/index.html'), { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const metrics = await page.evaluate(() => {
      const stage = document.querySelector('.sc-robot-stage');
      const doc = document.documentElement;
      return {
        scrollWidth: doc.scrollWidth,
        clientWidth: doc.clientWidth,
        hasHorizontalOverflow: doc.scrollWidth > doc.clientWidth,
        stageHeight: stage.getBoundingClientRect().height
      };
    });

    console.log(`Viewport ${w}px: overflow=${metrics.hasHorizontalOverflow}, stageHeight=${metrics.stageHeight}px`);

    if (w === 390 || w === 768 || w === 1024) {
      await page.screenshot({ path: `/Users/avinesh_shukla/.gemini/antigravity/brain/0bb5ff4e-72a2-4bd0-b97c-6cc433440f57/aboutus-hero-${w}.png` });
    }
    await context.close();
  }

  // 3. Reduced Motion Test
  console.log('\n3. Verifying prefers-reduced-motion...');
  {
    const { context, page } = await setupPage({ width: 1280, height: 800 }, { reducedMotion: true });
    await page.goto('file://' + path.join(distDir, 'aboutus/index.html'), { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const canvasOpacity = await page.$eval('#sc-robot-canvas', (el) => window.getComputedStyle(el).opacity);
    console.log('Reduced motion canvas opacity (single frame rendered):', canvasOpacity);
    await context.close();
  }

  // 4. Fallback Test: Data Saver / Slow Connection
  console.log('\n4. Verifying Fallback on Data Saver (Save-Data: on)...');
  {
    const { context, page } = await setupPage({ width: 1280, height: 800 }, { saveData: true });
    await page.goto('file://' + path.join(distDir, 'aboutus/index.html'), { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const posterDisplay = await page.$eval('#sc-robot-poster', (el) => ({
      display: window.getComputedStyle(el).display,
      opacity: window.getComputedStyle(el).opacity
    }));
    const canvasOpacity = await page.$eval('#sc-robot-canvas', (el) => window.getComputedStyle(el).opacity);

    console.log('Data saver poster state (should stay visible):', posterDisplay);
    console.log('Data saver canvas opacity (should stay 0):', canvasOpacity);
    await context.close();
  }

  await browser.close();
  console.log('\n--- All Headless Browser Verifications Complete ---');
}

verifyAboutUsRobot().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});

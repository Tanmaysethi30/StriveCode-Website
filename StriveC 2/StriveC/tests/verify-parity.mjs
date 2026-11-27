import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function createStaticServer(baseDir, port) {
  const server = http.createServer((req, res) => {
    let reqPath = decodeURI(req.url.split('?')[0]);
    if (reqPath.endsWith('/')) {
      reqPath += 'index.html';
    }
    let filePath = path.join(baseDir, reqPath);
    if (!fs.existsSync(filePath) && fs.existsSync(filePath + '.html')) {
      filePath += '.html';
    } else if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      const notFoundPath = path.join(baseDir, '404.html');
      if (fs.existsSync(notFoundPath)) {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(fs.readFileSync(notFoundPath));
        return;
      }
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(fs.readFileSync(filePath));
  });

  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => {
      resolve(server);
    });
  });
}

async function run() {
  console.log('--- Starting Parity & Regression Verification ---');
  const distDir = path.resolve('dist');
  const origDir = path.resolve('originals_backup');

  const distPort = 4321;
  const origPort = 4322;

  const distServer = await createStaticServer(distDir, distPort);
  const origServer = await createStaticServer(origDir, origPort);

  console.log(`Dist server on http://127.0.0.1:${distPort}`);
  console.log(`Orig server on http://127.0.0.1:${origPort}`);

  const browser = await chromium.launch({
    executablePath: '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const screenshotsDir = path.resolve('diagnosis_results/verification_screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const results = {
    homepage: {},
    mentorship: {},
    navbar: {},
    routes: {},
    errors: []
  };

  try {
    const page = await browser.newPage();

    // 1. VERIFY HOMEPAGE (1440x900)
    console.log('\n--- 1. Testing Homepage at 1440px ---');
    await page.setViewportSize({ width: 1440, height: 900 });

    const pageConsoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        pageConsoleErrors.push(msg.text());
      }
    });

    await page.goto(`http://127.0.0.1:${distPort}/`, { waitUntil: 'networkidle' });

    // Wait for scLoaderOverlay to exit
    await page.waitForTimeout(2500);

    // Check Hero Left Column
    const heroLeftBox = await page.evaluate(() => {
      const el = document.querySelector('.lg\\:col-span-7');
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        opacity: style.opacity,
        visibility: style.visibility,
        revealed: el.classList.contains('revealed')
      };
    });

    console.log('Homepage Hero Left Column Box:', heroLeftBox);
    results.homepage.heroLeftBox = heroLeftBox;

    // Check Hero Right Column Height
    const heroRightBox = await page.evaluate(() => {
      const el = document.querySelector('.lg\\:col-span-5');
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height
      };
    });
    console.log('Homepage Hero Right Column Box:', heroRightBox);
    results.homepage.heroRightBox = heroRightBox;

    // Check Section 3 (Metrics & Dual Marquee Strip)
    const metricsBox = await page.evaluate(() => {
      const sec = document.querySelector('section.py-12.bg-\\[\\#EEEEEE\\]');
      if (!sec) return null;
      const rect = sec.getBoundingClientRect();
      const grid = sec.querySelector('.grid');
      const gridRect = grid ? grid.getBoundingClientRect() : null;
      return {
        sectionY: rect.y,
        sectionWidth: rect.width,
        gridWidth: gridRect ? gridRect.width : 0
      };
    });
    console.log('Section 3 (Metrics) Box:', metricsBox);
    results.homepage.metricsBox = metricsBox;

    // Check Navbar Link Alignments
    const navAlignment = await page.evaluate(() => {
      const homeLink = document.querySelector('nav a[href="/"]');
      const productLink = document.querySelector('nav a[href="/product"]');
      if (!homeLink || !productLink) return null;
      const homeRect = homeLink.getBoundingClientRect();
      const prodRect = productLink.getBoundingClientRect();
      return {
        homeTop: homeRect.top,
        homeHeight: homeRect.height,
        prodTop: prodRect.top,
        prodHeight: prodRect.height,
        diffTop: Math.abs(homeRect.top - prodRect.top)
      };
    });
    console.log('Navbar Link Alignment:', navAlignment);
    results.navbar = navAlignment;

    // Test Course Filter Toggle
    const filterTest = await page.evaluate(() => {
      const allBtn = document.querySelector('.track-filter-btn[data-filter="all"]');
      const accelBtn = document.querySelector('.track-filter-btn[data-filter="accelerator"]');
      const cards = document.querySelectorAll('[data-category]');

      const initialVisible = Array.from(cards).filter(c => c.style.display !== 'none').length;
      accelBtn.click();
      const accelVisible = Array.from(cards).filter(c => c.style.display !== 'none').length;
      allBtn.click();
      const restoredVisible = Array.from(cards).filter(c => c.style.display !== 'none').length;

      return {
        initialVisible,
        accelVisible,
        restoredVisible,
        filterWorks: accelVisible > 0 && accelVisible < initialVisible && restoredVisible === initialVisible
      };
    });
    console.log('Course Filter Interaction Test:', filterTest);
    results.homepage.filterTest = filterTest;

    // Test 5-Stage Execution Pedagogy
    const stageTest = [];
    for (let i = 1; i <= 5; i++) {
      await page.click(`#stage-tab-${i}`);
      await page.waitForTimeout(350);
      const stageInfo = await page.evaluate((idx) => {
        const titleEl = document.getElementById('stage-title');
        const badgeEl = document.getElementById('stage-badge');
        const activeTab = document.querySelector('.stage-node.is-active');
        return {
          index: idx,
          badge: badgeEl ? badgeEl.textContent.trim() : '',
          title: titleEl ? titleEl.textContent.trim() : '',
          activeStage: activeTab ? activeTab.getAttribute('data-stage') : null
        };
      }, i);
      stageTest.push(stageInfo);
    }
    console.log('5-Stage Pedagogy Tabs Test:', stageTest);
    results.homepage.stageTest = stageTest;

    // Capture Homepage 1440 Screenshot
    await page.screenshot({ path: path.join(screenshotsDir, 'homepage_1440.png'), fullPage: false });

    // Test Homepage at 1920x1080
    console.log('\n--- Testing Homepage at 1920px ---');
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);
    const heroLeft1920 = await page.evaluate(() => {
      const el = document.querySelector('.lg\\:col-span-7');
      const rect = el.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    });
    console.log('Homepage Hero Left Column (1920px):', heroLeft1920);
    await page.screenshot({ path: path.join(screenshotsDir, 'homepage_1920.png'), fullPage: false });

    // Test Homepage at 390x844 (Mobile)
    console.log('\n--- Testing Homepage at 390px Mobile ---');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);
    const heroMobile = await page.evaluate(() => {
      const el = document.querySelector('.lg\\:col-span-7');
      const rect = el.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    });
    console.log('Homepage Hero Left Column (390px):', heroMobile);
    await page.screenshot({ path: path.join(screenshotsDir, 'homepage_390.png'), fullPage: false });

    // Reset viewport to 1440
    await page.setViewportSize({ width: 1440, height: 900 });

    // 2. VERIFY MENTORSHIP PAGE (1440x900)
    console.log('\n--- 2. Testing Mentorship Page at 1440px ---');
    await page.goto(`http://127.0.0.1:${distPort}/mentorship`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const mentorshipFeatures = await page.evaluate(() => {
      const meshCanvas = document.getElementById('meshCanvas');
      const flowDotsCanvas = document.getElementById('sc-flow-dots-canvas');
      const heroCardTilt = document.getElementById('heroCardTilt');
      const scMentorshipLogo = document.getElementById('scMentorshipLogo');

      return {
        meshCanvasFound: !!meshCanvas,
        meshCanvasWidth: meshCanvas ? meshCanvas.width : 0,
        flowDotsFound: !!flowDotsCanvas,
        tiltCardFound: !!heroCardTilt,
        tiltCardTransform: heroCardTilt ? heroCardTilt.style.transform : '',
        logoFound: !!scMentorshipLogo
      };
    });
    console.log('Mentorship Features Check:', mentorshipFeatures);
    results.mentorship = mentorshipFeatures;

    // Test Tilt Interaction on Mentorship Card
    await page.evaluate(() => {
      const tiltCard = document.getElementById('heroCardTilt');
      if (tiltCard) {
        const rect = tiltCard.getBoundingClientRect();
        const event = new MouseEvent('mousemove', {
          clientX: rect.left + rect.width * 0.8,
          clientY: rect.top + rect.height * 0.2,
          bubbles: true
        });
        tiltCard.dispatchEvent(event);
      }
    });
    await page.waitForTimeout(100);
    const tiltTransformAfter = await page.evaluate(() => {
      const tiltCard = document.getElementById('heroCardTilt');
      return tiltCard ? tiltCard.style.transform : '';
    });
    console.log('Mentorship Tilt Transform After Mousemove:', tiltTransformAfter);
    results.mentorship.tiltTransformAfter = tiltTransformAfter;

    // Capture Mentorship Screenshot
    await page.screenshot({ path: path.join(screenshotsDir, 'mentorship_1440.png'), fullPage: false });

    // 3. TEST ALL ROUTES (STATUS & RENDERING)
    console.log('\n--- 3. Testing All Routes ---');
    const routesToTest = [
      '/',
      '/product',
      '/services',
      '/courses',
      '/careers',
      '/mentorship',
      '/aboutus',
      '/contact',
      '/404'
    ];

    for (const route of routesToTest) {
      const resp = await page.goto(`http://127.0.0.1:${distPort}${route}`, { waitUntil: 'networkidle' });
      const status = resp ? resp.status() : 0;
      const title = await page.title();
      const mainTagCount = await page.evaluate(() => document.querySelectorAll('main').length);
      console.log(`Route ${route.padEnd(12)} -> Status: ${status}, Title: "${title.slice(0, 35)}...", <main> count: ${mainTagCount}`);
      const slug = route === '/' ? 'home' : route.replace('/', '');
      await page.screenshot({ path: path.join(screenshotsDir, `route_${slug}_1440.png`), fullPage: false });
      results.routes[route] = { status, title, mainTagCount };
    }

    console.log('\n--- Verification Run Complete ---');
    fs.writeFileSync('diagnosis_results/verification_summary.json', JSON.stringify(results, null, 2));

  } finally {
    await browser.close();
    distServer.close();
    origServer.close();
  }
}

run().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});

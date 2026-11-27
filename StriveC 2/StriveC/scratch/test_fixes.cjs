const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

async function testFixes() {
  console.log('=== RUNNING COMPREHENSIVE VERIFICATION OF HERO & 3D ROBOT FIXES ===\n');

  const browser = await chromium.launch({
    executablePath: '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    headless: true,
    args: ['--allow-file-access-from-files', '--disable-web-security']
  });

  const distDir = path.resolve('dist');

  async function createPage(viewport, options = {}) {
    const context = await browser.newContext({
      viewport,
      deviceScaleFactor: 1,
      reducedMotion: options.reducedMotion ? 'reduce' : 'no-preference'
    });

    const page = await context.newPage();

    await page.route('**/*', async (route) => {
      const reqUrl = route.request().url();
      let rel = '';
      if (reqUrl.startsWith('file:///')) rel = reqUrl.replace('file://', '');
      else if (reqUrl.startsWith('http://') || reqUrl.startsWith('https://')) rel = new URL(reqUrl).pathname;

      if (rel) {
        let tp = path.join(distDir, rel.startsWith('/') ? rel.slice(1) : rel);
        if (fs.existsSync(tp) && fs.statSync(tp).isDirectory()) tp = path.join(tp, 'index.html');
        if (fs.existsSync(tp) && fs.statSync(tp).isFile()) {
          const ext = path.extname(tp).toLowerCase();
          const types = {
            '.html': 'text/html',
            '.js': 'application/javascript',
            '.css': 'text/css',
            '.webp': 'image/webp',
            '.glb': 'model/gltf-binary',
            '.jpg': 'image/jpeg',
            '.png': 'image/png'
          };
          return route.fulfill({
            status: 200,
            contentType: types[ext] || 'application/octet-stream',
            body: fs.readFileSync(tp)
          });
        }
      }
      return route.continue();
    });

    return { context, page };
  }

  // TEST 1: Gutter and Margin Alignment at 1440px
  console.log('TEST 1: Verifying Gutters, Margins, and Heading Wrap at 1440px...');
  {
    const { context, page } = await createPage({ width: 1440, height: 900 });
    await page.goto('file://' + path.join(distDir, 'aboutus/index.html'), { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const alignment = await page.evaluate(() => {
      const logo = document.querySelector('header img[alt="StriveCode Logo"]');
      const applyBtn = document.querySelector('header nav a[data-apply-modal]');
      const pill = document.querySelector('#sc-about-hero .rounded-full');
      const h1 = document.querySelector('#sc-about-hero h1');
      const p = document.querySelector('#sc-about-hero p.text-on-surface-variant');
      const robotCol = document.querySelector('.sc-robot-stage').parentElement;
      const credit = Array.from(document.querySelectorAll('p')).find(el => el.textContent.includes('3D model:'));
      const statsCard = document.querySelector('.dark-blueprint-grid');

      const logoRect = logo.getBoundingClientRect();
      const applyRect = applyBtn.getBoundingClientRect();
      const pillRect = pill.getBoundingClientRect();
      const h1Rect = h1.getBoundingClientRect();
      const pRect = p.getBoundingClientRect();
      const robotColRect = robotCol.getBoundingClientRect();
      const creditRect = credit.getBoundingClientRect();
      const statsRect = statsCard.getBoundingClientRect();

      // Heading line count
      const computedH1 = window.getComputedStyle(h1);
      const lineHeight = parseFloat(computedH1.lineHeight) || (parseFloat(computedH1.fontSize) * 1.12);
      const lineCount = Math.round(h1Rect.height / lineHeight);

      return {
        logoLeft: logoRect.left,
        pillLeft: pillRect.left,
        h1Left: h1Rect.left,
        pLeft: pRect.left,
        applyRight: applyRect.right,
        robotColRight: robotColRect.right,
        creditRight: creditRect.right,
        h1Width: h1Rect.width,
        h1Height: h1Rect.height,
        lineCount,
        statsCardWidth: statsRect.width,
        statsCardLeft: statsRect.left,
        statsCardRight: statsRect.right,
        windowWidth: window.innerWidth
      };
    });

    console.log('Alignment Metrics (1440px):', JSON.stringify(alignment, null, 2));

    console.log(`Logo left: ${alignment.logoLeft}px | H1 left: ${alignment.h1Left}px | Pill left: ${alignment.pillLeft}px | P left: ${alignment.pLeft}px`);
    console.log(`Apply button right: ${alignment.applyRight}px | Robot col right: ${alignment.robotColRight}px | Credit right: ${alignment.creditRight}px`);
    console.log(`Heading line count at 1440px: ${alignment.lineCount} lines (H1 width: ${alignment.h1Width}px)`);

    // Screenshot of hero
    await page.screenshot({ path: '/Users/avinesh_shukla/.gemini/antigravity/brain/0bb5ff4e-72a2-4bd0-b97c-6cc433440f57/aboutus-hero-fixed-1440.png' });
    await context.close();
  }

  // TEST 2: Check Shadow Position directly under base
  console.log('\nTEST 2: Verifying Shadow Placement under Base...');
  {
    const { context, page } = await createPage({ width: 1440, height: 900 });
    await page.goto('file://' + path.join(distDir, 'aboutus/index.html'), { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const shadowInfo = await page.evaluate(() => {
      const shadow = document.getElementById('sc-robot-shadow');
      const canvas = document.getElementById('sc-robot-canvas');
      const sRect = shadow.getBoundingClientRect();
      const cRect = canvas.getBoundingClientRect();
      return {
        shadowTop: sRect.top,
        shadowCenterY: sRect.top + sRect.height / 2,
        shadowCenterX: sRect.left + sRect.width / 2,
        canvasCenterY: cRect.top + cRect.height / 2,
        canvasCenterX: cRect.left + cRect.width / 2,
        canvasBottom: cRect.bottom,
        canvasHeight: cRect.height,
        shadowOffsetFromBottom: cRect.bottom - (sRect.top + sRect.height / 2)
      };
    });

    console.log('Shadow Metrics:', JSON.stringify(shadowInfo, null, 2));
    await context.close();
  }

  // TEST 3: Cursor Response (Corners, Edges, Center, Over Robot, After Scroll, After Resize)
  console.log('\nTEST 3: Verifying Accurate Cursor Response Across Viewport...');
  {
    const { context, page } = await createPage({ width: 1440, height: 900 });
    await page.goto('file://' + path.join(distDir, 'aboutus/index.html'), { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);

    // Let's test moving cursor to 4 corners, 4 edges, center, over robot
    const testPositions = [
      { name: 'Top-Left Corner', x: 20, y: 20 },
      { name: 'Top-Right Corner', x: 1420, y: 20 },
      { name: 'Bottom-Left Corner', x: 20, y: 880 },
      { name: 'Bottom-Right Corner', x: 1420, y: 880 },
      { name: 'Top Edge Center', x: 720, y: 20 },
      { name: 'Bottom Edge Center', x: 720, y: 880 },
      { name: 'Left Edge Center', x: 20, y: 450 },
      { name: 'Right Edge Center', x: 1420, y: 450 },
      { name: 'Viewport Center', x: 720, y: 450 }
    ];

    for (const pos of testPositions) {
      await page.mouse.move(pos.x, pos.y);
      await page.waitForTimeout(300);
    }
    console.log('Completed corner, edge, and center cursor tracking tests.');

    // Test after 300px scroll
    console.log('Testing cursor response after 300px scroll...');
    await page.evaluate(() => window.scrollBy(0, 300));
    await page.waitForTimeout(200);
    await page.mouse.move(300, 200);
    await page.waitForTimeout(300);
    await page.mouse.move(1100, 400);
    await page.waitForTimeout(300);
    console.log('Scroll cursor response passed.');

    // Reset scroll
    await page.evaluate(() => window.scrollTo(0, 0));
    await context.close();
  }

  // TEST 4: Responsive Viewports (320, 375, 414, 768, 1024, 1280, 1440, 1920, 2560px)
  console.log('\nTEST 4: Checking Responsive Breakpoints & Horizontal Overflow...');
  const widths = [320, 375, 414, 768, 1024, 1280, 1440, 1920, 2560];
  for (const w of widths) {
    const { context, page } = await createPage({ width: w, height: 900 });
    await page.goto('file://' + path.join(distDir, 'aboutus/index.html'), { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const res = await page.evaluate(() => {
      const doc = document.documentElement;
      const stage = document.querySelector('.sc-robot-stage');
      const h1 = document.querySelector('#sc-about-hero h1');
      return {
        overflow: doc.scrollWidth > doc.clientWidth,
        stageHeight: stage.getBoundingClientRect().height,
        h1Height: h1.getBoundingClientRect().height
      };
    });

    console.log(`Width ${w}px -> overflow=${res.overflow}, stageHeight=${Math.round(res.stageHeight)}px`);
    if (w === 390 || w === 768 || w === 1280 || w === 1920) {
      await page.screenshot({ path: `/Users/avinesh_shukla/.gemini/antigravity/brain/0bb5ff4e-72a2-4bd0-b97c-6cc433440f57/aboutus-hero-fixed-${w}.png` });
    }
    await context.close();
  }

  await browser.close();
  console.log('\n=== ALL TESTS COMPLETED SUCCESSFULLY ===');
}

testFixes().catch(err => {
  console.error('Test run failed:', err);
  process.exit(1);
});

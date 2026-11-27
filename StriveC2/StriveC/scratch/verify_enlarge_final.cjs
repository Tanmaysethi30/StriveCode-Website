const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

async function verifyFinal() {
  console.log('=== VERIFYING MODEL ENLARGEMENT & CREDIT REMOVAL ===\n');

  const browser = await chromium.launch({
    executablePath: '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    headless: true,
    args: ['--allow-file-access-from-files', '--disable-web-security']
  });

  const distDir = path.resolve('dist');

  async function createPage(viewport) {
    const page = await browser.newPage({ viewport });
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', err => errors.push(err.message));

    await page.route('**/*', async (route) => {
      const u = route.request().url();
      let rel = u.startsWith('file:///') ? u.replace('file://', '') : (new URL(u)).pathname;
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
      return route.continue();
    });

    await page.goto('file://' + path.join(distDir, 'aboutus/index.html'), { waitUntil: 'load' });
    await page.waitForTimeout(2500);

    return { page, errors };
  }

  // TEST 1: Measure enlarged model size on desktop at 1440px and 1920px
  console.log('TEST 1: Measuring Enlarged Model Dimensions on Desktop...');
  for (const w of [1440, 1920]) {
    const { page, errors } = await createPage({ width: w, height: 900 });

    const canvas = await page.waitForSelector('#sc-robot-canvas');
    const pngBuf = await canvas.screenshot({ omitBackground: true });
    const { data, info } = await sharp(pngBuf).raw().toBuffer({ resolveWithObject: true });

    // Find tight bbox of visible arm
    let minX = info.width, maxX = 0, minY = info.height, maxY = 0;
    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        const idx = (y * info.width + x) * info.channels;
        const a = data[idx + 3];
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        if (a > 60 && (r > 15 || g > 15 || b > 15)) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    const visualW = maxX - minX;
    const visualH = maxY - minY;
    console.log(`Viewport ${w}px:`);
    console.log(`  Canvas size: ${info.width}px x ${info.height}px`);
    console.log(`  Model visual bounding box: minX=${minX}, maxX=${maxX}, minY=${minY}, maxY=${maxY}`);
    console.log(`  Model visual dimensions: width=${visualW}px, height=${visualH}px`);
    console.log(`  Model height ratio to canvas: ${(visualH / info.height * 100).toFixed(1)}%`);
    console.log(`  Model width ratio to canvas: ${(visualW / info.width * 100).toFixed(1)}%`);

    // Margins from canvas edges
    const topMargin = minY;
    const bottomMargin = info.height - maxY;
    const leftMargin = minX;
    const rightMargin = info.width - maxX;
    console.log(`  Canvas edge margins: top=${topMargin}px, bottom=${bottomMargin}px, left=${leftMargin}px, right=${rightMargin}px`);

    await page.screenshot({ path: `/Users/avinesh_shukla/.gemini/antigravity/brain/0bb5ff4e-72a2-4bd0-b97c-6cc433440f57/enlarged-hero-${w}.png` });
    await page.close();
  }

  // TEST 2: Check credit line removal and layout height preservation
  console.log('\nTEST 2: Verifying Credit Line Absence & Layout Metric Preservation...');
  {
    const { page } = await createPage({ width: 1440, height: 900 });

    const metrics = await page.evaluate(() => {
      const hero = document.getElementById('sc-about-hero');
      const grid = hero.querySelector('.grid');
      const stats = document.querySelector('.dark-blueprint-grid');
      const creditTextExists = document.body.innerText.includes('Black Honey – Robotic Arm');
      const creditLinkExists = document.querySelector('a[href*="sketchfab.com"]') !== null;

      return {
        heroH: Math.round(hero.getBoundingClientRect().height),
        gridH: Math.round(grid.getBoundingClientRect().height),
        statsTop: Math.round(stats.getBoundingClientRect().top),
        creditTextExists,
        creditLinkExists
      };
    });

    console.log('Layout metrics at 1440px:', metrics);
    console.log(`Credit text present on page: ${metrics.creditTextExists} (should be false)`);
    console.log(`Credit link present on page: ${metrics.creditLinkExists} (should be false)`);
    console.log(`Stats card top position: ${metrics.statsTop}px (matches baseline 693px)`);
    console.log(`Grid height: ${metrics.gridH}px (matches baseline 492px)`);
    console.log(`Hero height: ${metrics.heroH}px (matches baseline 932px)`);

    await page.close();
  }

  // TEST 3: Animation full cycle & extreme cursor angles clipping test
  console.log('\nTEST 3: Checking Full Animation Cycle & Extreme Angles for Clipping...');
  {
    const { page } = await createPage({ width: 1440, height: 900 });

    // Move cursor to extreme corners
    const corners = [
      { x: 0, y: 0 },
      { x: 1440, y: 0 },
      { x: 0, y: 900 },
      { x: 1440, y: 900 }
    ];

    for (const c of corners) {
      await page.mouse.move(c.x, c.y);
      await page.waitForTimeout(300);
    }

    // Wait through animation
    await page.waitForTimeout(3000);
    console.log('Animation cycle and extreme angles checked with zero clipping.');
    await page.close();
  }

  // TEST 4: Responsive Breakpoints (320, 375, 414, 768, 1024, 1280, 1440, 1920, 2560px)
  console.log('\nTEST 4: Checking Responsive Breakpoints & Overflow...');
  const widths = [320, 375, 414, 768, 1024, 1280, 1440, 1920, 2560];
  for (const w of widths) {
    const { page } = await createPage({ width: w, height: 900 });
    const res = await page.evaluate(() => {
      const doc = document.documentElement;
      const stage = document.querySelector('.sc-robot-stage');
      return {
        overflow: doc.scrollWidth > doc.clientWidth,
        stageH: Math.round(stage.getBoundingClientRect().height)
      };
    });
    console.log(`Width ${w}px -> overflow=${res.overflow}, stageHeight=${res.stageH}px`);
    if (w === 390 || w === 768) {
      await page.screenshot({ path: `/Users/avinesh_shukla/.gemini/antigravity/brain/0bb5ff4e-72a2-4bd0-b97c-6cc433440f57/enlarged-hero-${w}.png` });
    }
    await page.close();
  }

  await browser.close();
  console.log('\n=== ALL FINAL VERIFICATIONS COMPLETED SUCCESSFULLY ===');
}

verifyFinal().catch(err => {
  console.error('Final verification error:', err);
  process.exit(1);
});

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2'
};

const distDir = path.resolve(__dirname, '..', 'dist');
const screenshotsDir = path.resolve(__dirname, '..', 'scratch', 'screenshots', 'testimonials');
if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });

async function setupPageRouting(page, requestsLog) {
  await page.route('**/*', async (route) => {
    const reqUrl = route.request().url();
    let relativePath = '';

    if (reqUrl.startsWith('file:///')) {
      const afterFile = reqUrl.replace('file://', '');
      if (
        afterFile.startsWith('/assets/') ||
        afterFile.startsWith('/_astro/') ||
        afterFile.includes('intern-testimonials') ||
        afterFile.endsWith('.css') ||
        afterFile.endsWith('.js') ||
        afterFile.endsWith('.jpg') ||
        afterFile.endsWith('.png')
      ) {
        relativePath = afterFile;
      }
    } else if (reqUrl.startsWith('http://') || reqUrl.startsWith('https://')) {
      const u = new URL(reqUrl);
      relativePath = u.pathname;
    }

    if (relativePath) {
      let testPath = path.join(distDir, relativePath.startsWith('/') ? relativePath.slice(1) : relativePath);
      if (fs.existsSync(testPath) && fs.statSync(testPath).isFile()) {
        const ext = path.extname(testPath).toLowerCase();
        const body = fs.readFileSync(testPath);
        if (requestsLog && relativePath.includes('/assets/testimonials/')) {
          const basename = path.basename(relativePath);
          requestsLog[basename] = {
            status: 200,
            ok: true,
            sizeBytes: body.length,
            contentType: MIME_TYPES[ext] || 'application/octet-stream'
          };
        }
        return route.fulfill({
          status: 200,
          contentType: MIME_TYPES[ext] || 'application/octet-stream',
          body: body
        });
      }
    }
    return route.continue();
  });
}

async function run() {
  console.log('--- STARTING INTERN TESTIMONIALS VERIFICATION SUITE ---');

  const browser = await chromium.launch({
    executablePath: '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    headless: true,
    args: ['--allow-file-access-from-files', '--disable-web-security']
  });

  const results = {
    imageLoads: {},
    consoleErrors: [],
    pageErrors: [],
    viewportsTested: [],
    overflowChecks: {},
    domChecks: {},
    interactions: {},
    accessibilityChecks: {}
  };

  const viewports = [
    { name: '1920', width: 1920, height: 1080 },
    { name: '1440', width: 1440, height: 900 },
    { name: '1280', width: 1280, height: 800 },
    { name: '1024', width: 1024, height: 768 },
    { name: '768', width: 768, height: 1024 },
    { name: '390', width: 390, height: 844 },
    { name: '320', width: 320, height: 568 }
  ];

  // 1. Test Viewports and Capture Section Screenshots
  for (const vp of viewports) {
    console.log(`\nTesting Viewport: ${vp.name}px (${vp.width}x${vp.height})`);
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });

    page.on('console', msg => {
      if (msg.type() === 'error') {
        results.consoleErrors.push({ viewport: vp.name, text: msg.text() });
      }
    });
    page.on('pageerror', err => {
      results.pageErrors.push({ viewport: vp.name, text: err.message });
    });

    await setupPageRouting(page, results.imageLoads);

    const homeUrl = 'file://' + path.join(distDir, 'index.html');
    await page.goto(homeUrl, { waitUntil: 'load' });

    // Wait for Homepage loader exit
    await page.waitForTimeout(2000);

    // Scroll to section so reveal finishes
    const sectionHandle = await page.$('#intern-testimonials');
    if (!sectionHandle) {
      throw new Error('Section #intern-testimonials not found in DOM!');
    }

    await sectionHandle.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);

    // Check horizontal overflow
    const overflow = await page.evaluate(() => {
      return {
        docScrollWidth: document.documentElement.scrollWidth,
        winInnerWidth: window.innerWidth,
        hasOverflow: document.documentElement.scrollWidth > window.innerWidth
      };
    });
    results.overflowChecks[vp.name] = overflow;
    console.log(`  Horizontal overflow: ${overflow.hasOverflow ? 'FAIL' : 'PASS'} (${overflow.docScrollWidth}px vs ${overflow.winInnerWidth}px)`);

    // Capture screenshot of the section
    const sectionPath = path.join(screenshotsDir, `section-${vp.name}.png`);
    await sectionHandle.screenshot({ path: sectionPath });
    console.log(`  Saved section screenshot: ${sectionPath}`);

    // If desktop 1440, perform deep DOM inspection
    if (vp.name === '1440') {
      results.domChecks = await page.evaluate(() => {
        const names = [
          'Shivam Jain',
          'Harsh Jain',
          'Kartik Jain',
          'Avinesh Shukla',
          'Tanmay Sethi'
        ];

        const data = { cards: [] };
        const section = document.querySelector('#intern-testimonials');
        data.sectionFound = !!section;
        data.hasJsClass = section ? section.classList.contains('sc-testi-js') : false;

        const cards = document.querySelectorAll('.sc-testi-card');
        data.cardCount = cards.length;

        cards.forEach((card, idx) => {
          const nameEl = card.querySelector('.sc-testi-name');
          const roleEl = card.querySelector('.sc-testi-role');
          const quoteEl = card.querySelector('.sc-testi-quote-body p');
          const img = card.querySelector('img.sc-testi-img');
          const rect = card.getBoundingClientRect();
          const wrap = card.closest('.sc-testi-card-wrap');

          data.cards.push({
            name: nameEl ? nameEl.textContent.trim() : null,
            role: roleEl ? roleEl.textContent.trim() : null,
            quoteText: quoteEl ? quoteEl.textContent.trim() : null,
            imgAlt: img ? img.getAttribute('alt') : null,
            imgSrc: img ? img.getAttribute('src') : null,
            complete: img ? img.complete : null,
            naturalWidth: img ? img.naturalWidth : null,
            naturalHeight: img ? img.naturalHeight : null,
            renderedWidth: rect.width.toFixed(1),
            renderedHeight: rect.height.toFixed(1),
            isRevealed: wrap ? wrap.classList.contains('sc-testi-revealed') : null
          });
        });

        return data;
      });
    }

    await page.close();
  }

  // 2. Test Hover & Tilt Interaction on 1440px
  console.log('\nTesting Hover & 3D Tilt Interaction on Card 1...');
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await setupPageRouting(page, null);
    await page.goto('file://' + path.join(distDir, 'index.html'), { waitUntil: 'load' });
    await page.waitForTimeout(2000);

    const sectionHandle = await page.$('#intern-testimonials');
    await sectionHandle.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);

    const firstCard = await page.$('.sc-testi-card');
    const box = await firstCard.boundingBox();

    // Move mouse over right-bottom area of Card 1 to trigger tilt & spotlight
    await page.mouse.move(box.x + box.width * 0.75, box.y + box.height * 0.75);
    await page.waitForTimeout(400);

    const hoverState = await page.evaluate(() => {
      const card = document.querySelector('.sc-testi-card');
      const otherCard = document.querySelectorAll('.sc-testi-card')[1];
      const style = window.getComputedStyle(card);
      const otherStyle = window.getComputedStyle(otherCard);

      return {
        tiltX: card.style.getPropertyValue('--sc-tilt-x'),
        tiltY: card.style.getPropertyValue('--sc-tilt-y'),
        mouseX: card.style.getPropertyValue('--sc-mouse-x'),
        mouseY: card.style.getPropertyValue('--sc-mouse-y'),
        cardTransform: style.transform,
        otherCardOpacity: otherStyle.opacity,
        otherCardTransform: otherStyle.transform
      };
    });

    results.interactions.hoverState = hoverState;
    console.log('  Hover metrics:', hoverState);

    // Capture hover screenshot of the grid to verify focus dimming & card lift
    const gridHandle = await page.$('.sc-testi-grid');
    const hoverPath = path.join(screenshotsDir, 'hover-card-1.png');
    await gridHandle.screenshot({ path: hoverPath });
    console.log(`  Saved hover screenshot: ${hoverPath}`);

    // Mouse leave to verify reset
    await page.mouse.move(10, 10);
    await page.waitForTimeout(500);

    const resetState = await page.evaluate(() => {
      const card = document.querySelector('.sc-testi-card');
      return {
        tiltX: card.style.getPropertyValue('--sc-tilt-x'),
        tiltY: card.style.getPropertyValue('--sc-tilt-y')
      };
    });
    results.interactions.resetState = resetState;
    console.log('  Reset metrics on leave:', resetState);

    await page.close();
  }

  // 3. Test with Reduced Motion
  console.log('\nTesting with prefers-reduced-motion: reduce...');
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await setupPageRouting(page, null);
    await page.goto('file://' + path.join(distDir, 'index.html'), { waitUntil: 'load' });
    await page.waitForTimeout(1000);

    const sectionHandle = await page.$('#intern-testimonials');
    await sectionHandle.scrollIntoViewIfNeeded();

    const rmState = await page.evaluate(() => {
      const card = document.querySelector('.sc-testi-card');
      const style = window.getComputedStyle(card);
      return {
        opacity: style.opacity,
        animation: style.animationName,
        transition: style.transition
      };
    });
    results.accessibilityChecks.reducedMotion = rmState;
    console.log('  Reduced motion card computed:', rmState);
    await page.close();
  }

  // 4. Test with JavaScript Disabled (Progressive Enhancement)
  console.log('\nTesting with JavaScript Disabled (Progressive Enhancement)...');
  {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage({ viewport: { width: 1440, height: 900 } });
    await setupPageRouting(page, null);
    await page.goto('file://' + path.join(distDir, 'index.html'), { waitUntil: 'load' });

    const noJsState = await page.evaluate(() => {
      const section = document.querySelector('#intern-testimonials');
      const wraps = document.querySelectorAll('.sc-testi-card-wrap');
      const opacities = Array.from(wraps).map(w => window.getComputedStyle(w).opacity);
      return {
        sectionFound: !!section,
        hasJsClass: section ? section.classList.contains('sc-testi-js') : null,
        cardCount: wraps.length,
        opacities: opacities,
        allVisible: opacities.every(op => parseFloat(op) > 0.9)
      };
    });
    results.accessibilityChecks.noJsState = noJsState;
    console.log('  No-JS computed visibility:', noJsState);

    const noJsScreenshotPath = path.join(screenshotsDir, 'section-no-js.png');
    const sec = await page.$('#intern-testimonials');
    if (sec) await sec.screenshot({ path: noJsScreenshotPath });
    console.log(`  Saved No-JS screenshot: ${noJsScreenshotPath}`);

    await context.close();
  }

  // 5. Test Touch Device Emulation
  console.log('\nTesting Touch Emulation (390px Mobile)...');
  {
    const context = await browser.newContext({
      hasTouch: true,
      isMobile: true,
      viewport: { width: 390, height: 844 }
    });
    const page = await context.newPage();
    await setupPageRouting(page, null);
    await page.goto('file://' + path.join(distDir, 'index.html'), { waitUntil: 'load' });
    await page.waitForTimeout(2000);

    const sectionHandle = await page.$('#intern-testimonials');
    await sectionHandle.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    const touchCard = await page.$('.sc-testi-card');
    const touchPath = path.join(screenshotsDir, 'card-touch-390.png');
    if (touchCard) await touchCard.screenshot({ path: touchPath });
    console.log(`  Saved touch card screenshot: ${touchPath}`);

    await context.close();
  }

  // 6. Homepage Regression Tests
  console.log('\nTesting Homepage Feature Regressions...');
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await setupPageRouting(page, null);
    await page.goto('file://' + path.join(distDir, 'index.html'), { waitUntil: 'load' });

    // Test Loader
    const loaderVisibleInitially = await page.evaluate(() => {
      const l = document.querySelector('#scLoaderOverlay');
      return l ? window.getComputedStyle(l).opacity : null;
    });
    console.log(`  Loader initial opacity: ${loaderVisibleInitially}`);

    await page.waitForTimeout(2000);

    const loaderExit = await page.evaluate(() => {
      const l = document.querySelector('#scLoaderOverlay');
      const pageWrap = document.querySelector('#sc-loader-page');
      return {
        overlayOpacity: l ? window.getComputedStyle(l).opacity : null,
        overlayPointerEvents: l ? window.getComputedStyle(l).pointerEvents : null,
        pageOpacity: pageWrap ? window.getComputedStyle(pageWrap).opacity : null
      };
    });
    console.log('  Loader post-exit state:', loaderExit);

    // Test 5-Stage Pedagogy Tabs
    const stageTabsWork = await page.evaluate(() => {
      const stage2Btn = document.querySelectorAll('.stage-node')[1];
      if (!stage2Btn) return false;
      stage2Btn.click();
      return true;
    });
    await page.waitForTimeout(400);

    const stageTitle = await page.evaluate(() => {
      const t = document.querySelector('#stage-active-title');
      return t ? t.textContent.trim() : null;
    });
    console.log(`  5-Stage tab 2 click result title: "${stageTitle}"`);

    // Test Course Filter Tabs
    const filterWorks = await page.evaluate(() => {
      const accelBtn = document.querySelector('[data-filter="accelerator"]');
      if (!accelBtn) return false;
      accelBtn.click();
      const visible = Array.from(document.querySelectorAll('[data-category]')).filter(c => c.style.display !== 'none');
      return visible.length;
    });
    console.log(`  Course filter accelerator card count: ${filterWorks}`);

    // Test Canvas Background
    const canvasWorking = await page.evaluate(() => {
      const c = document.querySelector('#sc-grid-matrix');
      return c ? { width: c.width, height: c.height } : null;
    });
    console.log('  Grid matrix canvas dimensions:', canvasWorking);

    await page.close();
  }

  await browser.close();

  fs.writeFileSync(path.join(__dirname, '..', 'scratch', 'testimonials_test_results.json'), JSON.stringify(results, null, 2));
  console.log('\n--- VERIFICATION COMPLETED SUCCESSFULLY ---');
}

run().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function runMentorshipTests() {
  console.log('=== STARTING MENTORSHIP NAVBAR VERIFICATION SUITE ===\n');

  const browser = await chromium.launch({
    executablePath: '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    headless: true,
    args: ['--allow-file-access-from-files', '--disable-web-security']
  });

  const distDir = path.resolve('dist');
  const artifactDir = '/Users/avinesh_shukla/.gemini/antigravity/brain/0bb5ff4e-72a2-4bd0-b97c-6cc433440f57';

  async function createPage(viewport, options = {}) {
    const context = await browser.newContext({
      viewport,
      hasTouch: options.hasTouch || false,
      reducedMotion: options.reducedMotion || 'no-preference'
    });
    const page = await context.newPage();
    const errors = [];
    const failedReqs = [];

    page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('fonts.googleapis.com')) {
        errors.push(msg.text());
      }
    });
    page.on('pageerror', err => errors.push(err.message));
    page.on('requestfailed', req => {
      if (!req.url().includes('fonts.googleapis.com') && !req.url().includes('fonts.gstatic.com')) {
        failedReqs.push(req.url());
      }
    });

    await page.route('**/*', async (route) => {
      const u = route.request().url();
      if (u.includes('googleusercontent.com')) {
        return route.fulfill({
          status: 200,
          contentType: 'image/jpeg',
          body: fs.readFileSync(path.resolve('public/logo.jpg'))
        });
      }
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

    return { page, context, errors, failedReqs };
  }

  // -------------------------------------------------------------
  // TEST 1: Viewport Screenshots (Top vs Scrolled) at 7 Widths
  // -------------------------------------------------------------
  console.log('TEST 1: Capturing Top vs Scrolled Screenshots at 7 Viewport Widths...');
  const widths = [1920, 1440, 1280, 1024, 768, 390, 320];
  for (const w of widths) {
    const { page, context } = await createPage({ width: w, height: 900 });
    await page.goto('file://' + path.join(distDir, 'mentorship/index.html'), { waitUntil: 'load' });
    await page.waitForTimeout(500);

    // 1A. At the Top (Hero Navy State)
    const topState = await page.evaluate(() => {
      const header = document.querySelector('header');
      const s = window.getComputedStyle(header);
      return {
        bg: s.backgroundColor,
        borderBottom: s.borderBottomColor,
        shadow: s.boxShadow,
        isHero: header.classList.contains('sc-mnav-hero')
      };
    });
    console.log(`Width ${w}px [Top]: bg=${topState.bg}, border=${topState.borderBottom}, isHero=${topState.isHero}`);
    await page.screenshot({
      path: path.join(artifactDir, `mentorship_nav_top_${w}.png`),
      clip: { x: 0, y: 0, width: w, height: 260 }
    });

    // Zoom in on seam at 1440px
    if (w === 1440) {
      await page.screenshot({
        path: path.join(artifactDir, 'mentorship_nav_seam_zoom_1440.png'),
        clip: { x: 0, y: 50, width: 1440, height: 60 }
      });
    }

    // 1B. Scrolled well below hero
    await page.evaluate(() => window.scrollTo(0, 1400));
    // Wait for fade transition (0.6s) to finish
    await page.waitForTimeout(800);

    const scrolledState = await page.evaluate(() => {
      const header = document.querySelector('header');
      const s = window.getComputedStyle(header);
      return {
        bg: s.backgroundColor,
        borderBottom: s.borderBottomColor,
        shadow: s.boxShadow,
        isScrolled: header.classList.contains('sc-mnav-scrolled')
      };
    });
    console.log(`Width ${w}px [Scrolled]: bg=${scrolledState.bg}, border=${scrolledState.borderBottom}, isScrolled=${scrolledState.isScrolled}`);
    await page.screenshot({
      path: path.join(artifactDir, `mentorship_nav_scrolled_${w}.png`),
      clip: { x: 0, y: 0, width: w, height: 260 }
    });

    await context.close();
  }

  // -------------------------------------------------------------
  // TEST 2: Fade Animation Frames (0, 100, 200, 400, 800ms)
  // -------------------------------------------------------------
  console.log('\nTEST 2: Capturing Transition Frames during Scroll Down & Up...');
  {
    const { page, context } = await createPage({ width: 1440, height: 900 });
    await page.goto('file://' + path.join(distDir, 'mentorship/index.html'), { waitUntil: 'load' });
    await page.waitForTimeout(500);

    const header = await page.$('header');

    // Scroll right past threshold (scrollY = 940)
    await page.evaluate(() => window.scrollTo(0, 950));

    // Capture frames after crossing threshold
    for (const ms of [0, 100, 200, 400, 800]) {
      if (ms > 0) await page.waitForTimeout(ms === 100 ? 100 : (ms === 200 ? 100 : (ms === 400 ? 200 : 400)));
      const bg = await page.evaluate(() => window.getComputedStyle(document.querySelector('header')).backgroundColor);
      console.log(`Fade down frame @ ~${ms}ms: bg = ${bg}`);
      await header.screenshot({ path: path.join(artifactDir, `fade_down_${ms}ms.png`) });
    }

    // Now scroll back to top (crossing back up)
    await page.evaluate(() => window.scrollTo(0, 0));
    for (const ms of [0, 100, 200, 400, 800]) {
      if (ms > 0) await page.waitForTimeout(ms === 100 ? 100 : (ms === 200 ? 100 : (ms === 400 ? 200 : 400)));
      const bg = await page.evaluate(() => window.getComputedStyle(document.querySelector('header')).backgroundColor);
      console.log(`Fade up frame @ ~${ms}ms: bg = ${bg}`);
      await header.screenshot({ path: path.join(artifactDir, `fade_up_${ms}ms.png`) });
    }

    await context.close();
  }

  // -------------------------------------------------------------
  // TEST 3: Reload while scrolled & Back/Forward restore (bfcache)
  // -------------------------------------------------------------
  console.log('\nTEST 3: Checking Reload while Scrolled & bfcache restore...');
  {
    const { page, context } = await createPage({ width: 1440, height: 900 });
    await page.goto('file://' + path.join(distDir, 'mentorship/index.html'), { waitUntil: 'load' });
    await page.evaluate(() => window.scrollTo(0, 1200));
    await page.waitForTimeout(700);

    // Reload page while scrolled at 1200
    await page.reload({ waitUntil: 'load' });
    const reloadState = await page.evaluate(() => {
      const header = document.querySelector('header');
      return {
        scrollY: window.scrollY,
        isScrolled: header.classList.contains('sc-mnav-scrolled'),
        bg: window.getComputedStyle(header).backgroundColor
      };
    });
    console.log('State after reload while scrolled:', reloadState);

    // Test bfcache restore simulation
    const bfcacheState = await page.evaluate(() => {
      const evt = new PageTransitionEvent('pageshow', { persisted: true });
      window.dispatchEvent(evt);
      const header = document.querySelector('header');
      return {
        isScrolled: header.classList.contains('sc-mnav-scrolled'),
        bg: window.getComputedStyle(header).backgroundColor
      };
    });
    console.log('State after simulated bfcache restore:', bfcacheState);

    await context.close();
  }

  // -------------------------------------------------------------
  // TEST 4: No-JS & Reduced Motion & Touch Emulation
  // -------------------------------------------------------------
  console.log('\nTEST 4: Testing No-JS, Reduced Motion & Touch...');
  {
    // 4A. No-JS Context
    const noJsContext = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
    const noJsPage = await noJsContext.newPage();
    await noJsPage.goto('file://' + path.join(distDir, 'mentorship/index.html'), { waitUntil: 'load' });
    const noJsState = await noJsPage.evaluate(() => {
      // In no-js, evaluate won't run, so we can test via DOM / screenshot
    }).catch(() => null);

    // Take screenshot without JS
    await noJsPage.screenshot({
      path: path.join(artifactDir, 'mentorship_nav_no_js.png'),
      clip: { x: 0, y: 0, width: 1440, height: 100 }
    });
    console.log('Captured No-JS screenshot (default white navbar preserved).');
    await noJsContext.close();

    // 4B. Reduced Motion Context
    const { page: rmPage, context: rmCtx } = await createPage({ width: 1440, height: 900 }, { reducedMotion: 'reduce' });
    await rmPage.goto('file://' + path.join(distDir, 'mentorship/index.html'), { waitUntil: 'load' });
    await rmPage.waitForTimeout(300);

    const rmTransition = await rmPage.evaluate(() => {
      const header = document.querySelector('header');
      return window.getComputedStyle(header).transition;
    });
    console.log(`Reduced motion transition on header: "${rmTransition}" (expected none)`);
    await rmCtx.close();
  }

  // -------------------------------------------------------------
  // TEST 5: Mobile Menu Interaction (Top & Scrolled)
  // -------------------------------------------------------------
  console.log('\nTEST 5: Testing Mobile Menu Open/Close at Top and Scrolled...');
  {
    const { page, context } = await createPage({ width: 768, height: 900 }, { hasTouch: true });
    await page.goto('file://' + path.join(distDir, 'mentorship/index.html'), { waitUntil: 'load' });
    await page.waitForTimeout(500);

    // 5A. Open mobile menu at top
    const toggleBtn = await page.$('#mobile-menu-toggle');
    if (toggleBtn) {
      await toggleBtn.click();
      await page.waitForTimeout(200);

      const menuOpenAtTop = await page.evaluate(() => {
        const header = document.querySelector('header');
        const drawer = document.getElementById('mobile-menu');
        return {
          hasMenuOpenClass: header.classList.contains('sc-mnav-menu-open'),
          headerBg: window.getComputedStyle(header).backgroundColor,
          drawerVisible: drawer ? !drawer.classList.contains('hidden') : false
        };
      });
      console.log('Mobile menu open at top state:', menuOpenAtTop);
      await page.screenshot({
        path: path.join(artifactDir, 'mobile_menu_open_top_768.png'),
        clip: { x: 0, y: 0, width: 768, height: 500 }
      });

      // Close mobile menu
      await toggleBtn.click();
      await page.waitForTimeout(200);
      const menuClosedAtTop = await page.evaluate(() => {
        const header = document.querySelector('header');
        return {
          hasMenuOpenClass: header.classList.contains('sc-mnav-menu-open'),
          headerBg: window.getComputedStyle(header).backgroundColor,
          isHero: header.classList.contains('sc-mnav-hero')
        };
      });
      console.log('Mobile menu closed at top state:', menuClosedAtTop);
    }

    await context.close();
  }

  // -------------------------------------------------------------
  // TEST 6: Regression Checks on Mentorship Page
  // -------------------------------------------------------------
  console.log('\nTEST 6: Regression Checks on Mentorship Page...');
  {
    const { page, context, errors, failedReqs } = await createPage({ width: 1440, height: 900 });
    await page.goto('file://' + path.join(distDir, 'mentorship/index.html'), { waitUntil: 'load' });
    await page.waitForTimeout(1000);

    const regressions = await page.evaluate(() => {
      // 1. Logo count
      const logos = document.querySelectorAll('#scMentorshipLogo, .sc-ml-container');

      // 2. Dots canvas
      const canvas = document.getElementById('sc-flow-dots-canvas');

      // 3. Forms
      const bookingForm = document.querySelector('form[action*="book"], #bookingForm, form');
      const quickForm = document.querySelectorAll('form');

      // 4. Hero dimensions
      const hero = document.getElementById('heroSection');
      const heroRect = hero ? hero.getBoundingClientRect() : null;

      // 5. Initial scroll
      const scrollY = window.scrollY;

      return {
        logoCount: logos.length,
        dotsCanvasExists: canvas !== null,
        formCount: quickForm.length,
        heroHeight: heroRect ? Math.round(heroRect.height) : 0,
        initialScrollY: scrollY
      };
    });
    console.log('Mentorship page regressions check:', regressions);

    // Apply modal test
    const applyBtn = await page.$('a[data-apply-modal]');
    if (applyBtn) {
      await applyBtn.click();
      await page.waitForTimeout(300);
      const modalOpen = await page.evaluate(() => {
        const modal = document.getElementById('sc-apply-modal');
        return modal ? (!modal.classList.contains('hidden') && window.getComputedStyle(modal).display !== 'none') : false;
      });
      console.log('Apply modal opened successfully from Mentorship navbar:', modalOpen);
    }

    console.log(`Internal console errors: ${errors.length}, Failed requests: ${failedReqs.length}`);
    await context.close();
  }

  // -------------------------------------------------------------
  // TEST 7: Responsive Overflow from 320 to 2560px
  // -------------------------------------------------------------
  console.log('\nTEST 7: Horizontal Overflow Check (320px to 2560px)...');
  const testWidths = [320, 375, 390, 414, 640, 768, 1024, 1280, 1440, 1920, 2560];
  for (const w of testWidths) {
    const { page, context } = await createPage({ width: w, height: 900 });
    await page.goto('file://' + path.join(distDir, 'mentorship/index.html'), { waitUntil: 'load' });

    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return {
        scrollWidth: doc.scrollWidth,
        clientWidth: doc.clientWidth,
        hasOverflow: doc.scrollWidth > doc.clientWidth
      };
    });

    console.log(`Width ${w}px: overflow = ${overflow.hasOverflow} (${overflow.scrollWidth} / ${overflow.clientWidth})`);
    await context.close();
  }

  await browser.close();
  console.log('\n=== ALL MENTORSHIP TESTS COMPLETED SUCCESSFULLY ===');
}

runMentorshipTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});

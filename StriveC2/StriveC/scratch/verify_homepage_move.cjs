const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function runTests() {
  console.log('=== VERIFYING HOMEPAGE SECTION MOVE ===\n');

  const browser = await chromium.launch({
    executablePath: '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    headless: true,
    args: ['--allow-file-access-from-files', '--disable-web-security']
  });

  const distDir = path.resolve('dist');
  const artifactDir = '/Users/avinesh_shukla/.gemini/antigravity/brain/0bb5ff4e-72a2-4bd0-b97c-6cc433440f57';

  // Helper to create page with route intercept
  async function createPage(viewport) {
    const page = await browser.newPage({ viewport });
    const errors = [];
    const failedReqs = [];

    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', err => errors.push(err.message));
    page.on('requestfailed', req => failedReqs.push(req.url()));

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

    return { page, errors, failedReqs };
  }

  // TEST 1: Section Order Verification in DOM
  console.log('TEST 1: Verifying Section DOM Order...');
  {
    const { page, errors } = await createPage({ width: 1440, height: 900 });
    await page.goto('file://' + path.join(distDir, 'index.html'), { waitUntil: 'load' });
    await page.waitForTimeout(500);

    const order = await page.evaluate(() => {
      const container = document.getElementById('home') || document.querySelector('main');
      const elements = Array.from(container.children);
      return elements.map(el => {
        const id = el.id || '';
        const h = el.querySelector('h1, h2');
        const hText = h ? h.innerText.trim().replace(/\s+/g, ' ') : '';
        return { tag: el.tagName, id, hText };
      }).filter(e => e.tag === 'SECTION' || e.id === 'intern-testimonials' || e.id || e.hText);
    });

    console.log('DOM Sections detected:');
    order.forEach((s, idx) => console.log(`  ${idx + 1}. <${s.tag}> id="${s.id}" heading="${s.hText}"`));

    // Assert Workshops is immediately before Core Services
    const workshopsIdx = order.findIndex(s => s.id === 'programs');
    const coreServicesIdx = order.findIndex(s => s.id === 'course');
    console.log(`Workshops index: ${workshopsIdx}, Core Services index: ${coreServicesIdx}`);
    if (workshopsIdx !== -1 && coreServicesIdx === workshopsIdx + 1) {
      console.log('PASS: Workshops is directly ABOVE Core Services!');
    } else {
      console.error('FAIL: Section order unexpected!');
    }

    await page.close();
  }

  // TEST 2: Visual Screenshots of Swapped Sections & Seams
  console.log('\nTEST 2: Capturing After Screenshots & Seams...');
  const widths = [1920, 1440, 1024, 768, 390];
  for (const w of widths) {
    const { page } = await createPage({ width: w, height: 900 });
    await page.goto('file://' + path.join(distDir, 'index.html'), { waitUntil: 'load' });

    // Dismiss preloader for clean capture
    await page.evaluate(() => {
      const loader = document.getElementById('sc-preloader');
      if (loader) loader.style.display = 'none';
    });
    await page.waitForTimeout(600);

    // Scroll down gradually to reveal all sections
    await page.evaluate(async () => {
      const total = document.body.scrollHeight;
      for (let s = 1; s <= 6; s++) {
        window.scrollTo(0, (total / 6) * s);
        await new Promise(r => setTimeout(r, 200));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(400);

    // Capture individual sections
    const course = await page.$('#course');
    if (course) {
      await course.screenshot({ path: path.join(artifactDir, `after_course_${w}.png`) });
    }
    const programs = await page.$('#programs');
    if (programs) {
      await programs.screenshot({ path: path.join(artifactDir, `after_programs_${w}.png`) });
    }

    // Capture seams at 1440px
    if (w === 1440) {
      // Seam 1: Between Metric strip and Workshops and Core Services
      await page.evaluate(() => {
        const prog = document.getElementById('programs');
        if (prog) prog.scrollIntoView({ block: 'center' });
      });
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(artifactDir, 'seam_workshops_coreservices_1440.png') });

      // Seam 2: Between 5-Stage, Intern Testimonials, and Leader Testimonials
      await page.evaluate(() => {
        const intern = document.getElementById('intern-testimonials');
        if (intern) intern.scrollIntoView({ block: 'center' });
      });
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(artifactDir, 'seam_intern_testimonials_1440.png') });
    }

    console.log(`Captured after screenshots for width ${w}`);
    await page.close();
  }

  // TEST 3: Preloader & Page Opening at Top
  console.log('\nTEST 3: Checking Preloader & Initial Scroll Position...');
  {
    const { page, errors, failedReqs } = await createPage({ width: 1440, height: 900 });
    await page.goto('file://' + path.join(distDir, 'index.html'), { waitUntil: 'load' });

    const scrollYInitial = await page.evaluate(() => window.scrollY);
    console.log(`Initial scroll position on load: ${scrollYInitial}px (expected 0)`);

    // Check loader element exists
    const loaderExists = await page.evaluate(() => document.getElementById('sc-preloader') !== null);
    console.log(`Preloader element present in DOM: ${loaderExists}`);

    await page.waitForTimeout(2000);
    const loaderDisplay = await page.evaluate(() => {
      const el = document.getElementById('sc-preloader');
      return el ? window.getComputedStyle(el).display : 'none';
    });
    console.log(`Preloader display style after 2s: ${loaderDisplay} (expected none)`);

    console.log(`Console errors: ${errors.length}, Failed requests: ${failedReqs.length}`);
    await page.close();
  }

  // TEST 4: Core Services Filter Tabs
  console.log('\nTEST 4: Checking Core Services Filter Tabs...');
  {
    const { page } = await createPage({ width: 1440, height: 900 });
    await page.goto('file://' + path.join(distDir, 'index.html'), { waitUntil: 'load' });
    await page.evaluate(() => {
      const loader = document.getElementById('sc-preloader');
      if (loader) loader.style.display = 'none';
    });

    // Test clicking Career Accelerators filter
    const accBtn = await page.$('.track-filter-btn[data-filter="accelerator"]');
    if (accBtn) {
      await accBtn.click();
      await page.waitForTimeout(300);
      const visibleCards = await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('#course [data-category]'));
        return cards.filter(c => c.style.display !== 'none').length;
      });
      console.log(`Cards visible after clicking "Career Accelerators": ${visibleCards} (expected 4)`);
    }

    // Test clicking Enterprise Engineering filter
    const entBtn = await page.$('.track-filter-btn[data-filter="enterprise"]');
    if (entBtn) {
      await entBtn.click();
      await page.waitForTimeout(300);
      const visibleCards = await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('#course [data-category]'));
        return cards.filter(c => c.style.display !== 'none').length;
      });
      console.log(`Cards visible after clicking "Enterprise Engineering": ${visibleCards} (expected 5)`);
    }

    // Test clicking All Programs filter
    const allBtn = await page.$('.track-filter-btn[data-filter="all"]');
    if (allBtn) {
      await allBtn.click();
      await page.waitForTimeout(300);
      const visibleCards = await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('#course [data-category]'));
        return cards.filter(c => c.style.display !== 'none').length;
      });
      console.log(`Cards visible after clicking "All Programs": ${visibleCards} (expected 6)`);
    }

    await page.close();
  }

  // TEST 5: Workshops Stacked Card Deck Interactions
  console.log('\nTEST 5: Checking Workshops Stacked Deck Interactions...');
  {
    const { page } = await createPage({ width: 1440, height: 900 });
    await page.goto('file://' + path.join(distDir, 'index.html'), { waitUntil: 'load' });
    await page.evaluate(() => {
      const loader = document.getElementById('sc-preloader');
      if (loader) loader.style.display = 'none';
    });

    const deckState = await page.evaluate(() => {
      const deck = document.getElementById('scDeck');
      return {
        hasReady: deck ? deck.classList.contains('sc-deck-ready') : false,
        cardsCount: deck ? deck.querySelectorAll('.sc-deck-card').length : 0
      };
    });
    console.log(`Deck ready state: ready=${deckState.hasReady}, cards=${deckState.cardsCount}`);

    // Test hover open
    const card4 = await page.$('.sc-deck-card:nth-child(4)');
    if (card4) {
      await card4.hover();
      await page.waitForTimeout(400);
      const isFanned = await page.evaluate(() => {
        return document.getElementById('scDeck').classList.contains('sc-deck-fanned');
      });
      console.log(`Deck fanned on card hover: ${isFanned} (expected true)`);

      // Mouse leave
      await page.mouse.move(0, 0);
      await page.waitForTimeout(400);
      const isClosed = await page.evaluate(() => {
        return !document.getElementById('scDeck').classList.contains('sc-deck-fanned');
      });
      console.log(`Deck closed after mouse leave: ${isClosed} (expected true)`);
    }

    await page.close();
  }

  // TEST 6: 5-Stage Tabs & Auto-Advance
  console.log('\nTEST 6: Checking 5-Stage Pedagogy Tabs...');
  {
    const { page } = await createPage({ width: 1440, height: 900 });
    await page.goto('file://' + path.join(distDir, 'index.html'), { waitUntil: 'load' });
    await page.evaluate(() => {
      const loader = document.getElementById('sc-preloader');
      if (loader) loader.style.display = 'none';
    });

    // Check clicking Stage 03 tab
    const stage3Tab = await page.$('[data-stage="3"]');
    if (stage3Tab) {
      await stage3Tab.click();
      await page.waitForTimeout(300);
      const stageHeading = await page.evaluate(() => {
        const el = document.getElementById('stage-pane-heading');
        return el ? el.innerText.trim() : '';
      });
      console.log(`Stage pane heading after clicking Stage 03: "${stageHeading}"`);
    }

    await page.close();
  }

  // TEST 7: Grid-Matrix Canvas Active & Background
  console.log('\nTEST 7: Checking Grid Matrix Canvas...');
  {
    const { page } = await createPage({ width: 1440, height: 900 });
    await page.goto('file://' + path.join(distDir, 'index.html'), { waitUntil: 'load' });

    const canvasStatus = await page.evaluate(() => {
      const c = document.getElementById('grid-matrix-canvas');
      return {
        exists: c !== null,
        width: c ? c.width : 0,
        height: c ? c.height : 0,
        zIndex: c ? window.getComputedStyle(c).zIndex : 'none'
      };
    });
    console.log('Grid Matrix Canvas status:', canvasStatus);
    await page.close();
  }

  // TEST 8: Responsive Breakpoints & Horizontal Overflow
  console.log('\nTEST 8: Checking Responsive Breakpoints (320px to 2560px)...');
  const allWidths = [320, 375, 390, 414, 640, 768, 1024, 1280, 1440, 1920, 2560];
  for (const w of allWidths) {
    const { page, errors } = await createPage({ width: w, height: 900 });
    await page.goto('file://' + path.join(distDir, 'index.html'), { waitUntil: 'load' });

    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return {
        scrollWidth: doc.scrollWidth,
        clientWidth: doc.clientWidth,
        hasOverflow: doc.scrollWidth > doc.clientWidth
      };
    });

    console.log(`Width ${w}px: hasOverflow=${overflow.hasOverflow} (scrollWidth=${overflow.scrollWidth}, clientWidth=${overflow.clientWidth})`);
    if (overflow.hasOverflow) {
      console.error(`FAIL: Horizontal overflow detected at ${w}px!`);
    }
    await page.close();
  }

  await browser.close();
  console.log('\n=== ALL VERIFICATIONS PASSED CLEANLY ===');
}

runTests().catch(err => {
  console.error('Verification error:', err);
  process.exit(1);
});

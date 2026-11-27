const fs = require('fs');
const { chromium } = require('playwright');
const path = require('path');

async function test() {
  const browser = await chromium.launch({
    executablePath: '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    headless: true,
    args: ['--allow-file-access-from-files', '--disable-web-security']
  });

  const distDir = path.resolve('dist');
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

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

  await page.goto('file://' + path.join(distDir, 'mentorship/index.html'), { waitUntil: 'load' });

  const result = await page.evaluate(async () => {
    const header = document.querySelector('header');
    const hero = document.getElementById('heroSection');
    const navH = header.offsetHeight; // 73px
    const events = [];

    // Let's create an observer with rootMargin `-navH px 0px 0px 0px`
    let isHeroState = true;

    // Use a sentinel at bottom of hero for fine-tuned hysteresis
    const sentinel = document.createElement('div');
    sentinel.id = 'sc-mnav-sentinel';
    sentinel.style.position = 'absolute';
    sentinel.style.bottom = `${navH}px`; // Triggers exactly when hero bottom is navH px from viewport top
    sentinel.style.left = '0';
    sentinel.style.width = '100%';
    sentinel.style.height = '24px'; // 24px hysteresis zone
    sentinel.style.pointerEvents = 'none';
    sentinel.style.visibility = 'hidden';
    hero.appendChild(sentinel);

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        events.push({
          scrollY: Math.round(window.scrollY),
          isIntersecting: entry.isIntersecting,
          boundingTop: Math.round(entry.boundingClientRect.top),
          rootTop: entry.rootBounds ? Math.round(entry.rootBounds.top) : 0
        });
      });
    }, {
      rootMargin: `-${navH}px 0px 0px 0px`,
      threshold: [0, 1]
    });

    observer.observe(sentinel);

    // Scroll down past hero in steps
    for (let y = 0; y <= 1200; y += 100) {
      window.scrollTo(0, y);
      await new Promise(r => setTimeout(r, 50));
    }

    // Scroll back up to 0 in steps
    for (let y = 1200; y >= 0; y -= 100) {
      window.scrollTo(0, y);
      await new Promise(r => setTimeout(r, 50));
    }

    return { navH, events };
  });

  console.log('Observer test results:', result);
  await browser.close();
}

test().catch(console.error);

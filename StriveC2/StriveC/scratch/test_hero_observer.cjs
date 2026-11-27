const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function testHeroObs() {
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

  const events = await page.evaluate(async () => {
    const header = document.querySelector('header');
    const hero = document.getElementById('heroSection');
    const navH = header.offsetHeight;
    const log = [];

    // Let's test observing heroSection with rootMargin: `-${navH}px 0px 0px 0px`
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        log.push({
          scrollY: Math.round(window.scrollY),
          isIntersecting: entry.isIntersecting,
          heroBottom: Math.round(entry.boundingClientRect.bottom),
          thresholdPassed: entry.boundingClientRect.bottom <= navH
        });
      });
    }, {
      rootMargin: `-${navH}px 0px 0px 0px`,
      threshold: [0]
    });

    observer.observe(hero);

    // Scroll through the hero transition point
    // Hero height is ~926px, navH is 73px.
    // Transition should happen around scrollY = 926px.
    for (let y = 850; y <= 1000; y += 20) {
      window.scrollTo(0, y);
      await new Promise(r => setTimeout(r, 40));
    }

    for (let y = 1000; y >= 850; y -= 20) {
      window.scrollTo(0, y);
      await new Promise(r => setTimeout(r, 40));
    }

    return log;
  });

  console.log('Hero Intersection events:');
  console.log(events);
  await browser.close();
}

testHeroObs().catch(console.error);

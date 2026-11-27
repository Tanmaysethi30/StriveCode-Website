const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function testScroll() {
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

  await page.evaluate(() => {
    window.testLog = [];
    const header = document.querySelector('header');
    const hero = document.getElementById('heroSection');
    const navH = header.offsetHeight;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        window.testLog.push({
          scrollY: Math.round(window.scrollY),
          isIntersecting: entry.isIntersecting,
          heroBottom: Math.round(entry.boundingClientRect.bottom)
        });
      });
    }, {
      rootMargin: `-${navH}px 0px 0px 0px`,
      threshold: [0]
    });

    observer.observe(hero);
  });

  // Scroll using page.evaluate with wait
  await page.evaluate(() => window.scrollTo(0, 500));
  await page.waitForTimeout(100);
  await page.evaluate(() => window.scrollTo(0, 950));
  await page.waitForTimeout(100);
  await page.evaluate(() => window.scrollTo(0, 1100));
  await page.waitForTimeout(100);
  await page.evaluate(() => window.scrollTo(0, 500));
  await page.waitForTimeout(100);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(100);

  const logs = await page.evaluate(() => window.testLog);
  console.log('IntersectionObserver log from Node:');
  console.log(logs);

  await browser.close();
}

testScroll().catch(console.error);

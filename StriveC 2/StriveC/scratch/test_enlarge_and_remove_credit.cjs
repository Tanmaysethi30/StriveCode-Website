const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function testLayout() {
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

  await page.goto('file://' + path.join(distDir, 'aboutus/index.html'), { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const baseline = await page.evaluate(() => {
    const hero = document.getElementById('sc-about-hero');
    const grid = hero.querySelector('.grid');
    const stats = document.querySelector('.dark-blueprint-grid');
    return {
      heroH: hero.getBoundingClientRect().height,
      gridH: grid.getBoundingClientRect().height,
      statsTop: stats.getBoundingClientRect().top
    };
  });

  console.log('Baseline measurements (with credit):', baseline);
  await browser.close();
}
testLayout();

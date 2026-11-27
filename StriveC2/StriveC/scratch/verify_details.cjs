const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function testDetails() {
  const browser = await chromium.launch({
    executablePath: '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    headless: true,
    args: ['--allow-file-access-from-files', '--disable-web-security']
  });

  const distDir = path.resolve('dist');
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const errors = [];
  page.on('console', msg => {
    // filter out external font 404s
    if (msg.type() === 'error' && !msg.text().includes('fonts.googleapis.com')) {
      errors.push(msg.text());
    }
  });

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

  await page.goto('file://' + path.join(distDir, 'index.html'), { waitUntil: 'load' });

  // 1. Preloader check
  const loaderCheck = await page.evaluate(() => {
    const overlay = document.getElementById('scLoaderOverlay');
    return {
      exists: overlay !== null,
      initialClass: overlay ? overlay.className : '',
      contentExists: document.getElementById('sc-loader-page') !== null
    };
  });
  console.log('Preloader check:', loaderCheck);

  // Wait for loader transition
  await page.waitForTimeout(2000);
  const loaderHidden = await page.evaluate(() => {
    const overlay = document.getElementById('scLoaderOverlay');
    return overlay ? (window.getComputedStyle(overlay).opacity === '0' || overlay.classList.contains('sc-loader-hidden') || window.getComputedStyle(overlay).display === 'none') : false;
  });
  console.log('Preloader dismissed after load:', loaderHidden);

  // 2. Grid matrix canvas check
  const canvasCheck = await page.evaluate(() => {
    const c = document.getElementById('sc-grid-matrix');
    return {
      exists: c !== null,
      width: c ? c.width : 0,
      height: c ? c.height : 0,
      position: c ? window.getComputedStyle(c).position : '',
      zIndex: c ? window.getComputedStyle(c).zIndex : ''
    };
  });
  console.log('Grid matrix canvas check:', canvasCheck);

  // 3. 5-Stage pedagogy tab switching check
  const stageCheck = await page.evaluate(async () => {
    const titleBefore = document.getElementById('stage-title') ? document.getElementById('stage-title').innerText.trim() : '';
    const tab3 = document.querySelector('[data-stage="3"]');
    if (tab3) tab3.click();
    await new Promise(r => setTimeout(r, 400));
    const titleAfter = document.getElementById('stage-title') ? document.getElementById('stage-title').innerText.trim() : '';
    const progressWidth = document.getElementById('stage-progress-bar') ? document.getElementById('stage-progress-bar').style.width : '';
    return { titleBefore, titleAfter, progressWidth };
  });
  console.log('5-Stage pedagogy tab switching check:', stageCheck);

  console.log('Internal console errors:', errors);
  await browser.close();
}

testDetails().catch(console.error);

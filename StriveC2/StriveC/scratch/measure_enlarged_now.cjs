const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

async function measure() {
  const browser = await chromium.launch({
    executablePath: '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    headless: true,
    args: ['--allow-file-access-from-files', '--disable-web-security']
  });
  const distDir = path.resolve('dist');

  for (const width of [1440, 1920]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
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

    const canvas = await page.waitForSelector('#sc-robot-canvas');
    const pngBuf = await canvas.screenshot({ omitBackground: true });
    const { data, info } = await sharp(pngBuf).raw().toBuffer({ resolveWithObject: true });

    // Isolate arm pixels by finding non-neutral background
    // Since canvas is rendered with clear color 0x000000, 0, but HTML background behind canvas might show,
    // canvas.screenshot({ omitBackground: true }) renders WebGL canvas directly.
    let minX = info.width, maxX = 0, minY = info.height, maxY = 0;
    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        const idx = (y * info.width + x) * info.channels;
        const a = data[idx + 3];
        if (a > 40) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    console.log(`Viewport ${width}px: Canvas ${info.width}x${info.height} | Model visual bbox: minX=${minX}, maxX=${maxX}, minY=${minY}, maxY=${maxY} | Visual size: ${maxX - minX}px x ${maxY - minY}px | Vertical ratio: ${(((maxY - minY) / info.height) * 100).toFixed(1)}%`);
    await page.close();
  }
  await browser.close();
}
measure();

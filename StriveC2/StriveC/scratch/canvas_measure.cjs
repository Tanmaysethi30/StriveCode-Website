const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

async function run() {
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

    await page.goto('file://' + path.join(distDir, 'aboutus/index.html'), { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);

    const canvasHandle = await page.waitForSelector('#sc-robot-canvas');
    const pngBuf = await canvasHandle.screenshot({ omitBackground: true });
    fs.writeFileSync(`scratch/canvas_${width}.png`, pngBuf);

    const { data, info } = await sharp(pngBuf).raw().toBuffer({ resolveWithObject: true });
    let minX = info.width, maxX = 0, minY = info.height, maxY = 0;
    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        const idx = (y * info.width + x) * info.channels;
        const a = data[idx + 3];
        if (a > 30) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    console.log(`Width ${width}px: Canvas ${info.width}x${info.height} | Model bbox: minX=${minX}, maxX=${maxX}, minY=${minY}, maxY=${maxY} | Model rendered size: ${maxX - minX}px x ${maxY - minY}px`);
    await page.close();
  }
  await browser.close();
}
run().catch(console.error);

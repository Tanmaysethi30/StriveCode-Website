const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

async function measureRobotRenderedSize() {
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
    await page.waitForTimeout(2000);

    const box = await page.evaluate(() => {
      const canvas = document.getElementById('sc-robot-canvas');
      return {
        canvasWidth: canvas.clientWidth,
        canvasHeight: canvas.clientHeight,
        rect: canvas.getBoundingClientRect()
      };
    });

    const canvas = await page.$('#sc-robot-canvas');
    const screenshot = await canvas.screenshot({ omitBackground: true });
    const { data, info } = await sharp(screenshot).raw().toBuffer({ resolveWithObject: true });

    let minX = info.width, maxX = 0, minY = info.height, maxY = 0;
    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        const idx = (y * info.width + x) * info.channels;
        const alpha = data[idx + 3];
        if (alpha > 40) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    console.log(`Width ${width}px:`);
    console.log(`  Canvas display size: ${box.canvasWidth}px x ${box.canvasHeight}px`);
    console.log(`  Rendered Model Bounding Box on Canvas: minX=${minX}, maxX=${maxX}, minY=${minY}, maxY=${maxY}`);
    console.log(`  Rendered Model Size: width=${maxX - minX}px, height=${maxY - minY}px`);
    console.log(`  Ratio of model height to canvas height: ${((maxY - minY) / box.canvasHeight * 100).toFixed(1)}%`);
    console.log(`  Ratio of model width to canvas width: ${((maxX - minX) / box.canvasWidth * 100).toFixed(1)}%`);

    await page.close();
  }
  await browser.close();
}
measureRobotRenderedSize().catch(console.error);

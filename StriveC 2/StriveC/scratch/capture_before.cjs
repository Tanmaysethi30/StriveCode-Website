const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2'
};

const origDir = path.resolve(__dirname, '..', 'originals_backup');
const distDir = path.resolve(__dirname, '..', 'dist');
const screenshotsDir = path.resolve(__dirname, '..', 'scratch', 'screenshots');

async function run() {
  const browser = await chromium.launch({
    executablePath: '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    headless: true,
    args: ['--allow-file-access-from-files', '--disable-web-security']
  });

  const viewports = [
    { name: 'desktop_1440', width: 1440, height: 900 },
    { name: 'wide_1920', width: 1920, height: 1080 },
    { name: 'mobile_390', width: 390, height: 844 }
  ];

  for (const vp of viewports) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });

    await page.route('**/*', async (route) => {
      const reqUrl = route.request().url();
      let relativePath = '';
      if (reqUrl.startsWith('file:///')) {
        const afterFile = reqUrl.replace('file://', '');
        if (afterFile.startsWith('/assets/') || afterFile.startsWith('/_astro/') || afterFile.endsWith('.css') || afterFile.endsWith('.js') || afterFile.endsWith('.png') || afterFile.endsWith('.jpg')) {
          relativePath = afterFile;
        }
      }
      if (relativePath) {
        let testPath = path.join(distDir, relativePath.startsWith('/') ? relativePath.slice(1) : relativePath);
        if (fs.existsSync(testPath) && fs.statSync(testPath).isFile()) {
          const ext = path.extname(testPath).toLowerCase();
          return route.fulfill({
            status: 200,
            contentType: MIME_TYPES[ext] || 'application/octet-stream',
            body: fs.readFileSync(testPath)
          });
        }
      }
      return route.continue();
    });

    const aboutOrigUrl = 'file://' + path.join(origDir, 'Aboutus.html');
    await page.goto(aboutOrigUrl, { waitUntil: 'load' });
    await page.waitForTimeout(500);

    const scrollHeight = await page.evaluate(() => document.body.scrollHeight);
    for (let y = 0; y < scrollHeight; y += 300) {
      await page.evaluate(top => window.scrollTo(0, top), y);
      await page.waitForTimeout(40);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);

    const fullPagePath = path.join(screenshotsDir, `aboutus-before-${vp.name}.png`);
    await page.screenshot({ path: fullPagePath, fullPage: true });
    console.log(`Saved before screenshot: ${fullPagePath}`);

    await page.close();
  }

  await browser.close();
  console.log('Before screenshots captured successfully!');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});

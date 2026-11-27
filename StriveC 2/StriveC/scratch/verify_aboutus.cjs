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

const distDir = path.resolve(__dirname, '..', 'dist');
const screenshotsDir = path.resolve(__dirname, '..', 'scratch', 'screenshots');
if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });

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

  const results = {
    imageLoads: {},
    consoleErrors: [],
    pageErrors: [],
    domChecks: {},
    screenshots: []
  };

  for (const vp of viewports) {
    console.log(`\nTesting viewport: ${vp.name} (${vp.width}x${vp.height})`);
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });

    page.on('console', msg => {
      if (msg.type() === 'error') {
        results.consoleErrors.push({ viewport: vp.name, text: msg.text() });
      }
    });
    page.on('pageerror', err => {
      results.pageErrors.push({ viewport: vp.name, text: err.message });
    });

    // Intercept requests so absolute root paths resolve correctly from dist/
    await page.route('**/*', async (route) => {
      const reqUrl = route.request().url();
      let relativePath = '';
      
      if (reqUrl.startsWith('file:///')) {
        const afterFile = reqUrl.replace('file://', '');
        if (afterFile.startsWith('/assets/') || afterFile.startsWith('/_astro/') || afterFile.endsWith('.css') || afterFile.endsWith('.js') || afterFile.endsWith('.png') || afterFile.endsWith('.jpg')) {
          relativePath = afterFile;
        }
      } else if (reqUrl.startsWith('http://') || reqUrl.startsWith('https://')) {
        const u = new URL(reqUrl);
        relativePath = u.pathname;
      }

      if (relativePath) {
        // Strip leading slash if needed
        let testPath = path.join(distDir, relativePath.startsWith('/') ? relativePath.slice(1) : relativePath);
        if (fs.existsSync(testPath) && fs.statSync(testPath).isFile()) {
          const ext = path.extname(testPath).toLowerCase();
          const body = fs.readFileSync(testPath);
          if (relativePath.includes('/assets/members/')) {
            const basename = path.basename(relativePath);
            results.imageLoads[basename] = {
              status: 200,
              ok: true,
              sizeBytes: body.length,
              contentType: MIME_TYPES[ext] || 'application/octet-stream'
            };
          }
          return route.fulfill({
            status: 200,
            contentType: MIME_TYPES[ext] || 'application/octet-stream',
            body: body
          });
        }
      }
      return route.continue();
    });

    const aboutUrl = 'file://' + path.join(distDir, 'aboutus', 'index.html');
    await page.goto(aboutUrl, { waitUntil: 'load' });
    await page.waitForTimeout(500);

    // Scroll through the page in steps so reveal animations finish
    const scrollHeight = await page.evaluate(() => document.body.scrollHeight);
    for (let y = 0; y < scrollHeight; y += 300) {
      await page.evaluate(top => window.scrollTo(0, top), y);
      await page.waitForTimeout(50);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);

    if (vp.name === 'desktop_1440') {
      results.domChecks = await page.evaluate(() => {
        const targets = ['Nitin Jain', 'Shivam Jain', 'Harsh Jain'];
        const data = {};
        for (const name of targets) {
          const img = document.querySelector(`img[alt="${name}"]`);
          if (!img) {
            data[name] = { found: false };
            continue;
          }
          const rect = img.getBoundingClientRect();
          const card = img.closest('.team-card') || img.closest('.relative.overflow-hidden');
          data[name] = {
            found: true,
            src: img.getAttribute('src'),
            currentSrc: img.currentSrc,
            complete: img.complete,
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight,
            naturalRatio: (img.naturalWidth / img.naturalHeight).toFixed(4),
            renderedWidth: rect.width.toFixed(1),
            renderedHeight: rect.height.toFixed(1),
            renderedRatio: (rect.width / rect.height).toFixed(4),
            isRevealed: card ? card.classList.contains('is-revealed') : null
          };
        }
        return data;
      });

      // Capture close-ups of each card
      const nitinCard = await page.$('div.relative.overflow-hidden.rounded-3xl');
      if (nitinCard) {
        await nitinCard.screenshot({ path: path.join(screenshotsDir, 'card-nitin-jain.png') });
        console.log('Saved card screenshot: card-nitin-jain.png');
      }

      const teamGrid = await page.$('.team-gallery');
      if (teamGrid) {
        await teamGrid.screenshot({ path: path.join(screenshotsDir, 'team-gallery-grid.png') });
        console.log('Saved card screenshot: team-gallery-grid.png');
      }

      const shivamImg = await page.$('img[alt="Shivam Jain"]');
      if (shivamImg) {
        const card = await shivamImg.evaluateHandle(el => el.closest('.team-card'));
        if (card) {
          await card.asElement().screenshot({ path: path.join(screenshotsDir, 'card-shivam-jain.png') });
          console.log('Saved card screenshot: card-shivam-jain.png');
        }
      }

      const harshImg = await page.$('img[alt="Harsh Jain"]');
      if (harshImg) {
        const card = await harshImg.evaluateHandle(el => el.closest('.team-card'));
        if (card) {
          await card.asElement().screenshot({ path: path.join(screenshotsDir, 'card-harsh-jain.png') });
          console.log('Saved card screenshot: card-harsh-jain.png');
        }
      }
    }

    // Capture full-page screenshot
    const fullPagePath = path.join(screenshotsDir, `aboutus-after-${vp.name}.png`);
    await page.screenshot({ path: fullPagePath, fullPage: true });
    results.screenshots.push(fullPagePath);
    console.log(`Saved full page screenshot: ${fullPagePath}`);

    await page.close();
  }

  await browser.close();

  fs.writeFileSync(path.join(__dirname, '..', 'scratch', 'test_results.json'), JSON.stringify(results, null, 2));
  console.log('\n--- VERIFICATION RESULTS ---');
  console.log(JSON.stringify(results, null, 2));
}

run().catch(err => {
  console.error('Test run failed:', err);
  process.exit(1);
});

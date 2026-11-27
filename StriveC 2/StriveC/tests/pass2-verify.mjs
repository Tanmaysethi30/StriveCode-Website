import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import http from 'http';
import { chromium } from 'playwright';

const BASELINE_DIR = path.resolve('../strivecode-baseline');
const BASELINE_SCREENSHOTS = path.join(BASELINE_DIR, 'screenshots');
const POST_CLEANUP_SCREENSHOTS = path.join(BASELINE_DIR, 'screenshots_post_cleanup');

if (!fs.existsSync(POST_CLEANUP_SCREENSHOTS)) {
  fs.mkdirSync(POST_CLEANUP_SCREENSHOTS, { recursive: true });
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function createStaticServer(baseDir, port) {
  const server = http.createServer((req, res) => {
    let reqPath = decodeURI(req.url.split('?')[0]);
    if (reqPath.endsWith('/')) {
      reqPath += 'index.html';
    }
    let filePath = path.join(baseDir, reqPath);
    if (!fs.existsSync(filePath) && fs.existsSync(filePath + '.html')) {
      filePath += '.html';
    } else if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      const notFoundPath = path.join(baseDir, '404.html');
      if (fs.existsSync(notFoundPath)) {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(fs.readFileSync(notFoundPath));
        return;
      }
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(fs.readFileSync(filePath));
  });

  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => {
      resolve(server);
    });
  });
}

async function verifyAll() {
  console.log('--- Pass 2 Comprehensive Verification ---');
  const port = 4326;
  const server = await createStaticServer(path.resolve('dist'), port);

  const browser = await chromium.launch({
    executablePath: '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const routes = [
    { route: '/', name: 'home' },
    { route: '/product', name: 'product' },
    { route: '/services', name: 'services' },
    { route: '/courses', name: 'courses' },
    { route: '/careers', name: 'careers' },
    { route: '/mentorship', name: 'mentorship' },
    { route: '/aboutus', name: 'aboutus' },
    { route: '/contact', name: 'contact' },
    { route: '/404', name: '404' }
  ];

  const results = {
    routesTested: {},
    assetsChecked: {},
    linksChecked: {},
    screenshotComparisons: {}
  };

  try {
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1440, height: 900 });

    const failedRequests = [];
    const consoleErrors = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('requestfailed', req => {
      failedRequests.push({ url: req.url(), failure: req.failure() ? req.failure().errorText : 'failed' });
    });

    for (const r of routes) {
      console.log(`\nTesting Route: ${r.route}`);
      const resp = await page.goto(`http://127.0.0.1:${port}${r.route}`, { waitUntil: 'networkidle' });
      const status = resp ? resp.status() : 0;

      if (r.route === '/') {
        await page.waitForTimeout(2500); // Wait for loader
      } else {
        await page.waitForTimeout(500);
      }

      // Collect links & assets on page
      const pageAssets = await page.evaluate(() => {
        const scripts = Array.from(document.querySelectorAll('script[src]')).map(s => s.getAttribute('src'));
        const stylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map(l => l.getAttribute('href'));
        const images = Array.from(document.querySelectorAll('img[src]')).map(i => i.getAttribute('src'));
        const internalLinks = Array.from(document.querySelectorAll('a[href]'))
          .map(a => a.getAttribute('href'))
          .filter(h => h && !h.startsWith('http') && !h.startsWith('#') && !h.startsWith('mailto:') && !h.startsWith('tel:'));

        return { scripts, stylesheets, images, internalLinks };
      });

      console.log(`  Route status: ${status}`);
      console.log(`  Scripts (${pageAssets.scripts.length}):`, pageAssets.scripts);
      console.log(`  Stylesheets (${pageAssets.stylesheets.length}):`, pageAssets.stylesheets);
      console.log(`  Images count: ${pageAssets.images.length}`);
      console.log(`  Internal links count: ${pageAssets.internalLinks.length}`);

      results.routesTested[r.route] = {
        status,
        scriptCount: pageAssets.scripts.length,
        stylesheetCount: pageAssets.stylesheets.length,
        imageCount: pageAssets.images.length,
        internalLinkCount: pageAssets.internalLinks.length
      };

      // Capture screenshot
      const newScreenshotPath = path.join(POST_CLEANUP_SCREENSHOTS, `post_cleanup_${r.name}_1440_full.png`);
      await page.screenshot({ path: newScreenshotPath, fullPage: true });

      // Compare with baseline screenshot
      const baselinePath = path.join(BASELINE_SCREENSHOTS, `baseline_${r.name}_1440_full.png`);
      if (fs.existsSync(baselinePath)) {
        const baseBuf = fs.readFileSync(baselinePath);
        const newBuf = fs.readFileSync(newScreenshotPath);
        const baseHash = crypto.createHash('sha256').update(baseBuf).digest('hex');
        const newHash = crypto.createHash('sha256').update(newBuf).digest('hex');
        const match = baseHash === newHash;
        console.log(`  Screenshot check for ${r.name}: Byte-identical? ${match} (Base: ${baseBuf.length}B, New: ${newBuf.length}B)`);
        results.screenshotComparisons[r.name] = { match, baseLength: baseBuf.length, newLength: newBuf.length };
      }
    }

    console.log('\n--- Link & Asset HTTP 200 Verification ---');
    // Test fetching all internal links and static assets directly via http
    const allInternalUrls = new Set([
      '/',
      '/product',
      '/services',
      '/courses',
      '/careers',
      '/mentorship',
      '/aboutus',
      '/contact',
      '/404',
      '/logo.jpg',
      '/main.js',
      '/grid-matrix.js',
      '/apply-modal.js',
      '/apply-modal.css',
      '/mentorship-dots.js',
      '/mentorship-dots.css',
      '/mentorship-logo.css',
      '/mentorship-logo.jpg',
      '/mentorship-logo.png',
      '/nav.css',
      '/style.css',
      '/robots.txt',
      '/sitemap.xml',
      '/_headers'
    ]);

    for (const urlPath of allInternalUrls) {
      const checkRes = await new Promise((resolve) => {
        http.get(`http://127.0.0.1:${port}${urlPath}`, (res) => {
          resolve({ status: res.statusCode, contentType: res.headers['content-type'] });
        }).on('error', (err) => resolve({ status: 'ERR', error: err.message }));
      });

      console.log(`  Asset ${urlPath.padEnd(25)} -> Status: ${checkRes.status}`);
      results.assetsChecked[urlPath] = checkRes;
    }

    console.log('\nVerification Summary:');
    console.log(`Total internal assets verified: ${allInternalUrls.size}`);
    console.log(`Console errors during browser navigation: ${consoleErrors.length}`);
    console.log(`Network request failures: ${failedRequests.length}`);

    fs.writeFileSync(path.join(BASELINE_DIR, 'verification-report.json'), JSON.stringify(results, null, 2), 'utf8');

  } finally {
    await browser.close();
    server.close();
  }
}

verifyAll().then(() => {
  console.log('\n✓ Pass 2 Comprehensive Verification Finished Successfully.');
}).catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});

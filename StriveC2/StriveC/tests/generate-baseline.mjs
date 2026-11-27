import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import http from 'http';
import { chromium } from 'playwright';

const BASELINE_DIR = path.resolve('../strivecode-baseline');
const SCREENSHOTS_DIR = path.join(BASELINE_DIR, 'screenshots');

if (!fs.existsSync(BASELINE_DIR)) fs.mkdirSync(BASELINE_DIR, { recursive: true });
if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

function walk(dir, baseDir = '') {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const full = path.join(dir, file);
    const rel = path.join(baseDir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      results = results.concat(walk(full, rel));
    } else {
      results.push({ full, rel, size: stat.size });
    }
  });
  return results;
}

const distFiles = walk('dist').sort((a, b) => a.rel.localeCompare(b.rel));
const hashLines = [];

for (const f of distFiles) {
  const content = fs.readFileSync(f.full);
  const hash = crypto.createHash('sha256').update(content).digest('hex');
  hashLines.push(`${hash}  ${f.rel} (${f.size} bytes)`);
}

const hashFilePath = path.join(BASELINE_DIR, 'dist-hashes.txt');
fs.writeFileSync(hashFilePath, hashLines.join('\n') + '\n', 'utf8');
console.log(`Generated baseline hashes for ${distFiles.length} files in dist/ -> ${hashFilePath}`);

// Static server for screenshots
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

async function captureScreenshots() {
  const port = 4325;
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

  try {
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1440, height: 900 });

    for (const r of routes) {
      console.log(`Capturing baseline screenshot for route: ${r.route}`);
      await page.goto(`http://127.0.0.1:${port}${r.route}`, { waitUntil: 'networkidle' });
      if (r.route === '/') {
        await page.waitForTimeout(2500); // wait for preloader exit
      } else {
        await page.waitForTimeout(500);
      }
      const screenshotPath = path.join(SCREENSHOTS_DIR, `baseline_${r.name}_1440_full.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`Saved screenshot -> ${screenshotPath}`);
    }
  } finally {
    await browser.close();
    server.close();
  }
}

captureScreenshots().then(() => {
  console.log('Baseline generation successfully completed.');
}).catch(err => {
  console.error('Baseline generation failed:', err);
  process.exit(1);
});

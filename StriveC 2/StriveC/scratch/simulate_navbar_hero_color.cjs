const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function simulate() {
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
  await page.waitForTimeout(1000);

  // Apply ONLY background-color: #041562 and border-color: transparent on header
  await page.evaluate(() => {
    const header = document.querySelector('header');
    header.style.backgroundColor = '#041562';
    header.style.borderBottomColor = 'transparent';
    header.style.boxShadow = 'none';
  });

  const artifactDir = '/Users/avinesh_shukla/.gemini/antigravity/brain/0bb5ff4e-72a2-4bd0-b97c-6cc433440f57';

  // Screenshot navbar and hero top
  await page.screenshot({
    path: path.join(artifactDir, 'navbar_contrast_issue_1440.png'),
    clip: { x: 0, y: 0, width: 1440, height: 260 }
  });

  // Also zoom in on the logo and nav links
  const header = await page.$('header');
  await header.screenshot({
    path: path.join(artifactDir, 'navbar_only_contrast_issue.png')
  });

  console.log('Saved screenshots demonstrating contrast issue');
  await browser.close();
}

simulate().catch(console.error);

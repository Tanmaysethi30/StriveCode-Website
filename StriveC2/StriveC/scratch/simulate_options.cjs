const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function simulateOptions() {
  const browser = await chromium.launch({
    executablePath: '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    headless: true,
    args: ['--allow-file-access-from-files', '--disable-web-security']
  });

  const distDir = path.resolve('dist');
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.route('**/*', async (route) => {
    const u = route.request().url();
    if (u.includes('googleusercontent.com')) {
      return route.fulfill({
        status: 200,
        contentType: 'image/jpeg',
        body: fs.readFileSync(path.resolve('public/logo.jpg'))
      });
    }
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

  // Apply Option 1: White text + hero navy background
  await page.evaluate(() => {
    const header = document.querySelector('header');
    header.style.backgroundColor = '#041562';
    header.style.borderBottomColor = 'transparent';
    header.style.boxShadow = 'none';

    // Text to white
    const title = header.querySelector('.font-display');
    if (title) title.style.color = '#ffffff';

    const sub = header.querySelector('.font-mono');
    if (sub) sub.style.color = 'rgba(255, 255, 255, 0.6)';

    const links = header.querySelectorAll('nav a:not([data-apply-modal])');
    links.forEach(l => {
      if (l.innerText.trim() === 'Mentorship') {
        l.style.color = '#ffffff';
      } else {
        l.style.color = 'rgba(255, 255, 255, 0.8)';
      }
    });

    const menuBtn = document.getElementById('mobile-menu-toggle');
    if (menuBtn) menuBtn.style.color = '#ffffff';
  });

  const artifactDir = '/Users/avinesh_shukla/.gemini/antigravity/brain/0bb5ff4e-72a2-4bd0-b97c-6cc433440f57';

  await page.screenshot({
    path: path.join(artifactDir, 'navbar_option1_white_text_1440.png'),
    clip: { x: 0, y: 0, width: 1440, height: 260 }
  });

  const header = await page.$('header');
  await header.screenshot({
    path: path.join(artifactDir, 'navbar_only_option1_white_text.png')
  });

  console.log('Saved option 1 screenshots');
  await browser.close();
}

simulateOptions().catch(console.error);

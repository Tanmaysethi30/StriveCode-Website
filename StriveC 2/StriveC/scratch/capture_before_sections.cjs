const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function captureBefore() {
  const browser = await chromium.launch({
    executablePath: '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    headless: true,
    args: ['--allow-file-access-from-files', '--disable-web-security']
  });

  const distDir = path.resolve('dist');
  const widths = [1920, 1440, 1024, 768, 390];

  for (const w of widths) {
    const page = await browser.newPage({ viewport: { width: w, height: 900 } });
    
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
    // Hide loader if present
    await page.evaluate(() => {
      const loader = document.getElementById('sc-preloader');
      if (loader) loader.style.display = 'none';
    });
    await page.waitForTimeout(1000);

    // Scroll to reveal elements
    await page.evaluate(async () => {
      window.scrollTo(0, document.body.scrollHeight / 3);
      await new Promise(r => setTimeout(r, 400));
      window.scrollTo(0, (document.body.scrollHeight / 3) * 2);
      await new Promise(r => setTimeout(r, 400));
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(500);

    // Capture #course
    const course = await page.$('#course');
    if (course) {
      await course.screenshot({ path: `scratch/before_course_${w}.png` });
    }

    // Capture #programs
    const programs = await page.$('#programs');
    if (programs) {
      await programs.screenshot({ path: `scratch/before_programs_${w}.png` });
    }

    console.log(`Captured before screenshots for width ${w}`);
    await page.close();
  }

  await browser.close();
  console.log('All before screenshots captured successfully.');
}

captureBefore().catch(console.error);

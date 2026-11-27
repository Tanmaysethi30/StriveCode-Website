const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

async function diagnose() {
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

  // 1. Diagnose Navbar Elements, computed styles, position
  const navDiagnosis = await page.evaluate(() => {
    const header = document.querySelector('header');
    const headerStyle = window.getComputedStyle(header);
    const rect = header.getBoundingClientRect();
    const hero = document.getElementById('heroSection');
    const heroStyle = window.getComputedStyle(hero);
    const heroRect = hero ? hero.getBoundingClientRect() : null;

    return {
      headerTag: header.tagName,
      position: headerStyle.position,
      top: headerStyle.top,
      zIndex: headerStyle.zIndex,
      backgroundColor: headerStyle.backgroundColor,
      boxShadow: headerStyle.boxShadow,
      borderBottom: `${headerStyle.borderBottomWidth} ${headerStyle.borderBottomStyle} ${headerStyle.borderBottomColor}`,
      backdropFilter: headerStyle.backdropFilter || headerStyle.webkitBackdropFilter,
      height: rect.height,
      heroTop: heroRect ? heroRect.top : null,
      heroHeight: heroRect ? heroRect.height : null,
      heroBgColor: heroStyle.backgroundColor
    };
  });
  console.log('--- NAVBAR DIAGNOSIS ---');
  console.log(navDiagnosis);

  // Take screenshot of hero top edge
  const heroEl = await page.$('#heroSection');
  const heroScreenshot = await heroEl.screenshot();
  const { data, info } = await sharp(heroScreenshot).raw().toBuffer({ resolveWithObject: true });

  console.log(`\n--- HERO SCREENSHOT INFO: ${info.width}x${info.height} channels: ${info.channels} ---`);
  
  // Sample pixels across width at y = 0, y = 5, y = 10
  for (const y of [0, 2, 5, 10]) {
    const samples = [];
    for (let x = 0; x < info.width; x += 100) {
      const idx = (y * info.width + x) * info.channels;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      samples.push({ x, rgb: `rgb(${r},${g},${b})`, hex: `#${((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1)}` });
    }
    console.log(`Samples at y=${y}:`);
    console.log(samples.map(s => `x=${s.x}: ${s.hex}`).join(', '));
  }

  // 2. Contrast Check
  // What are the colors of elements in Navbar?
  const navElements = await page.evaluate(() => {
    const header = document.querySelector('header');
    const links = Array.from(header.querySelectorAll('nav a'));
    const logoTitle = header.querySelector('.font-display');
    const logoSub = header.querySelector('.font-mono');
    const applyBtn = header.querySelector('[data-apply-modal]');
    const logoImg = header.querySelector('img');

    return {
      logoTitleColor: logoTitle ? window.getComputedStyle(logoTitle).color : null,
      logoSubColor: logoSub ? window.getComputedStyle(logoSub).color : null,
      links: links.map(l => ({ text: l.innerText.trim(), color: window.getComputedStyle(l).color })),
      applyBtnBg: applyBtn ? window.getComputedStyle(applyBtn).backgroundColor : null,
      applyBtnColor: applyBtn ? window.getComputedStyle(applyBtn).color : null,
      logoImgSrc: logoImg ? logoImg.src : null
    };
  });
  console.log('\n--- NAVBAR ELEMENTS COLORS ---');
  console.log(navElements);

  await browser.close();
}

diagnose().catch(console.error);

const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({
    executablePath: '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    headless: true,
    args: ['--allow-file-access-from-files', '--disable-web-security']
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('file://' + path.resolve('dist/index.html'), { waitUntil: 'load' });
  await page.evaluate(() => {
    const o = document.getElementById('scLoaderOverlay');
    if (o) o.style.display = 'none';
  });

  const applyBtn = await page.$('a[href="#apply"]');
  if (applyBtn) {
    await applyBtn.click();
    await page.waitForTimeout(300);
    const modalVisible = await page.evaluate(() => {
      const modal = document.getElementById('sc-apply-modal');
      return modal ? (!modal.classList.contains('hidden') && window.getComputedStyle(modal).display !== 'none') : false;
    });
    console.log('Apply modal opened after clicking #apply link:', modalVisible);
  } else {
    console.log('No a[href="#apply"] button found');
  }
  await browser.close();
})();

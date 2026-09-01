const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1300, height: 900 } });
  await page.goto('file://' + path.resolve(__dirname, '..', 'loop.html'));
  await page.waitForTimeout(600);
  await page.evaluate(() => demos['demo0'].next());
  await page.waitForTimeout(200);
  await (await page.$('#demo0 .demo-card')).screenshot({ path: 'C:/tmp/verify_start.png' });
  await browser.close();
})();

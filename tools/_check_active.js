const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('file://' + path.resolve(__dirname, '..', 'datatype.html'));
  await page.waitForTimeout(400);
  const out = await page.evaluate(() => {
    const d = demos['demo0'];
    const res = [];
    for (let i = 0; i < 4; i++) {
      d.next();
      const active = document.querySelector('#demo0-code .code-line.active');
      res.push({
        step: i,
        info: d.config.steps[i].info,
        highlighted: active ? active.querySelector('.ln').textContent + ': ' + active.querySelector('.code').textContent.trim() : '(无)'
      });
    }
    return res;
  });
  console.log(JSON.stringify(out, null, 2));
  await browser.close();
})();

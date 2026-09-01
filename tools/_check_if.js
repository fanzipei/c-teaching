// 检查所有 demo：代码中的 if/else if 行是否有对应步骤高亮（条件求值不应被跳过）
const { chromium } = require('playwright');
const path = require('path');
const PAGES = ['intro.html','datatype.html','condition.html','loop.html','function.html','array.html','pointer.html','struct.html'];
(async () => {
  const browser = await chromium.launch();
  for (const p of PAGES) {
    const page = await browser.newPage();
    await page.goto('file://' + path.resolve(__dirname, '..', p));
    await page.waitForTimeout(400);
    const rows = await page.evaluate(() => {
      const out = [];
      for (const d of Object.values(demos)) {
        const code = (d.config.code || '').trim().split('\n');
        const usedLines = new Set(d.config.steps.map(s => s.line));
        code.forEach((text, i) => {
          const t = text.trim();
          if (/^(if|else if|}\s*else if)\s*\(/.test(t) && !usedLines.has(i)) {
            out.push(`${d.config.id} 第${i + 1}行从未高亮: ${t.slice(0, 50)}`);
          }
        });
      }
      return out;
    });
    if (rows.length) console.log(`=== ${p} ===\n` + rows.join('\n'));
    await page.close();
  }
  await browser.close();
})();

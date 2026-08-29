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
        const codeLines = (d.config.code || '').trim().split('\n');
        d.config.steps.forEach((s, k) => {
          if (s.line === undefined) return;
          const text = (codeLines[s.line] || '<<<超出范围>>>').trim();
          // 只在可疑时输出：info 提到 main 但行内没有 main；或 info 说"程序结束"但行不是 return/}
          const info = s.info || '';
          const suspicious =
            (/main\(\) 开始/.test(info) && !/main/.test(text)) ||
            (/程序结束/.test(info) && !/return|^\}/.test(text));
          if (suspicious) out.push(`${d.config.id} step${k} line=${s.line} | ${text} | ${info}`);
        });
      }
      return out;
    });
    console.log(`=== ${p} ===`);
    console.log(rows.length ? rows.join('\n') : '（无明显错位）');
    await page.close();
  }
  await browser.close();
})();

// 全站步骤行号对齐审计：step.line 是 0-based，应对应代码中该步描述的语句
const { chromium } = require('playwright');
const path = require('path');
const PAGES = ['intro.html','datatype.html','condition.html','loop.html','function.html','array.html','pointer.html','struct.html'];
(async () => {
  const browser = await chromium.launch();
  let totalFlag = 0;
  for (const p of PAGES) {
    const page = await browser.newPage();
    await page.goto('file://' + path.resolve(__dirname, '..', p));
    await page.waitForTimeout(400);
    const rows = await page.evaluate(() => {
      const out = [];
      for (const d of Object.values(demos)) {
        const code = (d.config.code || '').trim().split('\n');
        const total = code.length;
        d.config.steps.forEach((s, k) => {
          if (s.line === undefined) return;
          const text = (code[s.line] || '').trim();
          const info = s.info || '';
          const flags = [];
          if (/main\(\) 开始/.test(info) && !/\bmain\b/.test(text)) flags.push('main不在main行');
          if (/程序结束|函数结束|返回主函数/.test(info) && !/return|^\}|main/.test(text)) flags.push('结束不在return/}行');
          if (s.output !== undefined && !/printf|puts|putchar|cout/.test(text)) flags.push('输出不在printf行');
          if (s.vars) {
            for (const name of Object.keys(s.vars)) {
              if (name === 'ret' && /scanf/.test(text)) continue;
              if (!new RegExp('\\b' + name + '\\b').test(text)) { flags.push(`变量${name}不在该行`); break; }
            }
          }
          if (s.line >= total) flags.push('行号越界');
          if (flags.length) out.push(`${d.config.id} step${k} line=${s.line} | ${text.slice(0,40)} | ${flags.join(',')}`);
        });
      }
      return out;
    });
    totalFlag += rows.length;
    console.log(`=== ${p} (${rows.length} 处可疑) ===`);
    console.log(rows.join('\n') || '（无）');
    await page.close();
  }
  await browser.close();
  console.log(`\n共 ${totalFlag} 处可疑`);
})();

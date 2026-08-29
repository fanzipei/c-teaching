// 移动端横向溢出体检：390px 视口加载所有页面，报告溢出与 JS 错误
// 用法：node tools/check_mobile.js   （在 c-teaching-web 目录下运行）
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const pages = ['index.html', 'intro.html', 'datatype.html', 'condition.html',
    'loop.html', 'function.html', 'array.html', 'pointer.html', 'struct.html'];
  let bad = 0;
  for (const p of pages) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = [];
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
    await page.goto('file://' + path.resolve(__dirname, '..', p));
    await page.waitForTimeout(800);
    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      const res = { scrollW: doc.scrollWidth, clientW: doc.clientWidth, wide: [] };
      if (doc.scrollWidth > doc.clientWidth + 2) {
        document.querySelectorAll('*').forEach(el => {
          const r = el.getBoundingClientRect();
          if (r.width > doc.clientWidth + 2 && res.wide.length < 6) {
            const cls = (typeof el.className === 'string' ? el.className : '').split(' ')[0];
            res.wide.push(el.tagName + (cls ? '.' + cls : '') + ' w=' + Math.round(r.width));
          }
        });
      }
      return res;
    });
    const ok = overflow.scrollW <= overflow.clientW + 2 && errors.length === 0;
    if (!ok) bad++;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${p}  scrollW=${overflow.scrollW} clientW=${overflow.clientW}` +
      (overflow.wide.length ? `  超宽: ${overflow.wide.join(' | ')}` : '') +
      (errors.length ? `  JS错误: ${errors.join(' ; ')}` : ''));
    await page.close();
  }
  await browser.close();
  process.exit(bad ? 1 : 0);
})();

// 移动端横向溢出体检：390px 视口加载所有页面，报告溢出与 JS 错误
// 用法：node tools/check_mobile.js   （在 c-teaching-web 目录下运行）
const { chromium } = require('playwright');
const path = require('path');
const CHAPTERS = require('../site-config');

(async () => {
  const browser = await chromium.launch();
  const pages = ['index.html', ...CHAPTERS.map(chapter => chapter.page)];
  let bad = 0;
  for (const p of pages) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = [];
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
    await page.goto('file://' + path.resolve(__dirname, '..', p));
    await page.waitForSelector('.site-nav .nav-links', { state: 'attached' });
    const audit = await page.evaluate(() => {
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
      const smallButtons = [...document.querySelectorAll('.btn, .nav-toggle')]
        .filter(el => {
          const style = getComputedStyle(el);
          return style.display !== 'none' && style.visibility !== 'hidden' && el.getBoundingClientRect().height < 43;
        })
        .slice(0, 6)
        .map(el => `${el.textContent.trim()} h=${Math.round(el.getBoundingClientRect().height)}`);
      const code = document.querySelector('.code-area');
      return { ...res, smallButtons, codeFont: code ? parseFloat(getComputedStyle(code).fontSize) : null };
    });
    const ok = audit.scrollW <= audit.clientW + 2 && audit.smallButtons.length === 0 &&
      (audit.codeFont === null || audit.codeFont >= 14) && errors.length === 0;
    if (!ok) bad++;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${p}  scrollW=${audit.scrollW} clientW=${audit.clientW}` +
      (audit.codeFont ? ` code=${audit.codeFont}px` : '') +
      (audit.wide.length ? `  超宽: ${audit.wide.join(' | ')}` : '') +
      (audit.smallButtons.length ? `  触控高度不足: ${audit.smallButtons.join(' | ')}` : '') +
      (errors.length ? `  JS错误: ${errors.join(' ; ')}` : ''));
    await page.close();
  }
  await browser.close();
  process.exit(bad ? 1 : 0);
})();

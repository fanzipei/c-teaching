// 基础无障碍回归：地标、当前页、控件名称、动态播报、重复 id 与章节导航。
const { chromium } = require('playwright');
const path = require('path');
const CHAPTERS = require('../site-config');

const pages = ['index.html', ...CHAPTERS.map(chapter => chapter.page)];

(async () => {
  const browser = await chromium.launch();
  let failures = 0;

  for (const pageName of pages) {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('file://' + path.resolve(__dirname, '..', pageName));
    await page.waitForSelector('.site-nav');

    const result = await page.evaluate(() => {
      const controlName = element => {
        if (element.getAttribute('aria-label') || element.getAttribute('aria-labelledby')) return true;
        if (element.id && document.querySelector(`label[for="${element.id}"]`)) return true;
        return false;
      };
      const unnamed = [...document.querySelectorAll('input, textarea, select')]
        .filter(element => element.type !== 'hidden' && !controlName(element))
        .map(element => `${element.tagName.toLowerCase()}#${element.id || '(无id)'}`);
      const ids = [...document.querySelectorAll('[id]')].map(element => element.id);
      const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
      const headings = [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')]
        .map(element => ({ level: Number(element.tagName.slice(1)), text: element.textContent.trim() }));
      const headingJumps = headings.slice(1)
        .filter((heading, index) => heading.level > headings[index].level + 1)
        .map(heading => `${heading.level}:${heading.text}`);
      const feedbackLink = document.querySelector('.nav-feedback');
      return {
        main: document.querySelectorAll('main#main-content').length,
        h1: document.querySelectorAll('h1').length,
        skipLink: Boolean(document.querySelector('.skip-link[href="#main-content"]')),
        currentPage: document.querySelectorAll('.site-nav [aria-current="page"]').length,
        liveRegions: document.querySelectorAll('[aria-live]').length,
        quickNav: Boolean(document.querySelector('.demo-quicknav[aria-label]')),
        chapterFooter: Boolean(document.querySelector('.chapter-footer-nav[aria-label]')),
        feedback: feedbackLink ? {
          href: feedbackLink.href,
          target: feedbackLink.target,
          rel: feedbackLink.rel,
          name: feedbackLink.getAttribute('aria-label') || feedbackLink.textContent.trim()
        } : null,
        unnamed,
        duplicateIds,
        headingJumps
      };
    });

    const isChapter = pageName !== 'index.html';
    const feedbackOk = result.feedback &&
      result.feedback.href.startsWith('https://github.com/fanzipei/c-teaching/issues/new?') &&
      result.feedback.target === '_blank' && result.feedback.rel.includes('noopener') &&
      result.feedback.name.includes('反馈');
    const ok = errors.length === 0 && result.main === 1 && result.h1 === 1 && result.skipLink &&
      result.currentPage === 1 && feedbackOk && result.unnamed.length === 0 && result.duplicateIds.length === 0 &&
      result.headingJumps.length === 0 &&
      (!isChapter || (result.liveRegions > 0 && result.quickNav && result.chapterFooter));
    if (!ok) failures++;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${pageName}  main=${result.main} h1=${result.h1}` +
      ` 当前页=${result.currentPage} 反馈=${feedbackOk} live=${result.liveRegions} 快速导航=${result.quickNav} 章末导航=${result.chapterFooter}` +
      (result.unnamed.length ? ` 未命名控件=[${result.unnamed.join(', ')}]` : '') +
      (result.duplicateIds.length ? ` 重复id=[${result.duplicateIds.join(', ')}]` : '') +
      (result.headingJumps.length ? ` 标题跳级=[${result.headingJumps.join(', ')}]` : '') +
      (errors.length ? ` JS错误=[${errors.join(' ; ')}]` : ''));
    await page.close();
  }

  await browser.close();
  process.exit(failures ? 1 : 0);
})();

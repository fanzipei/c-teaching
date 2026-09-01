// 全站回归：加载所有页面、跑完每个 demo、判完每道练习题、收集 JS 错误；验证进度持久化与首页进度徽章
// 用法：node tools/regression.js（在 c-teaching-web 目录下运行）
const { chromium } = require('playwright');
const path = require('path');

const PAGES = ['intro.html', 'datatype.html', 'condition.html', 'loop.html',
  'function.html', 'array.html', 'pointer.html', 'struct.html'];

(async () => {
  const browser = await chromium.launch();
  let failures = 0;

  // 1) 每个页面：加载 → 跑完所有 demo → 练习题判题（错答案必须判错、参考答案必须判对、提交后卡片完成）→ 刷新后标记仍在
  for (const p of PAGES) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
    await page.goto('file://' + path.resolve(__dirname, '..', p));
    await page.waitForTimeout(500);

    const result = await page.evaluate(() => {
      const out = { demos: 0, completedAfterRun: 0, notDone: [],
        quizzes: 0, quizWrongRejected: 0, quizRightAccepted: 0, quizNotDone: [] };
      for (const d of Object.values(demos)) {
        out.demos++;
        let guard = 0;
        while (d.currentStep < d.config.steps.length - 1 && guard++ < 2000) d.next();
        if (d.container.querySelector('.demo-card').classList.contains('completed')) {
          out.completedAfterRun++;
        } else {
          out.notDone.push(d.config.id);
        }
      }
      for (const q of Object.values(quizzes)) {
        out.quizzes++;
        const wrong = q.cfg.type === 'predict' ? '___肯定不对___' : q.cfg.code;
        const right = q.cfg.type === 'predict' ? q.cfg.answer : (q.cfg.accept || [])[0];
        if (!q.judge(wrong)) out.quizWrongRejected++;
        if (right !== undefined && q.judge(right)) out.quizRightAccepted++;
        const input = document.getElementById(q.id + (q.cfg.type === 'predict' ? '-answer' : '-editor'));
        input.value = right;
        q.submit();
        if (!q.container.querySelector('.quiz-card').classList.contains('completed')) {
          out.quizNotDone.push(q.id);
        }
      }
      return out;
    });

    // 刷新后完成标记应保持（localStorage 持久化）
    await page.reload();
    await page.waitForTimeout(500);
    const persisted = await page.evaluate(() =>
      Object.values(demos).filter(d =>
        d.container.querySelector('.demo-card').classList.contains('completed')).length +
      Object.values(quizzes).filter(q =>
        q.container.querySelector('.quiz-card').classList.contains('completed')).length);

    const expectTotal = result.demos + result.quizzes;
    const ok = errors.length === 0 && result.demos > 0 &&
      result.completedAfterRun === result.demos &&
      result.quizWrongRejected === result.quizzes &&
      result.quizRightAccepted === result.quizzes &&
      result.quizNotDone.length === 0 &&
      persisted === expectTotal;
    if (!ok) failures++;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${p}  demos=${result.demos} 跑完标记=${result.completedAfterRun}` +
      ` 练习=${result.quizzes} 判错=${result.quizWrongRejected} 判对=${result.quizRightAccepted} 刷新后保留=${persisted}/${expectTotal}` +
      (result.notDone.length ? `  未标记: ${result.notDone.join(',')}` : '') +
      (result.quizNotDone.length ? `  练习未完成: ${result.quizNotDone.join(',')}` : '') +
      (errors.length ? `  JS错误: ${errors.join(' ; ')}` : ''));
    await ctx.close();
  }

  // 2) 首页：导航注入 + 预置完成记录后显示进度徽章
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  await page.evaluate(() => {
    for (let i = 0; i < 11; i++) localStorage.setItem('cteaching:done:loop.html:demo' + i, '1');
    for (let i = 0; i < 6; i++) localStorage.setItem('cteaching:done:loop.html:quiz' + i, '1');
    localStorage.setItem('cteaching:done:struct.html:demo0', '1');
  });
  await page.reload();
  await page.waitForTimeout(500);
  const navCount = await page.evaluate(() => document.querySelectorAll('nav .nav-links a').length);
  const badges = await page.evaluate(() =>
    [...document.querySelectorAll('.topic-progress')].map(b => b.textContent));
  const indexOk = navCount === 9 && badges.includes('✓ 已全部完成') && badges.includes('已完成 1 / 16') && errors.length === 0;
  if (!indexOk) failures++;
  console.log(`${indexOk ? 'PASS' : 'FAIL'} index.html  导航链接=${navCount} 徽章=[${badges.join(' | ')}]` +
    (errors.length ? `  JS错误: ${errors.join(' ; ')}` : ''));
  await ctx.close();

  await browser.close();
  console.log(failures ? `\n共 ${failures} 项失败` : '\n全部通过');
  process.exit(failures ? 1 : 0);
})();

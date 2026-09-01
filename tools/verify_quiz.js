// 练习题答案全站校验：提取每页 quizzes 配置，用 gcc 实际编译运行来核对
//   - predict 题：代码必须编译通过，且实际 stdout 与配置的 answer（或 accept 备选）一致
//   - fix 题：accept 参考改法必须全部编译通过并能正常运行
// 用法：node tools/verify_quiz.js（在 c-teaching-web 目录下运行，需要 PATH 中有 gcc）
const { chromium } = require('playwright');
const { execFileSync, execFile } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { promisify } = require('util');
const execFileP = promisify(execFile);
const CHAPTERS = require('../site-config');

const PAGES = CHAPTERS.map(chapter => chapter.page);

// 与 demo-engine.js 中 normQuizOutput 保持一致
function normOutput(s) {
  return String(s).replace(/\r/g, '').split('\n')
    .map(l => l.replace(/[ \t]+$/g, '')).join('\n').replace(/\n+$/g, '');
}

async function compileAndRun(code, name, workdir) {
  const src = path.join(workdir, name + '.c');
  const exe = path.join(workdir, name + (process.platform === 'win32' ? '.exe' : ''));
  fs.writeFileSync(src, code, 'utf8');
  try {
    execFileSync('gcc', ['-std=c90', '-o', exe, src], { stdio: 'pipe' });
  } catch (e) {
    const detail = e.stderr && e.stderr.length ? e.stderr : e.message;
    return { ok: false, stage: 'compile', detail: String(detail || 'gcc 未返回错误信息').slice(0, 300) };
  }
  try {
    const { stdout } = await execFileP(exe, [], { timeout: 5000, maxBuffer: 1024 * 1024 });
    return { ok: true, stdout };
  } catch (e) {
    return { ok: false, stage: 'run', detail: String(e.message).slice(0, 300) };
  }
}

(async () => {
  const workdir = fs.mkdtempSync(path.join(os.tmpdir(), 'quizverify-'));
  const browser = await chromium.launch();
  const page = await browser.newPage();
  let failures = 0, checked = 0;

  for (const p of PAGES) {
    await page.goto('file://' + path.resolve(__dirname, '..', p));
    await page.waitForTimeout(400);
    const quizCfgs = await page.evaluate(() =>
      Object.entries(quizzes).map(([id, q]) => ({
        id, type: q.cfg.type, code: q.cfg.code, answer: q.cfg.answer, accept: q.cfg.accept || []
      })));

    for (const q of quizCfgs) {
      const tag = `${p}:${q.id}`;
      if (q.type === 'predict') {
        checked++;
        const r = await compileAndRun(q.code, tag.replace(/[:.]/g, '_'), workdir);
        if (!r.ok) {
          failures++;
          console.log(`FAIL ${tag}  题目代码${r.stage === 'compile' ? '编译失败' : '运行失败'}: ${r.detail}`);
          continue;
        }
        const accepted = [q.answer, ...q.accept].map(normOutput);
        if (!accepted.includes(normOutput(r.stdout))) {
          failures++;
          console.log(`FAIL ${tag}  答案不符\n  实际: ${JSON.stringify(normOutput(r.stdout))}\n  配置: ${JSON.stringify(normOutput(q.answer))}`);
        }
      } else {
        if (!q.accept.length) { failures++; console.log(`FAIL ${tag}  改错题缺少 accept 参考答案`); continue; }
        for (let k = 0; k < q.accept.length; k++) {
          checked++;
          const r = await compileAndRun(q.accept[k], `${tag}_${k}`.replace(/[:.]/g, '_'), workdir);
          if (!r.ok) {
            failures++;
            console.log(`FAIL ${tag}  accept[${k}] ${r.stage === 'compile' ? '编译失败' : '运行失败'}: ${r.detail}`);
          }
        }
      }
    }
    console.log(`${p}: ${quizCfgs.length} 道题检查完毕`);
  }

  await browser.close();
  fs.rmSync(workdir, { recursive: true, force: true });
  console.log(failures ? `\n共 ${failures} 项失败` : `\n全部通过（${checked} 项校验）`);
  process.exit(failures ? 1 : 0);
})();

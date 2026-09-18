// Statement execution, visualization snapshots, rewind, live input, and actual C stdout.
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const { createHash } = require('crypto');
const assert = require('assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'cteaching-steps-'));
  let checked = 0, compiled = 0;
  const env = { ...process.env };
  if (process.platform === 'win32') {
    const gcc = execFileSync('where.exe', ['gcc'], { encoding: 'utf8' }).trim().split(/\r?\n/)[0];
    env.PATH = path.dirname(gcc) + path.delimiter + env.PATH;
  }
  try {
    const page = await browser.newPage();
    for (const chapter of require('../site-config')) {
      await page.goto('file://' + path.resolve(__dirname, '..', chapter.page));
      const result = await page.evaluate(() => {
        const failures = [], programs = [];
        for (const [id, d] of Object.entries(demos)) {
          const key = location.pathname.split('/').pop() + ':' + id;
          if (!window.CTeachingTraceSources[key]) continue;
          d.updateLineHighlight = function () {
            const lines = this.container.querySelectorAll('.code-line');
            lines.forEach(el => el.classList.remove('active'));
            if (this.currentStep >= 0) document.getElementById(`${id}-line-${this.config.steps[this.currentStep].line}`).classList.add('active');
          };
          for (let i = 0; i < d.config.steps.length; i++) {
            const before = JSON.stringify(d.snapshot());
            d.next();
            const after = JSON.stringify(d.snapshot()), s = d.config.steps[i];
            if (JSON.stringify(d.variables) !== JSON.stringify(s.vars)) failures.push(`${id}:${i} variables`);
            if (!document.getElementById(`${id}-line-${s.line}`).classList.contains('active')) failures.push(`${id}:${i} highlight`);
            if (s.array && Object.keys(d.arrays).length !== s.array.length) failures.push(`${id}:${i} stale arrays`);
            if (s.matrix && Object.keys(d.matrices).length !== s.matrix.length) failures.push(`${id}:${i} stale matrices`);
            if (s.flow) {
              const active = [...d.container.querySelectorAll('.flow-node.active')].map(n => n.dataset.node);
              if (JSON.stringify(active) !== JSON.stringify(s.flow.node ? [s.flow.node] : [])) failures.push(`${id}:${i} flow node`);
              if (document.getElementById(`${id}-flow-current`).textContent !== s.flow.detail) failures.push(`${id}:${i} flow operation`);
            }
            if (i > 0) {
              d.prev();
              if (JSON.stringify(d.snapshot()) !== before) failures.push(`${id}:${i} rewind`);
              d.next();
              if (JSON.stringify(d.snapshot()) !== after) failures.push(`${id}:${i} replay`);
            }
          }
          programs.push({ id, code: d.config.code, hash: CTeachingTraceSources[key], output: d.output.join('\n') });
        }
        return { failures, programs };
      });
      assert.deepEqual(result.failures, [], chapter.page);
      for (const program of result.programs) {
        assert.equal(createHash('sha256').update(program.code).digest('hex'), program.hash, 'stale trace: ' + chapter.page + ':' + program.id);
        const source = path.join(temp, 'sample.c');
        const exe = path.join(temp, process.platform === 'win32' ? 'sample.exe' : 'sample');
        fs.writeFileSync(source, program.code);
        execFileSync('gcc', ['-std=gnu11', '-O0', '-w', source, '-o', exe], { env, stdio: 'pipe' });
        const output = execFileSync(exe, { cwd: temp, env, encoding: 'utf8', timeout: 5000 }).replace(/\r/g, '');
        assert.equal(program.output, output, 'C stdout: ' + chapter.page + ':' + program.id);
        compiled++;
      }
      checked += chapter.demo;
      console.log(`PASS ${chapter.page}: ${result.programs.length} traces, compiler output, visualization, rewind`);
    }

    // Regression for the reported examples: copying must not advance i/j early.
    await page.goto('file://' + path.resolve(__dirname, '..', 'array1.html'));
    const arrayChecks = await page.evaluate(() => {
      const concat = demos.demo5.config.steps;
      const copies = concat.filter(s => s.line === 8);
      const incrementsI = concat.filter(s => s.line === 9);
      const incrementsJ = concat.filter(s => s.line === 10);
      const search = demos.demo7.config.steps;
      return {
        i: copies.map(s => s.vars.i.value), j: copies.map(s => s.vars.j.value),
        incI: incrementsI.map(s => s.vars.i.value), incJ: incrementsJ.map(s => s.vars.j.value),
        declarations: search.filter(s => [5, 6].includes(s.line)).every(s => s.phase === 'declaration'),
        found: search.some(s => s.line === 9 && s.vars.found.value === 1),
        outerConditions: search.filter(s => s.line === 8 && s.phase === 'condition').length,
        breaks: search.filter(s => s.phase === 'statement' && s.info.includes('break')).length
      };
    });
    assert.deepEqual(arrayChecks, { i: [5,6,7,8,9], j: [0,1,2,3,4], incI: [6,7,8,9,10], incJ: [1,2,3,4,5], declarations: true, found: true, outerConditions: 7, breaks: 7 });

    await page.goto('file://' + path.resolve(__dirname, '..', 'intro.html'));
    for (const [id, input, expected] of [['demo3', '100 100 100', '100.0'], ['demo4', '30', '继续努力'], ['demo4', '90', '及格啦']]) {
      const output = await page.evaluate(({id,input}) => {
        const d = demos[id]; d.reset();
        while (d.currentStep < d.config.input.step - 1) d.next();
        d.next(); document.getElementById(id + '-input').value = input; d.submitInput();
        while (d.currentStep < d.config.steps.length - 1) d.next();
        return d.output.join('\n');
      }, {id,input});
      assert.ok(output.includes(expected), id + ' input');
    }
    await page.goto('file://' + path.resolve(__dirname, '..', 'datatype.html'));
    for (const input of ['18 92.5 B', '18 nope', 'nope']) {
      const state = await page.evaluate(input => {
        createDemo('demo4', makeScanfDemo(input));
        const d = demos.demo4;
        while (d.currentStep < d.config.steps.length - 1) d.next();
        return { output: d.output.join('\n'), lines: d.config.steps.map(s => s.line) };
      }, input);
      assert.ok(state.lines.includes(9));
      assert.ok(state.lines.includes(input === '18 92.5 B' ? 10 : 12));
      assert.ok(state.output.includes(input === '18 92.5 B' ? 'ret=3' : 'input error'));
    }
    console.log(`PASS ${checked} demos audited; ${compiled} compiled traces + 3 live input demos; reported array regressions`);
  } finally {
    await browser.close(); fs.rmSync(temp, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

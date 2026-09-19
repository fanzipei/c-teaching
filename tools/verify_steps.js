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

    await page.goto('file://' + path.resolve(__dirname, '..', 'pointer2.html'));
    const pointerChecks = await page.evaluate(() => {
      function at(id, source, phase = 'statement') {
        const cfg = demos[id].config;
        const found = cfg.steps.find(s => cfg.code.split('\n')[s.line].trim() === source && s.phase === phase);
        if (!found) throw Error('Missing statement: ' + source);
        return found;
      }
      const chars = at('demo6', "fixed[1] = 'e';");
      const returned = at('demo7', 'int *p = make_value(value);', 'declaration');
      const released = at('demo7', 'free(p);');
      const cleared = at('demo7', 'p = NULL;');
      const resuming = at('demo7', 'int *p = make_value(value);', 'resume');
      const rebound = at('demo6', 'literal = "dog";');
      const copied = at('demo8', 'p = target;');
      const owner = at('demo8', '*pp = target;');
      const caller = copied.pointer.find(p => p.name === 'main[0].p');
      const callee = copied.pointer.find(p => p.name === 'p');
      const mainPointer = owner.pointer.find(p => p.name === 'p');
      return {
        buffer: chars.array.find(a => a.name === 'buffer').cells.map(c => c.val),
        shared: ['p', 'fixed', 'view'].every(name => chars.pointer.find(p => p.name === name).targetValue === 'b'),
        literal: chars.pointer.find(p => p.name === 'literal').targetValue,
        pointerAddress: chars.vars.literal.value === chars.pointer.find(p => p.name === 'literal').value,
        stack: returned.stack.map(s => s.name),
        heapValue: returned.array.find(a => a.name === 'p（堆）').cells[0].val,
        heapPresent: returned.memory.some(m => m.storage.startsWith('堆')),
        heapBetweenFrames: resuming.memory.some(m => m.storage.startsWith('堆')),
        literalSurvives: rebound.memory.some(m => m.name === '字符串字面量' && m.val === 'cat\\0'),
        constTarget: chars.pointer.find(p => p.name === 'fixed').targetType,
        aliases: chars.array.find(a => a.name === 'buffer').markers.find(m => m.index === 0).label,
        rowType: demos.demo0.config.steps.flatMap(s => s.pointer || []).at(-1).targetType,
        released: released.memory.every(m => !m.storage.startsWith('堆')) && released.array.length === 0 && released.vars.p.value === '失效指针',
        cleared: cleared.pointer.find(p => p.name === 'p').value,
        copied: caller.addr !== callee.addr && caller.value !== callee.value && caller.targetName === 'a' && callee.targetName === 'b',
        owner: owner.pointer.find(p => p.name === 'pp').targetAddr === mainPointer.addr && mainPointer.targetName === 'b'
      };
    });
    assert.deepEqual(pointerChecks, { buffer: ['b','e','t','\\0'], shared: true, literal: 'c', pointerAddress: true,
      stack: ['main'], heapValue: 7, heapPresent: true, heapBetweenFrames: true, literalSurvives: true, constTarget: 'char',
      aliases: 'p / fixed / view', rowType: 'int[3]', released: true, cleared: 'NULL', copied: true, owner: true });
    console.log('PASS pointer semantics: string aliases, const access, heap lifetime, pointer parameter copies');

    await page.goto('file://' + path.resolve(__dirname, '..', 'intro.html'));
    for (const input of ['1', '5', '10', '100', '0', '101', 'abc']) {
      const state = await page.evaluate(input => {
        const d = demos.demo5; d.reset();
        while (d.currentStep < d.config.input.step - 1) d.next();
        d.next();
        document.getElementById('demo5-input').value = input;
        d.submitInput();
        while (d.currentStep < d.config.steps.length - 1) {
          const before = JSON.stringify(d.snapshot());
          d.next();
          const after = JSON.stringify(d.snapshot());
          d.prev();
          if (JSON.stringify(d.snapshot()) !== before) throw Error('sum rewind');
          d.next();
          if (JSON.stringify(d.snapshot()) !== after) throw Error('sum replay');
        }
        return { code: d.config.code, output: d.output.join('\n'), vars: d.variables,
          additions: d.config.steps.filter(s => s.line === 12).map(s => s.vars.sum.value),
          checks: d.config.steps.filter(s => s.line === 11 && s.info.startsWith('判断')).length,
          increments: d.config.steps.filter(s => s.line === 11 && s.info.startsWith('执行 i++')).length };
      }, input);
      const n = Number(input), valid = Number.isInteger(n) && n >= 1 && n <= 100;
      if (valid) {
        assert.equal(state.additions.length, n);
        assert.equal(state.checks, n + 1);
        assert.equal(state.increments, n);
        assert.equal(state.vars.sum.value, n * (n + 1) / 2);
        assert.equal(state.vars.i.value, n + 1);
        state.additions.forEach((sum, i) => assert.equal(sum, (i + 1) * (i + 2) / 2));
      } else {
        assert.equal(state.additions.length, 0);
        assert.ok(state.output.includes('请输入1~100的整数'));
      }
      const source = path.join(temp, 'sum.c'), exe = path.join(temp, process.platform === 'win32' ? 'sum.exe' : 'sum');
      fs.writeFileSync(source, state.code);
      execFileSync('gcc', ['-std=c90', source, '-o', exe], { env });
      const run = require('child_process').spawnSync(exe, [], { input: input + '\n', encoding: 'utf8', cwd: temp, env });
      assert.equal(run.status, valid ? 0 : 1);
      assert.equal(state.output.replace(input + '\n', ''), run.stdout.replace(/\r/g, ''), 'sum C output');
    }
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
    console.log(`PASS ${checked} demos audited; ${compiled} compiled traces + 4 live input demos; array regressions and interactive sums`);
  } finally {
    await browser.close(); fs.rmSync(temp, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

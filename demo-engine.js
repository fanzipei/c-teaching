/* ============================================================
   C语言教学演示引擎（增强版）
   - 单步/自动播放/回退
   - 进度条与步骤计数
   - 播放速度调节
   - 代码一键复制
   - 键盘快捷键
   - 公共导航栏注入
   ============================================================ */

const CHAPTERS = window.CTEACHING_CHAPTERS || [];
const PLAY_SPEEDS = Object.freeze({
  1: { interval: 2500, label: '慢速' },
  2: { interval: 1800, label: '较慢' },
  3: { interval: 1200, label: '正常' },
  4: { interval: 700, label: '较快' },
  5: { interval: 300, label: '快速' }
});
const NAV_HTML = `
  <a class="logo" href="index.html" aria-label="C语言教学演示首页">C语言<span>教学演示</span></a>
  <button class="nav-toggle" type="button" aria-label="切换导航" aria-controls="site-nav-links" aria-expanded="false">☰</button>
  <div class="nav-links" id="site-nav-links">
    <a href="index.html">首页</a>
    ${CHAPTERS.map(chapter => `<a href="${chapter.page}">${chapter.shortTitle || chapter.title}</a>`).join('')}
  </div>
`;

// 公共导航栏：自动高亮当前页面，并支持移动端折叠
(function injectNav() {
  function init() {
    const nav = document.querySelector('nav');
    if (!nav || nav.dataset.enhanced) return;
    nav.dataset.enhanced = 'true';
    nav.classList.add('site-nav');
    if (!document.querySelector('.skip-link')) {
      const skip = document.createElement('a');
      skip.className = 'skip-link';
      skip.href = '#main-content';
      skip.textContent = '跳到主要内容';
      document.body.insertBefore(skip, nav);
    }
    nav.innerHTML = NAV_HTML;

    const current = location.pathname.split('/').pop() || 'index.html';
    nav.querySelectorAll('.nav-links a').forEach(a => {
      if (a.getAttribute('href') === current) {
        a.classList.add('active');
        a.setAttribute('aria-current', 'page');
      }
    });

    const toggle = nav.querySelector('.nav-toggle');
    const links = nav.querySelector('.nav-links');
    if (toggle && links) {
      toggle.addEventListener('click', () => {
        const expanded = links.classList.toggle('open');
        toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        toggle.textContent = expanded ? '✕' : '☰';
      });
      // 点击导航链接后自动收起（移动端）
      links.querySelectorAll('a').forEach(a => {
        a.addEventListener('click', () => {
          links.classList.remove('open');
          toggle.setAttribute('aria-expanded', 'false');
          toggle.textContent = '☰';
        });
      });
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

// C 代码单行语法高亮（全局函数：Demo 代码区与练习题共用）
function highlightCLine(rawLine) {
  const line = rawLine.replace(/</g, '\x00LT\x00').replace(/>/g, '\x00GT\x00');
  const spans = [];
  const add = (regex, cls) => {
    let m;
    regex.lastIndex = 0;
    while ((m = regex.exec(line)) !== null) {
      spans.push({ start: m.index, end: m.index + m[0].length, cls });
      if (m.index === regex.lastIndex) regex.lastIndex++;
    }
  };
  add(/"([^"]*)"/g, 'st');
  add(/'(\\?.)'/g, 'st');
  add(/(\/\/.*$)/gm, 'cm');
  add(/#\w+/g, 'kw');                            // 预处理指令：#include、#define 等
  add(/\x00LT\x00[\w.]+\x00GT\x00/g, 'st');     // 头文件名：<stdio.h>（<> 已被转义占位）
  add(/\b(printf|scanf|malloc|free|sizeof|strcpy|strlen|strcmp|strcat|memset|memcpy|gets|puts)\b/g, 'fn');
  add(/\b(int|float|double|char|void|if|else|for|while|do|return|break|continue|switch|case|default|struct|typedef|const|static|extern|signed|unsigned|long|short|auto|register)\b/g, 'kw');
  add(/\b(NULL|true|false|EOF)\b/g, 'kw');
  add(/\b(int|float|double|char|void|struct)\b(?=\s+\*?\w)/g, 'ty');
  add(/\b(\d+\.?\d*)\b/g, 'nu');
  add(/(\+\+|--|==|!=|<=|>=|&&|\|\||->|!|[=+\-*/%&|<>])/g, 'op');

  spans.sort((a, b) => a.start - b.start || b.end - a.end);
  const merged = [];
  for (const s of spans) {
    if (merged.length && s.start < merged[merged.length - 1].end) continue;
    merged.push(s);
  }

  let result = '';
  let pos = 0;
  for (const s of merged) {
    result += line.slice(pos, s.start);
    result += `<span class="${s.cls}">${line.slice(s.start, s.end)}</span>`;
    pos = s.end;
  }
  result += line.slice(pos);
  return result.replace(/\x00LT\x00/g, '&lt;').replace(/\x00GT\x00/g, '&gt;');
}

class CDemo {
  constructor(containerId, config) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error('CDemo: container not found', containerId);
      return;
    }
    this.config = config;
    this.currentStep = -1;
    this.isPlaying = false;
    this.playTimer = null;
    this.playSpeedLevel = 3;
    this.playInterval = PLAY_SPEEDS[this.playSpeedLevel].interval;
    this.variables = {};
    this.output = [];
    this.history = [];           // 保存每一步前的完整状态，用于回退
    this.lastMemory = null;
    this.lastStack = null;
    this.lastArray = null;
    this.lastPointer = null;
    this.lastStruct = null;
    this.lastBranch = null;
    this.lastLoop = null;
    this.lastFlowchart = null;
    this.flowVisited = [];
    this.arrays = {};          // 命名数组集合：name -> {cells, markers}
    this.matrices = {};        // 二维数组集合：name -> {rows, cols, cells}
    this.lastLinkedList = null;
    this.graphState = null;      // 图/调用树渲染状态：{nodes, edges}
    this.lastHanoi = null;
    this.lastInfo = '点击"运行"、"下一步"或"上一步"开始演示';
    this.inputCollected = false;   // config.input：是否已收集到用户输入
    this.inputWaiting = false;     // 是否正停在输入步骤等待用户输入
    this.resumeAfterInput = false; // 输入完成后是否恢复自动播放
    this.render();
    this.reset();
    this.bindKeys();
  }

  render() {
    const c = this.config;
    this.container.innerHTML = `<div class="demo-card" role="region" aria-labelledby="${c.id}-title">
      <div class="demo-header">
        <div>
          <h3 id="${c.id}-title">${c.title}</h3>
          <span style="color:var(--text-secondary);font-size:0.85rem">${c.subtitle || ''}</span>
        </div>
      </div>
      ${c.diagram ? `<div class="demo-diagram">${c.diagram}</div>` : ''}
      <div class="demo-toolbar">
        <div class="step-counter" id="${c.id}-counter">步骤 0 / ${c.steps.length}</div>
        <div class="progress-bar" id="${c.id}-progressbar" role="progressbar" aria-label="${c.title}演示进度" aria-valuemin="0" aria-valuemax="${c.steps.length}" aria-valuenow="0"><div id="${c.id}-progress" class="progress-fill" style="width:0%"></div></div>
        <div class="speed-control" title="向右调节，自动播放会更快">
          <label for="${c.id}-speed">播放速度</label>
          <span class="speed-end" aria-hidden="true">慢</span>
          <input type="range" id="${c.id}-speed" min="1" max="5" step="1" value="${this.playSpeedLevel}" aria-valuetext="正常，每步 1.2 秒" aria-describedby="${c.id}-speed-value">
          <span class="speed-end" aria-hidden="true">快</span>
          <output class="speed-value" id="${c.id}-speed-value" for="${c.id}-speed">正常</output>
        </div>
        <button class="btn btn-copy" type="button" onclick="demos['${c.id}'].copyCode()">复制代码</button>
        <div class="shortcut-hint">←/→ 单步 · 空格 播放/暂停 · Home 重置</div>
      </div>
      <div class="demo-body">
        <div class="code-panel">
          <div class="code-area" id="${c.id}-code" role="region" aria-label="${c.title}示例代码"></div>
          <div class="controls" role="group" aria-label="${c.title}演示控制">
            <button class="btn btn-secondary" type="button" onclick="demos['${c.id}'].prev()" id="${c.id}-btn-prev">⏮ 上一步</button>
            <button class="btn btn-primary" type="button" onclick="demos['${c.id}'].play()" id="${c.id}-btn-play">▶ 运行</button>
            <button class="btn btn-secondary" type="button" onclick="demos['${c.id}'].next()" id="${c.id}-btn-next">⏭ 下一步</button>
            <button class="btn btn-secondary" type="button" onclick="demos['${c.id}'].reset()">&#x21bb; 重置</button>
          </div>
          <div class="step-info" id="${c.id}-info" role="status" aria-live="polite" aria-atomic="true">${this.lastInfo}</div>
        </div>
        <div class="viz-panel" id="${c.id}-viz"></div>
      </div>
    </div>`;
    this.renderCode();
    this.renderViz();
    if (this.config.input) {
      const inp = document.getElementById(`${this.config.id}-input`);
      if (inp) inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') this.submitInput(); });
    }
    const speed = document.getElementById(`${this.config.id}-speed`);
    if (speed) {
      speed.addEventListener('input', () => this.setSpeed(speed.value));
    }
  }

  renderCode() {
    const codeEl = document.getElementById(`${this.config.id}-code`);
    const rawCode = this.config.code || '';
    const lines = rawCode.trim().split('\n');
    codeEl.innerHTML = lines.map((line, i) => {
      return `<div class="code-line" id="${this.config.id}-line-${i}" aria-label="第 ${i + 1} 行"><span class="ln" aria-hidden="true">${i + 1}</span><span class="code">${highlightCLine(line)}</span></div>`;
    }).join('');
  }

  renderViz() {
    const vizEl = document.getElementById(`${this.config.id}-viz`);
    const parts = [];
    const types = this.config.vizTypes;
    const id = this.config.id;
    if (types.includes('flowchart')) parts.push(`<div class="viz-box"><h4>程序流程图</h4><div class="flowchart-viz" id="${id}-flowchart"></div></div>`);
    if (types.includes('vars')) parts.push(`<div class="viz-box"><h4>变量状态</h4><div class="var-table" id="${id}-vars"></div></div>`);
    if (types.includes('memory')) parts.push(`<div class="viz-box"><h4>内存视图</h4><div class="memory-view" id="${id}-memory"></div></div>`);
    if (types.includes('stack')) parts.push(`<div class="viz-box"><h4>调用栈</h4><div class="stack-frame" id="${id}-stack"></div></div>`);
    if (types.includes('console')) parts.push(`<div class="viz-box"><h4>输出</h4><div class="console" id="${id}-console"><span class="console-prompt">$ </span></div>${this.config.input ? `<div class="demo-input-row" id="${id}-input-row"><span class="console-prompt" aria-hidden="true">›</span><label class="sr-only" for="${id}-input">${this.config.title}程序输入</label><input class="demo-input" id="${id}-input" type="text" placeholder="${this.config.input.placeholder || ''}" autocomplete="off" spellcheck="false"></div>` : ''}</div>`);
    if (types.includes('array')) parts.push(`<div class="viz-box"><h4>数组</h4><div class="array-panel" id="${id}-array"></div></div>`);
    if (types.includes('matrix')) parts.push(`<div class="viz-box"><h4>二维数组</h4><div class="matrix-panel" id="${id}-matrix"></div></div>`);
    if (types.includes('pointer')) parts.push(`<div class="viz-box"><h4>指针关系</h4><div class="pointer-viz" id="${id}-pointer"></div></div>`);
    if (types.includes('struct')) parts.push(`<div class="viz-box"><h4>结构体</h4><div id="${id}-struct"></div></div>`);
    if (types.includes('linkedlist')) parts.push(`<div class="viz-box"><h4>链表</h4><div class="linkedlist-viz" id="${id}-linkedlist"></div></div>`);
    if (types.includes('graph')) parts.push(`<div class="viz-box"><h4>${this.config.graphTitle || '图（邻接关系）'}</h4><div class="graph-viz" id="${id}-graph"></div></div>`);
    if (types.includes('hanoi')) parts.push(`<div class="viz-box"><h4>汉诺塔</h4><div class="hanoi-viz" id="${id}-hanoi"></div></div>`);
    if (types.includes('branch')) parts.push(`<div class="viz-box"><h4>执行分支</h4><div class="branch-viz" id="${id}-branch"></div></div>`);
    if (types.includes('loop')) parts.push(`<div class="viz-box"><h4>迭代过程</h4><div id="${id}-loop"></div></div>`);
    vizEl.innerHTML = parts.join('');
  }

  snapshot() {
    return {
      currentStep: this.currentStep,
      variables: JSON.parse(JSON.stringify(this.variables)),
      output: [...this.output],
      memory: this.lastMemory,
      stack: this.lastStack,
      array: this.lastArray,
      pointer: this.lastPointer,
      struct: this.lastStruct,
      branch: this.lastBranch,
      loop: this.lastLoop,
      flowchart: this.lastFlowchart,
      flowVisited: [...this.flowVisited],
      arrays: JSON.parse(JSON.stringify(this.arrays)),
      matrices: JSON.parse(JSON.stringify(this.matrices)),
      linkedlist: this.lastLinkedList,
      graphState: JSON.parse(JSON.stringify(this.graphState)),
      hanoi: this.lastHanoi,
      info: this.lastInfo
    };
  }

  restore(state) {
    this.currentStep = state.currentStep;
    this.variables = JSON.parse(JSON.stringify(state.variables));
    this.output = [...state.output];
    this.lastMemory = state.memory;
    this.lastStack = state.stack;
    this.lastArray = state.array;
    this.lastPointer = state.pointer;
    this.lastStruct = state.struct;
    this.lastBranch = state.branch;
    this.lastLoop = state.loop;
    this.lastFlowchart = state.flowchart;
    this.flowVisited = [...(state.flowVisited || [])];
    this.arrays = JSON.parse(JSON.stringify(state.arrays || {}));
    this.matrices = JSON.parse(JSON.stringify(state.matrices || {}));
    this.lastLinkedList = state.linkedlist !== undefined ? state.linkedlist : null;
    this.graphState = state.graphState !== undefined ? JSON.parse(JSON.stringify(state.graphState)) : null;
    this.lastHanoi = state.hanoi !== undefined ? state.hanoi : null;
    this.lastInfo = state.info;

    const id = this.config.id;
    const lines = this.container.querySelectorAll('.code-line');
    lines.forEach(l => {
      l.classList.remove('active');
      l.removeAttribute('aria-current');
    });

    if (this.config.vizTypes.includes('vars')) this.renderVars();
    if (this.config.vizTypes.includes('console')) this.renderConsole();
    if (this.config.vizTypes.includes('memory')) this.renderMemory(this.lastMemory || []);
    if (this.config.vizTypes.includes('stack')) this.renderStack(this.lastStack || []);
    if (this.config.vizTypes.includes('array')) this.renderArray();
    if (this.config.vizTypes.includes('matrix')) this.renderMatrix();
    if (this.config.vizTypes.includes('pointer')) this.renderPointer(this.lastPointer || []);
    if (this.config.vizTypes.includes('struct')) this.renderStruct(this.lastStruct || []);
    if (this.config.vizTypes.includes('branch')) this.renderBranch(this.lastBranch || []);
    if (this.config.vizTypes.includes('loop')) this.renderLoop(this.lastLoop || []);
    if (this.config.vizTypes.includes('flowchart')) this.updateFlowchart(this.lastFlowchart);
    if (this.config.vizTypes.includes('linkedlist')) this.renderLinkedList(this.lastLinkedList || []);
    if (this.config.vizTypes.includes('graph')) this.renderGraph();
    if (this.config.vizTypes.includes('hanoi')) this.renderHanoi(this.lastHanoi || []);
    document.getElementById(`${id}-info`).textContent = this.lastInfo;
    this.updateProgress();
    this.updateLineHighlight();
  }

  reset() {
    this.currentStep = -1;
    this.isPlaying = false;
    this.variables = {};
    this.output = [];
    this.history = [this.snapshot()];
    this.lastMemory = null;
    this.lastStack = null;
    this.lastArray = null;
    this.lastPointer = null;
    this.lastStruct = null;
    this.lastBranch = null;
    this.lastLoop = null;
    this.lastFlowchart = null;
    this.flowVisited = [];
    this.arrays = {};
    this.matrices = {};
    this.lastLinkedList = null;
    this.graphState = null;
    this.lastHanoi = null;
    this.lastInfo = '点击"运行"、"下一步"或"上一步"开始演示';
    if (this.playTimer) clearInterval(this.playTimer);
    this.inputCollected = false;
    this.cancelInputWait();
    const inpEl = document.getElementById(`${this.config.id}-input`);
    if (inpEl) inpEl.value = '';

    const lines = this.container.querySelectorAll('.code-line');
    lines.forEach(l => {
      l.classList.remove('active');
      l.removeAttribute('aria-current');
    });

    const id = this.config.id;
    if (this.config.vizTypes.includes('vars')) document.getElementById(`${id}-vars`).innerHTML = '<span style="color:var(--comment);font-size:0.85rem">暂无变量</span>';
    if (this.config.vizTypes.includes('console')) document.getElementById(`${id}-console`).innerHTML = '<span class="console-prompt">$ </span>';
    if (this.config.vizTypes.includes('memory')) document.getElementById(`${id}-memory`).innerHTML = '<span style="color:var(--comment);font-size:0.85rem">内存未初始化</span>';
    if (this.config.vizTypes.includes('stack')) document.getElementById(`${id}-stack`).innerHTML = '<span style="color:var(--comment);font-size:0.85rem">栈为空</span>';
    if (this.config.vizTypes.includes('array')) document.getElementById(`${id}-array`).innerHTML = '';
    if (this.config.vizTypes.includes('matrix')) document.getElementById(`${id}-matrix`).innerHTML = '';
    if (this.config.vizTypes.includes('linkedlist')) document.getElementById(`${id}-linkedlist`).innerHTML = '';
    if (this.config.vizTypes.includes('graph')) document.getElementById(`${id}-graph`).innerHTML = '';
    if (this.config.vizTypes.includes('hanoi')) document.getElementById(`${id}-hanoi`).innerHTML = '';
    if (this.config.vizTypes.includes('pointer')) document.getElementById(`${id}-pointer`).innerHTML = '';
    if (this.config.vizTypes.includes('struct')) document.getElementById(`${id}-struct`).innerHTML = '';
    if (this.config.vizTypes.includes('branch')) document.getElementById(`${id}-branch`).innerHTML = '';
    if (this.config.vizTypes.includes('loop')) document.getElementById(`${id}-loop`).innerHTML = '';
    if (this.config.vizTypes.includes('flowchart')) this.renderFlowchart();
    document.getElementById(`${id}-info`).textContent = this.lastInfo;
    document.getElementById(`${id}-btn-play`).textContent = '▶ 运行';
    document.getElementById(`${id}-btn-next`).disabled = false;
    document.getElementById(`${id}-btn-prev`).disabled = true;
    this.updateProgress();
  }

  setSpeed(level) {
    const parsed = parseInt(level, 10);
    this.playSpeedLevel = Math.min(5, Math.max(1, Number.isFinite(parsed) ? parsed : 3));
    const setting = PLAY_SPEEDS[this.playSpeedLevel];
    this.playInterval = setting.interval;
    const speed = document.getElementById(`${this.config.id}-speed`);
    const output = document.getElementById(`${this.config.id}-speed-value`);
    if (speed) {
      speed.value = String(this.playSpeedLevel);
      speed.setAttribute('aria-valuetext', `${setting.label}，每步 ${(setting.interval / 1000).toFixed(1)} 秒`);
    }
    if (output) output.textContent = setting.label;
    if (this.isPlaying) {
      clearInterval(this.playTimer);
      this.playTimer = setInterval(() => {
        if (!this.next()) {
          this.isPlaying = false;
          clearInterval(this.playTimer);
          document.getElementById(`${this.config.id}-btn-play`).textContent = '▶ 运行';
        }
      }, this.playInterval);
    }
  }

  copyCode() {
    const code = this.config.code || '';
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).then(() => this.showToast('代码已复制到剪贴板'));
    } else {
      const ta = document.createElement('textarea');
      ta.value = code;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      this.showToast('代码已复制到剪贴板');
    }
  }

  showToast(msg) {
    const toast = document.createElement('div');
    toast.className = 'demo-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.textContent = msg;
    this.container.querySelector('.demo-card').appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 1500);
  }

  play() {
    if (this.isPlaying) {
      this.isPlaying = false;
      clearInterval(this.playTimer);
      document.getElementById(`${this.config.id}-btn-play`).textContent = '▶ 运行';
      return;
    }
    if (this.currentStep >= this.config.steps.length - 1) this.reset();
    this.isPlaying = true;
    document.getElementById(`${this.config.id}-btn-play`).textContent = '⏸ 暂停';
    this.next();
    this.playTimer = setInterval(() => {
      if (!this.next()) {
        this.isPlaying = false;
        clearInterval(this.playTimer);
        document.getElementById(`${this.config.id}-btn-play`).textContent = '▶ 运行';
      }
    }, this.playInterval);
  }

  // 到达输入步骤：暂停播放，高亮输入框，等待用户输入
  beginInputWait() {
    const id = this.config.id;
    this.inputWaiting = true;
    if (this.isPlaying) {
      this.resumeAfterInput = true;
      this.isPlaying = false;
      clearInterval(this.playTimer);
      document.getElementById(`${id}-btn-play`).textContent = '▶ 运行';
    }
    const row = document.getElementById(`${id}-input-row`);
    if (row) row.classList.add('waiting');
    const inp = document.getElementById(`${id}-input`);
    if (inp) inp.focus();
    document.getElementById(`${id}-info`).textContent =
      `程序正在等待输入：请在输出窗口中输入后按回车（不输入则使用默认值 ${this.config.input.defaultValue}）`;
  }

  // 收集输入（空值用默认值），回调页面重建后续步骤，然后继续执行
  submitInput() {
    const id = this.config.id;
    const inpCfg = this.config.input;
    const inp = document.getElementById(`${id}-input`);
    const v = (inp && inp.value.trim()) || inpCfg.defaultValue;
    this.inputCollected = true;
    this.inputWaiting = false;
    const row = document.getElementById(`${id}-input-row`);
    if (row) row.classList.remove('waiting');
    if (inpCfg.onSubmit) inpCfg.onSubmit(this, v);
    this.next();
    if (this.resumeAfterInput) {
      this.resumeAfterInput = false;
      if (!this.isPlaying) this.play();
    }
  }

  cancelInputWait() {
    this.inputWaiting = false;
    this.resumeAfterInput = false;
    const row = document.getElementById(`${this.config.id}-input-row`);
    if (row) row.classList.remove('waiting');
  }

  next() {
    if (this.currentStep >= this.config.steps.length - 1) return false;

    // 输入步骤（如 scanf）：第一次到达时暂停并高亮输入框；再次推进时收集输入（空则用默认值）
    const inpCfg = this.config.input;
    if (inpCfg && !this.inputCollected && this.currentStep + 1 === inpCfg.step) {
      if (!this.inputWaiting) this.beginInputWait();
      else this.submitInput();
      return true;
    }

    // 先保存当前状态快照，用于后续回退
    this.history[this.currentStep + 1] = this.snapshot();

    this.currentStep++;
    const step = this.config.steps[this.currentStep];
    const id = this.config.id;

    // 计算哪些变量发生了变化（用于精确高亮）
    const changedVars = new Set();
    if (step.vars) {
      for (const [name, info] of Object.entries(step.vars)) {
        const newVal = typeof info === 'object' ? info.value : info;
        const old = this.variables[name];
        const oldVal = old ? (typeof old === 'object' ? old.value : old) : undefined;
        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) changedVars.add(name);
      }
      Object.assign(this.variables, step.vars);
    }

    // output 自动区分两种写法：
    //   - 累积快照（新输出以当前控制台内容为前缀，如 "1 "→"1 2 "）：整体替换
    //   - 单次输出（如第一个 printf 之后又来一个 printf）：追加到控制台
    if (step.output !== undefined) {
      const prev = this.output.join('\n');
      const next = String(step.output);
      if (prev && next.startsWith(prev)) {
        this.output = next.split('\n');
      } else if (next) {
        this.output.push(...next.split('\n'));
      }
    }
    // outputAppend：该步新输出的一行（追加式）
    if (step.outputAppend !== undefined) {
      this.output.push(step.outputAppend);
    }
    if (step.memory !== undefined) this.lastMemory = step.memory;
    if (step.stack !== undefined) this.lastStack = step.stack;
    if (step.array !== undefined) {
      this.lastArray = step.array;
      this.applyArray(step.array);
    }
    if (step.matrix !== undefined) this.applyMatrix(step.matrix);
    if (step.pointer !== undefined) this.lastPointer = step.pointer;
    if (step.struct !== undefined) this.lastStruct = step.struct;
    if (step.branch !== undefined) this.lastBranch = step.branch;
    if (step.loop !== undefined) this.lastLoop = step.loop;
    if (step.linkedlist !== undefined) this.lastLinkedList = step.linkedlist;
    if (step.graph !== undefined) this.applyGraph(step.graph);
    if (step.hanoi !== undefined) this.lastHanoi = step.hanoi;
    if (step.flow !== undefined) {
      const f = step.flow;
      const visited = [...this.flowVisited];
      if (f.node && !visited.includes(f.node)) visited.push(f.node);
      const edges = [];
      if (f.edge) edges.push(f.edge);
      if (Array.isArray(f.edges)) edges.push(...f.edges);
      edges.forEach(e => {
        if (e && !visited.some(v => v && typeof v === 'object' && v.from === e.from && v.to === e.to)) {
          visited.push({ from: e.from, to: e.to });
        }
      });
      this.flowVisited = visited;
      this.lastFlowchart = { node: f.node || null, edge: f.edge || null, edges: f.edges || null, kind: f.kind || null, visited };
    }
    if (step.info !== undefined) this.lastInfo = step.info;

    this.updateLineHighlight();

    const vt = this.config.vizTypes;
    if (step.vars && vt.includes('vars')) this.renderVars(changedVars);
    if ((step.output !== undefined || step.outputAppend !== undefined) && vt.includes('console')) this.renderConsole();
    if (step.memory !== undefined && vt.includes('memory')) this.renderMemory(step.memory);
    if (step.stack !== undefined && vt.includes('stack')) this.renderStack(step.stack);
    if (step.array !== undefined && vt.includes('array')) this.renderArray(this.lastArrayUpdated || []);
    if (step.matrix !== undefined && vt.includes('matrix')) this.renderMatrix(this.lastMatrixUpdated || []);
    if (step.pointer !== undefined && vt.includes('pointer')) this.renderPointer(step.pointer);
    if (step.struct !== undefined && vt.includes('struct')) this.renderStruct(step.struct);
    if (step.branch !== undefined && vt.includes('branch')) this.renderBranch(step.branch);
    if (step.loop !== undefined && vt.includes('loop')) this.renderLoop(step.loop);
    if (step.linkedlist !== undefined && vt.includes('linkedlist')) this.renderLinkedList(step.linkedlist);
    if (step.graph !== undefined && vt.includes('graph')) this.renderGraph();
    if (step.hanoi !== undefined && vt.includes('hanoi')) this.renderHanoi(step.hanoi);
    if (step.flow !== undefined && vt.includes('flowchart')) this.updateFlowchart(this.lastFlowchart);
    if (step.info !== undefined) document.getElementById(`${id}-info`).textContent = step.info;

    this.updateProgress();
    document.getElementById(`${id}-btn-prev`).disabled = false;

    if (this.currentStep >= this.config.steps.length - 1) {
      document.getElementById(`${id}-btn-next`).disabled = true;
      if (this.isPlaying) {
        this.isPlaying = false;
        clearInterval(this.playTimer);
        document.getElementById(`${id}-btn-play`).textContent = '▶ 运行';
      }
    }
    return true;
  }

  prev() {
    if (this.currentStep < 0) return false;
    if (this.currentStep === 0) {
      this.reset();
      return true;
    }
    // 回退到前一步的状态
    const state = this.history[this.currentStep];
    if (!state) return false;
    this.restore(state);
    // 回退到输入步骤之前时，重新等待输入
    if (this.config.input) {
      this.cancelInputWait();
      if (this.currentStep < this.config.input.step) this.inputCollected = false;
    }
    // restore 会把 currentStep 设置为前一步，并把 history 截断
    this.history.length = this.currentStep + 1;
    document.getElementById(`${this.config.id}-btn-next`).disabled = false;
    if (this.currentStep <= 0) {
      document.getElementById(`${this.config.id}-btn-prev`).disabled = true;
    }
    return true;
  }

  updateLineHighlight() {
    if (this.currentStep < 0) return;
    const step = this.config.steps[this.currentStep];
    if (!step || step.line === undefined) return;
    const id = this.config.id;

    this.container.querySelectorAll('.code-line.active').forEach(el => {
      el.classList.remove('active');
      el.removeAttribute('aria-current');
    });
    const lineEl = document.getElementById(`${id}-line-${step.line}`);
    if (lineEl) {
      lineEl.classList.add('active');
      lineEl.setAttribute('aria-current', 'step');
      if (lineEl.scrollIntoView) {
        const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        lineEl.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' });
      }
    }
  }

  // 学习进度持久化：按「页面 + 示例 id」记录到 localStorage
  doneKey() {
    const page = location.pathname.split('/').pop() || 'index.html';
    return 'cteaching:done:' + page + ':' + this.config.id;
  }

  isDone() {
    try { return localStorage.getItem(this.doneKey()) === '1'; } catch (e) { return false; }
  }

  markDone() {
    try { localStorage.setItem(this.doneKey(), '1'); } catch (e) { /* 隐私模式等场景下静默失败 */ }
    refreshLearningNavigation();
  }

  updateProgress() {
    const id = this.config.id;
    const total = this.config.steps.length;
    const current = Math.max(0, this.currentStep + 1);
    const pct = total ? (current / total) * 100 : 0;
    document.getElementById(`${id}-counter`).textContent = `步骤 ${current} / ${total}`;
    document.getElementById(`${id}-progress`).style.width = `${pct}%`;
    document.getElementById(`${id}-progressbar`).setAttribute('aria-valuenow', String(current));
    // 跑完过全部步骤（含历史上跑完过）的卡片保持完成标记
    const reachedEnd = total > 0 && this.currentStep >= total - 1;
    if (reachedEnd) this.markDone();
    this.container.querySelector('.demo-card').classList.toggle('completed', reachedEnd || this.isDone());
  }

  renderVars(changedVars = new Set()) {
    const el = document.getElementById(`${this.config.id}-vars`);
    el.innerHTML = Object.entries(this.variables).map(([name, info]) => {
      const val = typeof info === 'object' ? info.value : info;
      const type = typeof info === 'object' ? info.type : '';
      const addr = typeof info === 'object' ? info.addr : '';
      const changed = changedVars.has(name) ? 'changed' : '';
      return `<div class="var-cell ${changed}"><div class="var-name">${name}</div><div class="var-value">${val}</div>${type ? `<div class="var-type">${type}</div>` : ''}${addr ? `<div class="var-addr">${addr}</div>` : ''}</div>`;
    }).join('');
    setTimeout(() => el.querySelectorAll('.var-cell').forEach(c => c.classList.remove('changed')), 600);
  }

  renderConsole() {
    const el = document.getElementById(`${this.config.id}-console`);
    el.innerHTML = '<span class="console-prompt">$ </span>' + this.output.map(o => `<div class="console-line">${this.escapeHtml(o)}</div>`).join('');
    el.scrollTop = el.scrollHeight;
  }

  escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  renderMemory(cells) {
    const el = document.getElementById(`${this.config.id}-memory`);
    el.innerHTML = cells.map(c => `<div class="mem-cell ${c.highlight ? 'highlight' : ''}"><span class="addr">${c.addr}</span><span class="val">${c.val}</span>${c.name ? `<span class="name">${c.name}</span>` : ''}</div>`).join('');
  }

  renderStack(items) {
    const el = document.getElementById(`${this.config.id}-stack`);
    if (!el) return;
    const top = items.length - 1;
    el.innerHTML = items.map((item, i) => {
      const cls = ['stack-item'];
      if (item.highlight) cls.push('highlight');
      if (item.pop) cls.push('pop');
      const badges = [];
      if (i === 0) badges.push('<span class="stack-badge stack-base">栈底</span>');
      if (i === top) badges.push('<span class="stack-badge stack-top">栈顶</span>');
      if (item.ret !== undefined) badges.push(`<span class="stack-badge stack-ret">返回 ${item.ret}</span>`);
      return `<div class="${cls.join(' ')}">
        <div class="stack-head">
          <span class="stack-fname"><span class="stack-depth">#${i}</span> ${this.escapeHtml(item.name)}</span>
          <span class="stack-badges">${badges.join('')}</span>
        </div>
        <div class="stack-locals">${this.escapeHtml(item.value !== undefined ? item.value : '')}</div>
      </div>`;
    }).join('');
  }

  // 应用数组数据：支持三种格式
  // 1) 旧格式 [{val:..},..]  替换为单个匿名数组
  // 2) {name, cells, markers} 更新指定名称的数组（其余保留）
  // 3) [{name, cells, markers}, ...] 批量更新
  applyArray(data) {
    this.lastArrayUpdated = [];
    if (Array.isArray(data) && data.length && !data[0].cells) {
      this.arrays = { '': { cells: data, markers: null } };
      this.lastArrayUpdated = [''];
      return;
    }
    if (Array.isArray(data) && data.length === 0) {
      this.arrays = {};
      return;
    }
    const items = Array.isArray(data) ? data : [data];
    items.forEach(g => {
      if (!g) return;
      const name = g.name || '';
      this.arrays[name] = { cells: g.cells || [], markers: g.markers || null };
      this.lastArrayUpdated.push(name);
    });
  }

  renderArray(updated = []) {
    const el = document.getElementById(`${this.config.id}-array`);
    if (!el) return;
    const names = Object.keys(this.arrays);
    el.innerHTML = names.map(name => {
      const g = this.arrays[name];
      const isUpdated = updated.includes(name);
      const cells = g.cells.map((c, i) => {
        const marks = (g.markers || []).filter(m => m.index === i)
          .map(m => `<span class="array-marker" style="color:${m.color || 'var(--warning)'}">▲${this.escapeHtml(m.label)}</span>`).join('');
        const cls = ['array-cell'];
        if (c.highlight) cls.push('highlight');
        if (c.empty) cls.push('empty');
        return `<div class="array-cell-wrap"><div class="${cls.join(' ')}"><span class="idx">${i}</span><span class="val">${c.val !== undefined && c.val !== null ? c.val : ''}</span></div>${marks ? `<div class="array-markers">${marks}</div>` : '<div class="array-markers"></div>'}</div>`;
      }).join('');
      return `<div class="array-group">${name ? `<div class="array-name ${isUpdated ? 'active' : ''}">${this.escapeHtml(name)}</div>` : ''}<div class="array-viz">${cells}</div></div>`;
    }).join('');
  }

  // 应用二维数组数据：{name, rows, cols, cells} 或数组形式，按名称合并
  applyMatrix(data) {
    this.lastMatrixUpdated = [];
    const items = Array.isArray(data) ? data : [data];
    items.forEach(m => {
      if (!m) return;
      const name = m.name || '';
      this.matrices[name] = { rows: m.rows, cols: m.cols, cells: m.cells || [] };
      this.lastMatrixUpdated.push(name);
    });
  }

  renderMatrix(updated = []) {
    const el = document.getElementById(`${this.config.id}-matrix`);
    if (!el) return;
    const names = Object.keys(this.matrices);
    el.innerHTML = names.map(name => {
      const m = this.matrices[name];
      const isUpdated = updated.includes(name);
      let html = `<div class="matrix-group">${name ? `<div class="array-name ${isUpdated ? 'active' : ''}">${this.escapeHtml(name)}</div>` : ''}`;
      html += `<div class="matrix-grid" style="grid-template-columns:auto repeat(${m.cols}, minmax(34px, auto))">`;
      html += `<div class="matrix-idx matrix-corner"></div>`;
      for (let j = 0; j < m.cols; j++) html += `<div class="matrix-idx">${j}</div>`;
      for (let i = 0; i < m.rows; i++) {
        html += `<div class="matrix-idx">${i}</div>`;
        for (let j = 0; j < m.cols; j++) {
          const c = (m.cells[i] && m.cells[i][j]) || {};
          const cls = ['matrix-cell'];
          if (c.highlight) cls.push('highlight');
          if (c.hl) cls.push('hl');
          if (c.empty) cls.push('empty');
          html += `<div class="${cls.join(' ')}">${c.val !== undefined && c.val !== null ? c.val : ''}</div>`;
        }
      }
      html += `</div></div>`;
      return html;
    }).join('');
  }

  renderLinkedList(nodes) {
    const el = document.getElementById(`${this.config.id}-linkedlist`);
    if (!el) return;
    el.innerHTML = (nodes || []).map((n, i) => {
      const cls = ['ll-node'];
      if (n.highlight) cls.push('highlight');
      if (n.deleted) cls.push('deleted');
      if (n.isNew) cls.push('new');
      const arrow = i < nodes.length - 1 ? '<div class="ll-arrow">&#8594;</div>' : '';
      return `<div class="ll-item">${n.label ? `<div class="ll-label">${this.escapeHtml(n.label)}</div>` : '<div class="ll-label"></div>'}<div class="${cls.join(' ')}"><div class="ll-data">${n.data}</div><div class="ll-next">${n.nextNull ? 'NULL' : '&#8226;'}</div></div>${n.addr ? `<div class="ll-addr">${n.addr}</div>` : ''}</div>${arrow}`;
    }).join('');
  }

  // 应用图数据：默认全量替换；{merge:true} 时按 id 合并节点（更新/新增），适合逐步生长的调用树
  applyGraph(g) {
    if (!g) { this.graphState = null; return; }
    if (!g.merge) { this.graphState = JSON.parse(JSON.stringify(g)); return; }
    if (!this.graphState) this.graphState = { nodes: [], edges: [] };
    const gs = this.graphState;
    gs.nodes.forEach(n => n.highlight = false);
    (gs.edges || []).forEach(e => e.highlight = false);
    (g.nodes || []).forEach(n => {
      const ex = gs.nodes.find(x => x.id === n.id);
      if (ex) Object.assign(ex, n); else gs.nodes.push({ ...n });
    });
    (g.edges || []).forEach(e => {
      gs.edges = gs.edges || [];
      const ex = gs.edges.find(x => x.from === e.from && x.to === e.to);
      if (ex) Object.assign(ex, e); else gs.edges.push({ ...e });
    });
  }

  renderGraph() {
    const el = document.getElementById(`${this.config.id}-graph`);
    if (!el) return;
    const g = this.graphState;
    if (!g || !g.nodes || !g.nodes.length) { el.innerHTML = ''; return; }
    const pad = 34;
    const w = Math.max(...g.nodes.map(n => n.x)) + pad * 2;
    const h = Math.max(...g.nodes.map(n => n.y)) + pad * 2;
    const nodeById = {};
    g.nodes.forEach(n => nodeById[n.id] = n);
    const edges = (g.edges || []).map(e => {
      const a = nodeById[e.from], b = nodeById[e.to];
      if (!a || !b) return '';
      return `<line class="graph-edge ${e.highlight ? 'highlight' : ''}" x1="${a.x + pad}" y1="${a.y + pad}" x2="${b.x + pad}" y2="${b.y + pad}"/>`;
    }).join('');
    const nodes = g.nodes.map(n => {
      const cls = ['graph-node'];
      if (n.highlight) cls.push('highlight');
      if (n.done) cls.push('done');
      const ly = n.y + pad + (n.sub ? -1 : 5);
      const sub = n.sub ? `<text class="graph-sub" x="${n.x + pad}" y="${n.y + pad + 13}" text-anchor="middle">${this.escapeHtml(n.sub)}</text>` : '';
      return `<g><circle class="${cls.join(' ')}" cx="${n.x + pad}" cy="${n.y + pad}" r="19"/><text class="graph-label" x="${n.x + pad}" y="${ly}" text-anchor="middle">${this.escapeHtml(n.label)}</text>${sub}</g>`;
    }).join('');
    el.innerHTML = `<svg class="graphviz" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet">${edges}${nodes}</svg>`;
  }

  renderHanoi(pegs) {
    const el = document.getElementById(`${this.config.id}-hanoi`);
    if (!el) return;
    el.innerHTML = (pegs || []).map(p => {
      const disks = (p.disks || []).map(d => {
        const size = typeof d === 'object' ? d.size : d;
        const hl = typeof d === 'object' && d.highlight;
        return `<div class="hanoi-disk hanoi-d${size} ${hl ? 'highlight' : ''}" style="width:${24 + size * 26}px">${size}</div>`;
      }).join('');
      return `<div class="hanoi-peg"><div class="hanoi-stack">${disks}</div><div class="hanoi-peg-name">${this.escapeHtml(p.peg)}</div></div>`;
    }).join('');
  }

  renderPointer(ptrs) {
    const el = document.getElementById(`${this.config.id}-pointer`);
    if (!el) return;
    el.innerHTML = ptrs.map(p => {
      // 结构化格式：明确区分「指针变量（存地址）」和「内存中的数据」
      if (p.targetName !== undefined || p.targetValue !== undefined || p.targetAddr !== undefined) {
        const tcls = p.targetInvalid ? 'ptr-cell-invalid' : (p.targetIsPointer ? 'ptr-cell-pointer' : 'ptr-cell-data');
        const trole = p.targetInvalid ? '⚠ 内存已释放 / 无效' : (p.targetIsPointer ? '也是指针' : '内存中的数据');
        return `<div class="ptr-pair">
          <div class="ptr-cell ptr-cell-pointer">
            <div class="ptr-head"><span class="ptr-name">${this.escapeHtml(p.name)}</span><span class="ptr-ctype">${this.escapeHtml(p.type || '')}</span></div>
            <div class="ptr-value">${p.value !== undefined ? this.escapeHtml(p.value) : ''}</div>
            <div class="ptr-addr">@${this.escapeHtml(p.addr || '')}</div>
            <div class="ptr-role">指针：存的是地址</div>
          </div>
          <div class="ptr-link">&#8594;</div>
          <div class="ptr-cell ${tcls}">
            <div class="ptr-head"><span class="ptr-name">${this.escapeHtml(p.targetName || '')}</span><span class="ptr-ctype">${this.escapeHtml(p.targetType || '')}</span></div>
            <div class="ptr-value">${p.targetValue !== undefined ? this.escapeHtml(p.targetValue) : ''}</div>
            <div class="ptr-addr">@${this.escapeHtml(p.targetAddr || '')}</div>
            <div class="ptr-role">${trole}</div>
          </div>
        </div>`;
      }
      // 旧格式兼容
      return `<div class="ptr-box">${p.name}<br><small>${p.addr}</small></div><div class="ptr-arrow">&#8594;</div><div class="target-box">${p.target}</div>`;
    }).join('');
  }

  renderStruct(structs) {
    const el = document.getElementById(`${this.config.id}-struct`);
    el.innerHTML = structs.map(s => `<div class="struct-box" style="margin:0.5rem 0;"><div class="struct-title">${s.name} ${s.addr || ''}</div>${s.fields.map(f => `<div class="struct-field"><span class="field-name">${f.name}</span><span class="field-value">${f.value}</span></div>`).join('')}</div>`).join('');
  }

  renderBranch(branches) {
    const el = document.getElementById(`${this.config.id}-branch`);
    el.innerHTML = branches.map(b => `<div class="branch-node ${b.active ? 'active' : 'inactive'}">${b.label}</div>${b.arrow ? '<div class="branch-arrow">&#8595;</div>' : ''}`).join('');
  }

  renderLoop(iters) {
    const el = document.getElementById(`${this.config.id}-loop`);
    el.innerHTML = iters.map(i => `<span class="loop-iter ${i.active ? 'active' : ''}">${i.label}</span>`).join('');
  }

  renderFlowchart() {
    const el = document.getElementById(`${this.config.id}-flowchart`);
    if (!el) return;
    const fc = this.config.flowchart;
    if (!fc || !fc.nodes || !fc.nodes.length) {
      el.innerHTML = '<span style="color:var(--comment);font-size:0.85rem">该示例未配置流程图</span>';
      return;
    }
    const nodes = fc.nodes;
    const edges = fc.edges || [];
    const curvePts = edges.filter(e => e.curve);
    const minX = Math.min(...nodes.map(n => n.x), ...curvePts.map(e => e.curve.cx));
    const minY = Math.min(...nodes.map(n => n.y), ...curvePts.map(e => e.curve.cy));
    const maxX = Math.max(...nodes.map(n => n.x + (n.w || 120)), ...curvePts.map(e => e.curve.cx));
    const maxY = Math.max(...nodes.map(n => n.y + (n.h || 44)), ...curvePts.map(e => e.curve.cy));
    const pad = 16;
    const width = maxX - minX + pad * 2;
    const height = maxY - minY + pad * 2;

    const nodeById = {};
    nodes.forEach(n => nodeById[n.id] = n);

    const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');

    const ox = -minX + pad, oy = -minY + pad;

    // 计算从节点中心朝目标点方向与节点边框的交点（让边止于节点边界而不是中心）
    const borderPoint = (n, cx, cy, tx, ty) => {
      const w = n.w || 120, h = n.h || 44;
      const dx = tx - cx, dy = ty - cy;
      const t = Math.min((w / 2) / (Math.abs(dx) || 1e-6), (h / 2) / (Math.abs(dy) || 1e-6));
      return { x: cx + dx * t, y: cy + dy * t };
    };

    const edgeSvg = edges.map(e => {
      const a = nodeById[e.from], b = nodeById[e.to];
      if (!a || !b) return '';
      const aw = a.w || 120, ah = a.h || 44;
      const bw = b.w || 120, bh = b.h || 44;
      const ax = a.x + aw / 2, ay = a.y + ah / 2;
      const bx = b.x + bw / 2, by = b.y + bh / 2;
      let sx, sy, ex, ey;
      if (e.fromSide === 'right')       { sx = a.x + aw; sy = ay; }
      else if (e.fromSide === 'left')   { sx = a.x;      sy = ay; }
      else if (e.fromSide === 'top')    { sx = ax;       sy = a.y; }
      else if (e.fromSide === 'bottom') { sx = ax;       sy = a.y + ah; }
      else { const p = borderPoint(a, ax, ay, bx, by); sx = p.x; sy = p.y; }
      if (e.toSide === 'right')         { ex = b.x + bw; ey = by; }
      else if (e.toSide === 'left')     { ex = b.x;      ey = by; }
      else if (e.toSide === 'top')      { ex = bx;       ey = b.y; }
      else if (e.toSide === 'bottom')   { ex = bx;       ey = b.y + bh; }
      else { const p = borderPoint(b, bx, by, ax, ay); ex = p.x; ey = p.y; }
      // 箭头与目标节点之间留一点间隙，避免箭头压住节点边框
      const gdx = ex - sx, gdy = ey - sy;
      const glen = Math.hypot(gdx, gdy) || 1;
      ex -= (gdx / glen) * 4;
      ey -= (gdy / glen) * 4;
      const path = e.curve
        ? `M ${sx + ox} ${sy + oy} Q ${e.curve.cx + ox} ${e.curve.cy + oy} ${ex + ox} ${ey + oy}`
        : `M ${sx + ox} ${sy + oy} L ${ex + ox} ${ey + oy}`;
      const labelPos = e.labelPos
        || (e.curve
          ? { x: 0.25 * sx + 0.5 * e.curve.cx + 0.25 * ex, y: 0.25 * sy + 0.5 * e.curve.cy + 0.25 * ey }
          : (() => {
              const mx = (sx + ex) / 2, my = (sy + ey) / 2;
              if (Math.abs(sx - ex) < 2) return { x: mx + 14, y: my };   // 竖直边：标签放右侧
              const nx = -(ey - sy) / glen, ny = (ex - sx) / glen;       // 斜边：沿法线方向避让
              return { x: mx + nx * 12, y: my + ny * 12 };
            })());
      const kind = e.kind ? ` flow-edge-${e.kind}` : '';
      return `<path class="flow-edge${kind}" data-edge="${e.from}->${e.to}" d="${path}" marker-end="url(#flow-arrow-${this.config.id})"/>`;
    }).join('');

    // 边标签单独收集，最后绘制（位于最顶层，不会被节点遮挡；配合 CSS 光晕保持可读）
    const labelSvg = edges.map(e => {
      if (!e.label) return '';
      const a = nodeById[e.from], b = nodeById[e.to];
      if (!a || !b) return '';
      const aw = a.w || 120, ah = a.h || 44;
      const bw = b.w || 120, bh = b.h || 44;
      const ax = a.x + aw / 2, ay = a.y + ah / 2;
      const bx = b.x + bw / 2, by = b.y + bh / 2;
      let sx, sy, ex, ey;
      if (e.fromSide === 'right')       { sx = a.x + aw; sy = ay; }
      else if (e.fromSide === 'left')   { sx = a.x;      sy = ay; }
      else if (e.fromSide === 'top')    { sx = ax;       sy = a.y; }
      else if (e.fromSide === 'bottom') { sx = ax;       sy = a.y + ah; }
      else { sx = ax; sy = ay; }
      if (e.toSide === 'right')         { ex = b.x + bw; ey = by; }
      else if (e.toSide === 'left')     { ex = b.x;      ey = by; }
      else if (e.toSide === 'top')      { ex = bx;       ey = b.y; }
      else if (e.toSide === 'bottom')   { ex = bx;       ey = b.y + bh; }
      else { ex = bx; ey = by; }
      const gdx = ex - sx, gdy = ey - sy;
      const glen = Math.hypot(gdx, gdy) || 1;
      const labelPos = e.labelPos
        || (e.curve
          ? { x: 0.25 * sx + 0.5 * e.curve.cx + 0.25 * ex, y: 0.25 * sy + 0.5 * e.curve.cy + 0.25 * ey }
          : (() => {
              const mx = (sx + ex) / 2, my = (sy + ey) / 2;
              if (Math.abs(sx - ex) < 2) return { x: mx + 14, y: my };
              const nx = -(ey - sy) / glen, ny = (ex - sx) / glen;
              return { x: mx + nx * 12, y: my + ny * 12 };
            })());
      const kind = e.kind ? ` flow-edge-${e.kind}` : '';
      return `<text class="flow-edge-label${kind}" data-edge="${e.from}->${e.to}" x="${labelPos.x + ox}" y="${labelPos.y + oy - 4}" text-anchor="middle">${esc(e.label)}</text>`;
    }).join('');

    const nodeSvg = nodes.map(n => {
      const w = n.w || 120, h = n.h || 44;
      const x = n.x - minX + pad, y = n.y - minY + pad;
      const type = n.type || 'process';
      let shape = '';
      if (type === 'start' || type === 'end') {
        shape = `<rect class="flow-node flow-node-${type}" data-node="${n.id}" x="${x}" y="${y}" rx="${h/2}" ry="${h/2}" width="${w}" height="${h}"/>`;
      } else if (type === 'decision') {
        const cx = x + w / 2, cy = y + h / 2;
        const pts = `${cx},${y} ${x + w},${cy} ${cx},${y + h} ${x},${cy}`;
        shape = `<polygon class="flow-node flow-node-decision" data-node="${n.id}" points="${pts}"/>`;
      } else {
        shape = `<rect class="flow-node flow-node-process" data-node="${n.id}" x="${x}" y="${y}" rx="6" ry="6" width="${w}" height="${h}"/>`;
      }
      const tx = x + w / 2, ty = y + h / 2;
      const lines = String(n.label).split('\n');
      const text = lines.map((line, i) => `<tspan x="${tx}" dy="${i === 0 ? (lines.length > 1 ? -((lines.length - 1) * 8) : 4) : 16}">${esc(line)}</tspan>`).join('');
      return `${shape}<text class="flow-label" data-node="${n.id}" x="${tx}" y="${ty}" text-anchor="middle">${text}</text>`;
    }).join('');

    el.innerHTML = `<svg class="flowchart" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">
      <defs>
        <marker id="flow-arrow-${this.config.id}" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0 L0,6 L9,3 z" class="flow-arrow"/>
        </marker>
      </defs>
      ${edgeSvg}
      ${nodeSvg}
      ${labelSvg}
    </svg>`;
  }

  updateFlowchart(flow) {
    const el = document.getElementById(`${this.config.id}-flowchart`);
    if (!el) return;
    if (!el.querySelector('svg')) this.renderFlowchart();
    if (!flow) {
      el.dataset.kind = '';
      el.querySelectorAll('.flow-node').forEach(n => n.classList.remove('active', 'visited'));
      el.querySelectorAll('.flow-edge').forEach(e => e.classList.remove('active', 'visited'));
      el.querySelectorAll('.flow-edge-label').forEach(l => l.classList.remove('active', 'visited'));
      return;
    }
    el.dataset.kind = flow.kind || '';
    const visited = flow.visited || [];
    const current = flow.node;
    const activeEdges = [];
    if (flow.edge) activeEdges.push(flow.edge);
    if (Array.isArray(flow.edges)) activeEdges.push(...flow.edges);

    el.querySelectorAll('.flow-node').forEach(n => {
      const id = n.getAttribute('data-node');
      n.classList.toggle('active', id === current);
      n.classList.toggle('visited', id !== current && visited.includes(id));
    });
    el.querySelectorAll('.flow-edge').forEach(e => {
      const key = e.getAttribute('data-edge');
      const isActive = activeEdges.some(ae => key === `${ae.from}->${ae.to}`);
      e.classList.toggle('active', isActive);
      e.classList.toggle('visited', !isActive && visited.some(v => v && typeof v === 'object' && `${v.from}->${v.to}` === key));
    });
    // 标签同步高亮（标签与边通过 data-edge 关联）
    el.querySelectorAll('.flow-edge-label').forEach(l => {
      const key = l.getAttribute('data-edge');
      const path = key && el.querySelector(`.flow-edge[data-edge="${key}"]`);
      if (path) {
        l.classList.toggle('active', path.classList.contains('active'));
        l.classList.toggle('visited', path.classList.contains('visited'));
      }
    });
  }

  bindKeys() {
    this.container.tabIndex = 0;
    this.container.setAttribute('aria-label', `${this.config.title}交互演示，使用左右方向键单步，空格播放或暂停，Home 键重置`);
    this.container.addEventListener('keydown', (e) => {
      // 避免在输入框等可编辑元素中误触发
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return;

      switch (e.key) {
        case 'ArrowRight':
        case 'n':
        case 'N':
          e.preventDefault();
          this.next();
          break;
        case 'ArrowLeft':
        case 'p':
        case 'P':
          e.preventDefault();
          this.prev();
          break;
        case ' ':
          e.preventDefault();
          this.play();
          break;
        case 'Home':
          e.preventDefault();
          this.reset();
          break;
      }
    });
  }
}

var demos = {};
function createDemo(id, config) {
  // 重复创建（如交互式重新运行）时，先清理旧实例的播放定时器
  if (demos[id] && demos[id].playTimer) clearInterval(demos[id].playTimer);
  demos[id] = new CDemo(id, { ...config, id });
}

function getCurrentPageName() {
  return location.pathname.split('/').pop() || 'index.html';
}

function readDone(key) {
  try { return localStorage.getItem(key) === '1'; } catch (e) { return false; }
}

// 同步快速导航与章末摘要的完成状态。
function refreshLearningNavigation() {
  const page = getCurrentPageName();
  document.querySelectorAll('.quicknav-chip[data-item-id]').forEach(link => {
    const itemId = link.dataset.itemId;
    const done = itemId === 'quiz-section'
      ? Object.keys(quizzes).length > 0 && Object.values(quizzes).every(q => q.isDone())
      : readDone(`cteaching:done:${page}:${itemId}`);
    link.classList.toggle('completed', done);
    link.setAttribute('aria-label', `${link.textContent.trim()}${done ? '，已完成' : '，未完成'}`);
    if (done) {
      link.dataset.status = '已完成';
    } else {
      delete link.dataset.status;
    }
  });

  const demoDone = Object.values(demos).filter(d => d.isDone()).length;
  const quizDone = Object.values(quizzes).filter(q => q.isDone()).length;
  const total = Object.keys(demos).length + Object.keys(quizzes).length;
  const done = demoDone + quizDone;
  const summary = document.querySelector('.chapter-progress-summary');
  if (summary) {
    summary.textContent = total && done >= total ? `✓ 本章 ${total} 项已全部完成` : `本章进度 ${done} / ${total}`;
    summary.classList.toggle('all-done', total > 0 && done >= total);
  }
}

function injectChapterFooter() {
  const main = document.querySelector('main.container');
  const page = getCurrentPageName();
  const currentIndex = CHAPTERS.findIndex(chapter => chapter.page === page);
  if (!main || currentIndex < 0 || main.querySelector('.chapter-footer-nav')) return;
  const previous = CHAPTERS[currentIndex - 1];
  const next = CHAPTERS[currentIndex + 1];
  const footer = document.createElement('nav');
  footer.className = 'chapter-footer-nav';
  footer.setAttribute('aria-label', '章节切换');
  footer.innerHTML = `
    <div class="chapter-progress-summary" role="status" aria-live="polite"></div>
    <div class="chapter-footer-links">
      ${previous ? `<a href="${previous.page}" class="chapter-nav-link chapter-prev"><span>上一章</span><strong>${previous.title}</strong></a>` : '<span></span>'}
      ${next ? `<a href="${next.page}" class="chapter-nav-link chapter-next"><span>下一章</span><strong>${next.title}</strong></a>` : '<a href="index.html" class="chapter-nav-link chapter-next"><span>返回</span><strong>课程首页</strong></a>'}
    </div>`;
  main.appendChild(footer);
}

// 长页面快速导航：显示完成状态、当前所在示例和练习入口。
(function injectQuickNav() {
  function init() {
    const intro = document.querySelector('.intro');
    if (!intro || intro.dataset.quicknav) return;
    const list = Object.values(demos);
    if (!list.length) return;
    intro.dataset.quicknav = 'true';

    const demoGrid = document.querySelector('.demo-grid');
    if (demoGrid && (!demoGrid.previousElementSibling || demoGrid.previousElementSibling.tagName !== 'H2')) {
      const demoHeading = document.createElement('h2');
      demoHeading.className = 'sr-only';
      demoHeading.textContent = '交互演示';
      demoGrid.before(demoHeading);
    }

    const quizGrid = document.querySelector('.quiz-grid');
    if (quizGrid) {
      const quizHeading = quizGrid.previousElementSibling;
      if (quizHeading && /^H[1-6]$/.test(quizHeading.tagName)) quizHeading.id = 'chapter-quiz';
    }

    const nav = document.createElement('nav');
    nav.className = 'demo-quicknav';
    nav.setAttribute('aria-label', '本章快速跳转');
    nav.innerHTML = '<span class="quicknav-label">本章导航</span>' +
      list.map(d => `<a href="#${d.config.id}" data-item-id="${d.config.id}" class="quicknav-chip">${d.config.title}</a>`).join('') +
      (quizGrid ? '<a href="#chapter-quiz" data-item-id="quiz-section" class="quicknav-chip quicknav-quiz">章节练习</a>' : '');
    intro.after(nav);

    const links = [...nav.querySelectorAll('.quicknav-chip')];
    let scheduled = false;
    const updateCurrent = () => {
      scheduled = false;
      const threshold = window.scrollY + Math.max(120, nav.getBoundingClientRect().height + 90);
      let current = null;
      links.forEach(link => {
        const target = document.querySelector(link.getAttribute('href'));
        if (target && target.offsetTop <= threshold) current = link;
      });
      links.forEach(link => {
        const active = link === current;
        link.classList.toggle('is-current', active);
        if (active) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    };
    window.addEventListener('scroll', () => {
      if (!scheduled) {
        scheduled = true;
        window.requestAnimationFrame(updateCurrent);
      }
    }, { passive: true });
    updateCurrent();
    injectChapterFooter();
    refreshLearningNavigation();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/* ============================================================
   章节练习引擎：预测输出题（predict）与最小改错题（fix）
   - C 代码语法高亮（复用 highlightCLine）
   - 自动评测，做错给出解析与参考答案；答对后 localStorage 持久化
   ============================================================ */

var quizzes = {};
function createQuiz(id, config) {
  quizzes[id] = new CQuiz(id, { ...config, id });
}

// 输出比较：忽略 \r、每行末尾空白与末尾空行
function normQuizOutput(s) {
  return String(s).replace(/\r/g, '').split('\n')
    .map(l => l.replace(/[ \t]+$/g, '')).join('\n').replace(/\n+$/g, '');
}
// 代码比较：忽略注释与空白字符（允许解释性注释和排版差异）
function normQuizCode(s) {
  return String(s).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '').replace(/\s+/g, '');
}

class CQuiz {
  constructor(id, cfg) {
    this.id = id;
    this.cfg = cfg;
    this.attempts = 0;
    this.container = document.getElementById(id);
    if (!this.container) { console.error('CQuiz: container not found', id); return; }
    this.render();
  }

  esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  highlightCode(code) {
    return code.trim().split('\n').map(l => highlightCLine(l)).join('\n');
  }

  doneKey() {
    const page = location.pathname.split('/').pop() || 'index.html';
    return 'cteaching:done:' + page + ':' + this.id;
  }

  isDone() {
    try { return localStorage.getItem(this.doneKey()) === '1'; } catch (e) { return false; }
  }

  markDone() {
    try { localStorage.setItem(this.doneKey(), '1'); } catch (e) { /* 隐私模式下静默失败 */ }
    refreshLearningNavigation();
  }

  render() {
    const c = this.cfg;
    const isPredict = c.type === 'predict';
    const typeLabel = isPredict ? '预测输出' : '改错题';
    const codeHl = this.highlightCode(c.code);
    const done = this.isDone();

    let bodyHtml;
    if (isPredict) {
      bodyHtml = `
      <pre class="quiz-code">${codeHl}</pre>
      <div class="quiz-prompt" id="${this.id}-prompt">这段程序执行后，标准输出（stdout）的内容是什么？</div>
      <label class="sr-only" for="${this.id}-answer">${this.esc(c.title || typeLabel)}的输出答案</label>
      <textarea class="quiz-output-input" id="${this.id}-answer" rows="3" spellcheck="false"
        aria-describedby="${this.id}-prompt" placeholder="在此填写输出内容"></textarea>`;
    } else {
      bodyHtml = `
      <div class="quiz-prompt" id="${this.id}-prompt">下面程序有错误，请做<strong>最小修改</strong>将其改对（直接编辑代码）：</div>
      <div class="quiz-edit-wrap">
        <pre class="quiz-edit-hl" id="${this.id}-hl" aria-hidden="true">${codeHl}</pre>
        <label class="sr-only" for="${this.id}-editor">${this.esc(c.title || typeLabel)}代码编辑器</label>
        <textarea class="quiz-edit-input" id="${this.id}-editor" aria-describedby="${this.id}-prompt" spellcheck="false">${this.esc(c.code.trim())}</textarea>
      </div>`;
    }

    this.container.innerHTML = `<div class="quiz-card${done ? ' completed' : ''}" role="region" aria-labelledby="${this.id}-title">
      <div class="quiz-head">
        <span class="quiz-type quiz-type-${c.type}">${typeLabel}</span>
        <span class="quiz-title" id="${this.id}-title">${this.esc(c.title || '')}</span>
        <span class="quiz-done-badge">✓ 已完成</span>
      </div>
      ${bodyHtml}
      <div class="quiz-actions">
        <button class="btn btn-primary" type="button" onclick="quizzes['${this.id}'].submit()">提交</button>
        ${isPredict ? '' : `<button class="btn btn-secondary" type="button" onclick="quizzes['${this.id}'].restore()">还原代码</button>`}
      </div>
      <div class="quiz-feedback" id="${this.id}-feedback" role="status" aria-live="polite" aria-atomic="true"></div>
    </div>`;

    if (!isPredict) {
      const editor = document.getElementById(`${this.id}-editor`);
      const hl = document.getElementById(`${this.id}-hl`);
      editor.addEventListener('input', () => { hl.innerHTML = this.highlightCode(editor.value); this.fitEditor(); this.syncEditor(); });
      editor.addEventListener('scroll', () => this.syncEditor());
      this.fitEditor();
      this.syncEditor();
    }
  }

  // 编辑器高度自适应内容行数
  fitEditor() {
    const editor = document.getElementById(`${this.id}-editor`);
    if (editor) editor.rows = editor.value.split('\n').length + 1;
  }

  syncEditor() {
    const editor = document.getElementById(`${this.id}-editor`);
    const hl = document.getElementById(`${this.id}-hl`);
    if (!editor || !hl) return;
    hl.scrollTop = editor.scrollTop;
    hl.scrollLeft = editor.scrollLeft;
  }

  restore() {
    const editor = document.getElementById(`${this.id}-editor`);
    this.attempts = 0;
    editor.value = this.cfg.code.trim();
    document.getElementById(`${this.id}-hl`).innerHTML = this.highlightCode(editor.value);
    document.getElementById(`${this.id}-feedback`).innerHTML = '';
    this.fitEditor();
    this.syncEditor();
  }

  // 判题：返回 true/false；供界面与自动化测试调用
  judge(value) {
    const c = this.cfg;
    if (c.type === 'predict') {
      const accepted = [c.answer, ...(c.accept || [])];
      return accepted.some(a => normQuizOutput(a) === normQuizOutput(value));
    }
    if (normQuizCode(value) === normQuizCode(c.code)) return false; // 未做任何修改
    if (typeof c.validate === 'function') {
      try { return Boolean(c.validate(value, { normalize: normQuizCode, original: c.code })); } catch (e) { return false; }
    }
    if ((c.acceptPatterns || []).some(pattern => {
      if (!(pattern instanceof RegExp)) return false;
      pattern.lastIndex = 0;
      return pattern.test(value);
    })) return true;
    return (c.accept || []).some(a => normQuizCode(a) === normQuizCode(value));
  }

  referenceAnswerHtml() {
    const c = this.cfg;
    if (c.type === 'predict') {
      return `<div class="quiz-answer-label">正确输出：</div><pre class="quiz-ref-output">${this.esc(c.answer)}</pre>`;
    }
    return `<div class="quiz-answer-label">一种参考改法：</div><pre class="quiz-code quiz-ref-code">${this.highlightCode((c.accept || [c.code])[0])}</pre>`;
  }

  showAnswer() {
    const fb = document.getElementById(`${this.id}-feedback`);
    if (!fb || fb.querySelector('.quiz-reference')) return;
    const answer = document.createElement('div');
    answer.className = 'quiz-reference';
    answer.innerHTML = this.referenceAnswerHtml();
    fb.appendChild(answer);
  }

  submit() {
    const c = this.cfg;
    const isPredict = c.type === 'predict';
    const value = document.getElementById(isPredict ? `${this.id}-answer` : `${this.id}-editor`).value;
    const ok = this.judge(value);
    const fb = document.getElementById(`${this.id}-feedback`);

    if (ok) {
      this.attempts = 0;
      fb.innerHTML = `<div class="quiz-result quiz-right">✓ 回答正确</div>
        <div class="quiz-explain">${c.explain || ''}</div>`;
    } else {
      this.attempts++;
      const firstHint = c.hint || (isPredict
        ? '先按执行顺序记录每次 printf 的内容，并留意空格与换行。'
        : '先定位编译或逻辑错误所在的最小范围，再只修改必要部分。');
      const detail = this.attempts >= 2 && c.explain ? `<div class="quiz-explain">${c.explain}</div>` : '';
      const reveal = this.attempts >= 2
        ? `<button class="btn btn-secondary quiz-reveal" type="button" onclick="quizzes['${this.id}'].showAnswer()">查看参考答案</button>`
        : '<div class="quiz-try-again">再次尝试后可选择查看参考答案</div>';
      fb.innerHTML = `<div class="quiz-result quiz-wrong">✗ 还不对，再想想</div>
        <div class="quiz-hint"><strong>提示：</strong>${firstHint}</div>${detail}${reveal}`;
    }
    if (ok) {
      this.markDone();
      this.container.querySelector('.quiz-card').classList.add('completed');
    }
    return ok;
  }
}

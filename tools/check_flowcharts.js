// 流程图几何回归：检查箭头间距、标签裁切和连线穿过无关节点的问题。
const { chromium } = require('playwright');
const path = require('path');

const pages = ['condition.html', 'loop.html'];

(async () => {
  const browser = await chromium.launch();
  let failures = 0;

  for (const pageName of pages) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('file://' + path.resolve(__dirname, '..', pageName));
    await page.waitForFunction(() => window.demos && Object.keys(window.demos).length > 0);

    const charts = await page.evaluate(() => Object.values(window.demos)
      .filter(demo => demo.config.flowchart)
      .map(demo => {
        demo.renderFlowchart();
        const root = document.getElementById(`${demo.config.id}-flowchart`);
        const svg = root && root.querySelector('svg.flowchart');
        const issues = [];
        if (!svg) return { id: demo.config.id, edgeCount: 0, issues: ['未生成 SVG'] };

        const viewBox = svg.viewBox.baseVal;
        const paths = [...svg.querySelectorAll('.flow-edge')];
        const nodes = new Map([...svg.querySelectorAll('.flow-node')]
          .map(node => [node.dataset.node, node]));
        const expectedEdges = demo.config.flowchart.edges || [];

        if (paths.length !== expectedEdges.length) {
          issues.push(`连线数量 ${paths.length}/${expectedEdges.length}`);
        }
        if (nodes.size !== demo.config.flowchart.nodes.length) {
          issues.push(`节点数量 ${nodes.size}/${demo.config.flowchart.nodes.length}`);
        }

        [...svg.querySelectorAll('.flow-edge-label')].forEach(label => {
          const box = label.getBBox();
          const outside = box.x < viewBox.x - 1 || box.y < viewBox.y - 1 ||
            box.x + box.width > viewBox.x + viewBox.width + 1 ||
            box.y + box.height > viewBox.y + viewBox.height + 1;
          if (outside) issues.push(`${label.dataset.edge} 标签超出画布`);
        });

        paths.forEach(edge => {
          const length = edge.getTotalLength();
          const target = nodes.get(edge.dataset.to);
          const gap = Number(edge.dataset.arrowGap);
          if (!Number.isFinite(length) || length < 6) {
            issues.push(`${edge.dataset.edge} 连线长度异常`);
            return;
          }
          if (!Number.isFinite(gap) || Math.abs(gap - 4) > 0.1) {
            issues.push(`${edge.dataset.edge} 箭头间距异常（${edge.dataset.arrowGap}）`);
          }
          if (!target || typeof target.isPointInFill !== 'function') return;

          const end = edge.getPointAtLength(length);
          if (target.isPointInFill(new DOMPoint(end.x, end.y))) {
            issues.push(`${edge.dataset.edge} 箭头终点进入目标节点`);
          }

          const beforeEnd = edge.getPointAtLength(Math.max(0, length - 1));
          const dx = end.x - beforeEnd.x, dy = end.y - beforeEnd.y;
          const distance = Math.hypot(dx, dy) || 1;
          const inside = new DOMPoint(end.x + dx / distance * 8, end.y + dy / distance * 8);
          if (!target.isPointInFill(inside)) {
            issues.push(`${edge.dataset.edge} 箭头未对准目标节点边缘`);
          }

          const unrelatedNodes = [...nodes.entries()]
            .filter(([id]) => id !== edge.dataset.from && id !== edge.dataset.to);
          for (let step = 2; step <= 18; step++) {
            const point = edge.getPointAtLength(length * step / 20);
            const crossed = unrelatedNodes.find(([, node]) => node.isPointInFill(new DOMPoint(point.x, point.y)));
            if (crossed) {
              issues.push(`${edge.dataset.edge} 连线穿过节点 ${crossed[0]}`);
              break;
            }
          }
        });

        return { id: demo.config.id, edgeCount: paths.length, issues };
      }));

    for (const chart of charts) {
      const ok = chart.issues.length === 0;
      if (!ok) failures++;
      console.log(`${ok ? 'PASS' : 'FAIL'} ${pageName}#${chart.id}  连线=${chart.edgeCount}` +
        (chart.issues.length ? `  ${chart.issues.join('；')}` : ''));
    }
    if (errors.length) {
      failures += errors.length;
      console.log(`FAIL ${pageName} JS错误: ${errors.join('；')}`);
    }
    await page.close();
  }

  await browser.close();
  process.exit(failures ? 1 : 0);
})();

// 一次性脚本：array/function/pointer 三章的 demo 迁移与新增
const fs = require('fs');

// ---------- array.html：移出栈/队列，重编号二维，插入字符串组 ----------
let t = fs.readFileSync('array.html', 'utf8');
const blockOf = (text, id) => {
  const start = text.indexOf(`createDemo("demo${id}", {`);
  const next = text.indexOf('createDemo("', start + 10);
  return text.slice(start, next);
};
const stackBlock = blockOf(t, 6);   // 栈
const queueBlock = blockOf(t, 7);   // 队列
fs.writeFileSync('tools/_sq_blocks.js', stackBlock + queueBlock, 'utf8');
t = t.replace(stackBlock, '').replace(queueBlock, '');

// 二维 demo8-14 → demo9-15（倒序防止覆盖；createDemo 与 grid div 一起换）
for (let n = 14; n >= 8; n--) {
  t = t.split(`createDemo("demo${n}"`).join(`createDemo("demo${n + 1}"`);
  t = t.split(`<div id="demo${n}"></div>`).join(`<div id="demo${n + 1}"></div>`);
}

// 一维 grid：删掉 demo6/demo7 占位 div
t = t.replace('  <div id="demo6"></div>\r\n  <div id="demo7"></div>\r\n', '');

// 一维 grid 后插入「字符数组与字符串」小节
const strDemos = fs.readFileSync('tools/_str_demos.js', 'utf8').trim();
const h2TwoDim = '<h2>二维数组</h2>';
if (t.indexOf(h2TwoDim) < 0) throw new Error('找不到二维数组小节');
t = t.replace(h2TwoDim,
  '<h2>字符数组与字符串</h2>\r\n<div class="demo-grid">\r\n  <div id="demo6"></div>\r\n  <div id="demo7"></div>\r\n  <div id="demo8"></div>\r\n</div>\r\n' + h2TwoDim);

// 字符串 demo 配置插到 demo5（数组作为函数参数）之后、demo9（原二维 demo8）之前
const twoDimStart = t.indexOf('createDemo("demo9"');
if (twoDimStart < 0) throw new Error('找不到二维首个 demo');
t = t.slice(0, twoDimStart) + strDemos.split('\n').join('\r\n') + '\r\n' + t.slice(twoDimStart);

// 简介一维部分补一条字符串知识点
const arrBullet = '<li>数组作为函数参数<strong>退化为指针</strong>，函数内无法通过 sizeof 获得长度</li>';
if (t.indexOf(arrBullet) < 0) throw new Error('找不到一维知识点末尾');
t = t.replace(arrBullet, arrBullet + '\r\n<li><strong>字符数组与字符串</strong>：以 <code>\'\\0\'</code> 结尾的 char 数组，<code>printf</code> 用 <code>%s</code> 整体输出；连接/比较/查找都可以逐字符手工实现</li>');

fs.writeFileSync('array.html', t, 'utf8');
console.log('array.html OK');

// ---------- function.html：删除 demo1（值传递），栈/队列迁入 ----------
t = fs.readFileSync('function.html', 'utf8');
const d1Start = t.indexOf('createDemo("demo1", {');
const d2Start = t.indexOf('createDemo("demo2", {');
if (d1Start < 0 || d2Start < 0) throw new Error('function demo1 边界未找到');
t = t.slice(0, d1Start) + t.slice(d2Start);

// demo2-7 → demo1-6（倒序）
for (let n = 7; n >= 2; n--) {
  t = t.split(`createDemo("demo${n}"`).join(`createDemo("demo${n - 1}"`);
  t = t.split(`<div id="demo${n}"></div>`).join(`<div id="demo${n - 1}"></div>`);
}

// 栈/队列作为 demo7/demo8 追加（综合应用：数组 + 函数封装）；用占位符防串号
const ren = (s, from, to) => s.split(`createDemo("${from}"`).join(`createDemo("${to}"`);
let sq = fs.readFileSync('tools/_sq_blocks.js', 'utf8').trim();
sq = ren(ren(sq, 'demo6', 'demo_SQ1'), 'demo7', 'demo_SQ2');
sq = ren(ren(sq, 'demo_SQ1', 'demo7'), 'demo_SQ2', 'demo8');
sq = '/* ========== 综合应用：用函数封装栈与队列 ========== */\r\n' + sq.split('\n').join('\r\n') + '\r\n';
const quizAnchor = '/* ========== 章节练习';
const qAt = t.indexOf(quizAnchor);
if (qAt < 0) throw new Error('function 练习区锚点未找到');
t = t.slice(0, qAt) + sq + t.slice(qAt);

// grid：demo6（汉诺塔）后追加 demo7、demo8
t = t.replace('  <div id="demo6"></div>\r\n</div>', '  <div id="demo6"></div>\r\n  <div id="demo7"></div>\r\n  <div id="demo8"></div>\r\n</div>');

fs.writeFileSync('function.html', t, 'utf8');
fs.rmSync('tools/_sq_blocks.js');
console.log('function.html OK');

// ---------- pointer.html：demo5 后插入字典序排序 ----------
t = fs.readFileSync('pointer.html', 'utf8');
// 旧 demo6、demo7 → demo7、demo8（倒序）
for (let n = 7; n >= 6; n--) {
  t = t.split(`createDemo("demo${n}"`).join(`createDemo("demo${n + 1}"`);
  t = t.split(`<div id="demo${n}"></div>`).join(`<div id="demo${n + 1}"></div>`);
}
const sortDemo = fs.readFileSync('tools/_sort_demo.js', 'utf8').trim().split('\n').join('\r\n');
const oldDemo6 = t.indexOf('createDemo("demo7"');   // 重编号后的 malloc/free
if (oldDemo6 < 0) throw new Error('pointer demo7 锚点未找到');
t = t.slice(0, oldDemo6) + '/* ========== demo6: 字符指针数组排序 ========== */\r\n' + sortDemo + '\r\n' + t.slice(oldDemo6);
// grid：此时占位为 demo0..demo5,demo7,demo8；在 demo7 前插入 demo6
t = t.replace('  <div id="demo7"></div>', '  <div id="demo6"></div>\r\n  <div id="demo7"></div>');
fs.writeFileSync('pointer.html', t, 'utf8');
fs.rmSync('tools/_sort_demo.js');
console.log('pointer.html OK');

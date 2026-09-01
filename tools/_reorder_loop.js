// 一次性脚本：loop.html 删除 demo8（打印坐标），把 demo4（嵌套循环）移到多层循环组开头，重排编号
const fs = require('fs');
let text = fs.readFileSync('loop.html', 'utf8');

// 1) 定位每个 demo 块（含其前面的注释行）
const quizAnchor = '/* ========== 章节练习';
const quizAt = text.indexOf(quizAnchor);
const marks = [];
const re = /\/\* =+ demo(\d+):[^\n]*\*\/\r?\ncreateDemo\("demo\d+"/g;
let m;
while ((m = re.exec(text))) {
  if (m.index > quizAt) break;
  marks.push({ id: parseInt(m[1], 10), start: m.index });
}
marks.forEach((mk, i) => {
  mk.end = i + 1 < marks.length ? marks[i + 1].start : quizAt;
});
if (marks.length !== 11) throw new Error('demo 块数量不对: ' + marks.length);

const blockOf = id => text.slice(marks.find(k => k.id === id).start, marks.find(k => k.id === id).end);

// 2) 新顺序：0,1,2,3,5,6,7,4,9,10（删除 8；4 挪到 7 后面）
const order = [0, 1, 2, 3, 5, 6, 7, 4, 9, 10];
const eol = text.includes('\r\n') ? '\r\n' : '\n';
const blocks = order.map((oldId, newId) => {
  let b = blockOf(oldId).replace(/\r?\n$/, '');
  if (oldId !== newId) b = b.split(`demo${oldId}`).join(`demo${newId}`);
  return b;
});
const demosSection = blocks.join(eol) + eol;

// 3) 替换整个 demo 区域（第一个注释块到练习题注释之间）
text = text.slice(0, marks[0].start) + demosSection + text.slice(quizAt);

// 4) 重建 demo-grid 的占位 div（10 个）
const gridRe = /<div class="demo-grid">[\s\S]*?<\/div>/;
text = text.replace(gridRe,
  '<div class="demo-grid">' + eol +
  Array.from({ length: 10 }, (_, i) => `  <div id="demo${i}"></div>`).join(eol) + eol +
  '</div>');

fs.writeFileSync('loop.html', text, 'utf8');
console.log('OK：loop.html 重排完成');

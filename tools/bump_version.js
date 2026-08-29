// 缓存版本号升级：把根目录所有 HTML 中的 ?v=N 统一升到最大版本号 + 1
// 每次修改 style.css 或 demo-engine.js 后运行：node tools/bump_version.js
const fs = require('fs');

const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));
let maxV = 0;
const re = /\?v=(\d+)/g;
for (const f of files) {
  const html = fs.readFileSync(f, 'utf8');
  for (const m of html.matchAll(re)) maxV = Math.max(maxV, parseInt(m[1], 10));
}
const next = maxV + 1;
for (const f of files) {
  const html = fs.readFileSync(f, 'utf8');
  const updated = html.replace(re, `?v=${next}`);
  if (updated !== html) {
    fs.writeFileSync(f, updated);
    console.log(`OK ${f}  ->  v=${next}`);
  }
}
console.log(`完成：全部资源版本号已升级为 v=${next}`);

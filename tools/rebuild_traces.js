// Rebuild offline statement snapshots from the C code currently displayed on each page.
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const root = path.resolve(__dirname, '..');

(async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'cteaching-build-'));
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const configs = {};
    for (const chapter of require('../site-config')) {
      await page.goto('file://' + path.join(root, chapter.page));
      configs[chapter.page] = await page.evaluate(() => Object.fromEntries(
        Object.entries(demos).map(([id, demo]) => [id, demo.config])));
    }
    const input = path.join(temp, 'input.json'), raw = path.join(temp, 'raw.json');
    fs.writeFileSync(input, JSON.stringify(configs));
    const options = { cwd: root, stdio: 'inherit', env: { ...process.env, PYTHONIOENCODING: 'utf-8' } };
    execFileSync('python', [path.join(__dirname, 'generate_traces.py'), input, raw], options);
    execFileSync('python', [path.join(__dirname, 'assemble_traces.py'), input, raw], options);
  } finally {
    await browser.close();
    fs.rmSync(temp, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

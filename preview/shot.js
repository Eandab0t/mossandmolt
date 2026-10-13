// Pass 8 screenshot runner: captures the local preview at 4 viewports.
// Usage: node shot.js [baseUrl] [outDir]
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

const EXE_CANDIDATES = [
  process.env.CHROMIUM_PATH,
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  'C:\\\\Users\\\\eacam\\\\AppData\\\\Local\\\\ms-playwright\\\\chromium-1243\\\\chrome-win64\\\\chrome.exe',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
].filter(Boolean);
function chromiumOptions() {
  const executablePath = EXE_CANDIDATES.find((p) => fs.existsSync(p));
  return executablePath ? { executablePath, args: ['--no-sandbox'] } : { args: ['--no-sandbox'] };
}
const BASE = process.argv[2] || 'http://localhost:3000';
const OUT = process.argv[3] || path.join(__dirname, '..', 'qa', 'local-preview');

const VIEWPORTS = [
  [1440, 900], [1024, 768], [390, 844], [320, 700]
];
const PAGES = [
  ['home-top', '/'],
  ['home-products', '/'],
  ['collection', '/collections/neocaridina-shrimp'],
  ['all-products', '/collections/all'],
  ['product', '/products/blue-ink-demon-orange-eye-neocaridina-shrimp-deep-blue-black-live-dwarf-shrimp'],
  ['tank-builder', '/pages/tank-builder'],
  ['cart', '/cart'],
  ['search', '/search?q=blue'],
  ['404', '/nope-missing-route']
];

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch(chromiumOptions());
  const errors = [];
  for (const [w, h] of VIEWPORTS) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 120)); });
    page.on('pageerror', (e) => errors.push(String(e).slice(0, 120)));
    for (const [name, url] of PAGES) {
      try {
        await page.goto(BASE + url + (url.includes('?') ? '&' : '?') + 'clean=1', { waitUntil: 'networkidle', timeout: 45000 });
        if (name === 'home-products') { await page.evaluate(() => { const w = document.querySelector('.page-wrapper'); if (w) w.scrollTop = 900; }); }
        if (name === '404') { await page.evaluate(() => { window.scrollTo(0, 0); }); }
        await page.waitForTimeout(800);
        const file = path.join(OUT, `pass8-${name}-${w}x${h}.png`);
        await page.screenshot({ path: file });
        console.log('shot ' + path.basename(file));
      } catch (e) { console.log('FAILED ' + name + ' ' + w + ': ' + String(e).slice(0, 100)); }
    }
    await page.close();
  }
  await browser.close();
  const uniq = [...new Set(errors)].slice(0, 20);
  fs.writeFileSync(path.join(OUT, 'console-errors.txt'), uniq.join('\n') || '(no console errors)');
  console.log('console errors: ' + uniq.length);

  // contact sheet
  const files = fs.readdirSync(OUT).filter((f) => f.endsWith('.png')).sort();
  const rows = VIEWPORTS.map(([w, h]) => {
    const cells = PAGES.map(([name]) => {
      const f = `pass8-${name}-${w}x${h}.png`;
      return files.includes(f) ? `<td><a href="${f}"><img src="${f}" style="width:100%"></a><br>${f}</td>` : `<td>missing ${f}</td>`;
    }).join('');
    return `<tr><td>${w}x${h}</td>${cells}</tr>`;
  }).join('\n');
  const heads = PAGES.map(([n]) => `<th>${n}</th>`).join('');
  fs.writeFileSync(path.join(OUT, 'index.html'),
    `<!doctype html><html><head><meta charset="utf8"><title>Pass 8 local preview contact sheet</title></head>`
    + `<body style="background:#08120F;color:#EDF5EE;font-family:sans-serif"><h1>Pass 8 local preview (sample data)</h1>`
    + `<table border="1" cellpadding="6"><tr><th>viewport</th>${heads}</tr>${rows}</table></body></html>`);
  console.log('contact sheet written');
}
main();

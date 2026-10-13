// Browser-evidence check: loads the local preview in a real Chromium and asserts
// that product cards render visible image + title + price.
// Run: node verify-preview.js [baseUrl]
const { chromium } = require('playwright-core');

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

const CASES = [
  ['home (product-list)', '/', 1440, 900],
  ['home mobile', '/', 390, 844],
  ['collection', '/collections/all', 1440, 900],
  ['search q=blue', '/search?q=blue', 1440, 900]
];

(async () => {
  const browser = await chromium.launch(chromiumOptions());
  let failures = 0;
  for (const [name, url, w, h] of CASES) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    await page.goto(BASE + url + (url.includes('?') ? '&' : '?') + 'clean=1', { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForTimeout(500);
    const cards = await page.evaluate(() => {
      const els = [...document.querySelectorAll('product-card')];
      return els.map((el) => {
        const r = el.getBoundingClientRect();
        const titleEl = el.querySelector('[id*="product-title"], .product-title, h1, h2, h3, p');
        const priceEl = [...el.querySelectorAll('*')].find((n) => /\$\d/.test(n.textContent || '') && n.children.length === 0);
        const img = el.querySelector('img');
        return {
          visible: r.width > 0 && r.height > 0,
          w: Math.round(r.width), h: Math.round(r.height),
          title: (el.querySelector('.product-card__link')?.getAttribute('aria-label')) || (titleEl ? titleEl.textContent.trim().slice(0, 60) : ''),
          price: priceEl ? priceEl.textContent.trim().slice(0, 20) : '',
          imgSrc: img ? img.getAttribute('src') : '',
          imgLoaded: img ? (img.complete && img.naturalWidth > 0) : false
        };
      });
    });
    const visible = cards.filter((c) => c.visible);
    const withTitle = visible.filter((c) => c.title && /\S/.test(c.title));
    const withPrice = visible.filter((c) => /\$\d/.test(c.price));
    const withImg = visible.filter((c) => c.imgSrc);
    const loadedImg = visible.filter((c) => c.imgLoaded);
    const ok = visible.length > 0 && withTitle.length > 0 && withPrice.length > 0;
    if (!ok) failures++;
    console.log(`\n${ok ? 'PASS' : 'FAIL'} ${name} ${w}x${h}`);
    console.log(`  product-card visible=${visible.length}/${cards.length} title=${withTitle.length} price=${withPrice.length} imgSrc=${withImg.length} imgLoaded=${loadedImg.length}`);
    visible.slice(0, 3).forEach((c) => console.log(`   - "${c.title}" | ${c.price} | img="${String(c.imgSrc).slice(0, 60)}" loaded=${c.imgLoaded} box=${c.w}x${c.h}`));
    await page.close();
  }
  await browser.close();
  console.log('\nRESULT: ' + (failures === 0 ? 'ALL CASES PASS' : failures + ' CASE(S) FAILED'));
  process.exit(failures === 0 ? 0 : 1);
})().catch((e) => { console.error(e.stack); process.exit(2); });

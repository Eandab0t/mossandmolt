// Standalone regression test for the content_for shim + _product-card block.
// Uses the real preview engine and the registered content_for tag.
// Run: node preview/test-content-for.js      (add --dump to print raw HTML)
const fs = require('fs');
const path = require('path');
const base = require('./base');
const eng = require('./engine');

const DUMP = process.argv.includes('--dump');
function fail(msg) { process.stderr.write('FAIL: ' + msg + '\n'); }
function ok(msg) { process.stdout.write('PASS: ' + msg + '\n'); }

function loadSection(sectionId) {
  let raw = base.read(path.join(base.THEME, 'templates', 'index.json'));
  raw = raw.replace(/^\/\*[\s\S]*?\*\//, '');
  const j = JSON.parse(raw);
  return { id: sectionId, json: j.sections[sectionId] };
}

function baseScope(extra) {
  return Object.assign({
    settings: base.SETTINGS,
    shop: base.SHOP,
    cart: base.CART,
    routes: { root: '/', cart_url: '/cart', search_url: '/search' },
    request: { design_mode: false, visual_preview_mode: false, locale: { iso_code: 'en', direction: 'ltr' } },
    linklists: base.LINKLISTS,
    content_for_header: '',
    page_title: 'test',
    template: 'index',
    closest: {}
  }, extra || {});
}

(async () => {
  const FIX = base.PRODUCTS[0];
  const section = loadSection('product_list_fa6P9H');
  const card = section.json.blocks['static-product-card'];

  // ---- Test 1: render _product-card file directly with fixture product ----
  process.stdout.write('\n== Test 1: renderBlock(_product-card) directly ==\n');
  let direct = '';
  try {
    direct = await eng.renderBlock('_product-card', card, Object.assign(baseScope(), {
      closest: { product: FIX },
      section: {
        id: 'preview-product-list',
        settings: eng.resolveRefSettings(section.json.settings || {}),
        blocks: section.json.blocks || {},
        block_order: section.json.block_order || Object.keys(section.json.blocks || {}),
        index: 1
      }
    }));
  } catch (e) { fail('renderBlock threw: ' + e.message + '\n' + e.stack); }
  if (DUMP) process.stdout.write('\n--- direct HTML (' + direct.length + ' bytes) ---\n' + direct + '\n--- end ---\n');
  if (direct.length > 0) ok('direct render produced non-empty HTML (' + direct.length + ' bytes)');
  else fail('direct render produced EMPTY HTML');
  (function () {
    const title = FIX.title;
    const price = '$' + (FIX.price / 100).toFixed(2);
    const img = FIX.featured_image.src;
    if (direct.indexOf(title) !== -1) ok('direct HTML contains fixture title: ' + title);
    else fail('direct HTML MISSING fixture title: ' + title);
    if (direct.indexOf(price) !== -1) ok('direct HTML contains fixture price: ' + price);
    else fail('direct HTML MISSING fixture price: ' + price);
    if (direct.indexOf(img) !== -1) ok('direct HTML contains fixture image: ' + img.slice(0, 70));
    else fail('direct HTML MISSING fixture image');
    if (direct.indexOf('product-card-') !== -1) ok('direct HTML contains product-card element');
    else fail('direct HTML MISSING product-card element');
  })();

  // ---- Test 2-5: render the product-list section (exercises content_for 'block' + for loop) ----
  process.stdout.write('\n== Test 2-5: renderSection(product-list) ==\n');
  let sec = '';
  try {
    sec = await eng.renderSection('product-list', section.json, baseScope());
  } catch (e) { fail('renderSection threw: ' + e.message + '\n' + e.stack); }
  if (DUMP) process.stdout.write('\n--- section HTML (' + sec.length + ' bytes) ---\n' + sec + '\n--- end ---\n');
  if (sec.length > 0) ok('section render produced non-empty HTML (' + sec.length + ' bytes)');
  else fail('section render produced EMPTY HTML');

  const itemCount = (sec.match(/class="resource-list__item"/g) || []).length;
  process.stdout.write('INFO: resource-list__item count = ' + itemCount + '\n');
  (function () {
    const title = FIX.title;
    if (sec.indexOf(title) !== -1) ok('section HTML contains fixture title: ' + title);
    else fail('section HTML MISSING fixture title (content_for block / for-loop not rendering)');
    const price = '$' + (FIX.price / 100).toFixed(2);
    if (sec.indexOf(price) !== -1) ok('section HTML contains fixture price: ' + price);
    else fail('section HTML MISSING fixture price');
  })();

  process.stdout.write('\nGAPS: ' + JSON.stringify(base.getGaps()) + '\n');
  process.stdout.write('\nDONE\n');
})().catch((e) => { process.stderr.write('UNCAUGHT: ' + e.stack + '\n'); process.exit(1); });

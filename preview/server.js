const fs = require('fs');
const path = require('path');
const express = require('express');
const base = require('./base');
const eng = require('./engine');

const app = express();
app.use((req, res, next) => { globalThis.PREVIEW_CLEAN = !!req.query.clean; next(); });
const PORT = process.env.PORT || 3000;

// theme static assets
app.use('/assets', express.static(path.join(base.THEME, 'assets')));
// placeholder for unmapped admin images
app.get('/preview-placeholder.svg', (req, res) => {
  res.type('svg').send(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800"><rect width="800" height="800" fill="#0B1F1A"/><rect x="350" y="350" width="100" height="100" fill="#12342B"/><text x="400" y="480" fill="#2BB3A3" font-family="monospace" font-size="20" text-anchor="middle">sample image</text></svg>`);
});

function loadTemplate(name) {
  let raw = base.read(path.join(base.THEME, 'templates', name + '.json'));
  raw = raw.replace(/^\/\*[\s\S]*?\*\//, '');
  return JSON.parse(raw);
}
function baseScope(extra) {
  return Object.assign({
    settings: base.SETTINGS,
    shop: base.SHOP,
    cart: base.CART,
    routes: { root: '/', cart_url: '/cart', search_url: '/search', predictive_search_url: '/search/suggest' },
    request: { design_mode: false, visual_preview_mode: false, locale: { iso_code: 'en', direction: 'ltr' } },
    linklists: base.LINKLISTS,
    content_for_header: '',
    page_title: 'Moss&Molt (local preview)',
    page_description: 'Local theme preview with sample data',
    canonical_url: 'http://localhost:' + PORT + '/'
  }, extra || {});
}
async function renderPage(templateName, context) {
  const tpl = loadTemplate(templateName);
  const scope = baseScope(context.scope || {});
  let layoutHtml = '';
  try {
    let body = '';
    for (const id of tpl.order || Object.keys(tpl.sections || {})) {
      const s = (tpl.sections || {})[id];
      if (!s || s.disabled) continue;
      body += await eng.renderSection(s.type, s, scope);
    }
    scope.content_for_layout = body;
    const layoutSrc = base.read(path.join(base.THEME, 'layout', 'theme.liquid'));
    layoutHtml = await eng.engine.parseAndRender(eng.preprocess(layoutSrc), scope);
  } catch (e) {
    base.gap('page-error:' + templateName + ':' + String(e.message).slice(0, 120));
    layoutHtml = '<h1>Preview render error</h1><pre>' + String(e.message).slice(0, 500) + '</pre>';
  }
  if (context.toolbar !== false && !globalThis.PREVIEW_CLEAN) {
    var btns = [1440, 1024, 390, 320].map(function (w) {
      return '<button data-w="' + w + '" style="margin:0 2px;background:#12342B;color:#EDF5EE;border:1px solid #2BB3A3;border-radius:4px;cursor:pointer">' + w + '</button>';
    }).join('');
    layoutHtml += '<div style="position:fixed;bottom:8px;right:8px;z-index:9999;background:#08120F;border:1px solid #2BB3A3;border-radius:8px;padding:6px 10px;font:12px monospace;color:#EDF5EE">preview ' + btns + '<span style="margin-left:6px;color:#7FD4C1">sample data</span></div>';
    layoutHtml += '<script>document.querySelectorAll("[data-w]").forEach(function(b){b.onclick=function(){document.body.style.maxWidth=b.dataset.w+"px";document.body.style.margin="0 auto";};});</script>';
  }
  return layoutHtml;
}

function productScope(handle) {
  const p = base.PRODUCTS.find((x) => x.handle === handle) || base.PRODUCTS[0];
  return { closest: { product: p, collection: base.COLLECTIONS['neocaridina-shrimp'] }, product: p, template: 'product' };
}
function collectionScope(handle) {
  const c = base.COLLECTIONS[handle] || base.COLLECTIONS['all'];
  return { closest: { collection: c }, collection: c, template: 'collection', paginate: { pages: 1, current_page: 1 } };
}

app.get('/', async (req, res) => {
  res.send(await renderPage('index', { scope: { template: 'index', closest: {} } }));
});
app.get('/collections/all', async (req, res) => {
  res.send(await renderPage('collection', { scope: collectionScope('all') }));
});
app.get('/collections/:handle', async (req, res) => {
  res.send(await renderPage('collection', { scope: collectionScope(req.params.handle) }));
});
app.get('/products/:handle', async (req, res) => {
  res.send(await renderPage('product', { scope: productScope(req.params.handle) }));
});
app.get('/pages/tank-builder', async (req, res) => {
  const html = await renderPage('page', { scope: { template: 'page', closest: {}, page: { title: 'Tank Builder' } } });
  res.send(html.replace('</body>', '<div style="max-width:1200px;margin:0 auto;padding:24px;color:#EDF5EE;font-family:monospace;border:2px dashed #2BB3A3">[PREVIEW PLACEHOLDER] The Tank Builder app renders here on the live store; it is not part of the theme files.</div></body>'));
});
app.get('/pages/:page', async (req, res) => {
  res.send(await renderPage('page', { scope: { template: 'page', closest: {}, page: { title: req.params.page } } }));
});
app.get('/cart', async (req, res) => {
  res.send(await renderPage('cart', { scope: { template: 'cart' } }));
});
app.get('/search', async (req, res) => {
  const q = req.query.q || '';
  const results = q ? base.PRODUCTS.filter((p) => p.title.toLowerCase().includes(q.toLowerCase())) : [];
  res.send(await renderPage('search', { scope: { template: 'search', search: { terms: q, results, results_count: results.length, performed: !!q } } }));
});
app.get('/gaps', (req, res) => res.json(base.getGaps()));
app.use(async (req, res) => {
  res.status(404).send(await renderPage('404', { scope: { template: '404' } }));
});

app.listen(PORT, () => console.log('Moss&Molt preview at http://localhost:' + PORT));

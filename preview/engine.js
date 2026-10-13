const path = require('path');
const { Liquid, Drop } = require('liquidjs');
const base = require('./base');

const shoptags = require('./shoptags');
const engine = new Liquid({ root: [path.join(__dirname, '..', 'snippets')], extname: '.liquid', strictFilters: false, strictVariables: false });

// ---------- preprocess: convert Shopify-only syntax to renderable form ----------
function convertLiquidTag(src) {
  // {% liquid ... %} -> individual tags (assign/echo/if/for/capture/etc.)
  return src.replace(/\{%-?\s*liquid\s+([\s\S]*?)\s*-?%\}/g, (m, body) => {
    const lines = body.split('\n').map((l) => l.trim()).filter(Boolean);
    return lines.map((l) => {
      if (/^echo\s+/.test(l)) return '{{ ' + l.replace(/^echo\s+/, '') + ' }}';
      return '{% ' + l + ' %}';
    }).join('\n');
  });
}
function preprocess(src) {
  let s = String(src);
  s = convertLiquidTag(s);
  s = s.replace(/\{%-?\s*#[\s\S]*?-?%\}/g, '');                       // {% # comment %}
  s = s.replace(/\{%-?\s*doc\s*-?%\}[\s\S]*?\{%-?\s*enddoc\s*-?%\}/g, '');
  s = s.replace(/\{%-?\s*schema\s*-?%\}[\s\S]*?\{%-?\s*endschema\s*-?%\}/g, '');
  s = s.replace(/\{%-?\s*stylesheet\s*-?%\}([\s\S]*?)\{%-?\s*endstylesheet\s*-?%\}/g, (m, b) => '<style data-shopify>' + b + '</style>');
  s = s.replace(/\{%-?\s*javascript\s*-?%\}[\s\S]*?\{%-?\s*endjavascript\s*-?%\}/g, '');
  s = s.replace(/\{%-?\s*style\s*-?%\}([\s\S]*?)\{%-?\s*endstyle\s*-?%\}/g, (m, b) => '<style>' + b + '</style>');
  s = s.replace(/\{%-?\s*form\s+[^%]*?%\}([\s\S]*?)\{%-?\s*endform\s*-?%\}/g, (m, b) => '<form>' + b + '</form>');
  s = s.replace(/\{%-?\s*paginate\s+[^%]*?%\}([\s\S]*?)\{%-?\s*endpaginate\s*-?%\}/g, (m, b) => b);
  return s;
}

// ---------- filters ----------
function imgSrc(v) {
  v = require('./base').resolveShopifyUrl(v);
  if (v == null) return '';
  if (typeof v === 'string') return v;
  return v.src || v.url || '';
}
engine.registerFilter('asset_url', (v) => '/assets/' + String(v));
engine.registerFilter('stylesheet_tag', (v, ...a) => '<link rel="stylesheet" href="' + v + '">');
engine.registerFilter('preload_tag', (v) => '<link rel="preload" href="' + v + '">');
engine.registerFilter('image_url', (v, ...args) => {
  let s = imgSrc(v); if (s && typeof s === 'object') s = s.src || s.url || '';
  const named = {};
  for (const a of args) {
    if (a && typeof a === 'object' && !Array.isArray(a)) Object.assign(named, a);
  }
  if (named.width && s && !/[?&]width=/.test(s)) s += (s.includes('?') ? '&' : '?') + 'width=' + named.width;
  return s;
});
engine.registerFilter('image_tag', (v, ...args) => {
  const s = imgSrc(v);
  return '<img src="' + s + '" alt="">';
});
engine.registerFilter('money', (v) => {
  const n = Number(v);
  if (isNaN(n)) return v;
  return '$' + (n / 100).toFixed(2);
});
engine.registerFilter('t', (v, ...args) => {
  let s = String(base.tlookup(v));
  if (args.length && typeof args[0] === 'object') {
    for (const k of Object.keys(args[0] || {})) s = s.split('{{ ' + k + ' }}').join(String(args[0][k]));
  }
  return s;
});
engine.registerFilter('font_url', () => '');
engine.registerFilter('font_face', () => '');
engine.registerFilter('font_modify', (v) => v);
engine.registerFilter('color_brightness', (v) => {
  const m = String(v || '').match(/#?([0-9a-f]{6})/i);
  if (!m) return 128;
  const r = parseInt(m[1].slice(0, 2), 16), g = parseInt(m[1].slice(2, 4), 16), b = parseInt(m[1].slice(4, 6), 16);
  return Math.round((r * 299 + g * 587 + b * 114) / 1000);
});
engine.registerFilter('json', (v) => JSON.stringify(v));
engine.registerFilter('handle', (v) => String(v || '').toLowerCase().replace(/[^a-z0-9]+/g, '-'));
engine.registerFilter('metafield_tag', () => '');
engine.registerFilter('inline_asset_content', () => '');
engine.registerFilter('placeholder_svg_tag', (v, cls) => '<svg class="' + (cls || '') + '"><rect width="100" height="100" fill="#12342B"/></svg>');

// ---------- block/section resolution ----------
function blockFile(type) {
  const p = path.join(base.THEME, 'blocks', type + '.liquid');
  return base.read(p);
}
function sectionFile(type) {
  const p = path.join(base.THEME, 'sections', type + '.liquid');
  return base.read(p);
}
function snippetFile(name) {
  const p = path.join(base.THEME, 'snippets', name + '.liquid');
  return base.read(p);
}
// {% content_for 'blocks' %} inside a section: render section.blocks in block_order
engine.registerTag('content_for', {
  parse(tagToken, remainTokens) {
    this.args = tagToken.args;
  },
  async render(ctx) {
    const a = this.args.trim();
    const scope = ctx.getAll ? ctx.getAll() : {};
    // {% content_for 'block', type: 'x', id: 'y' %} -> single static block
    const single = a.match(/^['"]block['"]\s*,\s*type:\s*['"]([^'"]+)['"]\s*,\s*id:\s*['"]([^'"]+)['"]/);
    if (single) {
      const sec = ((scope.block && scope.block.blocks) ? { blocks: scope.block.blocks, block_order: scope.block.block_order } : scope.section) || {};
      const blocks = sec.blocks || {};
      let found = blocks[single[2]];
      if (!found) found = Object.values(blocks).find((b) => b && b.type === single[1]);
      if (!found) { base.gap('content_for-missing:' + single[1] + '/' + single[2]); return ''; }
      // trailing params like: closest.product: product, product_view_context: 'collection'
      const tail = a.slice(single[0].length);
      const sub2 = Object.assign({}, scope);
      sub2.closest = Object.assign({}, scope.closest);
      const cp = tail.match(/closest\.product\s*:\s*([A-Za-z_][\w.]*)/);
      if (cp && cp[1] !== 'null' && cp[1] !== 'nil' && cp[1] !== 'empty') {
        try { sub2.closest.product = ctx.get(cp[1].split('.')); } catch (e) { sub2.closest.product = null; }
      } else if (/closest\.product\s*:\s*(null|nil|empty)/.test(tail)) {
        sub2.closest.product = null;
      }
      const cc = tail.match(/closest\.collection\s*:\s*([A-Za-z_][\w.]*)/);
      if (cc && !/^(null|nil|empty)$/.test(cc[1])) {
        try { sub2.closest.collection = ctx.get(cc[1].split('.')); } catch (e) { sub2.closest.collection = null; }
      }
      return renderBlock(single[1], found, sub2);
    }

    // {% content_for 'blocks' %} -> all blocks in order
    const sec = ((scope.block && scope.block.blocks) ? { blocks: scope.block.blocks, block_order: scope.block.block_order } : scope.section) || {};
    const blocks = sec.blocks || {};
    const order = sec.block_order || Object.keys(blocks);
    let out = '';
    for (const id of order) {
      const b = blocks[id];
      if (!b) continue;
      out += await renderBlock(b.type, Object.assign({ _id: id }, b), scope);
    }
    return out;
  }
});
async function renderBlock(type, block, scope) {
  let src;
  try { src = blockFile(type); }
  catch (e) { base.gap('block-missing:' + type); return '<!-- missing block ' + type + ' -->'; }
  const settings = Object.assign({}, block.settings || {});
  // resolve shopify:// urls in settings
  for (const k of Object.keys(settings)) {
    if (typeof settings[k] === 'string' && settings[k].startsWith('shopify://')) {
      settings[k] = base.resolveShopifyUrl(settings[k]);
    }
  }
  const sub = Object.assign({}, scope, { block: { settings, type, blocks: block.blocks, block_order: block.block_order }, closest: scope.closest });
  const prevGlobals = engine.options.globals;
  engine.options.globals = Object.assign({}, prevGlobals, { closest: sub.closest, section: sub.section, block: sub.block, settings: sub.settings });
  try {
    return await engine.parseAndRender(preprocess(src), sub);
  } catch (e) {
    base.gap('block-error:' + type + ':' + String(e.message).slice(0, 80));
    return '<!-- block error ' + type + ' -->';
  } finally {
    engine.options.globals = prevGlobals;
  }
}
// {% sections 'group-name' %} -> render group json
engine.registerTag('sections', {
  parse(tagToken) { this.args = tagToken.args; },
  async render(ctx) {
    const m = this.args.match(/['"]([^'"]+)['"]/);
    if (!m) return '';
    const scope = ctx.getAll ? ctx.getAll() : {};
    let grp;
    try { grp = JSON.parse(base.read(path.join(base.THEME, 'sections', m[1] + '.json'))); }
    catch (e) { base.gap('group-missing:' + m[1]); return ''; }
    let out = '';
    for (const id of grp.order || Object.keys(grp.sections || {})) {
      const s = (grp.sections || {})[id];
      if (!s || s.disabled) continue;
      out += await renderSection(s.type, s, scope);
    }
    return out;
  }
});
async function renderSection(type, sectionJson, scope) {
  let src;
  try { src = sectionFile(type); }
  catch (e) { base.gap('section-missing:' + type); return '<!-- missing section ' + type + ' -->'; }
  const sub = Object.assign({}, scope, {
    section: {
      id: 'preview-' + type,
      settings: resolveRefSettings(sectionJson.settings || {}),
      blocks: sectionJson.blocks || {},
      block_order: sectionJson.block_order || Object.keys(sectionJson.blocks || {}),
      index: 1
    }
  });
  const prevGlobals = engine.options.globals;
  const sectionGlobals = Object.assign({}, prevGlobals, { closest: sub.closest, section: sub.section, settings: sub.settings });
  delete sectionGlobals.block;
  engine.options.globals = sectionGlobals;
  try {
    return await engine.parseAndRender(preprocess(src), sub);
  } catch (e) {
    base.gap('section-error:' + type + ':' + String(e.message).slice(0, 80));
    return '<!-- section error ' + type + ' -->';
  } finally {
    engine.options.globals = prevGlobals;
  }
}
// silence {% theme_editor ... %} style unknown tags gracefully
engine.registerTag('theme_editor', { parse() {}, render() { return ''; } });

module.exports = { engine, resolveRefSettings, preprocess, renderBlock, renderSection };

shoptags.dropTag(engine, 'doc');
shoptags.dropTag(engine, 'schema');
shoptags.dropTag(engine, 'javascript');
shoptags.styleTag(engine, 'style');
shoptags.styleTag(engine, 'stylesheet');

shoptags.wrapTag(engine, 'form', '<form>', '</form>');
shoptags.wrapTag(engine, 'paginate', '', '');
function resolveRefSettings(settings) { const out = Object.assign({}, settings); const b2 = require('./base'); for (const k of Object.keys(out)) { if (typeof out[k] !== 'string') continue; if (out[k].indexOf('shopify://') === 0) { out[k] = b2.resolveShopifyUrl(out[k]); continue; } if ((k === 'collection' || k.endsWith('_collection')) && b2.COLLECTIONS[out[k]]) out[k] = b2.COLLECTIONS[out[k]]; if (k === 'product') { const p = b2.PRODUCTS.find((x) => x.handle === out[k]); if (p) out[k] = p; } } return out; }

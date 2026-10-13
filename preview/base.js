const fs = require('fs');
const path = require('path');

const THEME = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(f, 'utf8');
const gaps = new Set();
const gap = (s) => { gaps.add(s); };

// ---------- settings (resolve {{ settings.x }} refs) ----------
function loadSettings() {
  const raw = JSON.parse(read(path.join(THEME, 'config', 'settings_data.json')));
  const out = Object.assign({}, raw.current || {});
  for (const k of Object.keys(out)) {
    if (typeof out[k] === 'string') {
      const m = out[k].match(/^\{\{\s*settings\.([\w.]+)\s*\}\}$/);
      if (m) {
        const segs = m[1].split('.');
        let v = out;
        for (const s of segs) v = (v == null) ? v : v[s];
        if (v !== undefined) out[k] = v;
      }
    }
  }
  return out;
}
const SETTINGS = loadSettings();

// ---------- locale ----------
let LOCALE = {};
try { LOCALE = JSON.parse(read(path.join(THEME, 'locales', 'en.default.json')).replace(/^\/\*[\s\S]*?\*\//, '').replace(/^\s*\/\/.*$/gm, '')); }
catch (e) { gap('locale-missing'); }
function tlookup(key) {
  const parts = String(key).split('.');
  let v = LOCALE;
  for (const p of parts) { v = (v && typeof v === 'object') ? v[p] : undefined; }
  return v === undefined ? key : v;
}

// ---------- fixtures (SAMPLE DATA - not real store data) ----------
const CDN = 'https://www.mossandmolt.com/cdn/shop/files/';
function shopImg(name, w) { return CDN + name + '?v=1790790095&width=' + (w || 1200); }
function mkProduct(handle, title, cents, available, imgs) {
  const images = imgs.map((n, ix) => { const src = shopImg(n); return { id: 7000 + ix, media_type: 'image', src: src, url: src, alt: title, width: 1200, height: 1200, aspect_ratio: 1, preview_image: { src: src, alt: title, width: 1200, height: 1200, aspect_ratio: 1 } }; });
  return {
    title, handle, url: '/products/' + handle, description: title, object_type: 'product',
    price: cents, compare_at_price: null, available,
    featured_image: images[0], featured_media: images[0], images, media: images,
    variants: [{ id: 1, title: 'Default Title', price: cents, available }],
    options: [], options_with_values: []
  };
}
const PRODUCTS = [
  mkProduct('blue-ink-demon-orange-eye-neocaridina-shrimp-deep-blue-black-live-dwarf-shrimp', '(OE) Blue Ink Demon \u2014 Neocaridina Shrimp', 14500, true, ['IMG_0546_071908b7-65b8-4498-ba3e-34ab178e73fe.jpg', 'IMG_0503.jpg', 'FECBC23E-7EB7-4C5E-A1A0-FBF5406C35EF.jpg']),
  mkProduct('10-1-orange-eye-blue-demon-neocaridina-shrimp-usa-bred', '(OE) Blue Demon Marbled \u2014 Neocaridina Shrimp', 12499, true, ['6F5514BC-5853-4745-A65B-9C748F81DF01.jpg', 'IMG_1528.jpg', 'IMG_4005.jpg']),
  mkProduct('yellow-eye-red-neocaridina-painted-red-grade', '(YE) Painted Cherry Red - Neocaridina Shrimp', 5999, false, ['IMG_0091.jpg', 'IMG_0080.jpg']),
  mkProduct('yellow-eye-red-neocaridina-sakura-grade', '(YE) Sakura Red \u2014 Neocaridina Shrimp', 4999, true, ['IMG_0101_15acd9e5-14fb-401e-b1e5-af17f02a558f.jpg', 'IMG_0627_da31a1d6-0328-49cf-b886-1a81b52aa37d.jpg']),
  mkProduct('orange-eye-blue-demon-culls-mixed-grade-neocaridina', '(OE) Blue Demon Culls \u2014 Neocaridina Shrimp', 4999, true, ['IMG_0209.jpg', 'IMG_0208.jpg'])
];
function mkCollection(handle, title, desc, products) {
  return { title, handle, url: '/collections/' + handle, description: desc || '', image: null, products: products || [], all_products_count: (products || []).length };
}
const byHandle = (h) => PRODUCTS.find((p) => p.handle === h);
const COLLECTIONS = {
  'all': mkCollection('all', 'Products', '', PRODUCTS),
  'neocaridina-shrimp': mkCollection('neocaridina-shrimp', 'Neocaridina Shrimp', '', PRODUCTS),
  'orange-eye-neocaridina-shrimp': mkCollection('orange-eye-neocaridina-shrimp', 'ORANGE EYE NEOS', '', [byHandle('blue-ink-demon-orange-eye-neocaridina-shrimp-deep-blue-black-live-dwarf-shrimp'), byHandle('10-1-orange-eye-blue-demon-neocaridina-shrimp-usa-bred'), byHandle('orange-eye-blue-demon-culls-mixed-grade-neocaridina')]),
  'yellow-eye-neocaridina-shrimp': mkCollection('yellow-eye-neocaridina-shrimp', 'YELLOW EYE NEOS', '', [byHandle('yellow-eye-red-neocaridina-painted-red-grade'), byHandle('yellow-eye-red-neocaridina-sakura-grade')]),
  'culls': mkCollection('culls', 'LOW GRADES/CULLS', '', [byHandle('orange-eye-blue-demon-culls-mixed-grade-neocaridina')]),
  'aquatic-plants': mkCollection('aquatic-plants', 'AQUATIC PLANTS', '', []),
  'aquarium-equipment': mkCollection('aquarium-equipment', 'AQUARIUM EQUIPMENT', '', []),
  'snails': mkCollection('snails', 'OTHER INVERTEBRATES', '', [])
};
const SHOP = { name: 'Moss&Molt', url: 'https://www.mossandmolt.com', products_count: PRODUCTS.length };
const CART = { item_count: 0, items: [], total_price: 0, empty: true };
const SHOP_IMAGES = {
  'Gemini_Generated_Image_8znzlt8znzlt8znz.jpg': shopImg('Gemini_Generated_Image_8znzlt8znzlt8znz.jpg', 1600),
  'Moss_Molt_Aquatic_Emblem_3.png': 'https://www.mossandmolt.com/cdn/shop/files/Moss_Molt_Aquatic_Emblem_3.png?v=1791733366&width=1600',
  '2B2CB392-FF30-4B87-852B-A80BCDEA2C93.gif': 'https://www.mossandmolt.com/cdn/shop/files/2B2CB392-FF30-4B87-852B-A80BCDEA2C93.gif?v=1791733374&width=1200',
  'Gemini_Generated_Image_q07uncq07uncq07u.jpg': { src: 'https://www.mossandmolt.com/cdn/shop/files/Gemini_Generated_Image_q07uncq07uncq07u.jpg?v=1791733365&width=800', w: 800, h: 800 },
  'moss-and-molt-wordmark-black.png': { src: 'https://www.mossandmolt.com/cdn/shop/files/moss-and-molt-wordmark-black.png?v=1791755604&width=1000', w: 1000, h: 126 },
};
function resolveShopifyUrl(v) {
  if (typeof v !== 'string') return v;
  let m = v.match(/^shopify:\/\/shop_images\/(.+)$/);
  if (m) { const hit = SHOP_IMAGES[m[1]]; const src = (hit && hit.src) || hit || ('/preview-placeholder.svg?file=' + encodeURIComponent(m[1])); const w = (hit && hit.w) || 1600; const h = (hit && hit.h) || 900; return { src: src, alt: '', width: w, height: h, aspect_ratio: w / h, url: src }; }
  m = v.match(/^shopify:\/\/(collections|products|pages|blogs)\/(.+)$/);
  if (m) return '/' + m[1] + '/' + m[2];
  return v;
}

module.exports = { THEME, read, gaps, gap, getGaps: () => [...gaps], SETTINGS, tlookup, PRODUCTS, COLLECTIONS, SHOP, CART, resolveShopifyUrl };

// ---------- sample navigation + variant shims ----------
PRODUCTS.forEach((p, i) => {
  p.id = 9000001 + i;
  p.selected_variant = p.variants[0];
  p.selected_or_first_available_variant = p.variants[0];
  p.has_only_default_variant = true;
  p.options_with_values = [];
});
function mkLink(title, url) { return { title, url, links: [], active: false }; }
const LINKLISTS = {
  'main-menu': { links: [
    mkLink('Home', '/'),
    mkLink('Shop', '/collections/all'),
    mkLink('Care Guides', '/'),
    mkLink('Tank Simulator(Coming Soon)', '/'),
    mkLink('Contact/About Us', '/pages/contact')
  ] },
  'customer-account-main-menu': { links: [] }
};
module.exports.LINKLISTS = LINKLISTS;

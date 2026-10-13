# Pass 8 report correction — product-card rendering

Status: the product-grid evidence in the original Pass 8 report was NOT valid.

## What was wrong
The local preview's `content_for` shim leaked a `block` value into
`engine.options.globals`. Because LiquidJS snapshots globals into each render
context, the first section that rendered a block (the hero) left a stale
`scope.block` (a `button` block) in the global state. The product-list section
was rendered next, so its `content_for 'block'` calls resolved against the
hero's block collection instead of the section's own `section.blocks`. The
lookups for `static-header` and `static-product-card` failed and every
`div.resource-list__item` was emitted empty.

## Evidence (before fix)
- `node -e` rendering `hero_jVaWmY` then `product_list_fa6P9H` in one process:
  product-list `len=48994`, `BlueInk=false`, gaps =
  `["content_for-missing:_product-list-content/static-header",
    "content_for-missing:_product-card/static-product-card"]`.
- Running server `GET /?clean=1`: `len=340940`, `BlueInk=False`,
  `product-card=0`, 36 empty `.resource-list__item`.

## Fix
`preview/engine.js`
- `renderBlock`: save `engine.options.globals` before mutating and restore it in
  `finally`, so a block's globals can never leak into the next render.
- `renderSection`: delete `block` from the section's globals so a section-level
  `content_for 'block'` always resolves against `scope.section`.

`preview/base.js`
- Fixture products now carry `object_type: 'product'`, which the search results
  section requires (`search.results | where: 'object_type','product'`).

## Evidence (after fix)
- Standalone test `preview/test-content-for.js`: all checks PASS, `GAPS: []`.
- Full homepage sequence in one process: product-list `len=1267972`,
  `BlueInk=true`.
- Browser check `preview/verify-preview.js` (headless Chromium):
  - home 1440x900 and 390x844: visible cards with titles, prices and loaded images.
  - collection /collections/all: 5/5 cards.
  - search ?q=blue: 3/3 cards.

## Replacement screenshots
All `qa/local-preview/pass8-*.png` were recaptured from the fixed preview
(4 viewports x 9 pages). Text says `sample data`; no real store data is present.
The contact sheet is `qa/local-preview/index.html`.

## Remaining limitations
- Judge.me app block is not in the theme files, so that homepage slot stays
  empty in the preview (expected gap).
- Several shim gaps produce console noise (missing `standard_event_data`
  filter -> `view-event-payload` JSON parse errors, `Shopify is not defined`,
  a header ref, and a product-recommendations endpoint). These do not block
  product-card rendering.
- On the homepage the mobile carousel copy of the product list is not fully
  hidden at desktop widths in the preview (CSS fidelity gap), so extra
  duplicate cards can appear below the grid.

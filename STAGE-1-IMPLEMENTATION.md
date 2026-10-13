# Stage 1 implementation report

Branch: `stage-1/working-preview-design`

## Included changes

- Extended `assets/moss-molt.css` with shared spacing, surface, border, reading-width and focus tokens plus responsive safeguards for narrow layouts. Existing brand colors and Shopify theme structure remain in place.
- Made `preview/shot.js` and `preview/verify-preview.js` choose a Chromium executable from environment variables or common system paths rather than relying only on one developer's Windows installation.
- Added npm scripts for starting the preview, running the product-card regression checks and capturing viewport screenshots.
- Documented the preview commands and the distinction between sample fixtures and Shopify-backed functionality.

## Existing preview-card fix

The starting branch already contains a fix for stale LiquidJS block globals in `preview/engine.js`, the `object_type: 'product'` fixture field and `preview/test-content-for.js`. The repository's existing `qa/local-preview/PASS8-REPORT-CORRECTION.md` records prior browser verification. I have not changed that fix in this Stage 1 branch.

## Verification status

This environment can read and update text files through the connected GitHub integration, but it cannot clone/download the complete repository assets or launch its local server and browser. Therefore, the Stage 1 changes have **not** been run in Chromium here and no new screenshots are claimed as captured. The screenshot script is prepared to run in an environment with Node dependencies and Chromium available.

To verify locally from the repository root:
1. `cd preview`
2. `npm install`
3. `npm start`
4. In a second terminal in `preview`, run `npm test`
5. Run `npm run screenshots`

Screenshots are written to `qa/local-preview/` by default. Set `CHROMIUM_PATH` to the installed Chromium/Chrome executable if automatic detection cannot find it.

## Shopify limitations

Fixture products/prices and cart data are simulated for layout testing. Shopify checkout, live inventory, customer accounts, app embeds and store APIs are not reproduced by the local preview.

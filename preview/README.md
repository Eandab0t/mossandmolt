# Moss & Molt — local theme preview

Renders the REAL theme files (`layout/`, `templates/*.json`, `sections/`,
`blocks/`, `snippets/`, `assets/`, `config/settings_data.json`,
`locales/en.default.json`) with [LiquidJS](https://liquidjs.com/) plus small
shims for Shopify-only tags/filters. **No Shopify login, no store changes.**

Sample products/prices (`preview/base.js`) mirror the public live storefront
for layout testing only — they are clearly labeled fixtures, not store data.

## Start / stop

- Double-click `preview.bat` (installs dependencies once, opens
  http://localhost:3000). Close the window or press Ctrl+C to stop.
- After a reboot: run `preview.bat` again. Nothing persists otherwise.
- The server does not watch files; refresh the browser after editing theme
  files. (Restart the server only if you change files inside `preview/`.)

## Routes

`/` · `/collections/all` · `/collections/<handle>` · `/products/<handle>` ·
`/pages/tank-builder` · `/pages/<page>` · `/cart` · `/search?q=` · any other
path renders `templates/404.json`.

A floating toolbar offers 1440 / 1024 / 390 / 320 widths and reminds you this
is sample data. `/gaps` lists every unsupported tag/filter/object hit during
rendering so fidelity gaps stay visible.

## What is faithful vs simulated

See `qa/local-preview/FIDELITY.md`.


## Cross-platform screenshot and verification commands

From this folder, run `npm install`, then `npm start` to start the local preview.
In a second terminal run `npm run test` to exercise the block-rendering regression
check and browser product-card check. Run `npm run screenshots` to capture the
four viewport sizes and generate the contact sheet.

The screenshot and verification runners first check `CHROMIUM_PATH` or
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`, then common system browser locations,
then Playwright's configured browser install. If Playwright Core cannot find a
browser, install Chromium in your environment and set `CHROMIUM_PATH` to its
executable. On Windows, set it to the full path to `chrome.exe`.

Product names, prices and image URLs in `base.js` are fixtures for layout tests,
not live inventory. Shopify checkout, app embeds, customer data and store APIs
remain outside this local preview.

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

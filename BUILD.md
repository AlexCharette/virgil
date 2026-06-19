# Building Virgil from source (for AMO reviewers)

Virgil's extension code (JavaScript, CSS, HTML) is **plain, hand-written, and
shipped unmodified** — it is not minified, bundled, or transpiled. A small Node
build step only (a) generates the icon PNGs from the sprite code, (b) writes the
per-browser `manifest.json`, and (c) copies files into a `dist/` folder and zips
it. This document lets you reproduce the submitted package byte-for-byte.

## Requirements

- **Node.js** ≥ 18 (developed/tested on v26). No npm dependencies are installed
  — the `tools/` scripts use only the Node standard library.
- The `zip` CLI (preinstalled on macOS/Linux) for packaging.
- No network access is needed to build.

## Build

```sh
npm run build
```

This runs `tools/build.mjs`, which:

1. Regenerates `icons/icon-{16,32,48,128}.png` from the sprite code
   (`tools/icons.mjs` → `src/content/sprite.js`, via `tools/load-sprite.mjs`
   and the dependency-free PNG encoder in `tools/png.mjs`).
2. Copies `vendor/`, `src/`, and `icons/` into `dist/firefox/` (and `dist/chrome/`).
3. Writes `dist/firefox/manifest.json` — the Firefox variant of the root
   `manifest.json`, with `background.scripts` and the
   `browser_specific_settings.gecko` block (id, `strict_min_version`,
   `data_collection_permissions`).
4. Zips the **contents** of `dist/firefox/` into `dist/virgil-firefox.xpi`
   (manifest at the archive root).

The unpacked add-on that exactly matches the submitted `.xpi` is **`dist/firefox/`**.

## What maps to what

- **Reviewable source = this repository.** Every `.js`/`.css`/`.html` file in
  `src/` is shipped verbatim (the content-script load order and the background
  scripts are listed in the generated manifest).
- **Generated at build time:** `dist/*/manifest.json` (from root `manifest.json`
  + `tools/build.mjs`) and `icons/*.png` (from `src/content/sprite.js` +
  `tools/icons.mjs`).

## Third-party code

- `vendor/browser-polyfill.min.js` — Mozilla's **WebExtension browser API
  Polyfill**, version **0.12.0**, included **unmodified**.
  - Source: https://github.com/mozilla/webextension-polyfill (MPL-2.0)
  - Exact file: `https://unpkg.com/webextension-polyfill@0.12.0/dist/browser-polyfill.min.js`

No other third-party or generated code is included.

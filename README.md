# Virgil — a guide through the inferno

> *"I am Virgil. I'll guide you through what waits below."*

The internet is full of snares set to rob you of your attention. **Virgil** is a
pixel-art companion — a throwback to dungeon crawlers — who quietly scans
each page you visit and steps forward, lantern raised, when you wander toward
one of the web's circles of peril: **social media**, **infinite-scroll feeds**,
and **adult content**.

He comes in a few forms — a **Lantern-Bearer**, a **Sentinel**, a **Wisp**, or an
owl **Familiar** — and you pick your favourite from the popup. He runs on both
**Chrome/Edge and Firefox** via the WebExtension polyfill.

He is built to be cheap. Almost everything runs locally; AI is a last resort.

![Virgil](icons/icon-128.png)

## How he decides (cheapest first)

| Tier | Cost | What it does |
|------|------|--------------|
| **1 — Blocklist + keywords** | instant, offline | A curated map of well-known domains → circles, plus a conservative hostname/title keyword scan. Catches the obvious cases with zero work. |
| **2 — DOM heuristics** | local, lazy | A one-shot scan for feed-shaped DOM, and a self-terminating watcher that notices the page growing taller as you scroll (the signature of an infinite feed). No polling loops. |
| **3 — The Oracle (optional AI)** | network, opt-in | *Only* for ambiguous media/social-shaped pages Tier 1–2 couldn't name, and only if you supply a key. Calls an **OpenRouter / OpenAI-compatible** chat endpoint and **caches the verdict per domain for a week**, so each site is asked at most once. Off by default. |

When a circle is found, Virgil appears in the corner, his lantern glowing the
colour of the danger (cyan = safe, blue = caution, pink = peril), the page dims
into gloom behind him, and he speaks. You can ask him to lead you out, or
**Stay on this page** — which whitelists only that exact URL, not the whole
host, so allowing one YouTube video doesn't unguard all of YouTube. Manage
allowed pages and whole-site pauses from the popup.

## The Censor — blurring suggestive media

Virgil also blurs suggestive images/video and reveals them on click. Deciding
*what* to blur is tiered, cheapest-first (toggles in the popup):

| Tier | How it decides | Cost |
|---|---|---|
| **A — blur-all** | On an adult-flagged page, veil **all** media | free, instant |
| **B — heuristics** | On any page, veil media whose `alt` / `title` / filename hits the adult keyword scan | free |
| **C — on-device model** *(planned)* | A small bundled NSFW classifier scores in-view images locally — for mixed feeds | local, private; opt-in download |

It's **blur-first**: candidate media is blurred immediately, then revealed if
judged safe, so nothing flashes. Only visible media is examined
(`IntersectionObserver`), infinite-scroll additions are caught (throttled
`MutationObserver`), tiny media is skipped, and Virgil's own sprite is never
touched. Tier C plugs into `classifyEl()` in `src/content/censor.js` — the
blur-first seam is already there. A remote vision API is intentionally *not*
used: it would mean per-image network cost and sending your browsing to a third
party, against the "AI only where necessary" goal.

## Install (Chrome / Edge, unpacked)

1. Generate the toolbar icons (one-time, needs Node ≥ 18):
   ```sh
   node tools/gen-icons.mjs
   ```
2. Open `chrome://extensions`, enable **Developer mode**.
3. Click **Load unpacked** and select this folder.
4. Pin Virgil and visit `twitter.com` or `reddit.com` to see him appear.

### Install (Firefox / Zen / LibreWolf — any Firefox fork)

Firefox-based browsers can't use the repo-root manifest (it declares a Chrome
`service_worker` background, which Firefox doesn't run). Build the Firefox
package first:

```sh
npm run build       # regenerates icons + writes dist/chrome, dist/firefox, and the .zip/.xpi
```

Then load it (no ZIP needed for temporary loading):

1. Go to `about:debugging#/runtime/this-firefox` (type it into the address bar —
   it works in **Zen** too).
2. **Load Temporary Add-on…**
3. Select `dist/firefox/manifest.json` (or the built `dist/virgil-firefox.xpi`).

Temporary add-ons clear on restart. For a persistent install you need a *signed*
`.xpi` — release Firefox and Zen enforce signatures, so submit
`dist/virgil-firefox.xpi` to [AMO](https://addons.mozilla.org) (or run
`web-ext sign`) to get a signed build. Unsigned permanent installs only work on
Firefox Developer/Nightly/ESR with `xpinstall.signatures.required` disabled.

### Why two builds?

MV3 backgrounds are mutually exclusive across engines: Chrome/Edge **require**
`background.service_worker` and reject `background.scripts`; Firefox runs an
event page via `background.scripts` and doesn't run a service-worker background.
So `tools/build.mjs` emits `dist/chrome` and `dist/firefox` with the right
manifest each. Everything else is shared — every API call goes through the
`browser.*` namespace, native on Firefox and provided in Chrome/Edge by
`vendor/browser-polyfill.min.js` (Mozilla's WebExtension polyfill).

> **`dist/` is a copy of the source**, so edits don't reach a Firefox/Zen
> temporary add-on until you rebuild. Run **`npm run watch`** while developing —
> it rebuilds `dist/` on every change; just hit reload in `about:debugging`.
> Chrome/Edge load the repo root directly and skip this.

## Scripts

| Command | What it does |
|---|---|
| `npm run build` | Regenerate icons, then write `dist/chrome`, `dist/firefox`, and the `.zip` / `.xpi`. |
| `npm run watch` | Same as build, then rebuild on every change to `src/`, `vendor/`, or `manifest.json`. |
| `npm run icons` | Just regenerate the toolbar icons from the sprite. |
| `npm run preview` | Render the whole character set to `previews/gallery.html`. |
| `npm run release` | Build the packages and cut a `v<version>` GitHub release (reads the version from `manifest.json`; needs the `gh` CLI). |

### Pick your guide

Open the popup → **Choose your guide** and click a character. The choice is saved
and the on-page hero updates immediately. Preview the whole set with
`node tools/gen-concepts.mjs` (writes a `gallery.html`).

## The Oracle (optional)

Open the popup → **Oracle (optional AI)**:

- **Endpoint** — defaults to `https://openrouter.ai/api/v1/chat/completions`.
  Any OpenAI-compatible `/chat/completions` endpoint works.
- **Model** — e.g. `openai/gpt-4o-mini`.
- **API key** — stored only in `chrome.storage.local` on your machine; it never
  leaves your browser except in the request to your chosen endpoint.

Leave it off and Virgil works fully offline on Tiers 1–2.

## Project layout

```
manifest.json              MV3 manifest (cross-browser background)
vendor/
  browser-polyfill.min.js  Mozilla WebExtension polyfill (browser.* in Chrome)
src/
  shared/                  loaded into BOTH content world and service worker
    palette.js             the "August — Drawbridge" colours
    categories.js          the circles + Virgil's dialogue
    blocklist.js           Tier 1 domain lists
    classify.js            pure (DOM-free) classification
    settings.js            settings schema + storage helpers (incl. style)
  content/
    heuristics.js          Tier 2 DOM probes (feed / infinite scroll)
    sprite.js              the character system: pixel toolkit + the set + render
    hero.js                the hero's DOM + behaviour (style + severity)
    hero.css               his styling
    content.js             orchestrator (runs the tiers, drives the hero)
  background/
    service-worker.js      stats, badge, Tier 3 OpenRouter call + cache
  popup/                   guide picker + settings + the ledger
tools/
  png.mjs                  dependency-free PNG encoder
  load-sprite.mjs          loads sprite.js in a VM so tooling shares the art
  gen-icons.mjs            renders the chosen character to toolbar PNGs
  gen-concepts.mjs         renders the whole set to a preview gallery.html
icons/                     generated toolbar icons
```

No build step, no dependencies — plain JS loaded in order; shared modules attach
to a single `globalThis.Virgil` namespace. The character art lives only in
`src/content/sprite.js`; the node tooling renders from that same file via
`tools/load-sprite.mjs`, so the toolbar icon and previews can never drift from
the live hero. All extension APIs go through `browser.*` (promisified by the
polyfill on Chrome).

## Design notes

- **Sprite** is one pixel grid (`src/content/sprite.js`), rendered as inline SVG
  in-page (survives strict page CSP) and as PNG for the toolbar
  (`tools/gen-icons.mjs`) — keep the two grids in sync if you edit the art.
- **Colours** come from the *August — Drawbridge* theme: deep midnight blues with
  a single warm pink reserved for genuine peril.
- **Efficiency**: no per-tick timers, no persistent observers — every probe
  disconnects once it concludes, and the AI verdict is cached per domain.

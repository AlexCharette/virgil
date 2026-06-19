# Virgil — store submission kit

Paste-ready copy and justifications for the Chrome Web Store, Microsoft Edge
Add-ons, and Firefox AMO. Build the packages first with `npm run build`:

- Chrome & Edge → `dist/virgil-chrome.zip`
- Firefox / Zen → `dist/virgil-firefox.xpi` (AMO signs it)

> Replace the placeholder URLs (`https://herbary.io/...`) with your real ones,
> and host `PRIVACY.md` somewhere public (GitHub Pages works) so you have a
> **privacy policy URL** to enter in each dashboard.

---

## Listing copy

**Name:** Virgil — Guide Through the Inferno

**Short description (≤132 chars, used in manifest & Chrome):**
> A pixel-art guide that warns you past social media, infinite scroll & adult content — and blurs suggestive media.

**Summary / long description:**
> The internet is full of snares for your attention. Virgil is a 16-bit hooded
> companion — a throwback to dungeon crawlers — who quietly scans each page and
> steps forward, lantern raised, when you wander toward one of the web's circles
> of peril: social media, infinite-scroll feeds, and adult content. He dims the
> page into gloom, names the danger, and lets you turn back or stay.
>
> Virgil also blurs suggestive images and video (click to reveal), and keeps a
> private ledger of the time you've reclaimed.
>
> • Works locally and instantly — a curated blocklist plus on-page heuristics, no
>   account, no sign-in.
> • Choose your guide (Lantern-Bearer, Sentinel, Wisp, Familiar, Guardian Angel)
>   and your colour scheme (Drawbridge, Ember, Grove, Dusk).
> • Optional, opt-in AI (your own OpenRouter-compatible key) classifies tricky
>   pages — off by default; nothing leaves your browser unless you turn it on.
> • No analytics, no telemetry, no data sent to the developer.

**Category:** Productivity
**Primary purpose (single-purpose statement):** Help users avoid attention-trap
websites and suggestive media by warning on and blurring such content.

---

## Permission justifications (paste into each dashboard)

**Host permission — access to all websites (`<all_urls>`):**
> Virgil's core function is to scan the content of whatever page the user is
> viewing and overlay an on-page guide and blur suggestive media. It cannot know
> in advance which sites the user will visit, so it must run on all pages. All
> scanning happens locally in the browser.

**`storage`:**
> Stores the user's own settings, paused-site/allowed-page lists, local usage
> tallies, and (only if the optional AI feature is enabled) the user's API key —
> all kept on the user's device.

**Remote code / "uses remote code" question:** Answer **No**. Virgil executes no
remotely-hosted code. The optional AI feature only sends a text summary to an
endpoint and receives a category label back.

---

## Data-use disclosures

**Chrome Web Store → Privacy practices:**
- Does it collect user data? **Yes — only when the optional AI feature is enabled
  by the user.** Disclose: "Website content" is sent to a user-configured
  third-party AI endpoint for the sole purpose of classifying pages, only when
  the user opts in and supplies their own key.
- Not sold or transferred to third parties for other purposes. Not used for
  advertising or creditworthiness. Used only for the extension's single purpose.
- Provide the **privacy policy URL** (host `PRIVACY.md`).

**Firefox AMO → "This add-on requires the following..."**
- Note the broad host permission and the optional AI data flow in the notes to
  reviewers. Mention the only minified file is Mozilla's official
  `browser-polyfill.min.js` (vendored, unmodified); all other source is plain JS.
- Provide the privacy policy URL.
- AMO's **data-consent** requirement is satisfied in-manifest:
  `browser_specific_settings.gecko.data_collection_permissions` declares
  `required: ["none"]` (nothing collected by default — the marker for no required
  collection) and `optional: ["websiteContent", "browsingActivity"]` (only the
  opt-in AI sends a page summary). Injected by `tools/build.mjs` into the Firefox
  build.

**Edge Add-ons:** mirrors the Chrome answers; reuse the same disclosures.

---

## Maturity / content rating

Because Virgil detects and blurs adult content, set the maturity rating each
store offers accordingly (e.g. Edge: "mature"; AMO: not required but mention in
notes). Keep the listing assets themselves (screenshots, icon) safe-for-work.

---

## Assets checklist

- [ ] Icon 128×128 (already in `icons/icon-128.png`)
- [ ] 1–5 screenshots (Chrome 1280×800 or 640×400; Edge 1280×800; AMO any) —
      capture Virgil warning + page gloom, the blur/reveal, and the popup picker
- [ ] Small promo tile (Chrome 440×280, optional but recommended)
- [ ] Privacy policy URL (host `PRIVACY.md`)
- [ ] Support/homepage URL
- [ ] Bump `manifest.json` `version` before each resubmission

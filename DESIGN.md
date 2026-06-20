# Design

Virgil's visual identity. The look is already committed in code (`src/shared/palette.js`,
`src/content/sprite.js`, `src/content/hero.css`, `src/popup/popup.css`); this doc
codifies it and defines the brand layer on top. **Identity-preservation rule:**
the palette, the pixel hero, the lantern, and the system-monospace voice are the
brand — don't swap them for trend fonts or a new color scheme.

## North star

> A hooded guide with a lantern, 16-bit, standing at the mouth of a dark place.

Everything ladders to that one image. The mood is **midnight dungeon, not neon
arcade** — deep near-black grounds, a single cold light source, pixels with
intent. Spooky-charming, never cute, never clinical, never hacker-edgy.

Two motifs in tension carry the whole brand:

- **The lantern** — Virgil, light, protection. Its flame is the accent color and
  shifts with severity (cyan → blue → pink). It is the through-line on every surface.
- **The eyes** — the Watchers, surveillance, the thing in the dark. Pixel eyes
  that blink open at the edges when a page is watching you.

The lantern *reveals* the eyes. That sentence is the brand.

## Logo & wordmark

**Primary mark — the Lantern-Bearer.** The hooded pixel guide on a `void`
ground (the current toolbar icon, `icons/icon-128.png`, rendered from
`src/content/sprite.js`). Used at ≥48px: store hero, README, toolbar.

**Compact mark — the lantern glyph.** At ≤32px the full figure muddies; reduce
to the standalone pixel lantern (the staff-lantern from the Lantern-Bearer), flame
in the accent color, on `void`. This is the favicon-scale identity and the inline
brand bullet.

**The flame is a live token, not a fixed color.** It takes the active theme's
`glow` (and, in-product, the current severity color). Never hand-recolor the
cloak — theme switching does that systematically (see Color).

**Wordmark — `VIRGIL`.** Set in the UI monospace, **uppercase, letter-spacing
0.12em (~2px at 18px)**, color `ink`. This is exactly the popup `<h1>` today;
promote it to the canonical wordmark. Lockup: `[lantern glyph]  VIRGIL`, glyph
left, optically centered to the cap height.

- **Tagline:** *"Your guide through the web."* (Set in `inkDim`, sentence case,
  one size down.) Drop "Inferno / Hell / Dante" from all outward copy per brand
  voice — the lore stays in-character, not in the label.
- **Clear space:** one lantern-width on all sides. **Minimum wordmark size:** 14px
  (below that, mark only). Never stretch, outline, drop-shadow, or gradient the
  wordmark; the only effect Virgil's brand uses is the lantern's glow.

## Color system

Dark-first by conviction (the scene is a dark place). Four shipped themes; the
user picks one. Each is a full ramp with identical keys, so every surface retunes
together. Tokens live in `src/shared/palette.js` (`V.THEMES`).

**Token roles** (per theme): `void` (deepest ground) · `crypt` (panel/surface) ·
`stone` (border) · `shade` (cloak shadow) · `ink` (primary text) · `inkDim`
(muted/secondary) · `cloak` `cloakLit` `steel` `rune` (figure tones) · `glow`
`glowDeep` (the flame / accent) · `peril` (alarm).

| Theme | void (bg) | ink (text) | glow (accent) | peril | mood |
|---|---|---|---|---|---|
| **Drawbridge** *(default)* | `#131520` | `#b8cdfe` | `#86e0f9` | `#ec407a` | midnight blue, cold lantern |
| **Ember** | `#16130f` | `#efe2d0` | `#ffce5b` | `#ff4d52` | torchlit crypt — teal figure, gold flame |
| **Grove** | `#0f1311` | `#dcebd6` | `#83e6a6` | `#ff6a3d` | witchlight — brown figure, jade flame |
| **Dusk** | `#110f19` | `#e6dafc` | `#c294ff` | `#ff5a8c` | twilight — indigo figure, orchid flame |

**Color strategy: Committed-dark.** A near-neutral dark ground (low chroma —
faint temperature, never a full accent wash) carries 70%+ of every surface; one
luminous accent (the flame) does the work; `peril` is reserved for genuine
danger. The figure carries a *secondary* hue in deliberate temperature-contrast
to the flame (a verdigris guide under a gold lantern; a brown traveller with a
jade witchlight) so each palette holds two or three hues against a neutral
ground rather than washing to one. No neutral hedging — the dark *is* the brand.

**Severity ramp** (derived in `palette.js`, never hand-set): `safe → glow`,
`caution → steel`, `peril → peril`. It drives the hero aura, the page-gloom veil
tint (same hue, alpha 0.08 / 0.32 / 0.48), and the badge. **Never color-alone:**
always paired with the badge glyph (`!` caution, `‼` peril) and a named circle.

**CSS bridge.** In-page, the active palette is pushed to `--vg-*` custom
properties on `:root` (`--vg-void`, `--vg-void-rgb`, `--vg-crypt`, `--vg-stone`,
`--vg-ink`, `--vg-inkdim`, `--vg-cloak`, `--vg-accent`), so `hero.css` retunes
without rebuilds. The popup mirrors the palette into its own `:root` vars
(`--void`, `--crypt`, `--ink`, `--glow`, …). New surfaces consume these vars —
never hardcode hex.

**Contrast (AA, verified):** `ink` on `void`/`crypt` clears 4.5:1 in every theme;
`inkDim` is for ≥18px/labels only, not body. Placeholder text uses `inkDim`, not
a lighter gray.

## Typography

**One family, by principle: a system monospace stack** —
`ui-monospace, "Cascadia Mono", "DejaVu Sans Mono", Menlo, Consolas, monospace`.

This is a deliberate, identity-defining choice, not a reflex: it's **zero-load and
CSP-safe** (no webfonts — critical for a content script injected into hostile
pages), and its terminal/bitmap kinship sits right next to the pixel art. (Note:
this overrides the usual "mono = lazy technical" caution — here mono is the brand,
chosen for real constraints, and paired with pixel illustration, not as costume.)

- **Wordmark / section heads:** uppercase, tracked `0.12em`, `ink` or `glow`.
- **Body / dialogue:** sentence case, normal tracking, line-height 1.45,
  measure capped ~65ch in the speech bubble.
- **Numerals:** `font-variant-numeric: tabular-nums` for the ledger and counts.
- **Marketing only** (store banners, README hero image): a pixel/bitmap *display*
  face is permitted for the wordmark in raster assets, since CSP doesn't apply
  there. The shipping UI never loads a webfont.

## Iconography & illustration

**Everything is pixel art on a 1px grid**, rendered as inline SVG `<rect>`s with
`shape-rendering: crispEdges` (`src/content/sprite.js`), so it's crisp at any
scale, themeable, and CSP-safe. PNGs (toolbar icons) are generated from the *same*
sprite code (`tools/icons.mjs`) — one source of truth.

- **The guides** (5, user-selectable): Lantern-Bearer, Sentinel, Wisp, Familiar,
  Guardian Angel. Same 32×40 grid, same palette keys, lantern/light in `glow`.
- **The lantern**: the brand symbol; flame = accent/severity.
- **The Watchers eye**: a 7×5 pixel eye, sclera `glow`, pupil `void` — used for
  the blink effect and the count sigil.
- **The Shroud**: blurred media with a 2px `--vg-accent` outline (not an icon — a
  treatment). Click to reveal.
- Rules: no anti-aliased/rounded vector icons, no icon fonts, no rounded-rect
  app-icon clichés. If it's an icon, it's pixels.

## Components

- **Hero** — the guide in a corner (draggable, position remembered). Aura = the
  severity color via `drop-shadow`. Bobs idle; agitates on peril.
- **Speech bubble** — a carved-stone plaque: `crypt` fill, `--virgil-glow`
  border, hard pixel-ish shadow, a little pointer. Carries dialogue + actions.
- **The gloom (veil)** — full-page radial vignette in `void`, severity-tinted,
  fades in on a warning. `pointer-events: none`.
- **The Watchers** — edge eye-blink (count-scaled, once per page) + a glowing
  eye+count sigil pinned to the hero.
- **Popup** — `void` ground, `crypt` cards, pill toggles (track `stone` → `cloak`
  when on, knob → `glow`), swatch pickers for guide + theme, the ledger of
  reclaimed time / warnings / watchers.
- Affordance: cards only where they're the right answer; toggles are real pills;
  severity always shows glyph+label, not just color.

## Motion

Intentional, brief, interruptible. Ease-out (quart/expo), **no bounce, no
elastic**. Materials beyond transform/opacity are fair game where they earn it
(the veil's blur-free vignette, the lantern's glow, the eye blink via `scaleY`).

- Hero: 2.6s idle bob; faster agitation on peril.
- Veil: 0.45s opacity fade.
- Watchers: eyes fade in → **blink** (`scaleY` squash) → fade out, ~3.2s, staggered.
- **Every animation has a `prefers-reduced-motion: reduce` path** (static/instant).
  The eyes simply don't play under reduced motion; the sigil still conveys the count.

## Voice in the UI

Virgil speaks like a **watchful, wry, unhurried** guide. Archaic-but-clear;
addresses the user as *traveler / wayfarer*; names perils as *circles*; dry, never
preachy, never alarmed. Lore lives in his mouth, not on the label — outward copy
(store, repo) drops explicit Inferno/Hell/Dante.

- Warnings name the circle and offer a choice: *"Mind your step — the Pit of the
  Bottomless Feed has no bottom."* → **[Lead me out] [Stay on this page]**
- Privacy is matter-of-fact, not swaggering: *"7 watchers are here."*
- Features are in-world: **The Shroud** (blur), **The Watchers** (trackers),
  **Cloak my passage** (hardening), **the Oracle** (optional AI).
- Microcopy stays terse and kind. No guilt, no streaks, no "you failed."

## Applications

- **Extension UI** — the canonical surface. Hero + popup, fully theme-driven via
  the `--vg-*` / popup `:root` vars. This is where the brand lives.
- **Store listings** (Chrome / Edge / AMO) — `void` hero, the Lantern-Bearer +
  wordmark + tagline, then the real screenshots (`screenshots/`): a warning with
  gloom, the Shroud reveal, the popup. Voice per above (no "Inferno"). Listing
  copy is maintained in `STORE-LISTING.md`.
- **GitHub repo** — README leads with the 128px mark; prose in-voice but plain;
  the four theme swatches and the guide lineup as the visual proof. Keep the
  one-line tagline consistent with the stores.
- **Favicon / small** — lantern glyph only, flame in `glow`, on `void`.

## Accessibility

AA contrast across all themes; reduced-motion honored on every animation;
severity never by color alone (glyph + named circle); overlays are click-through
and never trap focus. See `PRODUCT.md` → Accessibility for the commitments.

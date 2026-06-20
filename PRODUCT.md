# Product

## Register

product

## Users

People who *want* to use the web but keep getting robbed by it — of their
attention (social feeds, infinite scroll, late-night doomscrolling, adult
content) and of their data (trackers, fingerprinting, surveillance dark
patterns). They're not asking to be locked out; they're asking for a companion
who notices the snares they've stopped noticing and gives them a beat to choose.

Context of use: mid-browse, often low-willpower moments — a "just one more
scroll" lull, a tab opened on reflex, a page quietly measuring their device. The
job to be done: *stay aware and keep agency* without installing a punitive
wall they'll resent and disable by Friday.

## Product Purpose

Virgil is a pixel-art companion — a hooded guide with a lantern — who walks with
you through the web and steps forward when you near one of its perils. He does
two things, locally and on your terms:

1. **Guards your attention.** Names the "circle" you're entering (social,
   infinite scroll, adult), dims the page into gloom, and lets you turn back or
   stay — per-page, never the whole site.
2. **Guards your privacy.** Reveals the Watchers (trackers, session-replay,
   fingerprinting) already on a page and **gouges them out by default** — barring
   known trackers, third-party only. Spots active device-fingerprinting, and can
   cloak your passage by hardening the browser's own settings or salt the earth
   on a site, clearing its cookies and storage.

Success looks like: the user keeps Virgil installed for months because he feels
like an ally, not a hall monitor — they notice more, lose fewer hours, leak less
data, and never feel scolded.

## Brand Personality

**Watchful · wry · unhurried.**

A seasoned night-watchman of a guide: he sees everything in the dark, says little,
and says it with dry wit rather than alarm. There's a pleasant shiver to him —
the eyes that blink open at the edges of a watched page — but the dominant feeling
is *accompaniment*: someone steady is looking out for you, and the choice stays
yours.

Emotional goals: reassurance (you're not alone in here), a small delicious dread
(the web is darker than it looks, and now you can see it), and retained agency
(he opens the door; you decide whether to walk through).

## Anti-references

Virgil is **none** of these:

- **The nanny / preachy blocker.** No guilt-streaks, no "you've failed your
  goal," no `ACCESS DENIED` walls (Cold Turkey, Freedom-style lockouts,
  Duolingo-style shaming). He warns and reveals; he never lectures or punishes.
- **Corporate digital-wellness.** No pastel mindfulness gradients, no
  Calm/Headspace serenity-spa aesthetic, no HR-deck "screen-time wellbeing."
- **Edgy hacker / security-bro.** No skull-and-terminal, no neon "PWN THE
  TRACKERS," no matrix-rain. Privacy is handled with composure, not swagger.
- **Cutesy gamified mascot.** No Duolingo-owl confetti, no badge-spam, no
  saccharine. Spooky-charming, dry, a little eerie — not childish.

## Design Principles

1. **Guide, never gaoler.** The wayfarer is never walled off from a page —
   Virgil warns, reveals, and leaves the choice ("Stay on this page" whitelists
   one URL). The only thing he bars without asking is the *watchers*, never the
   traveller.
2. **Reveal before shield — for the circles.** Awareness comes first for the
   attention perils: name the circle, draw the gloom, then let the user turn
   back or stay; he never blocks a page. The **watchers are the exception** —
   revealed *and* gouged out by default (trackers barred, third-party only),
   because surveillance shouldn't be a choice the user re-makes every page. The
   heavier shields — cloaking, salting a site — stay opt-in.
3. **Local by conviction.** Nothing leaves the device. The privacy features
   practice what the brand preaches: no telemetry, no analytics, AI is
   opt-in and bring-your-own-key. The product is the proof of the pitch.
4. **Atmosphere on a dimmer.** The character is always *felt* — a brief eye-blink,
   a dimming, one line of dialogue — and never loud. Every flourish is tasteful,
   interruptible, and reduced-motion-safe.
5. **The companion is the interface.** Virgil carries the brand. Copy speaks in
   his voice; the lantern is the throughline on every surface. We don't bolt a
   logo onto a generic settings panel — the guide *is* the product's face.

## Accessibility & Inclusion

- **WCAG AA** for contrast across all four themes; body/UI text verified against
  its surface (the pale-blue ink ramp on the deep `void`/`crypt` backgrounds).
- **Reduced motion is honored everywhere** (`prefers-reduced-motion`): the sprite
  bob, the page-gloom fade, and the Watchers eye-blink all degrade to static.
- **Never color alone for meaning.** Severity is carried by glyph and label as
  well as hue (the `!` / `‼` badge, the named circle), so the cyan/blue/pink
  severity ramp stays legible to color-blind users.
- **Click-through, non-trapping overlays.** The gloom and the eyes are
  `pointer-events: none`; nothing blocks the page or steals focus.

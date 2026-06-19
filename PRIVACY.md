# Virgil — Privacy Policy

_Last updated: 19 June 2026_

Virgil is a browser extension that scans web pages locally to warn you about
attention traps (social media, infinite-scroll feeds, adult content) and to blur
suggestive media. This policy explains exactly what data Virgil handles.

**Short version: Virgil sends nothing to its developers. It has no analytics,
no telemetry, and no tracking. Everything is stored on your own device, except
the optional AI feature described below, which is off by default.**

## What Virgil stores on your device

All of the following is kept in your browser's local extension storage
(`storage.local`). It never leaves your device and is never sent to us:

- **Your settings** — whether Virgil is enabled, the chosen character and colour
  scheme, the nag timer, and the blur options.
- **Your allow list** — hostnames you've paused and specific page URLs you chose
  to stay on.
- **Usage tallies** — counts of warnings shown and seconds spent on flagged
  pages, shown to you in the popup. These are simple local counters.
- **AI cache** — if you enable the optional AI feature, the per-site
  classification result is cached locally for up to 7 days to avoid repeat calls.
- **Your AI credentials** — if you enable the optional AI feature, the API key,
  endpoint URL, and model name you enter are stored locally and used only to make
  the requests you configured.

You can clear all of this at any time by removing the extension, or reset the
usage tallies from the popup.

## Page content

To do its job, Virgil reads the content of pages you visit (text, image and
video metadata) **locally, in your browser**, to decide whether to warn you or
blur media. This processing happens on your device and is **not transmitted
anywhere** — with one exception, which you must turn on yourself:

### The optional "Oracle" (AI) feature — off by default

If, and only if, you enable the Oracle and provide your own API key, then for
pages Virgil cannot classify locally it sends a **short summary** of the page to
the AI endpoint **you configured** (by default, an OpenRouter-compatible
service). That summary contains: the hostname, page title, meta description, a
few headings, up to ~500 characters of visible text, and a count of videos on
the page.

- This is sent **only** to the endpoint you specify, using **your** API key.
- It is used **only** to classify the page as social / scroll / adult / safe.
- Your use of that third-party service is governed by **that provider's**
  privacy policy, not this one.
- If you never enable the Oracle, no page data ever leaves your browser.

## Permissions

- **Host access to all sites** — required because Virgil must run on whatever
  page you're viewing to scan it and place the guide.
- **Storage** — used to save the on-device settings and tallies described above.

## What Virgil does NOT do

- It does not collect, transmit, or sell your browsing history or personal data.
- It does not include analytics, advertising, or third-party trackers.
- It does not send any data to the extension's developers.

## Changes

If this policy changes, the "Last updated" date above will change and the new
version will be published at the policy URL listed on the extension's store
pages.

## Contact

Questions about this policy: **virgil.0o5z2@passmail.net**

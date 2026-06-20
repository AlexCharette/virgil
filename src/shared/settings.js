/*
 * Virgil — settings schema + storage helpers, shared by the content script,
 * the service worker, and the popup. Single source of truth for defaults.
 */
(function (g) {
  const V = (g.Virgil = g.Virgil || {});

  V.DEFAULT_SETTINGS = {
    enabled: true, // master switch
    style: "lantern-bearer", // which character the wayfarer chose
    theme: "drawbridge", // which colour scheme
    greetOnSafe: false, // does Virgil pipe up on safe pages?
    lingerMinutes: 10, // nag after this long in a flagged circle
    pausedHosts: [], // whole hostnames where Virgil stays silent
    allowedUrls: [], // specific page URLs the wayfarer chose to stay on
    // The Shroud — blur suggestive media, reveal on click.
    blur: {
      enabled: true, // master switch for blurring
      onAdultPages: true, // Tier A: veil all media on adult-flagged pages
      heuristics: true, // Tier B: veil media by alt/title/filename keywords
      minSize: 80, // ignore media smaller than this (px)
      model: { enabled: false }, // Tier C: on-device classifier (future)
    },
    // Privacy guardianship.
    privacy: {
      revealWatchers: true, // count trackers/replay/fingerprinters on each page
      detectFingerprinting: true, // watch for active canvas/WebGL/audio probing
      watcherFx: true, // the spooky eyes-in-the-dark indicator when watched
      harden: false, // flip browser privacy settings (needs optional permission)
    },
    // The Snares — name the page's dark patterns (deceptive UX).
    snares: {
      enabled: true, // master switch
      mark: true, // pin a marker on the page (vs. tally quietly in the popup)
      tiers: { structural: true, lexical: false }, // Tier 1 on; lexical (FP-prone) later
      useOracle: false, // Tier 3 classification (reuses ai.* config)
      dismissed: {}, // { host: [snareId, …] } — local "not a snare" allowlist
    },
    // Tier 3 — optional, off until the wayfarer provides a key.
    ai: {
      enabled: false,
      endpoint: "https://openrouter.ai/api/v1/chat/completions",
      model: "openai/gpt-4o-mini",
      apiKey: "",
    },
  };

  const KEY = "virgil:settings";

  const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);

  // Layer stored settings over the defaults: nested objects merge recursively,
  // arrays and scalars are taken from `stored` when present (copied, never
  // shared by reference). New default fields appear for existing installs
  // automatically, and stored-only keys (e.g. per-host snare dismissals) are
  // kept — so adding a setting needs no change here.
  function deepMerge(def, src) {
    if (Array.isArray(def)) return (Array.isArray(src) ? src : def).slice();
    if (!isObj(def)) return src === undefined ? def : src;
    const out = {};
    for (const k of Object.keys(def))
      out[k] = deepMerge(def[k], isObj(src) ? src[k] : undefined);
    if (isObj(src)) for (const k of Object.keys(src)) if (!(k in out)) out[k] = src[k];
    return out;
  }

  function withDefaults(stored) {
    return deepMerge(V.DEFAULT_SETTINGS, stored || {});
  }

  // `browser` is the WebExtension polyfill namespace (native on Firefox,
  // provided by vendor/browser-polyfill in Chrome) — promise-based everywhere.
  V.getSettings = function () {
    return browser.storage.local
      .get(KEY)
      .then((res) => withDefaults(res && res[KEY]))
      .catch(() => withDefaults(null));
  };

  V.setSettings = function (next) {
    return browser.storage.local.set({ [KEY]: next }).then(() => next);
  };

  V.onSettingsChange = function (cb) {
    try {
      browser.storage.onChanged.addListener((changes, area) => {
        if (area === "local" && changes[KEY]) {
          cb(withDefaults(changes[KEY].newValue));
        }
      });
    } catch (e) {}
  };

  V.SETTINGS_KEY = KEY;
  V.withDefaults = withDefaults; // exposed for unit testing the merge

  // Register a one-shot responder for a popup query message (e.g. "getWatchers").
  // Shared by the content modules so each doesn't re-wrap browser.runtime.
  V.onQuery = function (type, fn) {
    try {
      browser.runtime.onMessage.addListener((msg) => {
        if (msg && msg.type === type) return Promise.resolve(fn());
      });
    } catch (e) {}
  };
})(globalThis);

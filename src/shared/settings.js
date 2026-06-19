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
    // The Censor — blur suggestive media, reveal on click.
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
      harden: false, // flip browser privacy settings (needs optional permission)
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

  // Deep-ish merge so new default fields appear for existing installs.
  function withDefaults(stored) {
    const d = V.DEFAULT_SETTINGS;
    const s = stored || {};
    return {
      ...d,
      ...s,
      ai: { ...d.ai, ...(s.ai || {}) },
      privacy: { ...d.privacy, ...(s.privacy || {}) },
      blur: {
        ...d.blur,
        ...(s.blur || {}),
        model: { ...d.blur.model, ...((s.blur && s.blur.model) || {}) },
      },
    };
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
})(globalThis);

/*
 * Single source of truth for the background's shared dependencies and their
 * load order. Consumed by BOTH:
 *   - service-worker.js  (Chrome/Edge: importScripts these, prefixed with "/")
 *   - tools/build.mjs    (Firefox/Zen: spliced into background.scripts)
 * Edit the list here only; neither consumer keeps its own copy.
 */
(function (g) {
  g.VIRGIL_SW_DEPS = [
    "src/shared/palette.js",
    "src/shared/categories.js",
    "src/shared/blocklist.js",
    "src/shared/classify.js",
    "src/shared/trackers.js",
    "src/shared/settings.js",
  ];
})(globalThis);

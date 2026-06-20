/*
 * Virgil — Reveal the Watchers. Awareness only: it reads the page's OWN resource
 * timings (what the page already loaded) and matches third-party hosts against
 * the known-tracker list. No requests are blocked, no network is touched, no
 * extra permission is needed. The popup queries the live tally; a running count
 * of distinct watchers feeds the dungeon ledger.
 */
(function (g) {
  const V = (g.Virgil = g.Virgil || {});
  const W = (V.watchers = {});

  let started = false;
  let fpOn = false;
  let pageBase = null;
  let po = null;
  const found = new Map(); // company name -> category
  let reported = 0;
  let reportTimer = null;

  // Active fingerprint signals (from the MAIN-world probe) fold into the same
  // map under the "fingerprint" category, so the popup renders them with no new UI.
  const FP_NAME = {
    canvas: "Canvas fingerprinting",
    webgl: "WebGL device probe",
    audio: "Audio fingerprinting",
  };
  function notifyHero() {
    try {
      if (V.hero && V.hero.setWatchers) V.hero.setWatchers(found.size);
    } catch (e) {}
  }

  function addFp(sig) {
    const name = FP_NAME[sig];
    if (!name || found.has(name)) return;
    found.set(name, "fingerprint");
    scheduleReport();
    notifyHero();
  }

  function consider(url) {
    let host;
    try {
      host = new URL(url, location.href).hostname;
    } catch (e) {
      return;
    }
    if (!host) return;
    if (V.baseDomain(host) === pageBase) return; // first-party — not a watcher
    const t = V.matchTracker(host);
    if (t && !found.has(t.name)) {
      found.set(t.name, t.category);
      scheduleReport();
      notifyHero();
    }
  }

  // Send only the count of newly-revealed watchers to the background tally, once
  // things settle (debounced) — flavour stat, approximate by design.
  function scheduleReport() {
    clearTimeout(reportTimer);
    reportTimer = setTimeout(() => {
      const delta = found.size - reported;
      if (delta > 0) {
        reported = found.size;
        try {
          browser.runtime.sendMessage({ type: "watchersSeen", count: delta }).catch(() => {});
        } catch (e) {}
      }
    }, 1500);
  }

  W.report = function () {
    const byCategory = {};
    for (const [name, cat] of found) (byCategory[cat] = byCategory[cat] || []).push(name);
    return { count: found.size, names: [...found.keys()], byCategory };
  };

  W.start = function (opts) {
    if (started) return;
    started = true;
    fpOn = !!(opts && opts.fingerprint);
    pageBase = V.baseDomain(location.hostname);
    try {
      for (const e of performance.getEntriesByType("resource")) consider(e.name);
    } catch (e) {}
    try {
      po = new PerformanceObserver((list) => {
        for (const e of list.getEntries()) consider(e.name);
      });
      po.observe({ type: "resource", buffered: true });
    } catch (e) {}
    // Fold in any fingerprint signals the probe already fired before we attached.
    if (fpOn) {
      try {
        const pre = document.documentElement.getAttribute("data-virgil-fp");
        if (pre) pre.split(",").forEach(addFp);
      } catch (e) {}
    }
  };

  // Live fingerprint signals from the MAIN-world probe.
  window.addEventListener("virgil:fp", (e) => {
    if (fpOn && e.detail) addFp(e.detail.sig);
  });

  // Answer the popup's live query (only this content-script handles getWatchers).
  try {
    browser.runtime.onMessage.addListener((msg) => {
      if (msg && msg.type === "getWatchers") return Promise.resolve(W.report());
    });
  } catch (e) {}
})(globalThis);

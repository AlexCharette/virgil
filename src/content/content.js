/*
 * Virgil — content orchestrator. Decides whether the current page is a peril
 * and tells the hero what to do. Detection runs cheapest-first:
 *   Tier 1  blocklist / hostname+title keywords  (instant, offline)
 *   Tier 2  DOM heuristics: feed shape + infinite scroll  (local, lazy)
 *   Tier 3  optional AI classification of ambiguous pages (OpenRouter)
 */
(function (g) {
  const V = (g.Virgil = g.Virgil || {});
  const C = V.CATEGORIES;

  let settings = null;
  let verdict = null; // current category id, once decided
  let scrollDisposer = null;
  let lingerTimer = null;
  let aiAsked = false;

  // --- active-time tracking ----------------------------------------------
  let activeSince = null;
  let bankedSeconds = 0;

  function clockIn() {
    if (activeSince == null && document.visibilityState === "visible")
      activeSince = performance.now();
  }
  function clockOut() {
    if (activeSince != null) {
      bankedSeconds += (performance.now() - activeSince) / 1000;
      activeSince = null;
    }
  }
  function flushTime() {
    clockOut();
    if (verdict && verdict !== "safe" && bankedSeconds >= 1) {
      send({ type: "time", category: verdict, seconds: Math.round(bankedSeconds) });
      bankedSeconds = 0;
    }
  }

  // Identify a page for the allowlist: drop the #fragment, keep path + query so
  // a single video (…/watch?v=ID) is whitelisted, not the whole site.
  function cleanUrl() {
    return location.href.split("#")[0];
  }

  function isExempt() {
    const host = V.normalizeHost(location.hostname);
    return (
      settings.pausedHosts.includes(host) ||
      (settings.allowedUrls || []).includes(cleanUrl())
    );
  }

  function send(msg) {
    // browser.* (polyfill) returns a promise; swallow teardown/no-receiver errors.
    try {
      return browser.runtime.sendMessage(msg).catch(() => null);
    } catch (e) {
      return Promise.resolve(null);
    }
  }

  // --- acting on a verdict ------------------------------------------------

  function speakWarning(category) {
    const cat = C[category] || C.safe;
    const seed = V.normalizeHost(location.hostname);
    const line = V.fillLine(V.pickLine(V.DIALOGUE[category], seed), {
      circle: cat.circle,
    });

    V.hero.setSeverity(cat.severity);
    V.hero.show();
    V.hero.dim(); // draw the page into gloom behind the warning
    V.hero.speak({
      text: line,
      sticky: true,
      actions: [
        {
          label: "Lead me out",
          onClick: () => {
            if (history.length > 1) history.back();
            else location.href = "about:blank";
          },
        },
        {
          label: "Stay on this page",
          ghost: true,
          onClick: stayHere,
        },
      ],
    });
  }

  function startLinger(category) {
    clearTimeout(lingerTimer);
    const mins = settings.lingerMinutes;
    if (!mins) return;
    lingerTimer = setTimeout(() => {
      if (document.visibilityState !== "visible") return;
      const line = V.fillLine(
        V.pickLine(V.DIALOGUE.linger, V.normalizeHost(location.hostname)),
        { minutes: mins }
      );
      V.hero.speak({ text: line, sticky: true });
    }, mins * 60 * 1000);
  }

  function handleVerdict(category, source) {
    if (verdict === category) return;
    verdict = category;
    const cat = C[category] || C.safe;

    if (category === "safe") {
      V.hero.setSeverity("safe");
      V.hero.undim(); // lift any gloom from a prior circle (e.g. SPA nav)
      if (settings.greetOnSafe) {
        V.hero.show();
        V.hero.speak({
          text: V.pickLine(V.DIALOGUE.safe, V.normalizeHost(location.hostname)),
          sticky: false,
        });
      } else {
        V.hero.hide();
      }
      return;
    }

    if (category === "adult" && V.censor) V.censor.setBlurAll(true);
    send({ type: "visit", category, source });
    speakWarning(category);
    startLinger(category);
    clockIn();
  }

  // "Stay" whitelists only this page (URL), not the whole host — so allowing one
  // YouTube video doesn't unguard all of YouTube.
  function stayHere() {
    const url = cleanUrl();
    const allowed = settings.allowedUrls || [];
    if (!allowed.includes(url)) {
      settings = { ...settings, allowedUrls: [...allowed, url] };
      V.setSettings(settings);
    }
    clearTimeout(lingerTimer);
    V.hero.hush();
    V.hero.hide();
    if (V.censor) V.censor.setBlurAll(false);
    verdict = "safe";
  }

  // --- detection pipeline -------------------------------------------------

  function runHeuristics() {
    // One-shot structural feed scan.
    if (V.heuristics.detectFeed()) {
      handleVerdict("scroll", "feed");
      return;
    }
    // Lazy infinite-scroll watcher (self-terminating).
    scrollDisposer = V.heuristics.detectInfiniteScroll(() => {
      if (!verdict || verdict === "safe") handleVerdict("scroll", "scroll");
    });

    maybeAskAI();
  }

  async function maybeAskAI() {
    if (aiAsked || !settings.ai || !settings.ai.enabled || !settings.ai.apiKey)
      return;
    const features = V.heuristics.gatherFeatures();
    // Only spend a call on media/social-shaped pages we couldn't name — never
    // on plain articles/docs (which are safe and would just waste the call).
    const og = (features.ogType || "").toLowerCase();
    const suspicious =
      features.videoCount >= 4 || og.startsWith("video") || og === "profile";
    if (!suspicious) return;

    aiAsked = true;
    const res = await send({ type: "classifyAI", features });
    if (res && res.category && res.category !== "safe") {
      if (!verdict || verdict === "safe") handleVerdict(res.category, "ai");
    }
  }

  async function evaluate() {
    if (isExempt()) {
      verdict = "safe";
      V.hero.setSeverity("safe");
      V.hero.undim();
      V.hero.hide();
      return;
    }

    const stat = V.classifyStatic({
      hostname: location.hostname,
      title: document.title,
    });
    if (stat) {
      handleVerdict(stat.category, stat.source);
      return;
    }

    handleVerdict("safe", "default");
    runHeuristics();
  }

  // --- SPA navigation: re-evaluate on URL change -------------------------

  function watchUrl() {
    let last = location.href;
    const fire = () => {
      if (location.href === last) return;
      last = location.href;
      // Reset per-page state and re-run.
      flushTime();
      verdict = null;
      aiAsked = false;
      if (scrollDisposer) scrollDisposer();
      clearTimeout(lingerTimer);
      setTimeout(evaluate, 400); // let the SPA paint
    };
    for (const m of ["pushState", "replaceState"]) {
      const orig = history[m];
      history[m] = function () {
        const r = orig.apply(this, arguments);
        fire();
        return r;
      };
    }
    window.addEventListener("popstate", fire);
  }

  // --- lifecycle ----------------------------------------------------------

  async function init() {
    settings = await V.getSettings();
    if (!settings.enabled) return;

    V.applyTheme(settings.theme);
    V.hero.mount();
    V.hero.setStyle(settings.style);
    if (!isExempt() && settings.blur && settings.blur.enabled && V.censor)
      V.censor.start(settings.blur);
    if (!isExempt() && settings.privacy && settings.privacy.revealWatchers && V.watchers)
      V.watchers.start();
    watchUrl();
    evaluate();

    V.onSettingsChange((next) => {
      if (next.style !== settings.style) V.hero.setStyle(next.style);
      if (next.theme !== settings.theme) V.hero.applyTheme(next.theme);
      settings = next;
    });

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") clockIn();
      else flushTime();
    });
    window.addEventListener("pagehide", flushTime);
    window.addEventListener("beforeunload", flushTime);
  }

  init();
})(globalThis);

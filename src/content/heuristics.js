/*
 * Virgil — Tier 2 DOM heuristics (content script only).
 *
 * Two cheap, self-terminating probes:
 *   1. detectInfiniteScroll — watches document height growth across a few
 *      scroll bursts, then disconnects. No polling loop.
 *   2. detectFeed — a one-shot structural scan for feed-shaped DOM.
 *
 * Plus gatherFeatures() which produces a small text summary for the optional
 * Tier 3 AI call (kept tiny so the request is cheap).
 */
(function (g) {
  const V = (g.Virgil = g.Virgil || {});
  const H = (V.heuristics = {});

  // One-shot structural scan: feeds tend to stack many sibling cards/articles.
  H.detectFeed = function () {
    if (document.querySelector('[role="feed"]')) return true;
    const articles = document.querySelectorAll("article").length;
    if (articles >= 8) return true;

    // Look for a container with many similarly-shaped direct children.
    const containers = document.querySelectorAll(
      "main, [role='main'], #app, body"
    );
    for (const c of containers) {
      const kids = c.children;
      if (kids.length >= 12) {
        let tagCount = {};
        for (const k of kids) tagCount[k.tagName] = (tagCount[k.tagName] || 0) + 1;
        const max = Math.max(...Object.values(tagCount));
        if (max >= 12) return true; // 12+ siblings of the same tag → a list/feed
      }
    }
    return false;
  };

  /*
   * Watches for the page growing taller as the user scrolls (the signature of
   * an infinite feed). Calls onDetect() once, then tears everything down.
   * Returns a disposer so the caller can cancel on navigation.
   */
  H.detectInfiniteScroll = function (onDetect) {
    let baseHeight = document.documentElement.scrollHeight;
    let growthEvents = 0;
    let done = false;
    let ticking = false;

    const measure = () => {
      ticking = false;
      if (done) return;
      const h = document.documentElement.scrollHeight;
      // Significant growth (> ~1 viewport) counts as one "the page fed me more".
      if (h > baseHeight + window.innerHeight * 0.75) {
        growthEvents += 1;
        baseHeight = h;
        if (growthEvents >= 2) {
          done = true;
          cleanup();
          onDetect();
        }
      }
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(measure);
      }
    };

    const cleanup = () => {
      window.removeEventListener("scroll", onScroll);
      clearTimeout(giveUp);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    // Stop watching after a while if no infinite-scroll behaviour appears.
    const giveUp = setTimeout(cleanup, 90 * 1000);

    return cleanup;
  };

  // Tiny page summary for the AI fallback. Bounded so the request stays cheap.
  H.gatherFeatures = function () {
    const meta = document.querySelector('meta[name="description"]');
    const og = document.querySelector('meta[property="og:type"]');
    const headings = Array.from(document.querySelectorAll("h1, h2"))
      .slice(0, 5)
      .map((h) => h.textContent.trim())
      .filter(Boolean);

    const bodyText = (document.body ? document.body.innerText : "")
      .replace(/\s+/g, " ")
      .slice(0, 600);

    return {
      hostname: location.hostname,
      title: (document.title || "").slice(0, 200),
      description: meta ? meta.content.slice(0, 300) : "",
      ogType: og ? og.content : "",
      headings,
      sample: bodyText,
      videoCount: document.querySelectorAll("video").length,
    };
  };
})(globalThis);

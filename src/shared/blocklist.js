/*
 * Virgil — Tier 1 detection: a curated map of well-known domains to circles.
 * This is the cheap, instant, offline path. Matching is suffix-based, so
 * "m.facebook.com" and "old.reddit.com" both resolve correctly.
 *
 * Lists are intentionally representative, not exhaustive — Tier 2 heuristics
 * and the optional Tier 3 AI catch the long tail.
 */
(function (g) {
  const V = (g.Virgil = g.Virgil || {});

  V.BLOCKLIST = {
    social: [
      "facebook.com",
      "instagram.com",
      "twitter.com",
      "x.com",
      "tiktok.com",
      "reddit.com",
      "snapchat.com",
      "threads.net",
      "tumblr.com",
      "pinterest.com",
      "linkedin.com",
      "substack.com",
      "weibo.com",
      "vk.com",
      "mastodon.social",
      "bsky.app",
      "9gag.com",
    ],
    // Feed-shaped sites whose primary danger is the bottomless scroll.
    scroll: [
      "youtube.com",
      "news.ycombinator.com",
      "imgur.com",
      "buzzfeed.com",
      "quora.com",
      "twitch.tv",
    ],
    // A modest set of well-known adult domains. Tier 2 keyword heuristics and
    // Tier 3 AI cover the rest; this just makes the obvious cases instant.
    adult: [
      "pornhub.com",
      "xvideos.com",
      "xnxx.com",
      "xhamster.com",
      "redtube.com",
      "youporn.com",
      "onlyfans.com",
      "chaturbate.com",
      "stripchat.com",
      "spankbang.com",
    ],
  };

  // Hostname → category, or null. Longest-suffix wins so a site listed in two
  // categories resolves to the most specific match.
  V.matchBlocklist = function (hostname) {
    const host = String(hostname || "").toLowerCase().replace(/^www\./, "");
    let best = null;
    let bestLen = -1;
    for (const category of Object.keys(V.BLOCKLIST)) {
      for (const domain of V.BLOCKLIST[category]) {
        const d = domain.split("/")[0]; // ignore path hints for host match
        if (host === d || host.endsWith("." + d)) {
          if (d.length > bestLen) {
            best = category;
            bestLen = d.length;
          }
        }
      }
    }
    return best;
  };
})(globalThis);

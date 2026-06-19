/*
 * Virgil — pure classification helpers shared by the content script and the
 * service worker. No DOM access here (the service worker has no DOM); the
 * DOM-driven heuristics live in content/heuristics.js.
 */
(function (g) {
  const V = (g.Virgil = g.Virgil || {});

  V.normalizeHost = function (input) {
    try {
      const u = input.includes("://") ? new URL(input) : new URL("https://" + input);
      return u.hostname.toLowerCase().replace(/^www\./, "");
    } catch (e) {
      return String(input || "").toLowerCase().replace(/^www\./, "");
    }
  };

  // Conservative keyword scan for adult content, used on hostname + page text.
  // Word-boundaried to avoid false hits ("scunthorpe"-style) where practical.
  const ADULT_WORDS = [
    "porn",
    "xxx",
    "nsfw",
    "hentai",
    "camgirl",
    "escort",
    "milf",
    "fetish",
    "hardcore",
    "nude",
    "nudes",
    "erotica",
    "camsex",
  ];

  // Compiled once at load — one alternation instead of 13 fresh RegExps per call
  // (this runs per image in the heuristic blur tier).
  const ADULT_RE = new RegExp("\\b(" + ADULT_WORDS.join("|") + ")\\b");

  V.adultKeywordHit = function (text) {
    return ADULT_RE.test(String(text || "").toLowerCase());
  };

  /*
   * Tier 1 + light Tier 2 (host/title keywords only — no live DOM).
   * Returns { category, source, confidence } or null when nothing fires.
   *   source: "blocklist" | "keyword"
   */
  V.classifyStatic = function ({ hostname, title }) {
    const host = V.normalizeHost(hostname);

    const listed = V.matchBlocklist(host);
    if (listed) return { category: listed, source: "blocklist", confidence: 1 };

    if (V.adultKeywordHit(host) || V.adultKeywordHit(title)) {
      return { category: "adult", source: "keyword", confidence: 0.75 };
    }

    return null;
  };
})(globalThis);

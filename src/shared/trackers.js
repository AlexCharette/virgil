/*
 * Virgil — a curated list of known "watchers": third-party trackers, ad
 * networks, analytics, session-replay, and fingerprinting services. Keyed by
 * registrable (base) domain, mapped to { name, category }. Representative, not
 * exhaustive — like blocklist.js, it names the obvious watchers cheaply.
 *
 * categories: analytics · ads · social · replay · fingerprint · tag
 */
(function (g) {
  const V = (g.Virgil = g.Virgil || {});

  // Naive registrable domain: last two labels. Fine for the .com/.net/.io hosts
  // trackers overwhelmingly use; multi-part TLDs (co.uk) are rare here.
  V.baseDomain = function (host) {
    const p = String(host || "").toLowerCase().split(".");
    return p.length <= 2 ? p.join(".") : p.slice(-2).join(".");
  };

  const T = (name, category) => ({ name, category });
  V.TRACKERS = {
    // Google
    "google-analytics.com": T("Google Analytics", "analytics"),
    "googletagmanager.com": T("Google Tag Manager", "tag"),
    "doubleclick.net": T("Google (DoubleClick)", "ads"),
    "googlesyndication.com": T("Google AdSense", "ads"),
    "googleadservices.com": T("Google Ads", "ads"),
    // Analytics
    "segment.com": T("Segment", "analytics"),
    "segment.io": T("Segment", "analytics"),
    "mixpanel.com": T("Mixpanel", "analytics"),
    "amplitude.com": T("Amplitude", "analytics"),
    "heap.io": T("Heap", "analytics"),
    "statcounter.com": T("StatCounter", "analytics"),
    "quantserve.com": T("Quantcast", "analytics"),
    "scorecardresearch.com": T("Comscore", "analytics"),
    "chartbeat.com": T("Chartbeat", "analytics"),
    "cloudflareinsights.com": T("Cloudflare Insights", "analytics"),
    // Session replay
    "hotjar.com": T("Hotjar", "replay"),
    "mouseflow.com": T("Mouseflow", "replay"),
    "fullstory.com": T("FullStory", "replay"),
    "clarity.ms": T("Microsoft Clarity", "replay"),
    "logrocket.com": T("LogRocket", "replay"),
    "inspectlet.com": T("Inspectlet", "replay"),
    "smartlook.com": T("Smartlook", "replay"),
    // Fingerprinting
    "fpjs.io": T("FingerprintJS", "fingerprint"),
    "fpcdn.io": T("FingerprintJS", "fingerprint"),
    "fingerprint.com": T("FingerprintJS", "fingerprint"),
    // Social pixels
    "facebook.net": T("Meta Pixel", "social"),
    "ads-twitter.com": T("X (Twitter) Pixel", "social"),
    "licdn.com": T("LinkedIn Insight", "social"),
    "pinterest.com": T("Pinterest Tag", "social"),
    "tiktok.com": T("TikTok Pixel", "social"),
    "sc-static.net": T("Snap Pixel", "social"),
    "reddit.com": T("Reddit Pixel", "social"),
    // Ad tech / exchanges
    "adnxs.com": T("Xandr (AppNexus)", "ads"),
    "criteo.com": T("Criteo", "ads"),
    "criteo.net": T("Criteo", "ads"),
    "taboola.com": T("Taboola", "ads"),
    "outbrain.com": T("Outbrain", "ads"),
    "pubmatic.com": T("PubMatic", "ads"),
    "rubiconproject.com": T("Magnite", "ads"),
    "openx.net": T("OpenX", "ads"),
    "adsrvr.org": T("The Trade Desk", "ads"),
    "amazon-adsystem.com": T("Amazon Ads", "ads"),
    "casalemedia.com": T("Index Exchange", "ads"),
    "adform.net": T("Adform", "ads"),
    // Data brokers / identity / DMPs
    "demdex.net": T("Adobe Audience Manager", "analytics"),
    "omtrdc.net": T("Adobe Analytics", "analytics"),
    "adobedtm.com": T("Adobe Launch", "tag"),
    "bluekai.com": T("Oracle BlueKai", "ads"),
    "krxd.net": T("Salesforce DMP", "ads"),
    "tiqcdn.com": T("Tealium", "tag"),
    "crwdcntrl.net": T("Lotame", "ads"),
    "rlcdn.com": T("LiveRamp", "ads"),
  };

  V.matchTracker = function (host) {
    return V.TRACKERS[V.baseDomain(host)] || null;
  };

  // --- dossiers: who a watcher is and what it takes -----------------------
  // A category fallback covers everything; named overrides add specifics for
  // the notable ones. Educational, plain, lightly wry.
  V.WATCHER_CATEGORY_BLURB = {
    analytics: "Measures what you do here and reports it back.",
    ads: "Builds an advertising profile of you and trades on it.",
    social: "A social network's pixel — ties this visit to your account there.",
    replay: "Records your session — moves, scrolls, clicks — to replay later.",
    fingerprint: "Identifies your device itself, even without cookies.",
    tag: "A tag manager — the conductor that loads the other watchers.",
  };
  V.TRACKER_DOSSIERS = {
    "Google Analytics": "Google's audience measurement — counts you, your path, and your device.",
    "Google Tag Manager": "Loads and fires other trackers on the page's behalf.",
    "Hotjar": "Records and replays your session: mouse, scrolls, clicks, rage-taps.",
    "FullStory": "Full session replay — it watches the whole visit and keeps it.",
    "LogRocket": "Session replay plus console/network capture for the site's owners.",
    "Microsoft Clarity": "Microsoft's free session recording and heatmaps.",
    "Meta Pixel": "Reports this visit to Facebook/Instagram for ad targeting.",
    "TikTok Pixel": "Ties your visit to your TikTok identity for ads.",
    "FingerprintJS": "Fingerprints your device to re-identify you without cookies.",
    "Criteo": "Retargeting — the ads that follow you around after you leave.",
    "Taboola": "'Around the web' content ads and the profile that feeds them.",
    "Outbrain": "Sponsored-link recommendations and the tracking behind them.",
    "The Trade Desk": "A demand-side platform bidding on your attention in real time.",
    "LiveRamp": "An identity broker — stitches your IDs across sites into one profile.",
    "Oracle BlueKai": "A data-management platform trading audience segments.",
    "Adobe Audience Manager": "Adobe's DMP — assembles and sells audience profiles.",
  };
  V.trackerDossier = (name, category) =>
    V.TRACKER_DOSSIERS[name] ||
    V.WATCHER_CATEGORY_BLURB[category] ||
    "A third-party watcher.";

  // --- the block rule -----------------------------------------------------
  // A single declarativeNetRequest dynamic rule barring every known tracker
  // domain — third-party only, so a site's own first-party calls are untouched.
  // Pure builder so it's unit-testable; the service worker applies it.
  V.trackerDomains = () => Object.keys(V.TRACKERS);
  V.buildBlockRule = (id) => ({
    id,
    priority: 1,
    action: { type: "block" },
    condition: { requestDomains: V.trackerDomains(), domainType: "thirdParty" },
  });
})(globalThis);

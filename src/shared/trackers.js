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
})(globalThis);

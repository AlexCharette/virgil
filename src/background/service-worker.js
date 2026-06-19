/*
 * Virgil — background service worker (MV3, classic worker so importScripts works).
 *
 * Responsibilities:
 *   - aggregate stats (warnings + time guarded) for the popup
 *   - paint the toolbar badge when the active page is a peril
 *   - Tier 3: classify ambiguous pages via an OpenRouter (OpenAI-compatible)
 *     chat-completions endpoint, cached per-host so each domain is asked once
 */
// Chrome runs this as a service worker (importScripts available) and pulls in
// its dependencies here. Firefox loads them via background.scripts in the
// manifest instead, where importScripts does not exist — hence the guard.
if (typeof importScripts === "function") {
  importScripts(
    "/vendor/browser-polyfill.min.js",
    "/src/shared/palette.js",
    "/src/shared/categories.js",
    "/src/shared/blocklist.js",
    "/src/shared/classify.js",
    "/src/shared/settings.js"
  );
}

const V = globalThis.Virgil;
const STATS_KEY = "virgil:stats";
const AICACHE_KEY = "virgil:aicache";
const AI_TTL_MS = 7 * 24 * 60 * 60 * 1000; // re-ask a domain at most weekly

// --- stats ----------------------------------------------------------------

function zeroed() {
  return Object.fromEntries(V.PERIL_CATEGORIES.map((id) => [id, 0]));
}

function blankStats() {
  return { since: Date.now(), warnings: zeroed(), seconds: zeroed(), watchers: 0 };
}

async function addWatchers(n) {
  const s = await getStats();
  s.watchers = (s.watchers || 0) + n;
  await browser.storage.local.set({ [STATS_KEY]: s });
}

// --- privacy hardening (Feature 2) ----------------------------------------
// Flips protective browser settings via the optional `privacy` API and, on
// Chrome, auto-denies notification prompts via `contentSettings`. Everything is
// feature-detected: if the optional permission isn't granted, browser.privacy /
// browser.contentSettings are undefined and this is a safe no-op.
function applyHardening(on) {
  const set = (node, key, value) => {
    try {
      const s = node && node[key];
      if (s && s.set) on ? s.set({ value }) : s.clear({});
    } catch (e) {}
  };
  const P = typeof browser !== "undefined" ? browser.privacy : undefined;
  if (P) {
    if (P.network) {
      set(P.network, "webRTCIPHandlingPolicy", "default_public_interface_only");
      set(P.network, "networkPredictionEnabled", false);
    }
    if (P.websites) {
      set(P.websites, "hyperlinkAuditingEnabled", false);
      // third-party cookies: Chrome boolean vs Firefox cookieConfig vs nothing
      if (P.websites.thirdPartyCookiesAllowed) {
        set(P.websites, "thirdPartyCookiesAllowed", false);
      } else if (P.websites.cookieConfig) {
        try {
          on
            ? P.websites.cookieConfig.set({ value: { behavior: "reject_third_party" } })
            : P.websites.cookieConfig.clear({});
        } catch (e) {}
      }
      // Firefox bonus: turn on built-in tracking protection.
      set(P.websites, "trackingProtectionMode", "always");
    }
  }
  try {
    const cs = typeof browser !== "undefined" ? browser.contentSettings : undefined;
    if (cs && cs.notifications) {
      on
        ? cs.notifications.set({ primaryPattern: "<all_urls>", setting: "block" })
        : cs.notifications.clear({});
    }
  } catch (e) {}
}

async function getStats() {
  const res = await browser.storage.local.get(STATS_KEY);
  return (res && res[STATS_KEY]) || blankStats();
}

async function bumpWarning(category) {
  const s = await getStats();
  if (s.warnings[category] != null) s.warnings[category] += 1;
  await browser.storage.local.set({ [STATS_KEY]: s });
}

async function addSeconds(category, seconds) {
  const s = await getStats();
  if (s.seconds[category] != null) s.seconds[category] += seconds;
  await browser.storage.local.set({ [STATS_KEY]: s });
}

// --- badge ----------------------------------------------------------------

function paintBadge(tabId, category) {
  if (tabId == null) return;
  const cat = V.CATEGORIES[category];
  const sev = V.severity[cat ? cat.severity : "safe"] || V.severity.safe;
  try {
    browser.action.setBadgeBackgroundColor({ tabId, color: sev.color });
    browser.action.setBadgeText({ tabId, text: sev.badge });
  } catch (e) {}
}

function clearBadge(tabId) {
  if (tabId == null) return;
  try {
    browser.action.setBadgeText({ tabId, text: "" });
  } catch (e) {}
}

browser.tabs.onUpdated.addListener((tabId, info) => {
  if (info.status === "loading") clearBadge(tabId);
});

// --- Tier 3: OpenRouter classification ------------------------------------

async function getCache() {
  const res = await browser.storage.local.get(AICACHE_KEY);
  return (res && res[AICACHE_KEY]) || {};
}

async function readCache(host) {
  const cache = await getCache();
  const hit = cache[host];
  if (hit && Date.now() - hit.ts < AI_TTL_MS) return hit.category;
  return null;
}

async function writeCache(host, category) {
  const cache = await getCache();
  cache[host] = { category, ts: Date.now() };
  await browser.storage.local.set({ [AICACHE_KEY]: cache });
}

const SYSTEM_PROMPT =
  "You classify a web page for a focus-guardian browser extension. " +
  'Reply with ONLY a JSON object: {"category":"social"|"scroll"|"adult"|"safe"}. ' +
  "social = social media or feeds of user posts/short videos. " +
  "scroll = infinite-scroll entertainment or aggregators engineered to maximize time-on-site. " +
  "adult = pornographic or sexual content. " +
  "safe = everything else (work, documentation, news articles, shopping, search, email). " +
  'Be conservative: choose "safe" unless the page is clearly one of the others.';

function parseCategory(text) {
  if (!text) return null;
  const m = text.match(/\{[\s\S]*?\}/);
  let cat = null;
  if (m) {
    try {
      cat = JSON.parse(m[0]).category;
    } catch (e) {}
  }
  if (!cat) {
    const lower = text.toLowerCase();
    cat = V.CATEGORY_IDS.find((c) => lower.includes(c));
  }
  return V.CATEGORY_IDS.includes(cat) ? cat : null;
}

async function classifyAI(features) {
  const settings = await V.getSettings();
  const ai = settings.ai || {};
  if (!ai.enabled || !ai.apiKey) return { category: null };

  const host = V.normalizeHost(features.hostname);
  const cached = await readCache(host);
  if (cached) return { category: cached, source: "ai-cache" };

  const userContent =
    "Page summary:\n" +
    JSON.stringify(
      {
        host,
        title: features.title,
        description: features.description,
        ogType: features.ogType,
        headings: features.headings,
        videos: features.videoCount,
        text: (features.sample || "").slice(0, 500),
      },
      null,
      0
    );

  let category = null;
  try {
    const resp = await fetch(ai.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + ai.apiKey,
        // Optional OpenRouter attribution headers (harmless elsewhere).
        "HTTP-Referer": "https://github.com/virgil-extension",
        "X-Title": "Virgil",
      },
      body: JSON.stringify({
        model: ai.model,
        max_tokens: 20,
        temperature: 0,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
      }),
    });
    if (resp.ok) {
      const data = await resp.json();
      const text =
        data &&
        data.choices &&
        data.choices[0] &&
        data.choices[0].message &&
        data.choices[0].message.content;
      category = parseCategory(text);
    }
  } catch (e) {
    category = null;
  }

  if (category) await writeCache(host, category);
  return { category };
}

// --- message router -------------------------------------------------------

// With the polyfill loaded on both ends, returning a Promise from the listener
// sends its resolved value as the response — uniform across Chrome and Firefox.
browser.runtime.onMessage.addListener((msg, sender) => {
  const tabId = sender && sender.tab && sender.tab.id;
  if (!msg || !msg.type) return;

  switch (msg.type) {
    case "visit":
      paintBadge(tabId, msg.category);
      return bumpWarning(msg.category);

    case "time":
      return addSeconds(msg.category, msg.seconds || 0);

    case "watchersSeen":
      return addWatchers(msg.count || 0);

    case "getStats":
      return getStats();

    case "resetStats":
      return browser.storage.local
        .set({ [STATS_KEY]: blankStats() })
        .then(() => blankStats());

    case "classifyAI":
      return classifyAI(msg.features).then((r) => {
        if (r.category && r.category !== "safe") paintBadge(tabId, r.category);
        return r;
      });
  }
});

browser.runtime.onInstalled.addListener(() => {
  // Establish defaults on first install (merge is harmless on upgrade).
  V.getSettings().then((s) => V.setSettings(s));
});

// Keep the theme (badge colour) and privacy hardening aligned with settings.
function applyFromSettings(s) {
  V.applyTheme(s.theme);
  applyHardening(!!(s.privacy && s.privacy.harden));
}
V.getSettings().then(applyFromSettings);
V.onSettingsChange(applyFromSettings);

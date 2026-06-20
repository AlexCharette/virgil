/*
 * Virgil — popup controller. Reads/writes shared settings, shows the ledger
 * of warnings and time, and manages the paused-site list and Oracle (AI) keys.
 */
(function () {
  const V = globalThis.Virgil;
  const $ = (id) => document.getElementById(id);
  let settings = null;
  let savedTimer = null;

  // Declare each control once as [input id, settings path]; populate() and
  // bindControls() are then generated loops, so a new setting is one row here.
  const getPath = (o, p) => p.split(".").reduce((x, k) => x && x[k], o);
  const setPath = (o, p, v) => {
    const ks = p.split(".");
    let x = o;
    for (let i = 0; i < ks.length - 1; i++) x = x[ks[i]];
    x[ks[ks.length - 1]] = v;
  };
  const TOGGLES = [
    ["enabled", "enabled"],
    ["greetOnSafe", "greetOnSafe"],
    ["blurEnabled", "blur.enabled"],
    ["blurOnAdult", "blur.onAdultPages"],
    ["blurHeuristics", "blur.heuristics"],
    ["revealWatchers", "privacy.revealWatchers"],
    ["detectFingerprinting", "privacy.detectFingerprinting"],
    ["watcherFx", "privacy.watcherFx"],
    ["aiEnabled", "ai.enabled"],
  ];
  const TEXTS = [
    ["aiEndpoint", "ai.endpoint"],
    ["aiModel", "ai.model"],
    ["aiKey", "ai.apiKey"],
  ];

  function flashSaved() {
    const el = $("saved");
    el.classList.add("show");
    clearTimeout(savedTimer);
    savedTimer = setTimeout(() => el.classList.remove("show"), 1200);
  }

  function fmtDuration(sec) {
    sec = Math.round(sec || 0);
    if (sec < 60) return sec + "s";
    if (sec < 3600) return Math.round(sec / 60) + "m";
    const h = Math.floor(sec / 3600);
    const m = Math.round((sec % 3600) / 60);
    return m ? `${h}h ${m}m` : `${h}h`;
  }

  function renderStats(stats) {
    const cats = V.PERIL_CATEGORIES;
    const sum = (bucket) => cats.reduce((t, id) => t + (stats[bucket][id] || 0), 0);
    const warned = sum("warnings");
    $("ledgerSummary").textContent =
      `${fmtDuration(sum("seconds"))} in the depths · ${warned} warned`;
    $("watchers-total").textContent = stats.watchers || 0;

    const ledger = $("ledger");
    ledger.replaceChildren();
    for (const id of cats) {
      const cat = V.CATEGORIES[id];
      const sev = cat.severity;
      const li = document.createElement("li");
      // Severity by glyph + colour, never colour alone (the badge carries the
      // distinction for colour-blind readers): "!" caution, "‼" peril.
      const badge = document.createElement("span");
      badge.className = "sev-badge";
      badge.style.color = V.severityColor[sev];
      badge.textContent = V.severity[sev].badge || "·";
      const left = document.createElement("span");
      left.className = "led-label";
      left.textContent = cat.label;
      const right = document.createElement("span");
      right.className = "count";
      right.textContent = `${stats.warnings[id]} · ${fmtDuration(
        stats.seconds[id]
      )}`;
      li.append(badge, left, right);
      ledger.appendChild(li);
    }
  }

  // Push the active palette into the popup's own :root vars (popup.css reads them).
  function applyThemeVars() {
    const P = V.palette;
    const d = document.documentElement.style;
    const map = {
      "--void": P.void, "--crypt": P.crypt, "--stone": P.stone,
      "--ink": P.ink, "--ink-dim": P.inkDim, "--cloak": P.cloak,
      "--steel": P.steel, "--glow": P.glow, "--peril": P.peril,
    };
    for (const k in map) d.setProperty(k, map[k]);
  }

  function renderThemePicker() {
    const grid = $("themeGrid");
    grid.replaceChildren();
    for (const t of V.THEME_LIST) {
      const opt = document.createElement("button");
      opt.type = "button";
      opt.className = "theme-opt" + (settings.theme === t.id ? " sel" : "");
      opt.title = t.name;
      const sw = document.createElement("span");
      sw.className = "theme-sw";
      sw.style.background = t.palette.crypt;
      for (const key of ["glow", "cloak", "peril"]) {
        const dot = document.createElement("i");
        dot.style.background = t.palette[key];
        sw.appendChild(dot);
      }
      const label = document.createElement("span");
      label.className = "theme-name";
      label.textContent = t.name;
      opt.append(sw, label);
      opt.addEventListener("click", () => {
        settings.theme = t.id;
        save();
        V.applyTheme(t.id);
        applyThemeVars();
        $("portrait").src = V.spriteDataUri(V.palette.glow, settings.style);
        renderPicker(); // recolour the guide thumbnails
        renderThemePicker();
      });
      grid.appendChild(opt);
    }
  }

  function renderPicker() {
    const grid = $("styleGrid");
    grid.replaceChildren();
    for (const c of V.CHARACTER_LIST) {
      const opt = document.createElement("button");
      opt.type = "button";
      opt.className = "style-opt" + (settings.style === c.id ? " sel" : "");
      opt.title = c.desc;
      const img = document.createElement("img");
      img.src = V.spriteDataUri(V.palette.glow, c.id);
      img.alt = c.name;
      const label = document.createElement("span");
      label.textContent = c.name;
      opt.append(img, label);
      opt.addEventListener("click", () => {
        settings.style = c.id;
        save();
        $("portrait").src = V.spriteDataUri(V.palette.glow, c.id);
        renderPicker();
      });
      grid.appendChild(opt);
    }
  }

  function shortUrl(u) {
    try {
      const x = new URL(u);
      let tail = x.pathname + x.search;
      if (tail.length > 34) tail = tail.slice(0, 33) + "…";
      return x.hostname.replace(/^www\./, "") + tail;
    } catch (e) {
      return u;
    }
  }

  function renderPaused() {
    const list = $("pausedList");
    const empty = $("pausedEmpty");
    list.replaceChildren();
    const hosts = settings.pausedHosts || [];
    const urls = settings.allowedUrls || [];
    const total = hosts.length + urls.length;
    empty.style.display = total ? "none" : "block";
    $("allowedCount").textContent = total ? String(total) : "";

    const row = (label, fullTitle, onRemove) => {
      const li = document.createElement("li");
      const span = document.createElement("span");
      span.textContent = label;
      span.title = fullTitle;
      span.className = "ignore-label";
      const btn = document.createElement("button");
      btn.textContent = "✕";
      btn.title = "Let Virgil watch this again";
      btn.addEventListener("click", () => {
        onRemove();
        save();
        renderPaused();
      });
      li.append(span, btn);
      list.appendChild(li);
    };

    for (const host of hosts)
      row(host, host + " (whole site)", () => {
        settings.pausedHosts = settings.pausedHosts.filter((h) => h !== host);
      });
    for (const url of urls)
      row(shortUrl(url), url, () => {
        settings.allowedUrls = settings.allowedUrls.filter((u) => u !== url);
      });
  }

  function save() {
    V.setSettings(settings).then(flashSaved);
  }

  const WATCHER_LABELS = {
    analytics: "Analytics",
    ads: "Advertising",
    social: "Social pixel",
    replay: "Session replay",
    fingerprint: "Fingerprinting",
    tag: "Tag manager",
  };

  function renderWatchers(rep) {
    const el = $("watchersBody");
    const summary = $("watchersSummary");
    if (!rep) {
      summary.textContent = "not scanned";
      el.textContent = "Not scanned on this page.";
      return;
    }
    if (!rep.count) {
      summary.textContent = "clear";
      el.textContent = "No watchers here — the road is unobserved.";
      return;
    }
    summary.textContent =
      rep.count === 1 ? "1 watching" : rep.count + " watching";
    el.replaceChildren();
    const head = document.createElement("div");
    head.className = "watchers-count";
    head.textContent =
      rep.count === 1 ? "1 watcher revealed" : rep.count + " watchers revealed";
    el.appendChild(head);
    for (const cat of Object.keys(rep.byCategory)) {
      const row = document.createElement("div");
      row.className = "watcher-row";
      const k = document.createElement("span");
      k.className = "watcher-cat";
      k.textContent = WATCHER_LABELS[cat] || cat;
      const v = document.createElement("span");
      v.className = "watcher-names";
      v.textContent = rep.byCategory[cat].join(", ");
      row.append(k, v);
      el.appendChild(row);
    }
  }

  async function loadWatchers() {
    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      const tab = tabs && tabs[0];
      if (!tab || tab.id == null) return renderWatchers(null);
      const rep = await browser.tabs
        .sendMessage(tab.id, { type: "getWatchers" })
        .catch(() => null);
      renderWatchers(rep);
    } catch (e) {
      renderWatchers(null);
    }
  }

  // Optional permissions actually available in this browser build.
  function hardenPerms() {
    const avail = browser.runtime.getManifest().optional_permissions || [];
    return ["privacy", "contentSettings"].filter((p) => avail.includes(p));
  }

  function bindControls() {
    for (const [id, path] of TOGGLES)
      $(id).addEventListener("change", (e) => {
        setPath(settings, path, e.target.checked);
        save();
      });
    for (const [id, path] of TEXTS)
      $(id).addEventListener("change", (e) => {
        setPath(settings, path, e.target.value.trim());
        save();
      });
    $("lingerMinutes").addEventListener("change", (e) => {
      settings.lingerMinutes = Math.max(0, parseInt(e.target.value, 10) || 0);
      save();
    });
    // Harden needs an optional permission — request it on enable (user gesture).
    $("harden").addEventListener("change", async (e) => {
      if (e.target.checked) {
        let granted = false;
        try {
          granted = await browser.permissions.request({ permissions: hardenPerms() });
        } catch (err) {
          granted = false;
        }
        if (!granted) {
          e.target.checked = false;
          $("hardenNote").hidden = false;
          return;
        }
        $("hardenNote").hidden = true;
        settings.privacy.harden = true;
        save();
      } else {
        $("hardenNote").hidden = true;
        settings.privacy.harden = false;
        save();
        try {
          browser.permissions.remove({ permissions: hardenPerms() });
        } catch (err) {}
      }
    });
    // Reset wipes all-time stats — guard it with an inline two-step confirm.
    let resetTimer = null;
    const disarmReset = (btn) => {
      clearTimeout(resetTimer);
      btn.dataset.armed = "0";
      btn.classList.remove("armed");
      btn.textContent = "Reset the ledger";
    };
    $("reset").addEventListener("click", (e) => {
      const btn = e.currentTarget;
      if (btn.dataset.armed !== "1") {
        btn.dataset.armed = "1";
        btn.classList.add("armed");
        btn.textContent = "Confirm — wipe it?";
        resetTimer = setTimeout(() => disarmReset(btn), 3500);
        return;
      }
      disarmReset(btn);
      browser.runtime
        .sendMessage({ type: "resetStats" })
        .then((stats) => stats && renderStats(stats));
    });
  }

  function populate() {
    for (const [id, path] of TOGGLES) $(id).checked = getPath(settings, path);
    for (const [id, path] of TEXTS) $(id).value = getPath(settings, path);
    $("lingerMinutes").value = settings.lingerMinutes;
    $("harden").checked = settings.privacy.harden;
  }

  async function init() {
    settings = await V.getSettings();
    V.applyTheme(settings.theme);
    applyThemeVars();
    $("portrait").src = V.spriteDataUri(V.palette.glow, settings.style);
    populate();
    renderThemePicker();
    renderPicker();
    renderPaused();
    loadWatchers();
    bindControls();
    browser.runtime
      .sendMessage({ type: "getStats" })
      .then((stats) => stats && renderStats(stats));
  }

  init();
})();

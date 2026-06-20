/*
 * Virgil — popup controller, recast as a loadout screen. The wayfarer equips
 * "wards" (each maps to an existing setting boolean); hovering or focusing a
 * ward inspects it in the detail strip. Equipped wards are reflected in the
 * portrait's charm sockets and on the live in-page hero (via content.js).
 */
(function () {
  const V = globalThis.Virgil;
  const $ = (id) => document.getElementById(id);
  let settings = null;
  let savedTimer = null;

  const getPath = (o, p) => p.split(".").reduce((x, k) => (x ? x[k] : undefined), o);
  const setPath = (o, p, v) => {
    const ks = p.split(".");
    let x = o;
    for (let i = 0; i < ks.length - 1; i++) x = x[ks[i]];
    x[ks[ks.length - 1]] = v;
  };

  // The loadout. Each ward's `path` is the existing setting it equips; `config`
  // are the sub-options shown when the ward is inspected.
  const WARDS = [
    {
      id: "eye", name: "The Watcher's Eye", charm: "eye",
      path: "privacy.revealWatchers",
      gloss: "Tally the trackers the moment a page loads.",
      config: [
        { type: "toggle", label: "Spot device fingerprinting", path: "privacy.detectFingerprinting" },
        { type: "toggle", label: "Spooky watcher alerts", path: "privacy.watcherFx" },
        { type: "toggle", label: "Gouge out the watchers (bar them, third-party only)", path: "privacy.block" },
      ],
    },
    {
      id: "cloak", name: "Cloak of Passage", charm: "cloak",
      path: "privacy.harden", special: "harden",
      gloss: "Block WebRTC leaks, link auditing & third-party cookies (and notification nags on Chrome). Asks the browser's leave when equipped.",
      config: [],
    },
    {
      id: "snare", name: "Snare-sense", charm: "knot",
      path: "snares.enabled",
      gloss: "Name the page's deceits — fake urgency, ticked boxes, crooked consent gates.",
      config: [],
    },
    {
      id: "shroud", name: "The Shroud", charm: "veil",
      path: "blur.enabled",
      gloss: "Blur suggestive media; click any veil to reveal it.",
      config: [
        { type: "toggle", label: "Veil all media on adult sites", path: "blur.onAdultPages" },
        { type: "toggle", label: "Veil lewd media anywhere", path: "blur.heuristics" },
      ],
    },
    {
      id: "oracle", name: "The Oracle", charm: "star",
      path: "ai.enabled",
      gloss: "Consult an OpenRouter-compatible model on pages Virgil can't name. Your key stays on this device.",
      config: [
        { type: "text", label: "Endpoint", path: "ai.endpoint", placeholder: "https://openrouter.ai/api/v1/chat/completions" },
        { type: "text", label: "Model", path: "ai.model", placeholder: "openai/gpt-4o-mini" },
        { type: "password", label: "API key", path: "ai.apiKey", placeholder: "sk-or-..." },
      ],
    },
  ];

  // The guide's own bearing (master switch + behaviour), shown when you inspect
  // the portrait.
  const CHARACTER = {
    id: "virgil", name: "Virgil",
    gloss: "Your guide. He walks with you and steps forward at the snares.",
    config: [
      { type: "toggle", label: "Virgil stands watch", path: "enabled" },
      { type: "toggle", label: "Greet me on safe roads", path: "greetOnSafe" },
      { type: "number", label: "Warn after (minutes)", path: "lingerMinutes", min: 0, max: 120 },
    ],
  };

  const lit = () => V.palette.glow;
  const dim = () => V.palette.inkDim;

  function flashSaved() {
    const el = $("saved");
    el.classList.add("show");
    clearTimeout(savedTimer);
    savedTimer = setTimeout(() => el.classList.remove("show"), 1200);
  }
  function save() {
    V.setSettings(settings).then(flashSaved);
  }

  function fmtDuration(sec) {
    sec = Math.round(sec || 0);
    if (sec < 60) return sec + "s";
    if (sec < 3600) return Math.round(sec / 60) + "m";
    const h = Math.floor(sec / 3600);
    const m = Math.round((sec % 3600) / 60);
    return m ? `${h}h ${m}m` : `${h}h`;
  }

  function charmFor(id, on) {
    const wrap = document.createElement("span");
    wrap.className = "charm" + (on ? " on" : "");
    wrap.appendChild(V.charmSvg(id, on ? lit() : dim()));
    return wrap;
  }

  // ---- the loadout ----
  function renderSockets() {
    const el = $("sockets");
    el.replaceChildren();
    for (const w of WARDS) {
      const on = !!getPath(settings, w.path);
      const s = charmFor(w.charm, on);
      s.title = w.name + (on ? " — equipped" : " — not equipped");
      el.appendChild(s);
    }
  }

  function renderWards() {
    const grid = $("wardGrid");
    grid.replaceChildren();
    for (const w of WARDS) {
      const on = !!getPath(settings, w.path);
      const tile = document.createElement("button");
      tile.type = "button";
      tile.className = "ward" + (on ? " equipped" : "");
      tile.setAttribute("role", "checkbox");
      tile.setAttribute("aria-checked", on ? "true" : "false");
      tile.setAttribute("aria-label", w.name + (on ? " — equipped" : " — not equipped"));
      tile.appendChild(charmFor(w.charm, on));
      const nm = document.createElement("span");
      nm.className = "ward-name";
      nm.textContent = w.name;
      const st = document.createElement("span");
      st.className = "ward-state";
      st.textContent = on ? "equipped" : "—";
      tile.append(nm, st);
      tile.addEventListener("click", () => toggleEquip(w));
      tile.addEventListener("mouseenter", () => showDetail(w));
      tile.addEventListener("focus", () => showDetail(w));
      grid.appendChild(tile);
    }
  }

  function toggleEquip(w) {
    if (w.special === "harden") return toggleHarden(w);
    setPath(settings, w.path, !getPath(settings, w.path));
    save();
    renderWards();
    renderSockets();
    showDetail(w);
  }

  // Filter a wanted permission list to those the build actually declares
  // (Firefox drops contentSettings, etc.), so we never request a missing one.
  function availPerms(list) {
    const avail = browser.runtime.getManifest().optional_permissions || [];
    return list.filter((p) => avail.includes(p));
  }
  const hardenPerms = () => availPerms(["privacy", "contentSettings"]);
  async function toggleHarden(w) {
    const cur = !!getPath(settings, "privacy.harden");
    if (!cur) {
      let granted = false;
      try {
        granted = await browser.permissions.request({ permissions: hardenPerms() });
      } catch (e) {}
      if (!granted) {
        showDetail(w, "The browser refused — your passage stays uncloaked.");
        return;
      }
      setPath(settings, "privacy.harden", true);
      save();
    } else {
      setPath(settings, "privacy.harden", false);
      save();
      try {
        browser.permissions.remove({ permissions: hardenPerms() });
      } catch (e) {}
    }
    renderWards();
    renderSockets();
    showDetail(w);
  }

  // ---- the inspect / detail strip ----
  function showDetail(item, note) {
    const d = $("wardDetail");
    d.replaceChildren();
    const head = document.createElement("div");
    head.className = "detail-head";
    head.textContent = item.name;
    const gloss = document.createElement("p");
    gloss.className = "detail-gloss";
    gloss.textContent = note || item.gloss;
    d.append(head, gloss);
    for (const cfg of item.config) d.appendChild(renderControl(cfg));
  }

  function renderControl(cfg) {
    if (cfg.type === "toggle" || cfg.type === "number") {
      const row = document.createElement("label");
      row.className = cfg.type === "toggle" ? "row switch" : "row";
      const lab = document.createElement("span");
      lab.className = "row-label";
      lab.textContent = cfg.label;
      const inp = document.createElement("input");
      if (cfg.type === "toggle") {
        inp.type = "checkbox";
        inp.checked = !!getPath(settings, cfg.path);
        inp.addEventListener("change", async () => {
          // Permission-gated toggles (e.g. blocking) request on enable, drop on
          // disable; revert the switch if the browser declines.
          if (cfg.perm) {
            if (inp.checked) {
              let granted = false;
              try {
                granted = await browser.permissions.request({ permissions: availPerms(cfg.perm) });
              } catch (e) {}
              if (!granted) {
                inp.checked = false;
                return;
              }
            } else {
              try {
                browser.permissions.remove({ permissions: availPerms(cfg.perm) });
              } catch (e) {}
            }
          }
          setPath(settings, cfg.path, inp.checked);
          save();
        });
      } else {
        inp.type = "number";
        inp.className = "num";
        if (cfg.min != null) inp.min = cfg.min;
        if (cfg.max != null) inp.max = cfg.max;
        inp.value = getPath(settings, cfg.path);
        inp.addEventListener("change", () => {
          setPath(settings, cfg.path, Math.max(0, parseInt(inp.value, 10) || 0));
          save();
        });
      }
      row.append(lab, inp);
      return row;
    }
    // text / password
    const field = document.createElement("label");
    field.className = "field";
    const lab = document.createElement("span");
    lab.textContent = cfg.label;
    const inp = document.createElement("input");
    inp.type = cfg.type === "password" ? "password" : "text";
    if (cfg.placeholder) inp.placeholder = cfg.placeholder;
    inp.value = getPath(settings, cfg.path) || "";
    inp.addEventListener("change", () => {
      setPath(settings, cfg.path, inp.value.trim());
      save();
    });
    field.append(lab, inp);
    return field;
  }

  // ---- the chronicle (ledger) ----
  function renderStats(stats) {
    const cats = V.PERIL_CATEGORIES;
    const sum = (bucket) => cats.reduce((t, id) => t + (stats[bucket][id] || 0), 0);
    $("ledgerSummary").textContent =
      `${fmtDuration(sum("seconds"))} in the depths · ${sum("warnings")} warned`;
    $("watchers-total").textContent = stats.watchers || 0;
    $("snares-total").textContent = stats.snares || 0;

    const ledger = $("ledger");
    ledger.replaceChildren();
    for (const id of cats) {
      const cat = V.CATEGORIES[id];
      const sev = cat.severity;
      const li = document.createElement("li");
      const badge = document.createElement("span");
      badge.className = "sev-badge";
      badge.style.color = V.severityColor[sev];
      badge.textContent = V.severity[sev].badge || "·";
      const left = document.createElement("span");
      left.className = "led-label";
      left.textContent = cat.label;
      const right = document.createElement("span");
      right.className = "count";
      right.textContent = `${stats.warnings[id]} · ${fmtDuration(stats.seconds[id])}`;
      li.append(badge, left, right);
      ledger.appendChild(li);
    }
  }

  // ---- attune (guide + realm) ----
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

  function refreshAfterTheme() {
    applyThemeVars();
    $("portrait").src = V.spriteDataUri(V.palette.glow, settings.style);
    renderSockets();
    renderWards();
    renderPicker();
    renderThemePicker();
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
        refreshAfterTheme();
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

  // ---- safe passages ----
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

  // ---- this road (live reconnaissance) ----
  const WATCHER_LABELS = {
    analytics: "Analytics", ads: "Advertising", social: "Social pixel",
    replay: "Session replay", fingerprint: "Fingerprinting", tag: "Tag manager",
  };

  function renderWatchers(rep) {
    const el = $("watchersBody");
    const sum = $("watchersSummary");
    if (!rep) {
      sum.textContent = "not scanned";
      el.textContent = "Not scanned on this page.";
      return;
    }
    if (!rep.count) {
      sum.textContent = "clear";
      el.textContent = "No watchers here — the road is unobserved.";
      return;
    }
    sum.textContent = rep.count === 1 ? "1 here" : rep.count + " here";
    el.replaceChildren();
    const dossier = document.createElement("p");
    dossier.className = "dossier";
    dossier.hidden = true;
    for (const cat of Object.keys(rep.byCategory)) {
      const row = document.createElement("div");
      row.className = "watcher-row";
      const k = document.createElement("span");
      k.className = "watcher-cat";
      k.textContent = WATCHER_LABELS[cat] || cat;
      const v = document.createElement("span");
      v.className = "watcher-names";
      for (const name of rep.byCategory[cat]) {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "chip";
        chip.textContent = name;
        chip.title = "Who is this?";
        chip.addEventListener("click", () => {
          dossier.textContent = name + " — " + V.trackerDossier(name, cat);
          dossier.hidden = false;
        });
        v.appendChild(chip);
      }
      row.append(k, v);
      el.appendChild(row);
    }
    el.appendChild(dossier);
  }

  function renderSnares(rep) {
    const el = $("snaresBody");
    const sum = $("snaresSummary");
    if (!rep) {
      sum.textContent = "not scanned";
      el.textContent = "Not scanned on this page.";
      return;
    }
    if (!rep.count) {
      sum.textContent = "clear";
      el.textContent = "No snares here — the way is honest.";
      return;
    }
    sum.textContent = rep.count === 1 ? "1 marked" : rep.count + " marked";
    el.replaceChildren();
    for (const id of Object.keys(rep.byType)) {
      const row = document.createElement("div");
      row.className = "watcher-row";
      const k = document.createElement("span");
      k.className = "watcher-cat";
      k.textContent = V.snareName(id);
      const v = document.createElement("span");
      v.className = "watcher-names";
      v.textContent = rep.byType[id];
      row.append(k, v);
      el.appendChild(row);
    }
  }

  async function queryActive(type, render) {
    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      const tab = tabs && tabs[0];
      if (!tab || tab.id == null) return render(null);
      const rep = await browser.tabs.sendMessage(tab.id, { type }).catch(() => null);
      render(rep);
    } catch (e) {
      render(null);
    }
  }

  // ---- site data: audit + "salt the earth" ----
  function renderStorage(rep) {
    const sum = $("storageSummary");
    const body = $("storageBody");
    if (!rep) {
      sum.textContent = "—";
      body.textContent = "Not scanned on this page.";
      return;
    }
    const parts = [];
    if (rep.cookies) parts.push(rep.cookies + (rep.cookies === 1 ? " cookie" : " cookies"));
    if (rep.localStorage) parts.push(rep.localStorage + " local");
    if (rep.sessionStorage) parts.push(rep.sessionStorage + " session");
    const total = (rep.cookies || 0) + (rep.localStorage || 0) + (rep.sessionStorage || 0);
    sum.textContent = total ? "stowed" : "clean";
    body.textContent = total
      ? "This site has stowed: " + parts.join(" · ") + "."
      : "Nothing stowed here that the page can see.";
  }
  const loadStorage = () => queryActive("getStorage", renderStorage);

  let purgeTimer = null;
  function disarmPurge(btn) {
    clearTimeout(purgeTimer);
    btn.dataset.armed = "0";
    btn.classList.remove("armed");
    btn.textContent = "Salt the earth here";
  }
  function bindPurge() {
    $("purge").addEventListener("click", async (e) => {
      const btn = e.currentTarget;
      if (btn.dataset.armed !== "1") {
        btn.dataset.armed = "1";
        btn.classList.add("armed");
        btn.textContent = "Confirm — wipe this site's data?";
        purgeTimer = setTimeout(() => disarmPurge(btn), 3500);
        return;
      }
      disarmPurge(btn);
      let granted = false;
      try {
        granted = await browser.permissions.request({ permissions: availPerms(["cookies", "browsingData"]) });
      } catch (e2) {}
      if (!granted) {
        $("storageBody").textContent = "Virgil needs the browser's leave to clear cookies — declined.";
        return;
      }
      try {
        const tabs = await browser.tabs.query({ active: true, currentWindow: true });
        const tab = tabs && tabs[0];
        if (!tab || !tab.url) return;
        const origin = new URL(tab.url).origin;
        await browser.tabs.sendMessage(tab.id, { type: "clearStorage" }).catch(() => null);
        await browser.runtime.sendMessage({ type: "purgeSite", origin }).catch(() => null);
        loadStorage();
        $("storageBody").textContent = "Salted. This site's cookies and storage are cleared.";
      } catch (e3) {
        $("storageBody").textContent = "Couldn't reach this page.";
      }
    });
  }

  // ---- reset (two-step) ----
  let resetTimer = null;
  function disarmReset(btn) {
    clearTimeout(resetTimer);
    btn.dataset.armed = "0";
    btn.classList.remove("armed");
    btn.textContent = "Reset the chronicle";
  }
  function bindReset() {
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

  // ---- lifecycle ----
  async function init() {
    settings = await V.getSettings();
    V.applyTheme(settings.theme);
    applyThemeVars();
    $("portrait").src = V.spriteDataUri(V.palette.glow, settings.style);

    renderSockets();
    renderWards();
    showDetail(CHARACTER); // bearing (master switch) visible by default
    renderThemePicker();
    renderPicker();
    renderPaused();
    bindReset();

    const inspectChar = () => showDetail(CHARACTER);
    $("character").addEventListener("click", inspectChar);
    $("character").addEventListener("mouseenter", inspectChar);
    $("character").addEventListener("focus", inspectChar);

    bindPurge();
    queryActive("getWatchers", renderWatchers);
    queryActive("getSnares", renderSnares);
    loadStorage();
    browser.runtime
      .sendMessage({ type: "getStats" })
      .then((stats) => stats && renderStats(stats));
  }

  init();
})();

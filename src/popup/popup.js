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
    $("stat-warnings").textContent = sum("warnings");
    $("stat-time").textContent = fmtDuration(sum("seconds"));

    const ledger = $("ledger");
    ledger.replaceChildren();
    for (const id of cats) {
      const cat = V.CATEGORIES[id];
      const li = document.createElement("li");
      const sev = cat.severity;
      li.style.borderLeftColor = V.severityColor[sev];
      const left = document.createElement("span");
      left.textContent = cat.label;
      const right = document.createElement("span");
      right.className = "count";
      right.textContent = `${stats.warnings[id]} · ${fmtDuration(
        stats.seconds[id]
      )}`;
      li.append(left, right);
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
    empty.style.display = hosts.length || urls.length ? "none" : "block";

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
    $("reset").addEventListener("click", () => {
      browser.runtime
        .sendMessage({ type: "resetStats" })
        .then((stats) => stats && renderStats(stats));
    });
  }

  function populate() {
    for (const [id, path] of TOGGLES) $(id).checked = getPath(settings, path);
    for (const [id, path] of TEXTS) $(id).value = getPath(settings, path);
    $("lingerMinutes").value = settings.lingerMinutes;
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
    bindControls();
    browser.runtime
      .sendMessage({ type: "getStats" })
      .then((stats) => stats && renderStats(stats));
  }

  init();
})();

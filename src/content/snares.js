/*
 * Virgil — the Snares (Phase 1, Tier 1). Reveals deceptive UX on the page and
 * marks it; never blocks or alters it (guide, not gaoler). Three structural
 * snares, all local, all high-precision:
 *   - false urgency  : a text node ticking DOWN like a clock (characterData)
 *   - ticked box     : a default-checked marketing/consent opt-in
 *   - crooked gate    : a known consent banner where you can accept but not refuse
 *
 * The judgement lives in V.dpEngine (pure, tested); this file is the DOM
 * plumbing — scoped scans, observers, markers, and the per-host dismiss loop.
 */
(function (g) {
  const V = (g.Virgil = g.Virgil || {});
  const S = (V.snares = {});

  const MAX_MARKS = 8;
  let started = false;
  let opts = { mark: true };
  let host = "";
  let dismissed = new Set(); // snareIds the wayfarer waved off for this host
  let layer = null;
  let mo = null;
  let scanTimer = null;
  let rafPending = false;

  const marked = new Map(); // targetEl -> { snareId, marker }
  const markers = []; // { el, marker } for repositioning
  const counts = {}; // snareId -> count
  let reported = 0;
  let reportTimer = null;

  const cautionColor = () =>
    (V.severityColor && V.severityColor.caution) || "#ffce5b";

  // --- reporting ----------------------------------------------------------
  function total() {
    return V.SNARE_IDS.reduce((t, id) => t + (counts[id] || 0), 0);
  }
  function notifyHero() {
    try {
      if (V.hero && V.hero.setSnares) V.hero.setSnares(total(), flashMarkers);
    } catch (e) {}
  }
  function scheduleReport() {
    clearTimeout(reportTimer);
    reportTimer = setTimeout(() => {
      const delta = total() - reported;
      if (delta > 0) {
        reported = total();
        try {
          browser.runtime
            .sendMessage({ type: "snaresSeen", count: delta })
            .catch(() => {});
        } catch (e) {}
      }
    }, 1500);
  }

  // --- markers ------------------------------------------------------------
  function ensureLayer() {
    if (layer) return;
    layer = document.createElement("div");
    layer.id = "virgil-snares-layer";
    (document.body || document.documentElement).appendChild(layer);
    window.addEventListener("scroll", reposition, { passive: true, capture: true });
    window.addEventListener("resize", reposition, { passive: true });
  }

  function addMarker(el, snareId) {
    if (!opts.mark) return;
    ensureLayer();
    const m = document.createElement("div");
    m.className = "virgil-snare";
    m.tabIndex = 0;
    m.setAttribute("role", "button");
    m.setAttribute(
      "aria-label",
      V.snareName(snareId) + ": " + V.snareLine(snareId)
    );
    m.style.setProperty("--vg-snare", cautionColor());
    m.appendChild(V.knotSvg(cautionColor()));

    const tip = document.createElement("div");
    tip.className = "virgil-snare-tip";
    const line = document.createElement("span");
    line.className = "virgil-snare-line";
    line.textContent = V.snareLine(snareId);
    const dismiss = document.createElement("button");
    dismiss.className = "virgil-snare-dismiss";
    dismiss.textContent = "Not a snare";
    dismiss.addEventListener("click", (e) => {
      e.stopPropagation();
      dismissType(snareId);
    });
    tip.append(line, dismiss);
    m.appendChild(tip);

    layer.appendChild(m);
    const rec = marked.get(el);
    if (rec) rec.marker = m;
    markers.push({ el, marker: m });
    place(el, m);
  }

  function place(el, m) {
    let r;
    try {
      r = el.getBoundingClientRect();
    } catch (e) {
      return;
    }
    const off = !r || (r.width === 0 && r.height === 0) ||
      r.bottom < 0 || r.top > window.innerHeight;
    m.style.display = off ? "none" : "block";
    if (off) return;
    const x = Math.min(Math.max(2, r.right - 20), window.innerWidth - 22);
    const y = Math.min(Math.max(2, r.top + 2), window.innerHeight - 22);
    m.style.left = x.toFixed(0) + "px";
    m.style.top = y.toFixed(0) + "px";
  }

  function reposition() {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => {
      rafPending = false;
      for (const { el, marker } of markers)
        if (marker.isConnected) place(el, marker);
    });
  }

  function flashMarkers() {
    if (!layer) return;
    layer.classList.remove("virgil-snares-flash");
    void layer.offsetWidth;
    layer.classList.add("virgil-snares-flash");
    setTimeout(() => layer && layer.classList.remove("virgil-snares-flash"), 1400);
  }

  // --- the dismiss loop ---------------------------------------------------
  function dismissType(snareId) {
    dismissed.add(snareId);
    counts[snareId] = 0;
    for (const [el, rec] of [...marked]) {
      if (rec.snareId !== snareId) continue;
      if (rec.marker) rec.marker.remove();
      marked.delete(el);
    }
    for (let i = markers.length - 1; i >= 0; i--)
      if (!markers[i].marker.isConnected) markers.splice(i, 1);
    notifyHero();
    persistDismiss(snareId);
  }

  async function persistDismiss(snareId) {
    try {
      const full = await V.getSettings();
      full.snares = full.snares || {};
      full.snares.dismissed = full.snares.dismissed || {};
      const arr = full.snares.dismissed[host] || [];
      if (!arr.includes(snareId))
        full.snares.dismissed[host] = [...arr, snareId];
      await V.setSettings(full);
    } catch (e) {}
  }

  // --- recording a finding ------------------------------------------------
  function flag(snareId, targetEl) {
    if (!targetEl || marked.has(targetEl) || dismissed.has(snareId)) return;
    if (marked.size >= MAX_MARKS) return;
    marked.set(targetEl, { snareId, marker: null });
    counts[snareId] = (counts[snareId] || 0) + 1;
    addMarker(targetEl, snareId);
    notifyHero();
    scheduleReport();
  }

  // --- detectors ----------------------------------------------------------
  function labelText(input) {
    let t = "";
    try {
      if (input.labels) for (const l of input.labels) t += " " + l.textContent;
      t += " " + (input.getAttribute("aria-label") || "");
      const ref = input.getAttribute("aria-labelledby");
      if (ref) {
        const e = document.getElementById(ref);
        if (e) t += " " + e.textContent;
      }
      const lab = input.closest("label");
      if (lab) t += " " + lab.textContent;
      else if (input.parentElement) t += " " + (input.parentElement.textContent || "");
    } catch (e) {}
    return t.replace(/\s+/g, " ").trim().slice(0, 200);
  }

  function scanPrechecked(root) {
    let boxes;
    try {
      boxes = (root || document).querySelectorAll('input[type="checkbox"]');
    } catch (e) {
      return;
    }
    let i = 0;
    for (const box of boxes) {
      if (++i > 200) break; // bound the work on huge forms
      if (!box.defaultChecked) continue;
      if (V.dpEngine.isPrecheckedOptIn({ checked: true, text: labelText(box) }))
        flag("prechecked", box);
    }
  }

  function gateFeatures(container) {
    const lex = V.SNARE_LEX;
    let hasAccept = false, hasReject = false, hasManage = false, acceptEl = null;
    let ctrls;
    try {
      ctrls = container.querySelectorAll(
        'button, a, [role="button"], input[type="button"], input[type="submit"]'
      );
    } catch (e) {
      return { hasAccept, hasReject, hasManage, acceptEl };
    }
    for (const b of ctrls) {
      const txt = (b.textContent || b.value || b.getAttribute("aria-label") || "").trim();
      if (!txt || txt.length > 40) continue;
      if (lex.reject.test(txt)) hasReject = true;
      else if (lex.accept.test(txt)) {
        hasAccept = true;
        if (!acceptEl) acceptEl = b;
      }
      if (lex.manage.test(txt)) hasManage = true;
    }
    return { hasAccept, hasReject, hasManage, acceptEl };
  }

  function scanCrookedGate() {
    for (const sel of V.CMP_SELECTORS) {
      let container;
      try {
        container = document.querySelector(sel);
      } catch (e) {
        continue;
      }
      if (!container) continue;
      const f = gateFeatures(container);
      if (V.dpEngine.isCrookedGate(f)) flag("crookedgate", f.acceptEl || container);
    }
  }

  function scanStructural(root) {
    if (!opts.tiers || !opts.tiers.structural) return;
    scanPrechecked(root);
    scanCrookedGate();
  }

  // Countdown: catch the text ticking down (fires only on real text changes).
  function onCharData(m) {
    const target = m.target;
    if (!target || marked.has(target.parentElement)) return;
    const oldV = m.oldValue;
    const newV = target.nodeValue;
    if (!V.dpEngine.looksLikeClock(newV) || !V.dpEngine.looksLikeClock(oldV)) return;
    if (V.dpEngine.isCountdownTick(V.dpEngine.parseClock(oldV), V.dpEngine.parseClock(newV)))
      flag("countdown", target.parentElement);
  }

  // --- public report (popup) ---------------------------------------------
  S.report = function () {
    const byType = {};
    for (const id of V.SNARE_IDS) if (counts[id]) byType[id] = counts[id];
    return { count: total(), byType };
  };

  // --- lifecycle ----------------------------------------------------------
  S.start = function (snareSettings) {
    if (started) return;
    started = true;
    opts = snareSettings || opts;
    host = V.normalizeHost(location.hostname);
    const list = (opts.dismissed && opts.dismissed[host]) || [];
    dismissed = new Set(list);

    const runScan = () => scanStructural(document);
    if (typeof requestIdleCallback === "function") requestIdleCallback(runScan, { timeout: 1500 });
    else setTimeout(runScan, 600);
    setTimeout(() => scanStructural(document), 1800); // catch late consent banners

    try {
      mo = new MutationObserver((muts) => {
        let structuralDirty = false;
        for (const m of muts) {
          if (m.type === "characterData") onCharData(m);
          else if (m.addedNodes && m.addedNodes.length) structuralDirty = true;
        }
        if (structuralDirty) {
          clearTimeout(scanTimer);
          scanTimer = setTimeout(() => scanStructural(document), 400);
        }
      });
      mo.observe(document.documentElement, {
        childList: true,
        subtree: true,
        characterData: true,
        characterDataOldValue: true,
      });
    } catch (e) {}
  };

  V.onQuery("getSnares", S.report);
})(globalThis);

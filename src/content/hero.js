/*
 * Virgil — the hero controller. Owns the in-page DOM and exposes a small API
 * the orchestrator (content.js) drives: mount, setSeverity, speak, hush, show,
 * hide. Kept deliberately dumb — all the "should I warn?" logic lives upstream.
 */
(function (g) {
  const V = (g.Virgil = g.Virgil || {});
  const P = V.palette;
  const H = (V.hero = {});

  let root, sprite, bubble, bubbleName, bubbleText, bubbleActions, veil, eyes, sigil;
  let light, embers, snareSigil, charmsLayer;
  let snareCount = 0;
  let snareOnClick = null;
  let speakTimer = null;
  let eyesTimer = null;
  let currentGlow = P.glow;
  let currentStyle = V.DEFAULT_STYLE;
  let currentSeverity = "safe";
  let fxEnabled = false; // the spooky watcher indicator
  let watcherCount = 0;
  let eyesPlayed = false;

  const prefersReduced = () =>
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function render() {
    if (sprite) sprite.replaceChildren(V.renderSpriteNode(currentGlow, currentStyle));
    setLightSource();
  }

  // Anchor the flickering light layer on the figure's lantern / beacon / orb.
  function setLightSource() {
    if (!light) return;
    const ls = V.lightSource(currentStyle);
    light.style.left = (ls.x * 100).toFixed(1) + "%";
    light.style.top = (ls.y * 100).toFixed(1) + "%";
  }
  function veilOn() {
    if (veil) veil.classList.add("virgil-veil-on");
  }
  function veilOff() {
    if (veil) veil.classList.remove("virgil-veil-on");
  }
  const isWarning = () => currentSeverity === "peril" || currentSeverity === "caution";

  // Push the active palette to CSS custom properties on the document root so the
  // bubble, buttons, veil, and shroud outline retheme (hero.css reads --vg-*).
  function setThemeVars() {
    const P = V.palette;
    const d = document.documentElement.style;
    d.setProperty("--vg-void", P.void);
    d.setProperty("--vg-void-rgb", V.hexTriple(P.void));
    d.setProperty("--vg-crypt", P.crypt);
    d.setProperty("--vg-stone", P.stone);
    d.setProperty("--vg-ink", P.ink);
    d.setProperty("--vg-inkdim", P.inkDim);
    d.setProperty("--vg-cloak", P.cloak);
    d.setProperty("--vg-accent", P.glow);
  }

  // --- the Watchers indicator: pixel eyes peering from the dark ------------
  const SVGNS = "http://www.w3.org/2000/svg";
  // A few eye shapes so the watchers don't all stare back identically.
  const EYES = [
    [".SSSSS.", "SSSPSSS", "SSPPPSS", "SSSPSSS", ".SSSSS."], // round
    [".SSSSS.", "SSSPSSS", "SSSPSSS", "SSSPSSS", ".SSSSS."], // slit
    [".SSSSS.", "SSSSSSS", "SSPPPSS", "SSSSSSS", ".SSSSS."], // wide
  ];
  function makeEye(pattern) {
    const pat = pattern || EYES[0];
    const svg = document.createElementNS(SVGNS, "svg");
    svg.setAttribute("viewBox", "0 0 7 5");
    svg.setAttribute("class", "virgil-eye-svg");
    for (let y = 0; y < pat.length; y++)
      for (let x = 0; x < pat[y].length; x++) {
        const ch = pat[y][x];
        if (ch === ".") continue;
        const r = document.createElementNS(SVGNS, "rect");
        r.setAttribute("x", x);
        r.setAttribute("y", y);
        r.setAttribute("width", 1);
        r.setAttribute("height", 1);
        r.setAttribute("fill", ch === "P" ? V.palette.void : V.palette.glow);
        svg.appendChild(r);
      }
    return svg;
  }

  // A point on a random screen edge — returns viewport pixel coords (the eye's
  // centre) so the web threads can be drawn back to Virgil.
  function edgePlacement() {
    const W0 = window.innerWidth, H0 = window.innerHeight, m = 18;
    const at = (lo, hi) => lo + Math.random() * (hi - lo);
    switch (Math.floor(Math.random() * 4)) {
      case 0: return { x: at(W0 * 0.08, W0 * 0.88), y: m };
      case 1: return { x: at(W0 * 0.08, W0 * 0.88), y: H0 - m };
      case 2: return { x: m, y: at(H0 * 0.08, H0 * 0.88) };
      default: return { x: W0 - m, y: at(H0 * 0.08, H0 * 0.88) };
    }
  }

  // One-shot: a clutch of eyes blink open at the edges, then fade. Count-scaled,
  // each linked back to Virgil by a faint thread that thickens with the count.
  function playEyes(n) {
    if (!eyes || prefersReduced()) return; // the sigil still conveys the count
    eyes.replaceChildren();
    const k = Math.min(Math.max(2, n), 6);
    const pts = [];
    for (let i = 0; i < k; i++) {
      const p = edgePlacement();
      pts.push(p);
      const e = document.createElement("div");
      e.className = "virgil-eye";
      e.style.left = (p.x - 15).toFixed(0) + "px";
      e.style.top = (p.y - 11).toFixed(0) + "px";
      e.style.animationDelay = (Math.random() * 0.6).toFixed(2) + "s";
      e.appendChild(makeEye(EYES[Math.floor(Math.random() * EYES.length)]));
      eyes.appendChild(e);
    }
    drawWeb(pts, n);
    eyes.classList.add("virgil-eyes-on");
    clearTimeout(eyesTimer);
    eyesTimer = setTimeout(() => {
      if (eyes) {
        eyes.classList.remove("virgil-eyes-on");
        eyes.replaceChildren();
      }
    }, 3400);
  }

  // Faint threads from each eye toward Virgil — the watchers' web, denser and
  // brighter the more of them there are.
  function drawWeb(pts, n) {
    if (!eyes || !pts.length) return;
    const W0 = window.innerWidth, H0 = window.innerHeight;
    let ax = W0 - 66, ay = H0 - 66;
    if (root) {
      const r = root.getBoundingClientRect();
      if (r.width) { ax = r.left + r.width / 2; ay = r.top + r.height / 2; }
    }
    const svg = document.createElementNS(SVGNS, "svg");
    svg.setAttribute("class", "virgil-web");
    svg.setAttribute("viewBox", `0 0 ${W0} ${H0}`);
    svg.setAttribute("preserveAspectRatio", "none");
    const w = Math.min(1.6, 0.4 + n * 0.12).toFixed(2);
    const op = Math.min(0.34, 0.08 + n * 0.03).toFixed(2);
    for (const p of pts) {
      const ln = document.createElementNS(SVGNS, "line");
      ln.setAttribute("x1", p.x.toFixed(0));
      ln.setAttribute("y1", p.y.toFixed(0));
      ln.setAttribute("x2", ax.toFixed(0));
      ln.setAttribute("y2", ay.toFixed(0));
      ln.setAttribute("stroke", V.palette.glow);
      ln.setAttribute("stroke-width", w);
      ln.setAttribute("stroke-opacity", op);
      svg.appendChild(ln);
    }
    eyes.appendChild(svg);
  }

  function updateSigil() {
    if (!sigil) return;
    if (fxEnabled && watcherCount > 0) {
      sigil.replaceChildren(makeEye());
      const num = document.createElement("span");
      num.className = "virgil-sigil-num";
      num.textContent = watcherCount;
      sigil.appendChild(num);
      sigil.title =
        watcherCount + (watcherCount === 1 ? " watcher is" : " watchers are") +
        " here — open Virgil to see them.";
      sigil.classList.toggle("virgil-sigil-alarm", watcherCount >= 5);
      sigil.hidden = false;
    } else {
      sigil.classList.remove("virgil-sigil-alarm");
      sigil.hidden = true;
    }
  }

  // --- the lantern light: flicker, bloom, and warning embers ----------------
  function bloomLight() {
    if (!light) return;
    light.classList.remove("virgil-bloom");
    void light.offsetWidth; // restart the one-shot flare
    light.classList.add("virgil-bloom");
  }

  function spawnEmbers() {
    if (!embers) return;
    embers.replaceChildren();
    const ls = V.lightSource(currentStyle);
    for (let i = 0; i < 8; i++) {
      const s = document.createElement("span");
      s.className = "virgil-ember";
      s.style.left = (ls.x * 100 + (Math.random() * 16 - 8)).toFixed(1) + "%";
      s.style.top = (ls.y * 100 + (Math.random() * 10 - 5)).toFixed(1) + "%";
      s.style.setProperty("--dx", (Math.random() * 16 - 8).toFixed(0) + "px");
      s.style.setProperty("--dy", (-30 - Math.random() * 34).toFixed(0) + "px");
      s.style.setProperty("--dur", (2.6 + Math.random() * 1.8).toFixed(2) + "s");
      s.style.animationDelay = (Math.random() * 2).toFixed(2) + "s";
      embers.appendChild(s);
    }
  }

  function clearEmbers() {
    if (embers) embers.replaceChildren();
  }

  // The "raise the lantern" moment: flare the light and loose a few embers.
  function escalate() {
    if (prefersReduced()) return; // the static pool still appears via CSS
    bloomLight();
    spawnEmbers();
  }

  H.mount = function () {
    if (root) return root;

    root = document.createElement("div");
    root.id = "virgil-root";
    root.setAttribute("aria-live", "polite");

    bubble = document.createElement("div");
    bubble.id = "virgil-bubble";
    bubbleName = document.createElement("span");
    bubbleName.className = "virgil-name";
    bubbleName.textContent = "Virgil";
    bubbleText = document.createElement("div");
    bubbleText.className = "virgil-text";
    bubbleActions = document.createElement("div");
    bubbleActions.className = "virgil-actions";
    bubble.append(bubbleName, bubbleText, bubbleActions);

    // Inline SVG (not <img src="data:…">) so strict page CSP can't block it.
    sprite = document.createElement("div");
    sprite.id = "virgil-sprite";
    sprite.setAttribute("role", "img");
    sprite.setAttribute("aria-label", "Virgil, your guide");
    sprite.appendChild(V.renderSpriteNode(currentGlow, currentStyle));

    // The flickering lantern light (behind the figure) and the warning embers.
    light = document.createElement("div");
    light.id = "virgil-light";
    embers = document.createElement("div");
    embers.id = "virgil-embers";

    root.append(light, sprite, embers, bubble);

    veil = document.createElement("div");
    veil.id = "virgil-veil";

    eyes = document.createElement("div");
    eyes.id = "virgil-eyes";

    sigil = document.createElement("div");
    sigil.id = "virgil-watch";
    sigil.hidden = true;
    root.appendChild(sigil);

    // The Snares indicator — a pixel knot + count; tap to find the marks.
    snareSigil = document.createElement("div");
    snareSigil.id = "virgil-snares-sigil";
    snareSigil.hidden = true;
    snareSigil.addEventListener("click", (e) => {
      e.stopPropagation();
      if (snareOnClick) snareOnClick();
    });
    root.appendChild(snareSigil);

    // Equipped-ward charms — a faint cluster reflecting the wayfarer's loadout.
    charmsLayer = document.createElement("div");
    charmsLayer.id = "virgil-charms";
    charmsLayer.hidden = true;
    root.appendChild(charmsLayer);
    renderCharms();

    const host = document.body || document.documentElement;
    host.appendChild(veil);
    host.appendChild(eyes);
    host.appendChild(root);

    setThemeVars();
    setLightSource();
    enableDrag();
    restorePosition();

    // Tap the hero to toggle the last message back into view.
    sprite.addEventListener("click", (e) => {
      if (root.dataset.didDrag === "1") {
        root.dataset.didDrag = "0";
        return;
      }
      // Keep the gloom in step with the bubble when a warning is live.
      if (root.classList.toggle("virgil-speaking")) H.dim();
      else H.undim();
    });

    return root;
  };

  H.setSeverity = function (severity) {
    currentSeverity = severity;
    const sev = V.severity[severity] || V.severity.safe;
    if (sev.color !== currentGlow) {
      currentGlow = sev.color;
      render();
    }
    if (root) {
      root.style.setProperty("--virgil-glow", sev.color);
      root.classList.toggle("virgil-alert", severity === "peril");
      root.classList.toggle("virgil-warn", isWarning());
    }
    if (veil) veil.style.setProperty("--virgil-veil-tint", sev.veilTint);
  };

  // Page-gloom controls — driven by the orchestrator alongside a warning.
  H.dim = function () {
    if (isWarning()) veilOn();
  };
  H.undim = veilOff;

  H.setStyle = function (styleId) {
    if (!styleId || styleId === currentStyle) return;
    currentStyle = styleId;
    render();
  };

  H.setWatcherFx = function (on) {
    fxEnabled = !!on;
    updateSigil();
  };

  // The Snares sigil — count of dark patterns marked on the page; tap to flash
  // the marks. Driven by content/snares.js. Caution-coloured, never alarming.
  function updateSnareSigil() {
    if (!snareSigil) return;
    if (snareCount > 0) {
      const color = (V.severityColor && V.severityColor.caution) || "#ffce5b";
      snareSigil.style.setProperty("--vg-snare", color);
      snareSigil.replaceChildren(V.knotSvg(color));
      const num = document.createElement("span");
      num.className = "virgil-sigil-num";
      num.textContent = snareCount;
      snareSigil.appendChild(num);
      snareSigil.title =
        snareCount + (snareCount === 1 ? " snare" : " snares") +
        " marked on this page — tap to find them.";
      snareSigil.hidden = false;
    } else {
      snareSigil.hidden = true;
    }
  }

  H.setSnares = function (n, onClick) {
    snareCount = n || 0;
    if (onClick) snareOnClick = onClick;
    updateSnareSigil();
  };

  // The loadout, reflected on the guide: a faint row of equipped-ward charms.
  let charmIds = [];
  function renderCharms() {
    if (!charmsLayer) return;
    charmsLayer.replaceChildren();
    const color = (V.palette && V.palette.glow) || "#86e0f9";
    for (const id of charmIds) {
      const c = document.createElement("span");
      c.className = "virgil-charm";
      c.appendChild(V.charmSvg(id, color));
      charmsLayer.appendChild(c);
    }
    charmsLayer.hidden = charmIds.length === 0;
  }
  H.setCharms = function (ids) {
    charmIds = Array.isArray(ids) ? ids : [];
    renderCharms();
  };

  // Called by the watcher detector with the running count. First time a watched
  // page is found, the eyes blink open once; the sigil tracks the live count.
  H.setWatchers = function (n) {
    watcherCount = n || 0;
    updateSigil();
    if (fxEnabled && watcherCount > 0 && !eyesPlayed) {
      eyesPlayed = true;
      playEyes(watcherCount);
    }
  };

  // Swap the colour scheme: re-tune the palette, the CSS vars, and the sprite,
  // then refresh the glow/veil for the current severity.
  H.applyTheme = function (themeId) {
    V.applyTheme(themeId);
    setThemeVars();
    const sev = V.severity[currentSeverity] || V.severity.safe;
    currentGlow = sev.color;
    render();
    if (root) root.style.setProperty("--virgil-glow", sev.color);
    if (veil) veil.style.setProperty("--virgil-veil-tint", sev.veilTint);
  };

  /*
   * speak({ text, actions, sticky })
   *   actions: [{ label, ghost?, onClick }]
   *   sticky:  if false (default for safe chatter), auto-hush after a while.
   */
  H.speak = function ({ text, actions = [], sticky = true, autoHushMs }) {
    if (!root) H.mount();
    bubbleText.textContent = text;
    bubbleActions.replaceChildren();
    for (const a of actions) {
      const btn = document.createElement("button");
      btn.textContent = a.label;
      if (a.ghost) btn.className = "virgil-ghost";
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        a.onClick && a.onClick();
      });
      bubbleActions.appendChild(btn);
    }
    root.classList.add("virgil-speaking");
    if (isWarning()) escalate();
    else clearEmbers();

    clearTimeout(speakTimer);
    const ms = autoHushMs != null ? autoHushMs : sticky ? 0 : 7000;
    if (ms > 0) speakTimer = setTimeout(() => H.hush(), ms);
  };

  H.hush = function () {
    if (root) root.classList.remove("virgil-speaking");
    clearTimeout(speakTimer);
    clearEmbers();
    veilOff();
  };

  H.show = function () {
    if (root) root.classList.remove("virgil-hidden");
  };

  H.hide = function () {
    if (root) root.classList.add("virgil-hidden");
    veilOff();
  };

  // --- dragging + position persistence -----------------------------------

  function enableDrag() {
    let startX, startY, originLeft, originTop, dragging = false;

    root.addEventListener("pointerdown", (e) => {
      if (e.target.closest("button")) return; // let bubble buttons work
      dragging = true;
      root.dataset.didDrag = "0";
      root.classList.add("virgil-dragging");
      const r = root.getBoundingClientRect();
      // Switch to top/left positioning while dragging.
      root.style.left = r.left + "px";
      root.style.top = r.top + "px";
      root.style.right = "auto";
      root.style.bottom = "auto";
      originLeft = r.left;
      originTop = r.top;
      startX = e.clientX;
      startY = e.clientY;
      root.setPointerCapture(e.pointerId);
    });

    root.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (Math.abs(dx) + Math.abs(dy) > 4) root.dataset.didDrag = "1";
      const maxL = window.innerWidth - root.offsetWidth;
      const maxT = window.innerHeight - root.offsetHeight;
      const left = Math.min(Math.max(0, originLeft + dx), maxL);
      const top = Math.min(Math.max(0, originTop + dy), maxT);
      root.style.left = left + "px";
      root.style.top = top + "px";
    });

    const end = (e) => {
      if (!dragging) return;
      dragging = false;
      root.classList.remove("virgil-dragging");
      savePosition();
    };
    root.addEventListener("pointerup", end);
    root.addEventListener("pointercancel", end);
  }

  function savePosition() {
    try {
      browser.storage.local
        .set({ "virgil:pos": { left: root.style.left, top: root.style.top } })
        .catch(() => {});
    } catch (e) {}
  }

  function restorePosition() {
    try {
      browser.storage.local
        .get("virgil:pos")
        .then((res) => {
          const pos = res && res["virgil:pos"];
          if (pos && pos.left) {
            root.style.left = pos.left;
            root.style.top = pos.top;
            root.style.right = "auto";
            root.style.bottom = "auto";
          }
        })
        .catch(() => {});
    } catch (e) {}
  }
})(globalThis);

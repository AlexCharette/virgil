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
  let speakTimer = null;
  let eyesTimer = null;
  let currentGlow = P.glow;
  let currentStyle = V.DEFAULT_STYLE;
  let currentSeverity = "safe";
  let fxEnabled = false; // the spooky watcher indicator
  let watcherCount = 0;
  let eyesPlayed = false;

  function render() {
    if (sprite) sprite.replaceChildren(V.renderSpriteNode(currentGlow, currentStyle));
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
  const EYE = [".SSSSS.", "SSSPSSS", "SSPPPSS", "SSSPSSS", ".SSSSS."];
  function makeEye() {
    const svg = document.createElementNS(SVGNS, "svg");
    svg.setAttribute("viewBox", "0 0 7 5");
    svg.setAttribute("class", "virgil-eye-svg");
    for (let y = 0; y < EYE.length; y++)
      for (let x = 0; x < EYE[y].length; x++) {
        const ch = EYE[y][x];
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

  function edgePlacement() {
    const r = () => (8 + Math.random() * 80).toFixed(1) + "%";
    switch (Math.floor(Math.random() * 4)) {
      case 0: return { top: "14px", left: r() };
      case 1: return { bottom: "14px", left: r() };
      case 2: return { left: "14px", top: r() };
      default: return { right: "14px", top: r() };
    }
  }

  // One-shot: a clutch of eyes blink open at the edges, then fade. Count-scaled.
  function playEyes(n) {
    if (!eyes) return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return; // respect reduced motion — the sigil still conveys it
    eyes.replaceChildren();
    const k = Math.min(Math.max(2, n), 6);
    for (let i = 0; i < k; i++) {
      const e = document.createElement("div");
      e.className = "virgil-eye";
      Object.assign(e.style, edgePlacement());
      e.style.animationDelay = (Math.random() * 0.6).toFixed(2) + "s";
      e.appendChild(makeEye());
      eyes.appendChild(e);
    }
    eyes.classList.add("virgil-eyes-on");
    clearTimeout(eyesTimer);
    eyesTimer = setTimeout(() => {
      if (eyes) {
        eyes.classList.remove("virgil-eyes-on");
        eyes.replaceChildren();
      }
    }, 3400);
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
      sigil.hidden = false;
    } else {
      sigil.hidden = true;
    }
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

    root.append(bubble, sprite);

    veil = document.createElement("div");
    veil.id = "virgil-veil";

    eyes = document.createElement("div");
    eyes.id = "virgil-eyes";

    sigil = document.createElement("div");
    sigil.id = "virgil-watch";
    sigil.hidden = true;
    root.appendChild(sigil);

    const host = document.body || document.documentElement;
    host.appendChild(veil);
    host.appendChild(eyes);
    host.appendChild(root);

    setThemeVars();
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

    clearTimeout(speakTimer);
    const ms = autoHushMs != null ? autoHushMs : sticky ? 0 : 7000;
    if (ms > 0) speakTimer = setTimeout(() => H.hush(), ms);
  };

  H.hush = function () {
    if (root) root.classList.remove("virgil-speaking");
    clearTimeout(speakTimer);
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

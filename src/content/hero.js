/*
 * Virgil — the hero controller. Owns the in-page DOM and exposes a small API
 * the orchestrator (content.js) drives: mount, setSeverity, speak, hush, show,
 * hide. Kept deliberately dumb — all the "should I warn?" logic lives upstream.
 */
(function (g) {
  const V = (g.Virgil = g.Virgil || {});
  const P = V.palette;
  const H = (V.hero = {});

  let root, sprite, bubble, bubbleName, bubbleText, bubbleActions, veil;
  let speakTimer = null;
  let currentGlow = P.glow;
  let currentStyle = V.DEFAULT_STYLE;
  let currentSeverity = "safe";

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
  // bubble, buttons, veil, and censor outline retheme (hero.css reads --vg-*).
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

    const host = document.body || document.documentElement;
    host.appendChild(veil);
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

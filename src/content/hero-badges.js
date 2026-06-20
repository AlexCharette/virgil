/*
 * Virgil — the hero's indicators, split out of hero.js so the core controller
 * stays focused on the guide, the bubble, and the gloom. This owns the corner
 * badges and the surveillance theatre:
 *   - the Watchers sigil (eye + count) and the eyes-in-the-dark blink + web
 *   - the Snares sigil (knot + count)
 *   - the equipped-ward charm cluster
 *
 * hero.mount() calls B.mount(root, host); the hero's public setWatchers /
 * setSnares / setCharms / setWatcherFx delegate here, so callers are unchanged.
 */
(function (g) {
  const V = (g.Virgil = g.Virgil || {});
  const B = (V.heroBadges = {});
  const SVGNS = "http://www.w3.org/2000/svg";

  let root, eyes, sigil, snareSigil, charmsLayer;
  let eyesTimer = null;
  let fxEnabled = false;
  let watcherCount = 0;
  let eyesPlayed = false;
  let snareCount = 0;
  let snareOnClick = null;
  let charmIds = [];

  const prefersReduced = () =>
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // A few eye shapes so the watchers don't all stare back identically.
  const EYES = [
    [".SSSSS.", "SSSPSSS", "SSPPPSS", "SSSPSSS", ".SSSSS."], // round
    [".SSSSS.", "SSSPSSS", "SSSPSSS", "SSSPSSS", ".SSSSS."], // slit
    [".SSSSS.", "SSSSSSS", "SSPPPSS", "SSSSSSS", ".SSSSS."], // wide
  ];
  // Sclera = glow, pupil (P) = void — a two-colour glyph via the shared builder.
  const makeEye = (pattern) =>
    V.pixelSvg(pattern || EYES[0], { S: V.palette.glow, P: V.palette.void }, "virgil-eye-svg");

  // A point on a random screen edge — viewport pixel coords (the eye's centre),
  // so the web threads can be drawn back to Virgil.
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

  // The Snares sigil — count of dark patterns marked on the page; tap to flash
  // the marks. Caution-coloured, never alarming.
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

  // The loadout, reflected on the guide: a faint row of equipped-ward charms.
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

  // --- public API (driven by hero.js / content modules) -------------------
  B.mount = function (rootEl, host) {
    root = rootEl;

    sigil = document.createElement("div");
    sigil.id = "virgil-watch";
    sigil.hidden = true;
    root.appendChild(sigil);

    snareSigil = document.createElement("div");
    snareSigil.id = "virgil-snares-sigil";
    snareSigil.hidden = true;
    snareSigil.addEventListener("click", (e) => {
      e.stopPropagation();
      if (snareOnClick) snareOnClick();
    });
    root.appendChild(snareSigil);

    charmsLayer = document.createElement("div");
    charmsLayer.id = "virgil-charms";
    charmsLayer.hidden = true;
    root.appendChild(charmsLayer);

    eyes = document.createElement("div");
    eyes.id = "virgil-eyes";
    host.appendChild(eyes);

    renderCharms();
    updateSigil();
    updateSnareSigil();
  };

  B.setWatcherFx = function (on) {
    fxEnabled = !!on;
    updateSigil();
  };

  // First time a watched page is found the eyes blink open once; the sigil
  // tracks the live count thereafter.
  B.setWatchers = function (n) {
    watcherCount = n || 0;
    updateSigil();
    if (fxEnabled && watcherCount > 0 && !eyesPlayed) {
      eyesPlayed = true;
      playEyes(watcherCount);
    }
  };

  B.setSnares = function (n, onClick) {
    snareCount = n || 0;
    if (onClick) snareOnClick = onClick;
    updateSnareSigil();
  };

  B.setCharms = function (ids) {
    charmIds = Array.isArray(ids) ? ids : [];
    renderCharms();
  };
})(globalThis);

/*
 * Virgil — the character system. A small shaded-pixel toolkit plus a *set* of
 * 32-bit-style characters the wayfarer can choose between. The same code draws
 * the live in-page hero (→ inline SVG) and the toolbar icon / preview gallery
 * (→ pixel buffer, PNG-encoded by the node tooling). Single source of truth.
 *
 * Fixed colours come from V.palette; the lantern/beacon "glow" is supplied per
 * call so the same character can read safe (cyan) / caution (blue) / peril (pink).
 */
(function (g) {
  const V = (g.Virgil = g.Virgil || {});

  const W = 32;
  const H = 40;
  V.CHAR_W = W;
  V.CHAR_H = H;
  V.DEFAULT_STYLE = "lantern-bearer";

  // ---- colour helpers ----------------------------------------------------
  function hexToRgba(hex) {
    return [
      parseInt(hex.slice(1, 3), 16),
      parseInt(hex.slice(3, 5), 16),
      parseInt(hex.slice(5, 7), 16),
      255,
    ];
  }
  const hx2 = (n) => n.toString(16).padStart(2, "0");
  function darken(hex, f) {
    const [r, gg, b] = hexToRgba(hex);
    const c = (n) => Math.max(0, Math.min(255, Math.round(n * f)));
    return "#" + hx2(c(r)) + hx2(c(gg)) + hx2(c(b));
  }

  function buildPalette(glowHex) {
    const P = V.palette;
    const h = hexToRgba;
    return {
      out: h(P.void),
      crypt: h(P.crypt),
      stone: h(P.stone),
      shade: h(P.shade),
      cloak: h(P.cloak),
      cloakLit: h(P.cloakLit),
      steel: h(P.steel),
      rune: h(P.rune),
      ink: h(P.ink),
      peril: h(P.peril),
      glow: h(glowHex),
      glowD: h(darken(glowHex, 0.78)),
    };
  }

  // ---- pixel toolkit (operates on cv = { buf: Uint8Array(W*H*4) }) --------
  function newCanvas() {
    return { buf: new Uint8Array(W * H * 4) };
  }
  // straight-alpha source-over compositing
  function blend(cv, x, y, c, a) {
    x = x | 0;
    y = y | 0;
    if (x < 0 || y < 0 || x >= W || y >= H || !c) return;
    if (a === undefined) a = 1;
    const i = (y * W + x) * 4;
    const da = cv.buf[i + 3] / 255;
    const oa = a + da * (1 - a);
    if (oa <= 0) {
      cv.buf[i + 3] = 0;
      return;
    }
    cv.buf[i] = (c[0] * a + cv.buf[i] * da * (1 - a)) / oa;
    cv.buf[i + 1] = (c[1] * a + cv.buf[i + 1] * da * (1 - a)) / oa;
    cv.buf[i + 2] = (c[2] * a + cv.buf[i + 2] * da * (1 - a)) / oa;
    cv.buf[i + 3] = Math.round(oa * 255);
  }
  const px = (cv, x, y, c) => blend(cv, x, y, c, 1);
  const hline = (cv, x0, x1, y, c) => {
    for (let x = Math.round(x0); x <= Math.round(x1); x++) px(cv, x, y, c);
  };
  const hlineA = (cv, x0, x1, y, c, a) => {
    for (let x = Math.round(x0); x <= Math.round(x1); x++) blend(cv, x, y, c, a);
  };
  const vline = (cv, y0, y1, x, c) => {
    for (let y = y0; y <= y1; y++) px(cv, x, y, c);
  };
  const rect = (cv, x, y, w, h, c) => {
    for (let j = 0; j < h; j++) hline(cv, x, x + w - 1, y + j, c);
  };
  function ellipse(cv, cx, cy, rx, ry, c) {
    const cxr = Math.ceil(rx);
    const cyr = Math.ceil(ry);
    for (let y = -cyr; y <= cyr; y++)
      for (let x = -cxr; x <= cxr; x++)
        if ((x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1) px(cv, cx + x, cy + y, c);
  }
  function trapez(cv, cx, topY, botY, topHW, botHW, c) {
    for (let y = topY; y <= botY; y++) {
      const t = (y - topY) / Math.max(1, botY - topY);
      const hw = Math.round(topHW + (botHW - topHW) * t);
      hline(cv, cx - hw, cx + hw, y, c);
    }
  }
  function halo(cv, cx, cy, radius, c) {
    for (let y = -radius; y <= radius; y++)
      for (let x = -radius; x <= radius; x++) {
        const d = Math.hypot(x, y);
        if (d <= radius) blend(cv, cx + x, cy + y, c, Math.max(0, 0.5 * (1 - d / radius)));
      }
  }

  // ---- the character set -------------------------------------------------
  // Each draw(cv, p) paints a 32x40 figure roughly centred on x≈14–16.

  function lanternBearer(cv, p) {
    const cx = 14;
    trapez(cv, cx, 13, 38, 5, 11, p.out);
    trapez(cv, cx, 13, 38, 4, 10, p.cloak);
    trapez(cv, cx + 3, 16, 37, 1, 3, p.shade);
    vline(cv, 16, 37, cx - 8, p.cloakLit);
    ellipse(cv, cx, 9, 7, 7, p.out);
    ellipse(cv, cx, 9, 6, 6, p.cloak);
    ellipse(cv, cx - 1, 7, 4, 4, p.cloakLit);
    ellipse(cv, cx, 10, 4, 4.5, p.out);
    ellipse(cv, cx, 10, 3, 3.6, p.shade);
    px(cv, cx - 1, 10, p.glow);
    px(cv, cx + 2, 10, p.glow);
    vline(cv, 8, 33, 24, p.out);
    vline(cv, 8, 33, 23, p.stone);
    hline(cv, 21, 24, 7, p.stone);
    px(cv, 24, 7, p.out);
    halo(cv, 23, 12, 6, p.glow);
    ellipse(cv, 23, 12, 3, 3.5, p.out);
    ellipse(cv, 23, 12, 2, 2.5, p.glow);
    px(cv, 23, 11, p.ink);
    hline(cv, cx + 8, 22, 22, p.cloak);
    px(cv, 22, 22, p.out);
  }

  function sentinel(cv, p) {
    const cx = 16;
    // greaves
    rect(cv, cx - 5, 32, 4, 7, p.out);
    rect(cv, cx - 4, 32, 2, 6, p.stone);
    rect(cv, cx + 2, 32, 4, 7, p.out);
    rect(cv, cx + 3, 32, 2, 6, p.stone);
    px(cv, cx - 3, 38, p.glowD);
    px(cv, cx + 3, 38, p.glowD);
    // breastplate
    trapez(cv, cx, 17, 33, 6, 7, p.out);
    trapez(cv, cx, 17, 33, 5, 6, p.steel);
    vline(cv, 18, 32, cx, p.stone); // central ridge
    vline(cv, 19, 31, cx - 5, p.rune); // lit edge
    trapez(cv, cx + 3, 19, 32, 0, 2, p.stone); // right shadow
    // beacon gem — faceted diamond
    halo(cv, cx, 24, 7, p.glow);
    for (let dy = -3; dy <= 3; dy++) hline(cv, cx - (3 - Math.abs(dy)), cx + (3 - Math.abs(dy)), 24 + dy, p.out);
    for (let dy = -2; dy <= 2; dy++) hline(cv, cx - (2 - Math.abs(dy)), cx + (2 - Math.abs(dy)), 24 + dy, p.glowD);
    for (let dy = -1; dy <= 1; dy++) hline(cv, cx - (1 - Math.abs(dy)), cx + (1 - Math.abs(dy)), 24 + dy, p.glow);
    px(cv, cx, 23, p.ink);
    // pauldrons
    ellipse(cv, cx - 7, 18, 4, 3, p.out);
    ellipse(cv, cx - 7, 18, 3, 2.2, p.steel);
    ellipse(cv, cx - 8, 17, 1.4, 1, p.rune);
    ellipse(cv, cx + 7, 18, 4, 3, p.out);
    ellipse(cv, cx + 7, 18, 3, 2.2, p.steel);
    // plume crest (behind the helm)
    ellipse(cv, cx + 2, 3, 2, 3, p.glowD);
    ellipse(cv, cx + 3, 4, 1.4, 2.4, p.glow);
    // great-helm
    rect(cv, cx - 6, 7, 12, 10, p.out);
    rect(cv, cx - 5, 7, 10, 9, p.steel);
    ellipse(cv, cx, 7, 6, 3, p.out);
    ellipse(cv, cx, 7, 5, 2.6, p.steel);
    rect(cv, cx + 2, 8, 4, 8, p.stone); // right shadow
    vline(cv, 6, 16, cx - 5, p.rune); // lit edge
    vline(cv, 5, 16, cx, p.stone); // central reinforcement
    rect(cv, cx - 5, 11, 10, 3, p.out); // recessed eye slit
    hline(cv, cx - 4, cx + 4, 12, p.glow);
    px(cv, cx, 12, p.stone); // the reinforcement bar crosses the slit
  }

  function wisp(cv, p) {
    const cx = 16;
    // spectral aura
    halo(cv, cx, 16, 13, p.glow);
    // flame-shaped body — half-width per row (pointed cowl up top, flaring below)
    const hwAt = (y) => {
      if (y < 4) return -1;
      if (y <= 17) return ((y - 4) * 8) / 13; // taper up to ~8
      if (y <= 27) return 8 - ((y - 17) * 3.5) / 10; // narrow to ~4.5
      return -1;
    };
    for (let y = 4; y <= 27; y++) { const hw = hwAt(y); if (hw < 0) continue; hline(cv, cx - hw - 1, cx + hw + 1, y, p.out); }
    for (let y = 4; y <= 27; y++) { const hw = hwAt(y); if (hw < 0) continue; hline(cv, cx - hw, cx + hw, y, p.cloak); }
    // translucent inner flame + bright spine
    for (let y = 9; y <= 26; y++) hlineA(cv, cx - Math.max(0, hwAt(y) - 2.2), cx + Math.max(0, hwAt(y) - 2.2), y, p.cloakLit, 0.85);
    for (let y = 11; y <= 25; y++) hlineA(cv, cx - 1, cx + 1, y, p.steel, 0.8);
    // hooded face recess + glowing eyes
    ellipse(cv, cx, 10, 3.4, 4, p.shade);
    halo(cv, cx - 2, 10, 2, p.glow);
    halo(cv, cx + 2, 10, 2, p.glow);
    px(cv, cx - 2, 10, p.glow);
    px(cv, cx + 2, 10, p.glow);
    // cupped orb of light + cloak "hands"
    for (const sx of [-4, 4]) { px(cv, cx + sx, 22, p.cloakLit); px(cv, cx + sx, 23, p.cloak); }
    halo(cv, cx, 22, 6, p.glow);
    ellipse(cv, cx, 22, 2.6, 2.6, p.glowD);
    ellipse(cv, cx, 22, 1.6, 1.6, p.glow);
    px(cv, cx - 1, 21, p.ink);
    // dissolving, swaying tails
    for (const ox of [-6, -2, 2, 6]) {
      for (let k = 0; k <= 7; k++) {
        const a = Math.max(0, 1 - (k / 7) * 0.85);
        const w = Math.max(0, 2 - Math.floor(k / 3));
        const sway = Math.round(Math.sin(k / 2 + ox));
        for (let dx = -w; dx <= w; dx++) blend(cv, cx + ox + sway + dx, 27 + k, k % 2 ? p.glowD : p.cloak, a);
      }
    }
    // floating motes
    blend(cv, cx - 9, 13, p.glow, 0.8);
    blend(cv, cx + 9, 18, p.glow, 0.7);
    blend(cv, cx - 7, 25, p.glow, 0.6);
  }

  function familiar(cv, p) {
    const cx = 16;
    ellipse(cv, cx, 22, 9, 11, p.out);
    ellipse(cv, cx, 22, 8, 10, p.cloak);
    ellipse(cv, cx, 24, 5, 7, p.shade);
    ellipse(cv, cx - 3, 16, 4, 4, p.cloakLit);
    px(cv, cx - 7, 11, p.out);
    px(cv, cx - 6, 12, p.cloak);
    px(cv, cx + 7, 11, p.out);
    px(cv, cx + 6, 12, p.cloak);
    for (const ox of [-4, 4]) {
      ellipse(cv, cx + ox, 16, 3.4, 3.4, p.out);
      ellipse(cv, cx + ox, 16, 2.6, 2.6, p.ink);
      ellipse(cv, cx + ox, 16, 1.4, 1.4, p.glow);
      px(cv, cx + ox, 16, p.out);
    }
    px(cv, cx, 18, p.glowD);
    px(cv, cx, 19, p.glowD);
    px(cv, cx - 1, 18, p.out);
    px(cv, cx + 1, 18, p.out);
    px(cv, cx - 3, 33, p.glowD);
    px(cv, cx + 3, 33, p.glowD);
    halo(cv, cx + 10, 25, 5, p.glow);
    px(cv, cx + 10, 21, p.stone);
    ellipse(cv, cx + 10, 25, 2, 2.6, p.out);
    ellipse(cv, cx + 10, 25, 1.2, 1.8, p.glow);
    px(cv, cx + 10, 24, p.ink);
  }

  function guardianAngel(cv, p) {
    const cx = 16;
    // soft full-body aura
    halo(cv, cx, 18, 12, p.glow);
    // wings — layered feather rows sweeping outward and down (drawn behind)
    const rows = [4, 7, 9, 7, 5, 3];
    for (let i = 0; i < rows.length; i++) {
      const y = 12 + i * 2;
      const len = rows[i];
      hline(cv, cx - 3 - len, cx - 3, y, p.out);
      hline(cv, cx - 3 - len + 1, cx - 4, y, i % 2 ? p.rune : p.ink);
      hline(cv, cx + 3, cx + 3 + len, y, p.out);
      hline(cv, cx + 4, cx + 3 + len - 1, y, i % 2 ? p.rune : p.ink);
    }
    hline(cv, cx - 9, cx - 4, 12, p.cloakLit); // wing top highlights
    hline(cv, cx + 4, cx + 9, 12, p.cloakLit);
    // robe / gown
    trapez(cv, cx, 15, 37, 3, 8, p.out);
    trapez(cv, cx, 15, 37, 2.4, 7, p.cloak);
    vline(cv, 17, 36, cx, p.cloakLit); // central lit fold
    hline(cv, cx - 4, cx + 4, 20, p.glow); // girdle of light
    // clasped hands cradling a small light
    halo(cv, cx, 22, 4, p.glow);
    ellipse(cv, cx, 22, 1.6, 1.6, p.ink);
    px(cv, cx, 22, p.glow);
    // head + serene eyes
    ellipse(cv, cx, 9, 3, 3, p.out);
    ellipse(cv, cx, 9, 2.3, 2.5, p.ink);
    px(cv, cx - 1, 9, p.glowD);
    px(cv, cx + 1, 9, p.glowD);
    // radiant halo ring above the head (thin ring + a soft inner gleam)
    halo(cv, cx, 4, 3, p.glow);
    for (let y = -2; y <= 2; y++)
      for (let x = -6; x <= 6; x++) {
        const v = (x * x) / 36 + (y * y) / 4;
        if (v <= 1 && v >= 0.55) px(cv, cx + x, 4 + y, p.glow);
      }
  }

  const CHARACTERS = [
    { id: "lantern-bearer", name: "Lantern-Bearer", desc: "A hooded guide with a staff-lantern. The classic Virgil.", draw: lanternBearer },
    { id: "sentinel", name: "Sentinel", desc: "An armoured watchman-knight with a glowing beacon.", draw: sentinel },
    { id: "wisp", name: "Wisp", desc: "A bodiless spirit cupping an orb of light.", draw: wisp },
    { id: "familiar", name: "Familiar", desc: "A little owl-sage with a tiny lantern.", draw: familiar },
    { id: "guardian-angel", name: "Guardian Angel", desc: "A winged, haloed watcher robed in light.", draw: guardianAngel },
  ];
  const BY_ID = Object.fromEntries(CHARACTERS.map((c) => [c.id, c]));

  // Where each figure's light lives, as a fraction of the 32x40 grid. The hero
  // anchors its flickering light layer here so the flame sits on the lantern /
  // beacon / orb — not floating in the middle of the box. Kept beside the art.
  V.LIGHT_SOURCE = {
    "lantern-bearer": { x: 23 / W, y: 12 / H },
    sentinel: { x: 16 / W, y: 24 / H },
    wisp: { x: 16 / W, y: 22 / H },
    familiar: { x: 26 / W, y: 25 / H },
    "guardian-angel": { x: 16 / W, y: 22 / H },
  };
  V.lightSource = (styleId) => V.LIGHT_SOURCE[styleId] || { x: 0.5, y: 0.5 };

  // Lightweight list for the popup picker.
  V.CHARACTER_LIST = CHARACTERS.map(({ id, name, desc }) => ({ id, name, desc }));

  // Pure render to an RGBA pixel buffer (used by the node tooling for PNGs).
  V.drawCharacter = function (styleId, glowHex) {
    const char = BY_ID[styleId] || BY_ID[V.DEFAULT_STYLE];
    const cv = newCanvas();
    char.draw(cv, buildPalette(glowHex || V.palette.glow));
    return { W, H, buf: cv.buf };
  };

  // Walk the buffer, merging horizontal runs of identical pixels into spans.
  // cb(x, y, run, "#rrggbb", alpha) — shared by both renderers below.
  function eachRun(buf, cb) {
    for (let y = 0; y < H; y++) {
      let x = 0;
      while (x < W) {
        const i = (y * W + x) * 4;
        const a = buf[i + 3];
        if (a === 0) {
          x++;
          continue;
        }
        const r = buf[i], gg = buf[i + 1], b = buf[i + 2];
        let run = 1;
        while (x + run < W) {
          const j = (y * W + x + run) * 4;
          if (buf[j + 3] !== a || buf[j] !== r || buf[j + 1] !== gg || buf[j + 2] !== b) break;
          run++;
        }
        cb(x, y, run, "#" + hx2(r) + hx2(gg) + hx2(b), a);
        x += run;
      }
    }
  }

  // Render to an inline-SVG STRING — used for the popup's <img src> data URI.
  V.renderSprite = function (glowHex, styleId) {
    const { buf } = V.drawCharacter(styleId, glowHex);
    let rects = "";
    eachRun(buf, (x, y, run, fill, a) => {
      const op = a < 255 ? ` fill-opacity="${(a / 255).toFixed(3)}"` : "";
      rects += `<rect x="${x}" y="${y}" width="${run}" height="1" fill="${fill}"${op}/>`;
    });
    return (
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" ` +
      `shape-rendering="crispEdges" width="${W}" height="${H}">${rects}</svg>`
    );
  };

  // Render to a real SVG DOM NODE — used for the live hero, so we never assign
  // a dynamic string to innerHTML (clears the AMO "unsafe innerHTML" warning and
  // skips an HTML parse). Requires a DOM; only called in the browser.
  const SVGNS = "http://www.w3.org/2000/svg";
  V.renderSpriteNode = function (glowHex, styleId) {
    const { buf } = V.drawCharacter(styleId, glowHex);
    const svg = document.createElementNS(SVGNS, "svg");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("shape-rendering", "crispEdges");
    svg.setAttribute("width", String(W));
    svg.setAttribute("height", String(H));
    eachRun(buf, (x, y, run, fill, a) => {
      const rect = document.createElementNS(SVGNS, "rect");
      rect.setAttribute("x", x);
      rect.setAttribute("y", y);
      rect.setAttribute("width", run);
      rect.setAttribute("height", 1);
      rect.setAttribute("fill", fill);
      if (a < 255) rect.setAttribute("fill-opacity", (a / 255).toFixed(3));
      svg.appendChild(rect);
    });
    return svg;
  };

  V.spriteDataUri = function (glowHex, styleId) {
    return "data:image/svg+xml;utf8," + encodeURIComponent(V.renderSprite(glowHex, styleId));
  };

  // ---- ward charms -------------------------------------------------------
  // Small 9x9 pixel sigils for the loadout: shown in the popup sockets/tiles
  // and as a faint cluster on the live hero. One source for every surface.
  const CHARM_GLYPHS = {
    eye: [
      ".........", "..SSSSS..", ".SSSSSSS.", "SSS...SSS", "SS.....SS",
      "SSS...SSS", ".SSSSSSS.", "..SSSSS..", ".........",
    ],
    knot: [
      "..SSSS...", ".S....S..", "S......S.", "S......S.", ".S....S..",
      "..SSSS...", "....S....", "...S.....", "..S......",
    ],
    cloak: [
      "...SSS...", "..SSSSS..", ".SS.S.SS.", ".SSSSSSS.", "SSSSSSSSS",
      "SSSSSSSSS", ".SSSSSSS.", ".SS...SS.", ".S.....S.",
    ],
    veil: [
      "SSSSSSSSS", "S.S.S.S.S", "SSSSSSSSS", ".S.S.S.S.", "S.S.S.S.S",
      ".S.S.S.S.", "..S.S.S..", "...S.S...", "....S....",
    ],
    star: [
      "....S....", "....S....", "..S.S.S..", "...SSS...", "SSSSSSSSS",
      "...SSS...", "..S.S.S..", "....S....", "....S....",
    ],
  };
  V.CHARM_GLYPHS = CHARM_GLYPHS;

  V.charmSvg = function (id, color) {
    const pat = CHARM_GLYPHS[id] || CHARM_GLYPHS.eye;
    const svg = document.createElementNS(SVGNS, "svg");
    svg.setAttribute("viewBox", "0 0 9 9");
    svg.setAttribute("shape-rendering", "crispEdges");
    svg.setAttribute("class", "virgil-charm-svg");
    for (let y = 0; y < pat.length; y++)
      for (let x = 0; x < pat[y].length; x++) {
        if (pat[y][x] !== "S") continue;
        const r = document.createElementNS(SVGNS, "rect");
        r.setAttribute("x", x);
        r.setAttribute("y", y);
        r.setAttribute("width", 1);
        r.setAttribute("height", 1);
        r.setAttribute("fill", color || "#86e0f9");
        svg.appendChild(r);
      }
    return svg;
  };
})(globalThis);

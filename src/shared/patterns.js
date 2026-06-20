/*
 * Virgil — the Snares: a taxonomy of dark patterns (deceptive UX) plus the
 * lexicons and known-CMP selectors the detection engine reads. Pure data +
 * a small DOM helper for the marker glyph; the actual judgement lives in the
 * (testable) dp-engine, and the live scanning in content/snares.js.
 *
 * Tier 1 (here) is deterministic and high-precision. Lexical/AI tiers come later.
 */
(function (g) {
  const V = (g.Virgil = g.Virgil || {});

  // The named snares. `severity` keys into V.severity (marker/sigil colour);
  // `line` is Virgil's voice when the wayfarer reveals one.
  V.SNARES = {
    countdown: {
      id: "countdown",
      name: "False urgency",
      severity: "caution",
      line: "A countdown leans on you here. Don't let it choose for you.",
    },
    prechecked: {
      id: "prechecked",
      name: "A box ticked for you",
      severity: "caution",
      line: "A box was ticked for you — not by you.",
    },
    crookedgate: {
      id: "crookedgate",
      name: "A crooked gate",
      severity: "caution",
      line: "The gate is crooked — consent made easy, refusal made hard.",
    },
  };
  V.SNARE_IDS = Object.keys(V.SNARES);
  V.snareLine = (id) => (V.SNARES[id] || {}).line || "";
  V.snareName = (id) => (V.SNARES[id] || {}).name || id;

  // Lexicons. Kept conservative — Tier 1 corroborates these with structure.
  V.SNARE_LEX = {
    clock: /\b\d{1,2}:\d{2}(?::\d{2})?\b/,
    marketing:
      /\b(newsletter|offers?|deals?|discounts?|promotion(?:al|s)?|marketing|subscribe|sign me up|keep me (?:posted|informed|updated)|share (?:my )?(?:data|info|details)|third[- ]part|consent to)\b/i,
    accept: /\b(accept(?:\s+all)?|agree|allow all|allow|got it|i agree|okay|continue)\b/i,
    reject:
      /\b(reject(?:\s+all)?|decline|refuse|deny|necessary only|essential only|no,?\s*thanks|do not (?:sell|share)|disagree)\b/i,
    manage: /\b(manage|settings|preferences|customi[sz]e|options|purposes|more choices)\b/i,
  };

  // Known consent-management platforms. crooked-gate is scoped to these so the
  // Tier-1 verdict stays high-precision (generic banners are deferred to Tier 2).
  V.CMP_SELECTORS = [
    "#onetrust-banner-sdk",
    "#CybotCookiebotDialog",
    ".didomi-popup-container",
    "#didomi-host",
    ".qc-cmp2-container",
    ".osano-cm-window",
    ".cc-window",
    "#cookie-law-info-bar",
    '[id^="sp_message_container"]',
    ".fc-consent-root",
    "#truste-consent-track",
  ];

  // The marker glyph — a pixel snare-knot (a noosed loop with a trailing cord),
  // built as inline SVG so a hostile page CSP can't block it. DOM-only; never
  // called in the node tests.
  const SVGNS = "http://www.w3.org/2000/svg";
  const KNOT = [
    "..SSSS...",
    ".S....S..",
    "S......S.",
    "S......S.",
    ".S....S..",
    "..SSSS...",
    "....S....",
    "...S.....",
    "..S......",
  ];
  V.knotSvg = function (color) {
    const svg = document.createElementNS(SVGNS, "svg");
    svg.setAttribute("viewBox", "0 0 9 9");
    svg.setAttribute("shape-rendering", "crispEdges");
    svg.setAttribute("class", "virgil-knot");
    for (let y = 0; y < KNOT.length; y++)
      for (let x = 0; x < KNOT[y].length; x++) {
        if (KNOT[y][x] !== "S") continue;
        const r = document.createElementNS(SVGNS, "rect");
        r.setAttribute("x", x);
        r.setAttribute("y", y);
        r.setAttribute("width", 1);
        r.setAttribute("height", 1);
        r.setAttribute("fill", color || "#ffce5b");
        svg.appendChild(r);
      }
    return svg;
  };
})(globalThis);

/*
 * Virgil — colour schemes. Each theme is a full palette with the same keys;
 * `V.palette` holds the ACTIVE one and `V.applyTheme(id)` swaps it in place
 * (so references captured at load still see the new colours). Severity colours
 * and the page-gloom veil tint are derived from the active palette, so the
 * whole extension — sprite, hero bubble, veil, badge, popup — retunes together.
 */
(function (g) {
  const V = (g.Virgil = g.Virgil || {});

  // Palette keys: void (deepest bg) · crypt (panel) · stone (border) ·
  // shade (cloak shadow) · ink (text) · inkDim (muted) · cloak/cloakLit/steel/
  // rune (figure tones) · glow/glowDeep (the lantern flame) · peril (alarm).
  V.THEMES = {
    drawbridge: {
      name: "Drawbridge",
      palette: {
        void: "#131520", crypt: "#1b1f32", stone: "#252a41", shade: "#2c3354",
        ink: "#b8cdfe", inkDim: "#627af4", cloak: "#4961da", cloakLit: "#627af4",
        steel: "#7289fd", rune: "#a5b3fe", glow: "#86e0f9", glowDeep: "#67c9e4",
        peril: "#ec407a",
      },
    },
    ember: {
      name: "Ember",
      palette: {
        void: "#190f0a", crypt: "#241712", stone: "#3a261a", shade: "#3a261a",
        ink: "#f4d8b0", inkDim: "#b07b4f", cloak: "#a8431f", cloakLit: "#d96a2c",
        steel: "#f0944a", rune: "#f6c074", glow: "#ffb24d", glowDeep: "#d97e2b",
        peril: "#ff3b6b",
      },
    },
    grove: {
      name: "Grove",
      palette: {
        void: "#0e1410", crypt: "#15201a", stone: "#1f3326", shade: "#1f3326",
        ink: "#d2e9c4", inkDim: "#7ba874", cloak: "#3a7a4a", cloakLit: "#56a566",
        steel: "#7fce86", rune: "#aee59f", glow: "#9ee84f", glowDeep: "#6fb83a",
        peril: "#ff7a3c",
      },
    },
    dusk: {
      name: "Dusk",
      palette: {
        void: "#14101e", crypt: "#1d1730", stone: "#2c2342", shade: "#2c2342",
        ink: "#e2d2ff", inkDim: "#9a82c8", cloak: "#6a3fce", cloakLit: "#8a5cf0",
        steel: "#a87dff", rune: "#c9adff", glow: "#c77dff", glowDeep: "#9a4fe0",
        peril: "#ff5ca0",
      },
    },
  };

  V.THEME_LIST = Object.entries(V.THEMES).map(([id, t]) => ({
    id,
    name: t.name,
    palette: t.palette,
  }));
  V.DEFAULT_THEME = "drawbridge";

  // Active palette — populated by applyTheme(); never reassigned, so captured
  // `const P = V.palette` references stay valid.
  V.palette = {};

  // "#rrggbb" → "r, g, b" (for building rgba() in CSS).
  V.hexTriple = (hex) =>
    [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(", ");

  const VEIL_ALPHA = { safe: 0.08, caution: 0.32, peril: 0.48 };
  const BADGE = { safe: "", caution: "!", peril: "‼" };

  function recompute() {
    const P = V.palette;
    const color = { safe: P.glow, caution: P.steel, peril: P.peril };
    V.severity = {};
    for (const k of ["safe", "caution", "peril"]) {
      V.severity[k] = {
        color: color[k],
        veilTint: `rgba(${V.hexTriple(color[k])}, ${VEIL_ALPHA[k]})`,
        badge: BADGE[k],
      };
    }
    V.severityColor = { ...color };
  }

  V.applyTheme = function (id) {
    const t = V.THEMES[id] || V.THEMES[V.DEFAULT_THEME];
    Object.assign(V.palette, t.palette);
    recompute();
    return id in V.THEMES ? id : V.DEFAULT_THEME;
  };

  V.applyTheme(V.DEFAULT_THEME);
})(globalThis);

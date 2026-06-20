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
      // Midnight keep, cold cyan lantern (the original August-Drawbridge accent
      // and ground, kept). The figure now wears indigo-violet so it reads
      // against the cyan flame rather than washing to one blue; peril is the
      // warm pink break.
      palette: {
        void: "#131520", crypt: "#1b1f32", stone: "#252a41", shade: "#2f2a66",
        ink: "#b8cdfe", inkDim: "#7488f6", cloak: "#5a4fd0", cloakLit: "#7d6ff0",
        steel: "#7e8cff", rune: "#b2a8ff", glow: "#86e0f9", glowDeep: "#67c9e4",
        peril: "#ec407a",
      },
    },
    ember: {
      name: "Ember",
      // Torchlit crypt. Near-neutral warm-dark ground (not an orange wash) so
      // the gold flame pops; the figure wears cool verdigris-teal in deliberate
      // temperature-contrast to the flame. Severity ramp reads as fire: gold
      // (safe) → orange (caution) → red (peril).
      palette: {
        void: "#16130f", crypt: "#201b16", stone: "#312a22", shade: "#1f3b3a",
        ink: "#efe2d0", inkDim: "#ab9a84", cloak: "#357f7e", cloakLit: "#54a5a1",
        steel: "#ff8c3a", rune: "#ffd98a", glow: "#ffce5b", glowDeep: "#d99a30",
        peril: "#ff4d52",
      },
    },
    grove: {
      name: "Grove",
      // Witchlight in a deep wood. Near-neutral cool-dark ground; a brown-robed
      // traveller (warm figure) carries a phosphorescent jade flame (cool light,
      // not lime). Caution is a teal, peril a warm coral break.
      palette: {
        void: "#0f1311", crypt: "#181e1a", stone: "#283029", shade: "#3a2c1a",
        ink: "#dcebd6", inkDim: "#92a98f", cloak: "#6a4f33", cloakLit: "#8f6f48",
        steel: "#3fb8b0", rune: "#cdb488", glow: "#83e6a6", glowDeep: "#4fb87a",
        peril: "#ff6a3d",
      },
    },
    dusk: {
      name: "Dusk",
      // Twilight over a dark keep. Near-neutral violet-dark ground; an
      // indigo-blue figure under an orchid flame, with a cyan caution and a hot
      // rose peril — four hues kept apart so nothing washes to one purple.
      palette: {
        void: "#110f19", crypt: "#191628", stone: "#2a2640", shade: "#232a55",
        ink: "#e6dafc", inkDim: "#998fc0", cloak: "#4a44b0", cloakLit: "#6c66e0",
        steel: "#56b8d8", rune: "#d9b8ff", glow: "#c294ff", glowDeep: "#8a4fe0",
        peril: "#ff5a8c",
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

/*
 * Virgil — dark-pattern engine. PURE judgement, no DOM: it takes normalized
 * candidates (plain objects) and returns whether they're a snare. The live
 * scanning, observers, and markers live in content/snares.js; keeping the
 * decisions here means tools/test-dp.mjs can exercise them with literals.
 *
 * Depends only on V.SNARE_LEX (from shared/patterns.js).
 */
(function (g) {
  const V = (g.Virgil = g.Virgil || {});
  const lex = () => V.SNARE_LEX;

  // "MM:SS" / "HH:MM:SS" → total seconds, or null if it isn't a clock.
  function parseClock(text) {
    const m = String(text == null ? "" : text).match(
      /\b(\d{1,2}):(\d{2})(?::(\d{2}))?\b/
    );
    if (!m) return null;
    const a = +m[1];
    const b = +m[2];
    const c = m[3] != null ? +m[3] : null;
    if (b > 59 || (c != null && c > 59)) return null;
    return c != null ? a * 3600 + b * 60 + c : a * 60 + b;
  }

  // A single reading that *contains* a clock-like value.
  function looksLikeClock(text) {
    return lex().clock.test(String(text == null ? "" : text));
  }

  // Two readings ~1s apart: did the clock tick DOWN by a small, plausible step?
  // (Rejects live clocks, which hold or climb, and big jumps from re-renders.)
  function isCountdownTick(s0, s1) {
    return s0 != null && s1 != null && s1 < s0 && s0 - s1 <= 5;
  }

  // A checkbox shipped already ticked, next to marketing/consent wording.
  // cand: { checked: boolean (the default/as-shipped state), text: string }
  function isPrecheckedOptIn(cand) {
    return !!(cand && cand.checked && lex().marketing.test(cand.text || ""));
  }

  // Given the controls found inside a known consent banner, is refusal made
  // hard? Crooked = you can accept here, but cannot reject here — refusal is
  // absent or hidden behind a "manage/preferences" detour.
  // c: { hasAccept, hasReject, hasManage }
  function isCrookedGate(c) {
    if (!c || !c.hasAccept) return false;
    return !c.hasReject && !!c.hasManage;
  }

  V.dpEngine = {
    parseClock,
    looksLikeClock,
    isCountdownTick,
    isPrecheckedOptIn,
    isCrookedGate,
  };
  g.__virgilDp = V.dpEngine; // testing handle, mirrors __virgilFp
})(globalThis);

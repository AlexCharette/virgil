/*
 * Virgil — the perils he guards against, and the words he speaks.
 * The internet is an inferno of circles; Virgil names them as you cross.
 */
(function (g) {
  const V = (g.Virgil = g.Virgil || {});

  // The three named circles plus the catch-all. `severity` drives the hero's
  // aura colour (see palette.js). `circle` is the flavour name shown in bubbles.
  V.CATEGORIES = {
    social: {
      id: "social",
      label: "Social Media",
      circle: "the Circle of Endless Voices",
      severity: "caution",
    },
    scroll: {
      id: "scroll",
      label: "Infinite Scroll",
      circle: "the Pit of the Bottomless Feed",
      severity: "caution",
    },
    adult: {
      id: "adult",
      label: "Adult Content",
      circle: "the Circle of the Flesh",
      severity: "peril",
    },
    safe: {
      id: "safe",
      label: "Safe Passage",
      circle: "open road",
      severity: "safe",
    },
  };

  // Derived once so the rest of the extension never re-types the category set.
  V.CATEGORY_IDS = Object.keys(V.CATEGORIES);
  // The circles worth counting/warning about (everything that isn't "safe").
  V.PERIL_CATEGORIES = V.CATEGORY_IDS.filter(
    (id) => V.CATEGORIES[id].severity !== "safe"
  );

  // Virgil's dialogue. One is chosen by a stable hash of the hostname so the
  // same site always greets you the same way (no per-load randomness).
  V.DIALOGUE = {
    social: [
      "Beware, traveler. {circle} lies ahead — many enter, few return with their hour intact.",
      "The voices here never rest. Are you sure you came seeking them?",
      "I have walked {circle} before. It is wider than it looks, and has no floor.",
      "Every voice here begs a moment of you. A thousand moments make a wasted day.",
      "You came with a purpose, did you not? {circle} will gladly make you forget it.",
      "Here the crowd speaks all at once and says nothing you'll recall tomorrow.",
      "Step lightly, wayfarer — these shades feed on the minutes you grant them.",
      "A hundred strangers shouting for your eye. Lend it sparingly, or not at all.",
    ],
    scroll: [
      "Mind your step — {circle} has no bottom. It feeds on those who keep descending.",
      "The scroll goes ever on. It was not made for you to reach its end.",
      "Each flick of the thumb is a step deeper. Do you remember why you came?",
      "Down and down it goes, traveler, and the floor recedes as you reach for it.",
      "{circle} offers one more, and then one more. That 'more' has no last.",
      "There is no treasure at the foot of this pit — only the hour you spent falling.",
      "I've seen wanderers begin their descent at dawn and surface at dusk, none the richer.",
      "The feed will never tire before you do. Set your own end to it.",
    ],
    adult: [
      "Halt. This is {circle}. Turn back, friend — there is nothing here that keeps.",
      "I will not follow you past this gate. Choose well.",
      "{circle} promises much and returns little. The road behind you is still open.",
      "This door leads only down, traveler, never up. Are you certain of your step?",
      "What waits beyond is a hunger that grows by feeding. Best leave it unfed.",
      "Turn your eyes from this gate, wayfarer — the way out only narrows past it.",
      "No light reaches the bottom of {circle}. Many have looked for it; none returned with more.",
    ],
    safe: [
      "The road is clear. Walk on.",
      "No snares here. I'll keep watch all the same.",
      "Honest ground beneath us. Carry on, traveler.",
      "Fair passage — your hour is your own here.",
      "Nothing stirs in the dark. Go about your work.",
      "Solid footing, wayfarer. I'll trouble you only when it matters.",
    ],
    greet: [
      "I am Virgil. I'll guide you through what waits below.",
      "Keep close. The web is darker than it looks.",
      "Well met, traveler. I've walked these roads longer than you'd believe.",
      "Where you go, I follow — and where it's wise, I'll bid you turn back.",
      "Steel yourself. Not every door we pass should be opened.",
    ],
    // Spoken when the wayfarer lingers too long in a flagged circle.
    linger: [
      "You have tarried {minutes} minutes here. The hour is not yours to lose.",
      "Still here? {minutes} minutes gone. I'd not say it if I didn't mean it.",
      "{minutes} minutes swallowed by this place, traveler. Shall we press on?",
      "The light has shifted — {minutes} minutes spent, and the road still waits.",
      "Count it with me: {minutes} minutes. Time you may yet wish to have back.",
      "{minutes} minutes, and the gate behind us grows distant. Best we go.",
    ],
  };

  // Deterministic line picker — stable per (key, seed).
  V.pickLine = function (lines, seed) {
    if (!lines || !lines.length) return "";
    let h = 0;
    const s = String(seed || "");
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return lines[Math.abs(h) % lines.length];
  };

  V.fillLine = function (line, vars) {
    return line.replace(/\{(\w+)\}/g, (m, k) =>
      vars && k in vars ? vars[k] : m
    );
  };
})(globalThis);

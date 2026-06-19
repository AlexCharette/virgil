/*
 * Virgil — the Censor. Blurs suggestive media (images, video, posters) and
 * reveals it on click. Two free tiers today, with a hook for an on-device model:
 *
 *   A. blur-all   — when the page itself is a flagged adult circle, veil every
 *                   piece of media on it.
 *   B. heuristics — on any page, veil individual media whose alt / title /
 *                   filename hits the adult keyword scan (reused from classify.js).
 *   C. model      — (future) a local NSFW classifier plugs in at classifyEl();
 *                   blur-first is already wired so nothing flashes before it runs.
 *
 * Efficiency: only visible media is examined (IntersectionObserver), additions
 * from infinite scroll are caught (throttled MutationObserver), tiny media is
 * skipped, and each element is processed once.
 */
(function (g) {
  const V = (g.Virgil = g.Virgil || {});
  const Z = (V.censor = {});

  let cfg = null;
  let blurAll = false;
  let io = null;
  let mo = null;
  const processed = new WeakSet();

  const minSize = () => (cfg && cfg.minSize) || 80;

  function isMedia(el) {
    return el && (el.tagName === "IMG" || el.tagName === "VIDEO");
  }

  function bigEnough(el) {
    const r = el.getBoundingClientRect();
    const w = Math.max(r.width, el.naturalWidth || 0, el.videoWidth || 0);
    const h = Math.max(r.height, el.naturalHeight || 0, el.videoHeight || 0);
    return w >= minSize() && h >= minSize();
  }

  function haystack(el) {
    let s =
      (el.getAttribute("alt") || "") +
      " " + (el.getAttribute("title") || "") +
      " " + (el.getAttribute("aria-label") || "") +
      " " + (el.currentSrc || el.src || "");
    if (el.tagName === "VIDEO") {
      s += " " + (el.getAttribute("poster") || "");
      for (const so of el.querySelectorAll("source")) s += " " + (so.src || "");
    }
    return s.toLowerCase();
  }

  function revealHandler(e) {
    const el = e.currentTarget;
    if (!el.classList.contains("virgil-censored")) return;
    // First click only uncovers — don't also follow the link / toggle the video.
    e.preventDefault();
    e.stopPropagation();
    reveal(el);
  }

  function blur(el) {
    if (el.classList.contains("virgil-censored")) return;
    el.classList.add("virgil-censored");
    if (!el.dataset.virgilTitle) {
      el.dataset.virgilTitle = el.getAttribute("title") || "";
      el.setAttribute("title", "Hidden by Virgil — click to reveal");
    }
    el.addEventListener("click", revealHandler, true);
  }

  function reveal(el) {
    el.classList.remove("virgil-censored");
    el.removeEventListener("click", revealHandler, true);
    if ("virgilTitle" in el.dataset) {
      if (el.dataset.virgilTitle) el.setAttribute("title", el.dataset.virgilTitle);
      else el.removeAttribute("title");
      delete el.dataset.virgilTitle;
    }
  }

  // Tier C seam: returns true/false/undefined. undefined ⇒ "no opinion" (the
  // on-device model isn't loaded). When a model is wired, it resolves async and
  // calls reveal() for safe items — blur() has already run (blur-first).
  function classifyEl(el) {
    if (V.nsfwModel && cfg.model && cfg.model.enabled) {
      blur(el); // blur-first
      Promise.resolve(V.nsfwModel.isExplicit(el))
        .then((explicit) => { if (!explicit) reveal(el); })
        .catch(() => {});
      return true;
    }
    return undefined;
  }

  function process(el) {
    if (processed.has(el) || !isMedia(el)) return;
    if (el.closest && el.closest("#virgil-root")) return; // never touch Virgil
    if (!bigEnough(el)) return; // skip icons/avatars/spacers
    processed.add(el);

    if (blurAll) return void blur(el);
    if (cfg.heuristics && V.adultKeywordHit(haystack(el))) return void blur(el);
    classifyEl(el); // Tier C (no-op until a model is present)
  }

  function scanAll() {
    for (const el of document.querySelectorAll("img, video")) observe(el);
  }

  function observe(el) {
    if (processed.has(el)) return;
    // blur-all wants media veiled ASAP (even off-screen) so nothing flashes on
    // scroll; heuristics/model can wait until the element is near the viewport.
    if (blurAll || !io) process(el);
    else io.observe(el);
  }

  Z.start = function (config) {
    if (cfg) return; // already running
    cfg = config;
    if (!cfg || !cfg.enabled) return;

    try {
      io = new IntersectionObserver(
        (entries) => {
          for (const en of entries)
            if (en.isIntersecting) {
              process(en.target);
              io.unobserve(en.target);
            }
        },
        { rootMargin: "200px" }
      );
    } catch (e) {
      io = null;
    }

    scanAll();

    // Only inspect newly added subtrees — O(added nodes) per mutation, not a
    // full-document querySelectorAll that grows with the page on infinite feeds.
    mo = new MutationObserver((records) => {
      for (const rec of records)
        for (const node of rec.addedNodes) {
          if (node.nodeType !== 1) continue;
          if (node.tagName === "IMG" || node.tagName === "VIDEO") observe(node);
          else if (node.querySelectorAll)
            for (const el of node.querySelectorAll("img, video")) observe(el);
        }
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });
  };

  // Called by the orchestrator once the page verdict is known. Turning blur-all
  // on veils everything currently on the page (even media already judged safe by
  // the heuristics pass) and everything added afterwards (via scanAll/process).
  Z.setBlurAll = function (on) {
    if (!cfg || !cfg.enabled || !cfg.onAdultPages) return;
    blurAll = on;
    if (!on) return;
    // Read all layout (bigEnough → getBoundingClientRect) before writing any
    // classes, so we don't thrash layout image-by-image across the whole page.
    const targets = [];
    for (const el of document.querySelectorAll("img, video")) {
      if (el.closest && el.closest("#virgil-root")) continue;
      if (bigEnough(el)) targets.push(el);
      processed.add(el);
    }
    for (const el of targets) blur(el);
  };
})(globalThis);

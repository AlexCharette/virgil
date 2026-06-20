/*
 * Virgil — fingerprint heuristic engine (Phase 1: canvas / WebGL / audio).
 *
 * Pure state machine: the MAIN-world probe feeds it normalized events; it fires
 * a named signal at most once per surface. No DOM, no globals beyond the small
 * factory it exports — so it's unit-testable in Node (see tools/test-fp.mjs).
 *
 * Runs in the page's MAIN world (no `browser.*`, no Virgil namespace).
 */
(function (g) {
  function createEngine(emit) {
    const drawn = new WeakSet(); // canvases that had text drawn on them
    const fired = new Set(); // signals already reported (idempotent)
    const fire = (sig) => {
      if (!fired.has(sig)) {
        fired.add(sig);
        emit(sig);
      }
    };
    return {
      // canvas fingerprinting = draw text, then read it back off-screen
      canvasText(canvas) {
        if (canvas) drawn.add(canvas);
      },
      canvasRead(canvas, offscreen) {
        if (canvas && offscreen && drawn.has(canvas)) fire("canvas");
      },
      // WebGL = ask for the unmasked GPU vendor/renderer
      webglDebug() {
        fire("webgl");
      },
      // audio = render an OfflineAudioContext (overwhelmingly fingerprinting)
      audioRead() {
        fire("audio");
      },
    };
  }

  g.__virgilFp = { createEngine };
})(globalThis);

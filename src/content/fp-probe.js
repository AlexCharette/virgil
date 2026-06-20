/*
 * Virgil — fingerprint probe. Runs in the page's MAIN world at document_start so
 * it can observe the page's own calls to fingerprinting-prone APIs *before* the
 * page caches references. It only watches — it never changes return values (so
 * it can't break pages) and never reads the entropy itself (only the fact that
 * a fingerprint-shaped call happened).
 *
 * Findings reach the isolated world two ways, to catch both early and late
 * probing: a cumulative `data-virgil-fp` attribute on <html> (read once by the
 * isolated watcher on start) and a `virgil:fp` CustomEvent (for live updates).
 */
(function () {
  if (window.__virgilFpProbe) return;
  window.__virgilFpProbe = 1;
  var api = window.__virgilFp;
  if (!api || !api.createEngine) return;

  var seen = [];
  var engine = api.createEngine(function (sig) {
    seen.push(sig);
    try {
      document.documentElement.setAttribute("data-virgil-fp", seen.join(","));
    } catch (e) {}
    try {
      window.dispatchEvent(new CustomEvent("virgil:fp", { detail: { sig: sig } }));
    } catch (e) {}
  });

  function wrap(obj, name, before) {
    if (!obj) return;
    var orig = obj[name];
    if (typeof orig !== "function") return;
    var w = function () {
      try {
        before(this, arguments);
      } catch (e) {}
      return orig.apply(this, arguments);
    };
    try {
      w.toString = function () {
        return orig.toString();
      };
    } catch (e) {}
    try {
      obj[name] = w;
    } catch (e) {}
  }

  var offscreen = function (cv) {
    return !cv.isConnected || (cv.width || 0) <= 300;
  };

  // --- Canvas: text drawn, then read back off-screen ---
  try {
    [window.CanvasRenderingContext2D, window.OffscreenCanvasRenderingContext2D].forEach(
      function (Ctx) {
        if (!Ctx) return;
        wrap(Ctx.prototype, "fillText", function (ctx) {
          engine.canvasText(ctx.canvas);
        });
        wrap(Ctx.prototype, "strokeText", function (ctx) {
          engine.canvasText(ctx.canvas);
        });
        wrap(Ctx.prototype, "getImageData", function (ctx) {
          engine.canvasRead(ctx.canvas, offscreen(ctx.canvas));
        });
      }
    );
    if (window.HTMLCanvasElement) {
      wrap(HTMLCanvasElement.prototype, "toDataURL", function (cv) {
        engine.canvasRead(cv, offscreen(cv));
      });
      wrap(HTMLCanvasElement.prototype, "toBlob", function (cv) {
        engine.canvasRead(cv, offscreen(cv));
      });
    }
    if (window.OffscreenCanvas) {
      wrap(OffscreenCanvas.prototype, "convertToBlob", function (cv) {
        engine.canvasRead(cv, true);
      });
    }
  } catch (e) {}

  // --- WebGL: unmasked GPU vendor/renderer ---
  try {
    var DEBUG = { 37445: 1, 37446: 1 }; // 0x9245 UNMASKED_VENDOR, 0x9246 RENDERER
    [window.WebGLRenderingContext, window.WebGL2RenderingContext].forEach(function (Ctx) {
      if (!Ctx) return;
      wrap(Ctx.prototype, "getExtension", function (ctx, args) {
        if (args[0] === "WEBGL_debug_renderer_info") engine.webglDebug();
      });
      wrap(Ctx.prototype, "getParameter", function (ctx, args) {
        if (DEBUG[args[0]]) engine.webglDebug();
      });
    });
  } catch (e) {}

  // --- Audio: rendering an OfflineAudioContext ---
  try {
    [window.OfflineAudioContext, window.webkitOfflineAudioContext].forEach(function (O) {
      if (O) wrap(O.prototype, "startRendering", function () {
        engine.audioRead();
      });
    });
  } catch (e) {}
})();

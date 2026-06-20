/*
 * Unit tests for the fingerprint heuristic engine (src/content/fp-engine.js).
 * Pure, DOM-free. Run: node tools/test-fp.mjs  (or: npm test)
 */
import vm from "node:vm";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sb = {};
sb.globalThis = sb;
vm.createContext(sb);
vm.runInContext(readFileSync(join(root, "src/content/fp-engine.js"), "utf8"), sb, {
  filename: "fp-engine.js",
});

let failed = 0;
const assert = (cond, msg) => {
  console.log((cond ? "  ok  " : "  FAIL") + " " + msg);
  if (!cond) failed++;
};

const run = () => {
  const fired = [];
  const eng = sb.__virgilFp.createEngine((s) => fired.push(s));
  return { fired, eng };
};
const count = (fired, sig) => fired.filter((s) => s === sig).length;

// Canvas: text drawn then read back off-screen → fires once.
{
  const { fired, eng } = run();
  const cv = { width: 50, isConnected: false };
  eng.canvasText(cv);
  eng.canvasRead(cv, !cv.isConnected || cv.width <= 300);
  eng.canvasRead(cv, true); // again → idempotent
  assert(count(fired, "canvas") === 1, "canvas fires once on text + off-screen read");
}

// Canvas: on-screen read of a drawn canvas → no fire (legit rendering).
{
  const { fired, eng } = run();
  const cv = { width: 800, isConnected: true };
  eng.canvasText(cv);
  eng.canvasRead(cv, false);
  assert(count(fired, "canvas") === 0, "no canvas signal for on-screen read");
}

// Canvas: read with no prior text → no fire.
{
  const { fired, eng } = run();
  const cv = { width: 10, isConnected: false };
  eng.canvasRead(cv, true);
  assert(count(fired, "canvas") === 0, "no canvas signal without a prior text draw");
}

// WebGL + audio fire once each.
{
  const { fired, eng } = run();
  eng.webglDebug();
  eng.webglDebug();
  eng.audioRead();
  assert(count(fired, "webgl") === 1, "webgl fires once");
  assert(count(fired, "audio") === 1, "audio fires once");
}

console.log(failed ? `\nFP ENGINE TESTS FAILED (${failed})` : "\nFP ENGINE OK");
process.exit(failed ? 1 : 0);

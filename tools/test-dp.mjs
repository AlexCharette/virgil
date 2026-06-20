/*
 * Unit tests for the dark-pattern engine. Loads shared/patterns.js +
 * content/dp-engine.js into a VM sandbox (the exact code that ships) and
 * exercises the pure judgement with literals — no DOM needed.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sandbox = {};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
for (const f of ["src/shared/patterns.js", "src/content/dp-engine.js"]) {
  vm.runInContext(readFileSync(join(root, f), "utf8"), sandbox, { filename: f });
}
const e = sandbox.Virgil.dpEngine;

let failed = 0;
function ok(name, cond) {
  console.log(`  ${cond ? "ok  " : "FAIL"} ${name}`);
  if (!cond) failed++;
}

// parseClock
ok("parseClock MM:SS", e.parseClock("09:59") === 599);
ok("parseClock HH:MM:SS", e.parseClock("1:02:03") === 3723);
ok("parseClock embedded", e.parseClock("Offer ends 02:30!") === 150);
ok("parseClock rejects non-clock", e.parseClock("hello") === null);
ok("parseClock rejects bad minutes", e.parseClock("12:99") === null);

// looksLikeClock
ok("looksLikeClock true", e.looksLikeClock("ends in 00:42"));
ok("looksLikeClock false", !e.looksLikeClock("no numbers here"));

// isCountdownTick
ok("tick down small", e.isCountdownTick(600, 599));
ok("tick down a few", e.isCountdownTick(600, 598));
ok("tick not climbing", !e.isCountdownTick(599, 600));
ok("tick not equal", !e.isCountdownTick(600, 600));
ok("tick rejects big jump", !e.isCountdownTick(600, 500));

// isPrecheckedOptIn
ok("prechecked newsletter", e.isPrecheckedOptIn({ checked: true, text: "Sign me up for the newsletter" }));
ok("prechecked offers", e.isPrecheckedOptIn({ checked: true, text: "Yes, send me promotional offers" }));
ok("prechecked needs checked", !e.isPrecheckedOptIn({ checked: false, text: "newsletter" }));
ok("prechecked ignores ToS", !e.isPrecheckedOptIn({ checked: true, text: "I agree to the terms of service" }));

// isCrookedGate
ok("crooked: accept + manage, no reject", e.isCrookedGate({ hasAccept: true, hasReject: false, hasManage: true }));
ok("fair: accept + reject present", !e.isCrookedGate({ hasAccept: true, hasReject: true, hasManage: true }));
ok("not a gate: accept only, no manage", !e.isCrookedGate({ hasAccept: true, hasReject: false, hasManage: false }));
ok("not a gate: no accept", !e.isCrookedGate({ hasAccept: false, hasReject: false, hasManage: true }));

if (failed) {
  console.log(`\nDP ENGINE: ${failed} FAILED`);
  process.exit(1);
}
console.log("\nDP ENGINE OK");

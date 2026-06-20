/*
 * Unit tests for the pure shared logic — the detection/classification core that
 * has no DOM and no `browser` dependency at load time. Loads the real shipping
 * modules into a VM sandbox (same trick as load-sprite / test-dp).
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sandbox = {};
sandbox.globalThis = sandbox;
sandbox.URL = URL; // the browser global the modules rely on (absent in a bare vm)
vm.createContext(sandbox);
for (const f of [
  "src/shared/blocklist.js",
  "src/shared/classify.js",
  "src/shared/trackers.js",
  "src/shared/settings.js",
]) {
  vm.runInContext(readFileSync(join(root, f), "utf8"), sandbox, { filename: f });
}
const V = sandbox.Virgil;

let failed = 0;
function ok(name, cond) {
  console.log(`  ${cond ? "ok  " : "FAIL"} ${name}`);
  if (!cond) failed++;
}
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// normalizeHost
ok("normalizeHost strips www + scheme + case", V.normalizeHost("https://www.Example.com/p") === "example.com");
ok("normalizeHost bare host", V.normalizeHost("WWW.Foo.COM") === "foo.com");

// matchBlocklist (suffix, longest-wins)
ok("blocklist subdomain", V.matchBlocklist("m.facebook.com") === "social");
ok("blocklist scroll", V.matchBlocklist("youtube.com") === "scroll");
ok("blocklist adult", V.matchBlocklist("pornhub.com") === "adult");
ok("blocklist miss", V.matchBlocklist("example.com") === null);

// adultKeywordHit (word-boundaried)
ok("adult hit", V.adultKeywordHit("free nude photos"));
ok("adult no false hit", !V.adultKeywordHit("attitude adjustment"));

// classifyStatic
ok("classify blocklist", eq(V.classifyStatic({ hostname: "twitter.com", title: "" }), { category: "social", source: "blocklist", confidence: 1 }));
ok("classify keyword", V.classifyStatic({ hostname: "example.com", title: "Free XXX cams" }).source === "keyword");
ok("classify safe → null", V.classifyStatic({ hostname: "example.com", title: "Quarterly report" }) === null);

// baseDomain + matchTracker
ok("baseDomain two labels", V.baseDomain("foo.com") === "foo.com");
ok("baseDomain deep", V.baseDomain("a.b.google-analytics.com") === "google-analytics.com");
ok("tracker analytics", V.matchTracker("www.google-analytics.com").category === "analytics");
ok("tracker replay name", V.matchTracker("sub.hotjar.com").name === "Hotjar");
ok("tracker miss", V.matchTracker("example.com") === null);

// withDefaults — partial stored objects must preserve nested defaults
ok("defaults from empty", eq(V.withDefaults({}), V.DEFAULT_SETTINGS));
ok("defaults from null", eq(V.withDefaults(null), V.DEFAULT_SETTINGS));
const partial = V.withDefaults({ snares: { enabled: false } });
ok("nested default kept (snares.tiers)", partial.snares.tiers.structural === true);
ok("stored override kept (snares.enabled)", partial.snares.enabled === false);
ok("nested default kept (ai.endpoint)", V.withDefaults({ ai: { apiKey: "x" } }).ai.endpoint === V.DEFAULT_SETTINGS.ai.endpoint);
ok("top-level array preserved", eq(V.withDefaults({ pausedHosts: ["a.com"] }).pausedHosts, ["a.com"]));
ok("blur.model nested kept", V.withDefaults({ blur: { enabled: false } }).blur.model.enabled === false);

if (failed) {
  console.log(`\nSHARED LOGIC: ${failed} FAILED`);
  process.exit(1);
}
console.log("\nSHARED LOGIC OK");

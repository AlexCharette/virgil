/*
 * Virgil — per-browser bundler.
 *
 * MV3 backgrounds are mutually exclusive across engines: Chrome/Edge require
 * `background.service_worker` and REJECT `background.scripts`; Firefox runs an
 * event page via `background.scripts` and does not run a service-worker
 * background. So a single manifest can't serve both — we emit one per target.
 *
 * The repo root manifest.json is the Chrome/Edge version (loads directly, no
 * build). This regenerates icons, then derives dist/chrome and dist/firefox
 * (each with a loadable .zip / .xpi). Pass --watch to rebuild on every change.
 *
 *   node tools/build.mjs            one-shot
 *   node tools/build.mjs --watch    rebuild on source changes (for Firefox/Zen)
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, watch } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { writeIcons } from "./icons.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ASSETS = ["vendor", "src", "icons"];

// Firefox loads these as ordinary background scripts (no importScripts there);
// order matters — polyfill, then shared modules, then the worker body.
const FF_BACKGROUND_SCRIPTS = [
  "vendor/browser-polyfill.min.js",
  "src/shared/palette.js",
  "src/shared/categories.js",
  "src/shared/blocklist.js",
  "src/shared/classify.js",
  "src/shared/settings.js",
  "src/background/service-worker.js",
];

function emit(target, manifest) {
  const out = join(root, "dist", target);
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  for (const a of ASSETS) cpSync(join(root, a), join(out, a), { recursive: true });
  writeFileSync(join(out, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
}

// Zip the CONTENTS of a dist folder (manifest.json at the archive root) into a
// loadable package. Needs the `zip` CLI.
function pack(target, outName) {
  const zipPath = join(root, "dist", outName);
  rmSync(zipPath, { force: true });
  const r = spawnSync("zip", ["-r", "-X", "-FS", zipPath, ".", "-x", ".*"], {
    cwd: join(root, "dist", target),
    stdio: "ignore",
  });
  return r.status === 0 ? `dist/${outName}` : null;
}

function buildAll() {
  const base = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8"));
  writeIcons(); // keep dist icons in sync with the sprite code

  // Chrome / Edge — service-worker background (same as repo root).
  emit("chrome", base);
  // Firefox / Zen — event-page background + gecko settings.
  const ff = structuredClone(base);
  ff.background = { scripts: FF_BACKGROUND_SCRIPTS };
  ff.browser_specific_settings = {
    gecko: {
      id: "virgil@herbary.io",
      strict_min_version: "115.0",
      // AMO-required data-consent declaration. Virgil collects nothing by
      // default (settings stay local); the opt-in AI transmits a page summary
      // (websiteContent) including the hostname (browsingActivity) only with
      // the user's consent — so those are optional, with nothing required.
      data_collection_permissions: {
        required: [],
        optional: ["websiteContent", "browsingActivity"],
      },
    },
  };
  emit("firefox", ff);

  const packed = [pack("chrome", "virgil-chrome.zip"), pack("firefox", "virgil-firefox.xpi")];
  const stamp = new Date().toLocaleTimeString();
  const pkgNote = packed.every(Boolean) ? "" : " (zip CLI missing — folders only)";
  console.log(`[${stamp}] built dist/chrome + dist/firefox${pkgNote}`);
}

buildAll();

if (process.argv.includes("--watch")) {
  console.log("watching src/, vendor/, manifest.json — Ctrl-C to stop");
  let timer = null;
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        buildAll();
      } catch (e) {
        console.error("build failed:", e.message);
      }
    }, 150); // debounce bursts of FS events
  };
  for (const target of ["src", "vendor", "manifest.json"]) {
    try {
      watch(join(root, target), { recursive: true }, schedule);
    } catch (e) {
      watch(join(root, target), schedule); // non-recursive fallback (files)
    }
  }
}

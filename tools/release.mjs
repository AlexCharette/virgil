/*
 * Virgil — cut a tagged GitHub release for the current manifest version.
 * Builds the packages, then creates a `v<version>` release with the Chrome and
 * Firefox bundles attached and auto-generated notes.
 *
 *   1. bump "version" in manifest.json (and commit/push)
 *   2. npm run release
 *
 * Requires the `gh` CLI, authenticated with repo scope.
 */
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const run = (cmd, args) => execFileSync(cmd, args, { cwd: root, stdio: "inherit" });

const version = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8")).version;
const tag = "v" + version;

console.log(`Building packages for ${tag}…`);
run("npm", ["run", "build"]);

console.log(`Creating GitHub release ${tag}…`);
run("gh", [
  "release",
  "create",
  tag,
  "dist/virgil-chrome.zip#Chrome / Edge (.zip)",
  "dist/virgil-firefox.xpi#Firefox / Zen (.xpi)",
  "--title",
  "Virgil " + tag,
  "--generate-notes",
]);

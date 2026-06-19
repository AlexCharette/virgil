/*
 * Loads the browser-side character system (palette.js + sprite.js) into a Node
 * VM sandbox and returns the populated `Virgil` namespace, so the tooling
 * renders from the exact same code that ships in the extension.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

export function loadVirgil() {
  const sandbox = {};
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  for (const f of ["src/shared/palette.js", "src/content/sprite.js"]) {
    vm.runInContext(readFileSync(join(root, f), "utf8"), sandbox, { filename: f });
  }
  return sandbox.Virgil;
}

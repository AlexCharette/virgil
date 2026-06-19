/*
 * Shared icon writer — renders the chosen character to the manifest icon sizes.
 * Used by tools/gen-icons.mjs (direct) and tools/build.mjs (so a build always
 * ships icons that match the current sprite code).
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadVirgil } from "./load-sprite.mjs";
import { encodePNG } from "./png.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

export function writeIcons(style) {
  const V = loadVirgil();
  const styleId = style || V.DEFAULT_STYLE;
  const { W, H, buf } = V.drawCharacter(styleId, V.palette.glow);
  const outDir = join(root, "icons");
  mkdirSync(outDir, { recursive: true });
  const written = [];
  for (const size of [16, 32, 48, 128]) {
    const path = join(outDir, `icon-${size}.png`);
    writeFileSync(path, encodePNG(buf, W, H, size, size));
    written.push(`icon-${size}.png`);
  }
  return { styleId, written };
}

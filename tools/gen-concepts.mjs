/*
 * Virgil — character preview gallery. Renders every character from the shared
 * sprite system and writes a self-contained gallery.html (plus a PNG each) so
 * the set can be compared at a glance. Purely a dev/preview aid — the in-app
 * picker is the real chooser.
 *   node tools/gen-concepts.mjs [outDir]
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { loadVirgil } from "./load-sprite.mjs";
import { encodePNG } from "./png.mjs";

const V = loadVirgil();
const outDir = process.argv[2] || ".";
mkdirSync(outDir, { recursive: true });

const cards = [];
for (const c of V.CHARACTER_LIST) {
  const { W, H, buf } = V.drawCharacter(c.id, V.palette.glow);
  writeFileSync(`${outDir}/concept-${c.id}.png`, encodePNG(buf, W, H, 224, 280));
  cards.push({ ...c, b64: encodePNG(buf, W, H, 160, 200).toString("base64") });
  console.log(`wrote ${outDir}/concept-${c.id}.png`);
}

const gallery = `<style>
  body{margin:0;background:#131520;color:#b8cdfe;font-family:ui-monospace,Menlo,Consolas,monospace}
  h1{letter-spacing:2px;text-transform:uppercase;font-size:20px;padding:20px 24px 0}
  p.sub{color:#627af4;padding:0 24px;margin:4px 0 16px}
  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;padding:0 24px 32px}
  .card{background:#1b1f32;border:1px solid #252a41;border-radius:8px;padding:16px;text-align:center}
  .card img{width:160px;height:200px;image-rendering:pixelated;background:radial-gradient(circle at 50% 40%, #1b2238, #131520);border-radius:6px}
  .card h2{font-size:13px;letter-spacing:1px;color:#86e0f9;margin:12px 0 6px}
  .card p{font-size:12px;line-height:1.45;color:#b8cdfe;margin:0}
</style>
<h1>Virgil — character set</h1>
<p class="sub">32-bit guides · the wayfarer picks one in the popup</p>
<div class="grid">
${cards
  .map(
    (c) => `  <div class="card">
    <img alt="${c.name}" src="data:image/png;base64,${c.b64}"/>
    <h2>${c.name}</h2>
    <p>${c.desc}</p>
  </div>`
  )
  .join("\n")}
</div>`;
writeFileSync(`${outDir}/gallery.html`, gallery);
console.log(`wrote ${outDir}/gallery.html`);

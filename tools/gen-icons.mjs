/*
 * Virgil — toolbar icon generator. Thin wrapper over the shared icon writer.
 *   node tools/gen-icons.mjs [styleId]
 */
import { writeIcons } from "./icons.mjs";

const { styleId, written } = writeIcons(process.argv[2]);
console.log(`wrote ${written.length} icons (style="${styleId}")`);

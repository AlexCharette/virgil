/*
 * Minimal dependency-free PNG encoder. Takes an RGBA pixel buffer (gw x gh) and
 * renders it into an outW x outH PNG, scaled to fit (aspect-preserved, centred,
 * nearest-neighbour) on a transparent field.
 */
import { deflateSync } from "node:zlib";

const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = (b) => {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
};

export function encodePNG(buf, gw, gh, outW, outH) {
  const scale = Math.min(outW / gw, outH / gh);
  const drawW = Math.round(gw * scale);
  const drawH = Math.round(gh * scale);
  const offX = Math.floor((outW - drawW) / 2);
  const offY = Math.floor((outH - drawH) / 2);

  const rgba = Buffer.alloc(outW * outH * 4); // transparent
  for (let ty = 0; ty < drawH; ty++) {
    const sy = Math.min(gh - 1, Math.floor(ty / scale));
    for (let tx = 0; tx < drawW; tx++) {
      const sx = Math.min(gw - 1, Math.floor(tx / scale));
      const si = (sy * gw + sx) * 4;
      const di = ((offY + ty) * outW + (offX + tx)) * 4;
      rgba[di] = buf[si];
      rgba[di + 1] = buf[si + 1];
      rgba[di + 2] = buf[si + 2];
      rgba[di + 3] = buf[si + 3];
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(outW, 0);
  ihdr.writeUInt32BE(outH, 4);
  ihdr[8] = 8;
  ihdr[9] = 6; // RGBA
  const stride = outW * 4;
  const raw = Buffer.alloc((stride + 1) * outH);
  for (let y = 0; y < outH; y++)
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

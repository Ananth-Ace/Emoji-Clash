// Generates icon192.png and icon512.png — no external packages needed
const zlib = require('zlib');
const fs   = require('fs');

// ── CRC32 ─────────────────────────────────────────────────────────────────
const CRC = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (const b of buf) c = CRC[(c ^ b) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

// ── PNG writer ────────────────────────────────────────────────────────────
function makePNG(w, h, pixelFn) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    for (let x = 0; x < w; x++) {
      const [r, g, b, a] = pixelFn(x, y, w, h);
      const i = y * (w * 4 + 1) + 1 + x * 4;
      raw[i] = r; raw[i+1] = g; raw[i+2] = b; raw[i+3] = a;
    }
  }
  function chunk(type, data) {
    const tb = Buffer.from(type);
    const lb = Buffer.alloc(4); lb.writeUInt32BE(data.length);
    const cb = Buffer.alloc(4); cb.writeUInt32BE(crc32(Buffer.concat([tb, data])));
    return Buffer.concat([lb, tb, data, cb]);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137,80,78,71,13,10,26,10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

// ── Icon pixel function ───────────────────────────────────────────────────
function iconPixel(x, y, w, h) {
  const cx = w / 2, cy = h / 2;
  const rx = (x - cx) / cx;  // -1 to 1
  const ry = (y - cy) / cy;
  const dist = Math.sqrt(rx*rx + ry*ry);

  // Rounded corners (make icon circular-ish)
  const cornerX = Math.abs(rx) > 0.82;
  const cornerY = Math.abs(ry) > 0.82;
  if (cornerX && cornerY && dist > 1.1) return [0,0,0,0];

  // Background: dark blue radial gradient
  const t = Math.min(dist, 1);
  let r = Math.round(30  + t * 15);
  let g = Math.round(26  + t * 10);
  let b = Math.round(110 - t * 50);
  let a = 255;

  // Outer glow ring
  if (dist > 0.88 && dist < 0.96) {
    r = Math.round(r * 0.4 + 79  * 0.6);
    g = Math.round(g * 0.4 + 195 * 0.6);
    b = Math.round(b * 0.4 + 247 * 0.6);
  }

  // Inner golden ring
  if (dist > 0.55 && dist < 0.60) {
    r = Math.round(r * 0.5 + 255 * 0.5);
    g = Math.round(g * 0.5 + 215 * 0.5);
    b = Math.round(b * 0.5 + 0   * 0.5);
  }

  // Crossed swords (2 diagonal lines)
  const sword1 = Math.abs(rx - ry) < 0.09 && dist < 0.75;
  const sword2 = Math.abs(rx + ry) < 0.09 && dist < 0.75;

  if (sword1 || sword2) {
    // Bright gold
    r = 255; g = Math.round(200 + dist * 15); b = 30;
    // Sword tip highlights
    if (dist > 0.55) { r = 255; g = 255; b = 180; }
  }

  // Center circle (handle/guard)
  if (dist < 0.13) {
    r = 220; g = 170; b = 40;
  }
  if (dist < 0.08) {
    r = 255; g = 220; b = 80;
  }

  // Corner stars (4 small diamonds)
  const starPositions = [[0.65,0.65],[0.65,-0.65],[-0.65,0.65],[-0.65,-0.65]];
  for (const [sx, sy] of starPositions) {
    const sdist = Math.sqrt((rx-sx)**2 + (ry-sy)**2);
    if (sdist < 0.07) { r = 255; g = 240; b = 100; }
  }

  return [Math.min(255,r), Math.min(255,g), Math.min(255,b), a];
}

// ── Generate both sizes ───────────────────────────────────────────────────
[192, 512].forEach(size => {
  const png      = makePNG(size, size, iconPixel);
  const filename = `icon${size}.png`;
  fs.writeFileSync(filename, png);
  console.log(`✅  Created ${filename}  (${png.length} bytes)`);
});

console.log('\nDone! Upload icon192.png and icon512.png to GitHub.');

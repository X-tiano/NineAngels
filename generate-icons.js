#!/usr/bin/env node
// Generates icon-192.png and icon-512.png for the PWA manifest
const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

// CRC32 table
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c;
}
function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function chunk(type, data) {
  const tb = Buffer.from(type, 'ascii');
  const db = Buffer.isBuffer(data) ? data : Buffer.from(data);
  const lb = Buffer.allocUnsafe(4); lb.writeUInt32BE(db.length, 0);
  const ci = Buffer.concat([tb, db]);
  const cb = Buffer.allocUnsafe(4); cb.writeUInt32BE(crc32(ci), 0);
  return Buffer.concat([lb, tb, db, cb]);
}

function renderIcon(size) {
  // Brand colours: bg = #2d2a24 (ink), fg = #faf7f1 (paper)
  const [bgR, bgG, bgB] = [0x2d, 0x2a, 0x24];
  const [fgR, fgG, fgB] = [0xfa, 0xf7, 0xf1];

  const pixels = new Uint8Array(size * size * 4);
  const cx = size / 2, cy = size / 2;
  const r  = size * 0.46;
  const s  = size / 192;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i  = (y * size + x) * 4;
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Anti-aliased circle alpha
      const a = Math.round(Math.min(1, Math.max(0, r - dist + 0.5)) * 255);
      if (!a) continue;

      pixels[i]   = bgR;
      pixels[i+1] = bgG;
      pixels[i+2] = bgB;
      pixels[i+3] = a;

      // "IX" glyph
      const rx = dx, ry = dy;

      // — I (left stroke) —
      const iCX = -13 * s, iHW = 2.5 * s, iHH = 17 * s, iCapH = 1.5 * s, iCapW = 5 * s;
      const inIBar    = rx >= iCX-iHW && rx < iCX+iHW && ry >= -iHH && ry < iHH;
      const inITopCap = ry >= -iHH-iCapH && ry < -iHH+iCapH && rx >= iCX-iCapW && rx < iCX+iCapW;
      const inIBotCap = ry >= iHH-iCapH  && ry < iHH+iCapH  && rx >= iCX-iCapW && rx < iCX+iCapW;

      // — X (right cross) —
      const xCX = 13 * s, xW = 13 * s, xH = 17 * s, xThick = 2.2 * s;
      const lx = rx - xCX;
      const slope = xH / xW;
      const norm  = Math.sqrt(1 + slope * slope);
      const d1    = Math.abs(ry - slope * lx) / norm;
      const d2    = Math.abs(ry + slope * lx) / norm;
      const inX   = Math.abs(lx) <= xW && Math.abs(ry) <= xH && (d1 < xThick || d2 < xThick);

      if (inIBar || inITopCap || inIBotCap || inX) {
        pixels[i]   = fgR;
        pixels[i+1] = fgG;
        pixels[i+2] = fgB;
        pixels[i+3] = a;
      }
    }
  }

  // Pack into PNG rows (filter byte = 0)
  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.allocUnsafe(1 + size * 4);
    row[0] = 0;
    Buffer.from(pixels.buffer).copy(row, 1, y * size * 4, (y + 1) * size * 4);
    rows.push(row);
  }
  const compressed = zlib.deflateSync(Buffer.concat(rows), { level: 9 });

  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8]=8; ihdr[9]=6; ihdr[10]=0; ihdr[11]=0; ihdr[12]=0;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

const assetsDir = path.join(__dirname, 'assets');
fs.writeFileSync(path.join(assetsDir, 'icon-192.png'), renderIcon(192));
fs.writeFileSync(path.join(assetsDir, 'icon-512.png'), renderIcon(512));
console.log('Generated assets/icon-192.png and assets/icon-512.png');

import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(process.cwd(), "src-tauri", "icons");

const SS = 4; // 4x supersampling for ultra crisp anti-aliasing

// Colors
const BODY_TOP = [129, 140, 248];    // #818CF8 - bright electric periwinkle
const BODY_MID = [99, 102, 241];     // #6366F1 - vibrant indigo
const BODY_BOT = [67, 56, 202];      // #4338CA - deep royal indigo
const RIM_DARK = [24, 21, 56];       // #181538 - high contrast dark rim
const EAR_INNER = [251, 113, 133];   // #FB7185 - cute warm pink inner ear
const EYE_DARK = [15, 23, 42];       // #0F172A - deep obsidian eye
const EYE_LIGHT = [255, 255, 255];   // #FFFFFF - sparkle catchlight
const BLUSH = [244, 63, 94];         // #F43F5E - soft blush cheeks
const SPARKLE = [254, 240, 138];     // #FEF08A - golden intelligence star

function insideBody(x, y, rx, ry) {
  const n = 2.7;
  return Math.pow(Math.abs(x / rx), n) + Math.pow(Math.abs(y / ry), n) <= 1;
}

function insideCircle(x, y, cx, cy, r) {
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}

function insideRotatedPill(x, y, cx, cy, w, h, angleRad) {
  const cos = Math.cos(-angleRad);
  const sin = Math.sin(-angleRad);
  const dx = x - cx;
  const dy = y - cy;
  const rx = dx * cos - dy * sin;
  const ry = dx * sin + dy * cos;
  const hw = w / 2;
  const hh = h / 2;
  const r = Math.min(hw, hh);
  const px = Math.max(-hw + r, Math.min(hw - r, rx));
  const py = Math.max(-hh + r, Math.min(hh - r, ry));
  return (rx - px) ** 2 + (ry - py) ** 2 <= r * r;
}

function renderPowpow(size) {
  const px = new Uint8Array(size * size * 4);
  const cx = size / 2;
  const cy = size / 2 + size * 0.05;
  const R = size * 0.35;
  const rx = R * 1.12;
  const ry = R * 0.90;
  const rim = Math.max(1.0, R * 0.07);

  // Ears
  const earW = R * 0.50;
  const earH = R * 0.70;
  const earInnerW = earW * 0.60;
  const earInnerH = earH * 0.60;
  const earDistX = rx * 0.72;
  const earDistY = ry * 0.88;
  const earAngle = 0.38; // ~22 degrees outward tilt

  // Eyes
  const eyeR = R * 0.22;
  const eyeX = rx * 0.44;
  const eyeY = ry * 0.08;
  const shineR1 = eyeR * 0.38;
  const shineR2 = eyeR * 0.20;

  // Blush
  const blushW = R * 0.32;
  const blushH = R * 0.16;
  const blushX = rx * 0.66;
  const blushY = ry * 0.38;

  // Forehead Sparkle Star
  const starY = -ry * 0.58;
  const starR = R * 0.20;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let bodyHits = 0;
      let bodyRimHits = 0;
      let earHits = 0;
      let earRimHits = 0;
      let earInnerHits = 0;
      let eyeHits = 0;
      let shine1Hits = 0;
      let shine2Hits = 0;
      let blushHits = 0;
      let starHits = 0;
      let smileHits = 0;

      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const px0 = x + (sx + 0.5) / SS - cx;
          const py0 = y + (sy + 0.5) / SS - cy;

          // Ears
          const inLeftEarRim = insideRotatedPill(px0, py0, -earDistX, -earDistY, earW + rim * 2, earH + rim * 2, -earAngle);
          const inRightEarRim = insideRotatedPill(px0, py0, earDistX, -earDistY, earW + rim * 2, earH + rim * 2, earAngle);
          if (inLeftEarRim || inRightEarRim) {
            earRimHits++;
            const inLeftEar = insideRotatedPill(px0, py0, -earDistX, -earDistY, earW, earH, -earAngle);
            const inRightEar = insideRotatedPill(px0, py0, earDistX, -earDistY, earW, earH, earAngle);
            if (inLeftEar || inRightEar) {
              earHits++;
              if (insideRotatedPill(px0, py0, -earDistX, -earDistY + earH * 0.1, earInnerW, earInnerH, -earAngle) ||
                  insideRotatedPill(px0, py0, earDistX, -earDistY + earH * 0.1, earInnerW, earInnerH, earAngle)) {
                earInnerHits++;
              }
            }
          }

          // Body
          if (insideBody(px0, py0, rx + rim, ry + rim)) {
            bodyRimHits++;
            if (insideBody(px0, py0, rx, ry)) {
              bodyHits++;

              // Eyes
              const leftEye = insideCircle(px0, py0, -eyeX, eyeY, eyeR);
              const rightEye = insideCircle(px0, py0, eyeX, eyeY, eyeR);
              if (leftEye || rightEye) {
                eyeHits++;
                // Catchlights
                const targetEyeX = px0 < 0 ? -eyeX : eyeX;
                if (insideCircle(px0, py0, targetEyeX - eyeR * 0.32, eyeY - eyeR * 0.32, shineR1)) {
                  shine1Hits++;
                } else if (insideCircle(px0, py0, targetEyeX + eyeR * 0.35, eyeY + eyeR * 0.35, shineR2)) {
                  shine2Hits++;
                }
              }

              // Cheeks Blush
              if (!leftEye && !rightEye) {
                if (insideRotatedPill(px0, py0, -blushX, blushY, blushW, blushH, 0) ||
                    insideRotatedPill(px0, py0, blushX, blushY, blushW, blushH, 0)) {
                  blushHits++;
                }
              }

              // Cheerful Happy Smile Arc (mouth edges curl upwards happily)
              if (Math.abs(px0) <= R * 0.24 && py0 >= eyeY + eyeR * 0.7 && py0 <= eyeY + eyeR * 1.5) {
                const smileArc = -((px0 / (R * 0.24)) ** 2) * (R * 0.14);
                const smileTargetY = eyeY + eyeR * 1.25 + smileArc;
                if (Math.abs(py0 - smileTargetY) <= Math.max(1.2, R * 0.055)) {
                  smileHits++;
                }
              }

              // Forehead Sparkle Star
              const dxStar = Math.abs(px0);
              const dyStar = Math.abs(py0 - starY);
              if (dxStar + dyStar <= starR) {
                starHits++;
              }
            }
          }
        }
      }

      const total = SS * SS;
      const anyHit = bodyRimHits || earRimHits;
      if (anyHit === 0) continue;

      let r = RIM_DARK[0], g = RIM_DARK[1], b = RIM_DARK[2], a = Math.max(bodyRimHits, earRimHits) / total;

      // Base ear color
      if (earHits > 0) {
        const earAlpha = earHits / total;
        r = r * (1 - earAlpha) + BODY_TOP[0] * earAlpha;
        g = g * (1 - earAlpha) + BODY_TOP[1] * earAlpha;
        b = b * (1 - earAlpha) + BODY_TOP[2] * earAlpha;
      }
      if (earInnerHits > 0) {
        const innerAlpha = (earInnerHits / total) * 0.85;
        r = r * (1 - innerAlpha) + EAR_INNER[0] * innerAlpha;
        g = g * (1 - innerAlpha) + EAR_INNER[1] * innerAlpha;
        b = b * (1 - innerAlpha) + EAR_INNER[2] * innerAlpha;
      }

      // Base body color with smooth vertical gradient
      if (bodyHits > 0) {
        const bodyAlpha = bodyHits / total;
        const gradT = Math.min(1, Math.max(0, (y - (cy - ry)) / (2 * ry)));
        const bodyR = gradT < 0.5
          ? BODY_TOP[0] + (BODY_MID[0] - BODY_TOP[0]) * (gradT * 2)
          : BODY_MID[0] + (BODY_BOT[0] - BODY_MID[0]) * ((gradT - 0.5) * 2);
        const bodyG = gradT < 0.5
          ? BODY_TOP[1] + (BODY_MID[1] - BODY_TOP[1]) * (gradT * 2)
          : BODY_MID[1] + (BODY_BOT[1] - BODY_MID[1]) * ((gradT - 0.5) * 2);
        const bodyB = gradT < 0.5
          ? BODY_TOP[2] + (BODY_MID[2] - BODY_TOP[2]) * (gradT * 2)
          : BODY_MID[2] + (BODY_BOT[2] - BODY_MID[2]) * ((gradT - 0.5) * 2);

        r = r * (1 - bodyAlpha) + bodyR * bodyAlpha;
        g = g * (1 - bodyAlpha) + bodyG * bodyAlpha;
        b = b * (1 - bodyAlpha) + bodyB * bodyAlpha;
      }

      // Blush
      if (blushHits > 0) {
        const blushAlpha = (blushHits / total) * 0.45;
        r = r * (1 - blushAlpha) + BLUSH[0] * blushAlpha;
        g = g * (1 - blushAlpha) + BLUSH[1] * blushAlpha;
        b = b * (1 - blushAlpha) + BLUSH[2] * blushAlpha;
      }

      // Smile
      if (smileHits > 0) {
        const smileAlpha = smileHits / total;
        r = r * (1 - smileAlpha) + RIM_DARK[0] * smileAlpha;
        g = g * (1 - smileAlpha) + RIM_DARK[1] * smileAlpha;
        b = b * (1 - smileAlpha) + RIM_DARK[2] * smileAlpha;
      }

      // Forehead Sparkle Star
      if (starHits > 0) {
        const starAlpha = starHits / total;
        r = r * (1 - starAlpha) + SPARKLE[0] * starAlpha;
        g = g * (1 - starAlpha) + SPARKLE[1] * starAlpha;
        b = b * (1 - starAlpha) + SPARKLE[2] * starAlpha;
      }

      // Eyes
      if (eyeHits > 0) {
        const eyeAlpha = eyeHits / total;
        r = r * (1 - eyeAlpha) + EYE_DARK[0] * eyeAlpha;
        g = g * (1 - eyeAlpha) + EYE_DARK[1] * eyeAlpha;
        b = b * (1 - eyeAlpha) + EYE_DARK[2] * eyeAlpha;
      }
      if (shine1Hits > 0 || shine2Hits > 0) {
        const shineAlpha = Math.max(shine1Hits, shine2Hits) / total;
        r = r * (1 - shineAlpha) + EYE_LIGHT[0] * shineAlpha;
        g = g * (1 - shineAlpha) + EYE_LIGHT[1] * shineAlpha;
        b = b * (1 - shineAlpha) + EYE_LIGHT[2] * shineAlpha;
      }

      const o = (y * size + x) * 4;
      px[o] = Math.round(r);
      px[o + 1] = Math.round(g);
      px[o + 2] = Math.round(b);
      px[o + 3] = Math.round(Math.min(1, a) * 255);
    }
  }
  return px;
}

// ── PNG ──
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePNG(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    Buffer.from(rgba.buffer, y * size * 4, size * 4).copy(raw, y * (size * 4 + 1) + 1);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function encodeICO(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);
  const dir = Buffer.alloc(16 * entries.length);
  let offset = header.length + dir.length;
  entries.forEach((e, i) => {
    const o = i * 16;
    dir[o] = e.size >= 256 ? 0 : e.size;
    dir[o + 1] = e.size >= 256 ? 0 : e.size;
    dir[o + 2] = 0;
    dir[o + 3] = 0;
    dir.writeUInt16LE(1, o + 4);
    dir.writeUInt16LE(32, o + 6);
    dir.writeUInt32LE(e.png.length, o + 8);
    dir.writeUInt32LE(offset, o + 12);
    offset += e.png.length;
  });
  return Buffer.concat([header, dir, ...entries.map((e) => e.png)]);
}

mkdirSync(OUT, { recursive: true });
console.log("Generating Powpow brand icons...");
const png = (size) => encodePNG(size, renderPowpow(size));

const files = {
  "32x32.png": png(32),
  "128x128.png": png(128),
  "128x128@2x.png": png(256),
  "icon.png": png(512),
};
for (const [name, data] of Object.entries(files)) {
  writeFileSync(join(OUT, name), data);
  console.log(`${name} — ${data.length} bytes`);
}

const ico = encodeICO([16, 24, 32, 48, 64, 128, 256].map((size) => ({ size, png: png(size) })));
writeFileSync(join(OUT, "icon.ico"), ico);
console.log(`icon.ico — ${ico.length} bytes`);
console.log("Done!");

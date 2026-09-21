// Rasterises the Symtora LogoMark (src/components/icons.tsx) into the app icon
// set. Pure pngjs + a small SDF renderer, so it needs no native image toolchain.
const fs = require('fs');
const path = require('path');
const { PNG } = require('../src/frontend/node_modules/pngjs');

const OUT = process.argv[2];

const NAVY = [0x14, 0x29, 0x39];
const MARK = [0xb9, 0xdc, 0xf7];
const WHITE = [0xff, 0xff, 0xff];

// The polyline from LogoMark, in its 64x64 viewBox.
const POINTS = [[9, 35], [21, 35], [27, 20], [35, 45], [40, 33], [55, 33]];
const STROKE = 4;
const VB = 64;

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

function segDist(px, py, ax, ay, bx, by) {
  const vx = bx - ax, vy = by - ay;
  const wx = px - ax, wy = py - ay;
  const len2 = vx * vx + vy * vy;
  const t = len2 === 0 ? 0 : clamp01((wx * vx + wy * vy) / len2);
  const dx = px - (ax + t * vx), dy = py - (ay + t * vy);
  return Math.hypot(dx, dy);
}

// Distance to the polyline; round caps and joins fall out of the capsule union.
function markDist(x, y) {
  let d = Infinity;
  for (let i = 0; i < POINTS.length - 1; i++) {
    const [ax, ay] = POINTS[i], [bx, by] = POINTS[i + 1];
    d = Math.min(d, segDist(x, y, ax, ay, bx, by));
  }
  return d - STROKE / 2;
}

// Signed distance to a rounded rect centred on the viewbox. r = 0 -> plain square.
function tileDist(x, y, r) {
  const h = VB / 2;
  const qx = Math.abs(x - h) - (h - r);
  const qy = Math.abs(y - h) - (h - r);
  const ox = Math.max(qx, 0), oy = Math.max(qy, 0);
  return Math.hypot(ox, oy) + Math.min(Math.max(qx, qy), 0) - r;
}

/**
 * @param size    output edge length in px
 * @param radius  tile corner radius in viewBox units (0 = square, null = no tile)
 * @param scale   how much of the canvas the mark spans (1 = full viewBox)
 * @param markRgb stroke colour
 * @param tileRgb tile colour, or null for a transparent background
 */
function render({ size, radius, scale = 1, markRgb = MARK, tileRgb = NAVY }) {
  const png = new PNG({ width: size, height: size });
  const SS = 4; // 4x4 supersampling per pixel
  const unit = VB / size; // viewBox units per output pixel
  // The mark is inset by `scale`; everything is measured in viewBox units so the
  // stroke width scales with it.
  const c = VB / 2;

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let tileCov = 0, markCov = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const x = (px + (sx + 0.5) / SS) * unit;
          const y = (py + (sy + 0.5) / SS) * unit;
          // Sample the mark in a viewbox shrunk by `scale` about the centre.
          const mx = c + (x - c) / scale;
          const my = c + (y - c) / scale;
          markCov += clamp01(0.5 - markDist(mx, my) / (unit / scale));
          if (tileRgb) tileCov += clamp01(0.5 - tileDist(x, y, radius) / unit);
        }
      }
      const n = SS * SS;
      tileCov /= n;
      markCov /= n;

      const i = (size * py + px) << 2;
      const alpha = tileRgb ? tileCov : markCov;
      if (alpha <= 0) {
        png.data[i] = png.data[i + 1] = png.data[i + 2] = png.data[i + 3] = 0;
        continue;
      }
      // Composite the mark over the tile, then the whole thing over transparency.
      const m = tileRgb ? markCov * tileCov : 1;
      for (let ch = 0; ch < 3; ch++) {
        const base = tileRgb ? tileRgb[ch] : markRgb[ch];
        png.data[i + ch] = Math.round(base * (1 - m) + markRgb[ch] * m);
      }
      png.data[i + 3] = Math.round(alpha * 255);
    }
  }
  return png;
}

function write(name, png) {
  const file = path.join(OUT, name);
  fs.writeFileSync(file, PNG.sync.write(png));
  console.log(name, fs.statSync(file).size + ' bytes');
}

// iOS/web square icon: full bleed at LogoMark's own proportions, since the
// platform applies its own corner mask.
write('icon.png', render({ size: 1024, radius: 0, scale: 1 }));
// Adaptive icon: a flat navy plate, with the mark alone in the foreground layer
// pulled inside Android's inner-66% safe zone.
write('android-icon-background.png', render({ size: 1024, radius: 0, scale: 1, markRgb: NAVY }));
write('android-icon-foreground.png', render({ size: 1024, scale: 0.8, tileRgb: null }));
write('android-icon-monochrome.png', render({ size: 1024, scale: 0.8, tileRgb: null, markRgb: WHITE }));
// Splash and favicon keep the rounded tile, since they sit on a light surface.
write('splash-icon.png', render({ size: 1024, radius: 16, scale: 1 }));
write('favicon.png', render({ size: 96, radius: 16, scale: 1 }));

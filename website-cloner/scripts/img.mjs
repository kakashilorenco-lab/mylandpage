// Tiny PNG helpers on top of pngjs (no native deps).
import fs from "node:fs";
import { PNG } from "pngjs";

export const readPng = (file) => PNG.sync.read(fs.readFileSync(file));
export const writePng = (file, png) => fs.writeFileSync(file, PNG.sync.write(png));

/** RGB24 buffer -> RGBA PNG object. */
export function fromRgb(rgb, w, h) {
  const png = new PNG({ width: w, height: h });
  for (let i = 0, j = 0; i < w * h; i++, j += 3) {
    png.data[i * 4] = rgb[j];
    png.data[i * 4 + 1] = rgb[j + 1];
    png.data[i * 4 + 2] = rgb[j + 2];
    png.data[i * 4 + 3] = 255;
  }
  return png;
}

export function blank(w, h, rgb = [255, 255, 255]) {
  const png = new PNG({ width: w, height: h });
  for (let i = 0; i < w * h; i++) {
    png.data[i * 4] = rgb[0];
    png.data[i * 4 + 1] = rgb[1];
    png.data[i * 4 + 2] = rgb[2];
    png.data[i * 4 + 3] = 255;
  }
  return png;
}

export function crop(src, x, y, w, h) {
  x = Math.max(0, Math.round(x));
  y = Math.max(0, Math.round(y));
  w = Math.min(src.width - x, Math.round(w));
  h = Math.min(src.height - y, Math.round(h));
  const out = new PNG({ width: w, height: h });
  PNG.bitblt(src, out, x, y, w, h, 0, 0);
  return out;
}

/** Area-average when shrinking, bilinear when enlarging. */
export function resize(src, w, h) {
  w = Math.max(1, Math.round(w));
  h = Math.max(1, Math.round(h));
  const out = new PNG({ width: w, height: h });
  const sx = src.width / w;
  const sy = src.height / h;
  const s = src.data;
  const d = out.data;
  if (sx >= 1 && sy >= 1) {
    for (let y = 0; y < h; y++) {
      const y0 = Math.floor(y * sy), y1 = Math.max(y0 + 1, Math.floor((y + 1) * sy));
      for (let x = 0; x < w; x++) {
        const x0 = Math.floor(x * sx), x1 = Math.max(x0 + 1, Math.floor((x + 1) * sx));
        let r = 0, g = 0, b = 0, n = 0;
        for (let yy = y0; yy < y1; yy++) {
          for (let xx = x0; xx < x1; xx++) {
            const i = (yy * src.width + xx) * 4;
            r += s[i];
            g += s[i + 1];
            b += s[i + 2];
            n++;
          }
        }
        const o = (y * w + x) * 4;
        d[o] = r / n;
        d[o + 1] = g / n;
        d[o + 2] = b / n;
        d[o + 3] = 255;
      }
    }
    return out;
  }
  for (let y = 0; y < h; y++) {
    const fy = Math.min(src.height - 1, Math.max(0, (y + 0.5) * sy - 0.5));
    const y0 = Math.floor(fy), y1 = Math.min(src.height - 1, y0 + 1), ty = fy - y0;
    for (let x = 0; x < w; x++) {
      const fx = Math.min(src.width - 1, Math.max(0, (x + 0.5) * sx - 0.5));
      const x0 = Math.floor(fx), x1 = Math.min(src.width - 1, x0 + 1), tx = fx - x0;
      const o = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) {
        const a = s[(y0 * src.width + x0) * 4 + c] * (1 - tx) + s[(y0 * src.width + x1) * 4 + c] * tx;
        const b = s[(y1 * src.width + x0) * 4 + c] * (1 - tx) + s[(y1 * src.width + x1) * 4 + c] * tx;
        d[o + c] = a * (1 - ty) + b * ty;
      }
      d[o + 3] = 255;
    }
  }
  return out;
}

export const resizeToWidth = (src, w) => resize(src, w, (src.height * w) / src.width);

/** Place images left-to-right, top-aligned. */
export function hstack(imgs, gap = 12, bg = [40, 40, 40]) {
  const w = imgs.reduce((a, i) => a + i.width, 0) + gap * (imgs.length - 1);
  const h = Math.max(...imgs.map((i) => i.height));
  const out = blank(w, h, bg);
  let x = 0;
  for (const i of imgs) {
    PNG.bitblt(i, out, 0, 0, i.width, i.height, x, 0);
    x += i.width + gap;
  }
  return out;
}

/** Thumbnail grid (contact sheet). */
export function grid(imgs, cols = 6, cellW = 200, gap = 8, bg = [30, 30, 30]) {
  const thumbs = imgs.map((i) => resizeToWidth(i, cellW));
  const rows = Math.ceil(thumbs.length / cols);
  const rowH = [];
  for (let r = 0; r < rows; r++) rowH.push(Math.max(...thumbs.slice(r * cols, r * cols + cols).map((t) => t.height)));
  const out = blank(cols * cellW + gap * (cols + 1), rowH.reduce((a, b) => a + b, 0) + gap * (rows + 1), bg);
  let y = gap;
  thumbs.forEach((t, i) => {
    const r = Math.floor(i / cols), c = i % cols;
    if (c === 0 && r > 0) y += rowH[r - 1] + gap;
    PNG.bitblt(t, out, 0, 0, t.width, t.height, gap + c * (cellW + gap), y);
  });
  return out;
}

function hline(png, y, rgb, thick = 1) {
  for (let t = 0; t < thick; t++) {
    const yy = Math.min(png.height - 1, y + t);
    for (let x = 0; x < png.width; x++) png.data.set([...rgb, 255], (yy * png.width + x) * 4);
  }
}
function vline(png, x, rgb, thick = 1) {
  for (let t = 0; t < thick; t++) {
    const xx = Math.min(png.width - 1, x + t);
    for (let y = 0; y < png.height; y++) png.data.set([...rgb, 255], (y * png.width + xx) * 4);
  }
}

/** Guide lines every 5% (thicker red every 10%) plus an optional green rectangle. */
export function drawGuides(png, rect) {
  const out = crop(png, 0, 0, png.width, png.height);
  for (let p = 5; p < 100; p += 5) {
    const major = p % 10 === 0;
    const col = major ? [255, 40, 40] : [255, 220, 0];
    hline(out, Math.round((png.height * p) / 100), col, major ? 2 : 1);
    vline(out, Math.round((png.width * p) / 100), col, major ? 2 : 1);
  }
  if (rect) {
    const g = [0, 255, 90];
    hline(out, rect.y, g, 4);
    hline(out, rect.y + rect.h - 4, g, 4);
    vline(out, rect.x, g, 4);
    vline(out, rect.x + rect.w - 4, g, 4);
  }
  return out;
}

export const hex = (r, g, b) => "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

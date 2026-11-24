#!/usr/bin/env node
// Watch a screen recording of a website (a file, or an Instagram / TikTok / YouTube / X
// link) end to end and turn it into build evidence:
//
//   - timeline: every scroll (direction, distance in CSS px, speed), pause, cut and animation
//   - stitched full-page reconstructions per scene (frames aligned by scroll offset,
//     sticky header/footer bands detected and kept separate)
//   - sections detected from background changes, with OCR text per section
//   - motion: reveal-on-scroll ranges, local animations (start/mid/end strips + mp4 clips),
//     floating fixed elements (chat buttons, sticky CTAs)
//   - full-resolution keyframes + a contact sheet of the whole video
//   - domain / @handle candidates (OCR of address bar + post caption) to find the live site
//   - palette sampled from the reconstruction
//
// Usage: npm run video -- <file-or-url> [--name slug] [--crop x,y,w,h | 10%,5%,80%,90%]
//        [--fps 8] [--css-width 390] [--width 1280] [--cookies-from-browser chrome] [--no-ocr]
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";
import { blank, crop as cropPng, drawGuides, fromRgb, grid, hex, hstack, resizeToWidth, writePng } from "./img.mjs";
import { ensureDir, parseArgs, shortHash, writeJson } from "./lib.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = parseArgs(process.argv.slice(2));
const input = args._[0];
if (!input) {
  console.error("Usage: npm run video -- <file-or-url> [--name slug] [--crop x,y,w,h|x%,y%,w%,h%] [--fps 8] [--css-width 390] [--no-ocr]");
  process.exit(1);
}
const isUrl = /^https?:\/\//i.test(input);
const name =
  args.name ||
  (isUrl
    ? (input.match(/\/(?:reel|reels|p|tv|video|shorts|status)\/([\w-]+)/)?.[1] ?? shortHash(input))
    : path.basename(input).replace(/\.[^.]+$/, "")).replace(/[^a-z0-9_-]+/gi, "-").toLowerCase();
const outDir = ensureDir(path.join(ROOT, "docs/research", name, "video"));
const dirs = {
  keyframes: ensureDir(path.join(outDir, "keyframes")),
  scenes: ensureDir(path.join(outDir, "scenes")),
  motion: ensureDir(path.join(outDir, "motion")),
};
const has = (bin) => spawnSync("which", [bin]).status === 0;
const log = (...a) => console.log(...a);

// ---------------------------------------------------------------- 1. get the video
let file = input;
let postInfo = null;
if (isUrl) {
  if (!has("yt-dlp")) throw new Error("yt-dlp not installed (pip install yt-dlp) — or download the video and pass the file path");
  log(`▶ downloading ${input}`);
  const r = spawnSync(
    "yt-dlp",
    [
      "-f", "bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/bv*+ba/b",
      "--merge-output-format", "mp4",
      "--write-info-json", "--no-playlist", "--no-progress",
      ...(args["cookies-from-browser"] ? ["--cookies-from-browser", args["cookies-from-browser"]] : []),
      ...(args.cookies ? ["--cookies", args.cookies] : []),
      "-o", path.join(outDir, "source.%(ext)s"),
      input,
    ],
    { stdio: "inherit" },
  );
  file = fs.readdirSync(outDir).filter((f) => f.startsWith("source.") && !f.endsWith(".json")).map((f) => path.join(outDir, f))[0];
  if (r.status !== 0 || !file) {
    console.error(
      "\n✖ Download failed. Instagram often needs a logged-in session: retry with --cookies-from-browser chrome (or firefox/safari),\n" +
        "  or save the video manually (screen-record or a downloader) and run: npm run video -- path/to/video.mp4",
    );
    process.exit(2);
  }
  const infoFile = fs.readdirSync(outDir).find((f) => f.endsWith(".info.json"));
  if (infoFile) {
    const j = JSON.parse(fs.readFileSync(path.join(outDir, infoFile), "utf8"));
    postInfo = { title: j.title, description: j.description, uploader: j.uploader, channel: j.channel, url: j.webpage_url };
  }
}
if (!fs.existsSync(file)) throw new Error(`file not found: ${file}`);

// ---------------------------------------------------------------- 2. probe + crop
function ffprobe() {
  const r = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration:stream=codec_type,avg_frame_rate", "-of", "json", file], { encoding: "utf8" });
  const j = JSON.parse(r.stdout || "{}");
  const v = j.streams?.find((s) => s.codec_type === "video");
  const [n, d] = (v?.avg_frame_rate || "30/1").split("/").map(Number);
  return { duration: Number(j.format?.duration || 0), fps: d ? n / d : 30, hasAudio: !!j.streams?.some((s) => s.codec_type === "audio") };
}
function grabFrame(t, vf) {
  const r = spawnSync("ffmpeg", ["-v", "error", "-ss", String(Math.max(0, t)), "-i", file, "-frames:v", "1", ...(vf ? ["-vf", vf] : []), "-f", "image2pipe", "-vcodec", "png", "-"], { maxBuffer: 1 << 29 });
  if (!r.stdout?.length) return null;
  return PNG.sync.read(r.stdout);
}
const even = (n) => Math.max(2, Math.round(n / 2) * 2);

const meta = ffprobe();
const full = grabFrame(Math.min(meta.duration / 2, 1)) || grabFrame(0);
if (!full) throw new Error("could not decode video");
const srcW = full.width, srcH = full.height;

function parseCrop(spec) {
  const parts = String(spec).split(/[,:]/).map((s) => s.trim());
  if (parts.length !== 4) throw new Error("--crop needs x,y,w,h (pixels or percentages)");
  const v = parts.map((p, i) => (p.endsWith("%") ? (parseFloat(p) / 100) * (i % 2 === 0 ? srcW : srcH) : parseFloat(p)));
  return { x: even(v[0]), y: even(v[1]), w: even(Math.min(v[2], srcW - v[0])), h: even(Math.min(v[3], srcH - v[1])) };
}
function autoCrop() {
  // 1) letterbox via cropdetect, 2) then trim any border that is flat AND never changes
  // (solid frames/backgrounds around the recording). Busy edits still need --crop.
  const r = spawnSync("ffmpeg", ["-v", "info", "-i", file, "-vf", "fps=2,cropdetect=limit=24:round=2:reset=0", "-f", "null", "-"], { encoding: "utf8", maxBuffer: 1 << 26 });
  const m = [...(r.stderr || "").matchAll(/crop=(\d+):(\d+):(\d+):(\d+)/g)].at(-1);
  let box = { x: 0, y: 0, w: srcW, h: srcH };
  if (m) {
    const [w, h, x, y] = m.slice(1).map(Number);
    if (w * h >= srcW * srcH * 0.3) box = { x, y, w, h };
  }
  const sw = 180, sh = Math.max(2, Math.round((box.h * sw) / box.w));
  const n = 24;
  const fr = Math.max(0.5, n / Math.max(1, meta.duration));
  const raw = spawnSync("ffmpeg", ["-v", "error", "-i", file, "-vf", `fps=${fr},crop=${box.w}:${box.h}:${box.x}:${box.y},scale=${sw}:${sh}:flags=area`, "-frames:v", String(n), "-f", "rawvideo", "-pix_fmt", "gray", "-"], { maxBuffer: 1 << 28 }).stdout;
  const count = Math.floor((raw?.length || 0) / (sw * sh));
  if (count >= 4) {
    const lo = new Uint8Array(sw * sh).fill(255), hi = new Uint8Array(sw * sh);
    for (let f = 0; f < count; f++) {
      for (let i = 0; i < sw * sh; i++) {
        const v = raw[f * sw * sh + i];
        if (v < lo[i]) lo[i] = v;
        if (v > hi[i]) hi[i] = v;
      }
    }
    // a dead line never changes over time and is a single flat color along its length
    const dead = (idx) => {
      let mn = 255, mx = 0;
      for (const i of idx) {
        if (hi[i] - lo[i] > 6) return false;
        mn = Math.min(mn, lo[i]);
        mx = Math.max(mx, lo[i]);
      }
      return mx - mn <= 10;
    };
    const deadCol = (x) => dead(Array.from({ length: sh }, (_, y) => y * sw + x));
    const deadRow = (y, a, b) => dead(Array.from({ length: b - a }, (_, j) => y * sw + a + j));
    let x0 = 0, x1 = sw;
    while (x0 < sw / 2 && deadCol(x0)) x0++;
    while (x1 > x0 + 4 && deadCol(x1 - 1)) x1--;
    let y0 = 0, y1 = sh;
    while (y0 < sh / 2 && deadRow(y0, x0, x1)) y0++;
    while (y1 > y0 + 4 && deadRow(y1 - 1, x0, x1)) y1--;
    const k = box.w / sw;
    if ((x1 - x0) * (y1 - y0) < sw * sh * 0.97 && (x1 - x0) * (y1 - y0) > sw * sh * 0.05) {
      box = { x: box.x + Math.ceil(x0 * k), y: box.y + Math.ceil(y0 * k), w: Math.floor((x1 - x0) * k), h: Math.floor((y1 - y0) * k) };
    }
  }
  return { x: even(box.x), y: even(box.y), w: even(Math.min(box.w, srcW - box.x) - 1), h: even(Math.min(box.h, srcH - box.y) - 1) };
}
const cropRect = args.crop ? parseCrop(args.crop) : autoCrop();
writePng(path.join(outDir, "crop-guide.png"), drawGuides(full, cropRect));

const portrait = cropRect.h > cropRect.w * 1.2;
const cssWidth = Number(args["css-width"] || (portrait ? 390 : 1440));
let fps = Number(args.fps || 8);
if (meta.duration * fps > 1800) fps = Math.max(2, Math.floor(1800 / meta.duration));
const aw = even(Math.min(cropRect.w, Number(args.width || 1280)));
const ah = even((cropRect.h * aw) / cropRect.w);
const toCss = cssWidth / aw; // analysis px -> CSS px
const vfCrop = `crop=${cropRect.w}:${cropRect.h}:${cropRect.x}:${cropRect.y}`;
const vf = `fps=${fps},${vfCrop},scale=${aw}:${ah}:flags=area`;
log(`▶ ${path.basename(file)}: ${srcW}×${srcH}, ${meta.duration.toFixed(1)}s · crop ${cropRect.w}×${cropRect.h}+${cropRect.x}+${cropRect.y} · analysing ${aw}×${ah} @ ${fps}fps · ${portrait ? "mobile" : "desktop"} (${cssWidth} CSS px wide)`);

// ---------------------------------------------------------------- 3. decode + features
async function* frames() {
  const p = spawn("ffmpeg", ["-v", "error", "-i", file, "-vf", vf, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]);
  const size = aw * ah * 3;
  let frame = Buffer.allocUnsafe(size), off = 0;
  for await (const chunk of p.stdout) {
    let i = 0;
    while (i < chunk.length) {
      const n = Math.min(size - off, chunk.length - i);
      chunk.copy(frame, off, i, i + n);
      off += n;
      i += n;
      if (off === size) {
        yield frame;
        frame = Buffer.allocUnsafe(size);
        off = 0;
      }
    }
  }
}

const K = 24; // horizontal blocks per row profile
const C = 16; // cell size for change maps
const gw = Math.ceil(aw / C), gh = Math.ceil(ah / C);
const hc = Math.floor(ah / 4);

function features(rgb) {
  const prof = new Float32Array(ah * K);
  const cells = new Float32Array(gw * gh);
  const cellN = new Float32Array(gw * gh);
  const bw = aw / K;
  const tex = new Float32Array(ah);
  let prevRow = new Uint8Array(aw), curRow = new Uint8Array(aw);
  for (let y = 0; y < ah; y++) {
    const cy = (y / C) | 0;
    let last = -1, e = 0;
    for (let x = 0; x < aw; x++) {
      const i = (y * aw + x) * 3;
      const g = (rgb[i] * 77 + rgb[i + 1] * 150 + rgb[i + 2] * 29) >> 8;
      if (last >= 0) {
        const dd = Math.abs(g - last);
        if (dd > 12) e += dd; // ignore compression noise
      }
      if (y) {
        const dv = Math.abs(g - prevRow[x]);
        if (dv > 12) e += dv; // horizontal edges: section boundaries, card borders
      }
      curRow[x] = g;
      last = g;
      prof[y * K + Math.min(K - 1, (x / bw) | 0)] += g;
      const c = cy * gw + ((x / C) | 0);
      cells[c] += g;
      cellN[c]++;
    }
    tex[y] = e / aw;
    [prevRow, curRow] = [curRow, prevRow];
  }
  for (let i = 0; i < prof.length; i++) prof[i] /= bw;
  for (let i = 0; i < cells.length; i++) cells[i] /= cellN[i] || 1;
  const coarse = new Float32Array(hc * K);
  for (let r = 0; r < hc; r++) for (let k = 0; k < K; k++) coarse[r * K + k] = (prof[(r * 4) * K + k] + prof[(r * 4 + 1) * K + k] + prof[(r * 4 + 2) * K + k] + prof[(r * 4 + 3) * K + k]) / 4;
  // rows with real detail (text, edges, images): flat background matches any offset
  const mask = new Uint8Array(ah);
  for (let y = 0; y < ah; y++) mask[y] = tex[y] > 1.5 ? 1 : 0;
  const cmask = new Uint8Array(hc);
  for (let r = 0; r < hc; r++) cmask[r] = mask[r * 4] | mask[r * 4 + 1] | mask[r * 4 + 2] | mask[r * 4 + 3];
  return { prof, coarse, cells, mask, cmask };
}



// cur[r] ≈ prev[r + dy]  (dy > 0: page scrolled down by dy)
// Trimmed mean of per-row differences: sticky headers, floating buttons and reveal
// animations do not follow the scroll, so the worst rows are ignored.
const rowBuf = new Float32Array(4096);
function mad(prev, cur, dy, top, bot, h, minOv, keep = 0.8, mask = null) {
  const r0 = Math.max(top, top - dy), r1 = Math.min(h - bot, h - bot - dy);
  if (r1 - r0 < minOv || r1 <= r0) return Infinity;
  const all = r1 - r0;
  const rows = all <= rowBuf.length ? rowBuf.subarray(0, all) : new Float32Array(all);
  let n = 0;
  for (let pass = 0; pass < 2 && n < 8; pass++) {
    n = 0;
    for (let r = r0; r < r1; r++) {
      if (pass === 0 && mask && !mask[r]) continue; // fall back to every row if too few are textured
      const a = r * K, b = (r + dy) * K;
      let s = 0;
      for (let k = 0; k < K; k++) s += Math.abs(cur[a + k] - prev[b + k]);
      rows[n++] = s / K;
    }
    if (!mask) break;
  }
  if (!n) return Infinity;
  if (keep >= 1) {
    let s = 0;
    for (let i = 0; i < n; i++) s += rows[i];
    return s / n;
  }
  const used = rows.subarray(0, n).sort();
  const m = Math.max(1, Math.floor(n * keep));
  let s = 0;
  for (let i = 0; i < m; i++) s += used[i];
  return s / m;
}

log("▶ pass 1: watching frames…");
const feats = [];
for await (const f of frames()) feats.push(features(f));
if (feats.length < 2) throw new Error("video too short");
const T = (i) => +(i / fps).toFixed(2);

function analysePair(a, b, top, bot, prevDy) {
  const contentH = ah - top - bot;
  const d0 = mad(a.prof, b.prof, 0, top, bot, ah, 1, 1);
  const t0 = mad(a.prof, b.prof, 0, top, bot, ah, 1, 0.8, b.mask);
  // coarse search with a small continuity prior, then refine at full resolution
  const ct = Math.ceil(top / 4), cb = Math.ceil(bot / 4), maxD = Math.floor((0.8 * contentH) / 4);
  let bc = 0, bm = Infinity;
  for (let d = -maxD; d <= maxD; d++) {
    const m = mad(a.coarse, b.coarse, d, ct, cb, hc, (0.25 * contentH) / 4, 0.8, b.cmask) + (0.6 * Math.abs(d * 4 - prevDy)) / ah;
    if (m < bm) {
      bm = m;
      bc = d;
    }
  }
  let dy = 0, best = t0;
  for (let d = bc * 4 - 6; d <= bc * 4 + 6; d++) {
    const m = mad(a.prof, b.prof, d, top, bot, ah, 0.25 * contentH, 0.8, b.mask);
    if (m < best) {
      best = m;
      dy = d;
    }
  }
  // change map at dy = 0
  let changed = 0, x0 = gw, y0 = gh, x1 = -1, y1 = -1;
  for (let cy = 0; cy < gh; cy++) {
    for (let cx = 0; cx < gw; cx++) {
      if (Math.abs(a.cells[cy * gw + cx] - b.cells[cy * gw + cx]) > 10) {
        changed++;
        x0 = Math.min(x0, cx);
        y0 = Math.min(y0, cy);
        x1 = Math.max(x1, cx);
        y1 = Math.max(y1, cy);
      }
    }
  }
  const frac = changed / (gw * gh);
  const bbox = x1 >= 0 ? { x: x0 * C, y: y0 * C, w: (x1 - x0 + 1) * C, h: (y1 - y0 + 1) * C } : null;
  // scrolling while something animates (reveals, carousels) matches less cleanly: accept a weaker fit
  const strong = best < 10 && best < t0 * 0.5;
  // a real scroll moves content across most of the screen; a carousel only changes a strip
  const spread = bbox ? bbox.h / (ah - top - bot) : 0;
  if (dy !== 0 && spread > 0.35 && (strong || (best < 16 && best < t0 * 0.75 && frac < 0.6))) {
    // rows that still differ after alignment = something animating while scrolling
    const r0 = Math.max(top, top - dy), r1 = Math.min(ah - bot, ah - bot - dy);
    const bad = [];
    for (let r = r0; r < r1; r++) {
      let s = 0;
      for (let k = 0; k < K; k++) s += Math.abs(b.prof[r * K + k] - a.prof[(r + dy) * K + k]);
      if (s / K > 8) bad.push(r);
    }
    const fixedTop = (() => { let n = 0; while (n < ah * 0.3 && rowDiff(a, b, n) < 1) n++; return n; })();
    const fixedBot = (() => { let n = 0; while (n < ah * 0.3 && rowDiff(a, b, ah - 1 - n) < 1) n++; return n; })();
    return { kind: "scroll", weak: !strong, dy, err: +best.toFixed(2), d0: +d0.toFixed(2), residualRows: runs(bad, 6), fixedTop, fixedBot };
  }
  if (process.env.VDEBUG) console.log("pair " + JSON.stringify({ d0: +d0.toFixed(2), t0: +t0.toFixed(2), dy, best: +best.toFixed(2), bc, frac: +frac.toFixed(3), top, bot }));
  if (d0 < 0.6 && frac < 0.002) return { kind: "still", dy: 0, d0: +d0.toFixed(2) };
  if (frac > 0.6 && best > 12) return { kind: "cut", dy: 0, d0: +d0.toFixed(2), frac: +frac.toFixed(3) };
  return { kind: "anim", dy: 0, d0: +d0.toFixed(2), frac: +frac.toFixed(3), bbox };
}
function rowDiff(a, b, r) {
  let s = 0;
  for (let k = 0; k < K; k++) s += Math.abs(a.prof[r * K + k] - b.prof[r * K + k]);
  return s / K;
}
function runs(rows, minLen) {
  const out = [];
  let s = null, p = null;
  for (const r of rows) {
    if (s === null) s = p = r;
    else if (r <= p + 3) p = r;
    else {
      if (p - s + 1 >= minLen) out.push([s, p]);
      s = p = r;
    }
  }
  if (s !== null && p - s + 1 >= minLen) out.push([s, p]);
  return out;
}

// Sticky header / footer (or browser chrome): rows at the top/bottom that stay identical
// in almost every pair where the rest of the screen changes. Independent of scrolling.
function estimateBands() {
  const busy = [];
  for (let i = 1; i < feats.length; i++) if (mad(feats[i - 1].prof, feats[i].prof, 0, 0, 0, ah, 1, 1) > 2) busy.push(i);
  if (busy.length < 4) return [0, 0];
  const stable = new Float32Array(ah);
  for (const i of busy) for (let r = 0; r < ah; r++) if (rowDiff(feats[i - 1], feats[i], r) < 2) stable[r]++;
  if (process.env.VDEBUG) console.log("bands busy=" + busy.length + " " + Array.from({ length: 43 }, (_, j) => Math.round((100 * stable[Math.min(ah - 1, j * 40)]) / busy.length)).join(","));
  const ok = (r) => stable[r] / busy.length > 0.8;
  let top = 0;
  while (top < ah * 0.25 && ok(top)) top++;
  let bot = 0;
  while (bot < ah * 0.25 && ok(ah - 1 - bot)) bot++;
  return [top < 6 ? 0 : even(top), bot < 6 ? 0 : even(bot)];
}
const [bandTop, bandBot] = estimateBands();
let pairs = [];
let prevDy = 0;
for (let i = 1; i < feats.length; i++) {
  const p = analysePair(feats[i - 1], feats[i], bandTop, bandBot, prevDy);
  prevDy = p.kind === "scroll" ? p.dy : 0;
  pairs.push(p);
}
// A weak scroll fit only counts next to a confident scroll in the same direction;
// on its own it is usually a carousel or slide animation.
pairs.forEach((p, i) => {
  if (p.kind !== "scroll" || !p.weak) return;
  const near = [pairs[i - 1], pairs[i + 1], pairs[i - 2], pairs[i + 2]].some((q) => q?.kind === "scroll" && !q.weak && Math.sign(q.dy) === Math.sign(p.dy));
  if (!near) pairs[i] = { kind: "anim", dy: 0, d0: p.d0, frac: 0.1, bbox: { x: 0, y: bandTop, w: aw, h: ah - bandTop - bandBot } };
});
const contentH = ah - bandTop - bandBot;

// ---------------------------------------------------------------- 4. scenes, timeline, motion
const scenes = [];
const frameScene = [], frameY = [];
let sc = { id: 1, start: 0, end: 0, y: [0] };
scenes.push(sc);
frameScene[0] = 0;
frameY[0] = 0;
for (let i = 1; i < feats.length; i++) {
  const p = pairs[i - 1];
  if (p.kind === "cut") {
    sc = { id: scenes.length + 1, start: i, end: i, y: [0] };
    scenes.push(sc);
    frameY[i] = 0;
  } else {
    frameY[i] = frameY[i - 1] + (p.kind === "scroll" ? p.dy : 0);
    sc.end = i;
  }
  frameScene[i] = scenes.length - 1;
}
for (const s of scenes) {
  const ys = frameY.slice(s.start, s.end + 1);
  s.minY = Math.min(...ys);
  s.maxY = Math.max(...ys);
  s.frames = s.end - s.start + 1;
  s.t0 = T(s.start);
  s.t1 = T(s.end + 1);
  s.stitchable = s.frames >= 3;
  s.docHeightCss = Math.round((s.maxY - s.minY + contentH + bandTop) * toCss);
}

// timeline: merge consecutive pairs by kind (scroll direction counts as a kind)
const kindOf = (p) => (p.kind === "scroll" ? (p.dy > 0 ? "scroll-down" : "scroll-up") : p.kind);
const timeline = [];
pairs.forEach((p, i) => {
  const k = kindOf(p);
  const last = timeline.at(-1);
  if (last && last.kind === k && k !== "cut") {
    last.i1 = i + 1;
    last.dy += p.dy;
  } else timeline.push({ kind: k, i0: i, i1: i + 1, dy: p.dy });
});
// absorb tiny stills (frame-rate jitter) inside same-direction scrolls
for (let j = timeline.length - 2; j > 0; j--) {
  const [a, b, c] = [timeline[j - 1], timeline[j], timeline[j + 1]];
  if (b.kind === "still" && b.i1 - b.i0 <= Math.ceil(fps * 0.25) && a.kind === c.kind && a.kind.startsWith("scroll")) {
    a.i1 = c.i1;
    a.dy += c.dy;
    timeline.splice(j, 2);
  }
}
for (const s of timeline) {
  s.t0 = T(s.i0);
  s.t1 = T(s.i1);
  s.dur = +(s.t1 - s.t0).toFixed(2);
  s.scene = frameScene[s.i0] + 1;
  if (s.kind.startsWith("scroll")) {
    s.distanceCss = Math.round(Math.abs(s.dy) * toCss);
    s.speedCssPerS = Math.round(s.distanceCss / Math.max(s.dur, 0.01));
    s.fromCss = Math.round((frameY[s.i0] - scenes[frameScene[s.i0]].minY) * toCss);
  }
}

// local animations (not explained by scrolling)
const motions = [];
pairs.forEach((p, i) => {
  if (p.kind !== "anim" || !p.bbox) return;
  const last = motions.at(-1);
  if (last && i - last.i1 <= 1 && frameScene[i] === frameScene[last.i0]) {
    last.i1 = i + 1;
    const b = last.bbox, n = p.bbox;
    const x0 = Math.min(b.x, n.x), y0 = Math.min(b.y, n.y);
    last.bbox = { x: x0, y: y0, w: Math.max(b.x + b.w, n.x + n.w) - x0, h: Math.max(b.y + b.h, n.y + n.h) - y0 };
    last.maxFrac = Math.max(last.maxFrac, p.frac);
  } else motions.push({ i0: i, i1: i + 1, bbox: { ...p.bbox }, maxFrac: p.frac });
});
for (const m of motions) {
  m.t0 = T(m.i0);
  m.t1 = T(m.i1);
  m.dur = +(m.t1 - m.t0).toFixed(2);
  m.scene = frameScene[m.i0] + 1;
  m.docYCss = Math.round((frameY[m.i0] - scenes[frameScene[m.i0]].minY + m.bbox.y) * toCss);
  m.areaPct = {
    x: +((100 * m.bbox.x) / aw).toFixed(1), y: +((100 * m.bbox.y) / ah).toFixed(1),
    w: +((100 * m.bbox.w) / aw).toFixed(1), h: +((100 * m.bbox.h) / ah).toFixed(1),
  };
  m.type = m.maxFrac > 0.35 ? "large transition (slide / fade / carousel / page transition)" : m.dur >= 0.75 * meta.duration ? "continuous (counter, ticker, video, loop)" : "local animation (hover, counter, carousel, typing, toggle)";
}

// reveal-on-scroll: rows that changed while scrolling, mapped to document Y
const reveals = [];
const fixedHits = new Map();
pairs.forEach((p, i) => {
  if (p.kind !== "scroll") return;
  for (const [r0, r1] of p.residualRows) {
    for (let r = r0; r <= r1; r += 8) fixedHits.set(r >> 3, (fixedHits.get(r >> 3) || 0) + 1);
    const s = scenes[frameScene[i + 1]];
    reveals.push({ scene: s.id, y0: frameY[i + 1] - s.minY + r0 - bandTop, y1: frameY[i + 1] - s.minY + r1 - bandTop, t: T(i + 1), frameY0: r0, frameY1: r1 });
  }
});
// rows that keep differing at the SAME screen position across most scrolls = floating fixed element
const nScroll = pairs.filter((p) => p.kind === "scroll").length;
const floatingRows = [...fixedHits.entries()].filter(([, n]) => nScroll > 4 && n > nScroll * 0.5).map(([r]) => r * 8).sort((a, b) => a - b);
const floating = runs(floatingRows, 8).map(([a, b]) => ({ frameYcss: Math.round(a * toCss), heightCss: Math.round((b - a + 8) * toCss), framePct: +((100 * a) / ah).toFixed(1) }));
const floatSet = new Set(floatingRows.map((r) => r >> 3));
const revealRanges = [];
for (const r of reveals.filter((r) => !floatSet.has(r.frameY0 >> 3)).sort((a, b) => a.scene - b.scene || a.y0 - b.y0)) {
  const last = revealRanges.at(-1);
  if (last && last.scene === r.scene && r.y0 <= last.y1 + 24) {
    last.y1 = Math.max(last.y1, r.y1);
    last.tEnd = r.t;
  } else revealRanges.push({ scene: r.scene, y0: r.y0, y1: r.y1, t: r.t, tEnd: r.t });
}
revealRanges.forEach((r) => {
  r.y0Css = Math.round(Math.max(0, r.y0) * toCss);
  r.y1Css = Math.round(r.y1 * toCss);
});

// ---------------------------------------------------------------- 5. pass 2: stitch each scene
log("▶ pass 2: stitching full pages…");
const MAXH = 60000;
const canvases = scenes.map((s) => {
  if (!s.stitchable) return null;
  const h = Math.min(MAXH, s.maxY - s.minY + contentH);
  return { h, rgb: Buffer.alloc(aw * h * 3, 255), score: new Float32Array(h).fill(Infinity), header: null, footer: null };
});
{
  let i = 0;
  const mid = bandTop + contentH / 2;
  for await (const f of frames()) {
    if (i >= feats.length) break;
    const s = scenes[frameScene[i]];
    const cv = canvases[frameScene[i]];
    if (cv) {
      const big = pairs[i - 1]?.kind === "anim" && pairs[i - 1].frac > 0.35; // skip mid-transition frames
      if (!big) {
        const off = frameY[i] - s.minY;
        for (let r = bandTop; r < ah - bandBot; r++) {
          const dr = off + r - bandTop;
          if (dr < 0 || dr >= cv.h) continue;
          const score = Math.abs(r - mid);
          if (score < cv.score[dr]) {
            cv.score[dr] = score;
            f.copy(cv.rgb, dr * aw * 3, r * aw * 3, (r + 1) * aw * 3);
          }
        }
      }
      if (i === Math.floor((s.start + s.end) / 2)) {
        if (bandTop) cv.header = fromRgb(f.subarray(0, bandTop * aw * 3), aw, bandTop);
        if (bandBot) cv.footer = fromRgb(f.subarray((ah - bandBot) * aw * 3), aw, bandBot);
      }
    }
    i++;
  }
}

// sections from background changes + palette
function analyseStitch(png) {
  const w = png.width, h = png.height, d = png.data;
  const edge = Math.max(2, Math.round(w * 0.03));
  const rowBg = [];
  for (let y = 0; y < h; y++) {
    let r = 0, g = 0, b = 0, n = 0;
    for (const x0 of [0, w - edge]) {
      for (let x = x0; x < x0 + edge; x++) {
        const i = (y * w + x) * 4;
        r += d[i];
        g += d[i + 1];
        b += d[i + 2];
        n++;
      }
    }
    rowBg.push([r / n, g / n, b / n]);
  }
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  const secs = [];
  let cur = { y0: 0, bg: rowBg[0] }, streak = 0;
  for (let y = 1; y < h; y++) {
    if (dist(rowBg[y], cur.bg) > 20) {
      if (++streak >= 6) {
        cur.y1 = y - streak;
        secs.push(cur);
        cur = { y0: y - streak + 1, bg: rowBg[y] };
        streak = 0;
      }
    } else streak = 0;
  }
  cur.y1 = h - 1;
  secs.push(cur);
  const minH = 24 / toCss;
  const merged = [];
  for (const s of secs) {
    if (merged.length && s.y1 - s.y0 < minH) merged.at(-1).y1 = s.y1;
    else merged.push(s);
  }
  // palette
  const bins = new Map();
  for (let i = 0; i < w * h; i += 3) {
    const o = i * 4;
    const key = ((d[o] >> 3) << 10) | ((d[o + 1] >> 3) << 5) | (d[o + 2] >> 3);
    bins.set(key, (bins.get(key) || 0) + 1);
  }
  const total = (w * h) / 3;
  const pal = [];
  for (const [key, n] of [...bins.entries()].sort((a, b) => b[1] - a[1]).slice(0, 60)) {
    const c = [((key >> 10) & 31) * 8 + 4, ((key >> 5) & 31) * 8 + 4, (key & 31) * 8 + 4];
    const near = pal.find((p) => dist(p.c, c) < 28);
    if (near) near.n += n;
    else pal.push({ c, n });
  }
  return {
    sections: merged.map((s, i) => ({ index: i + 1, y0: s.y0, y1: s.y1, y0Css: Math.round(s.y0 * toCss), heightCss: Math.round((s.y1 - s.y0 + 1) * toCss), bg: hex(...s.bg) })),
    palette: pal.sort((a, b) => b.n - a.n).slice(0, 12).map((p) => ({ color: hex(...p.c), pct: +((100 * p.n) / total).toFixed(1) })),
  };
}

// ---------------------------------------------------------------- 6. OCR
const ocrOn = !args["no-ocr"] && has("tesseract");
const langs = ocrOn ? spawnSync("tesseract", ["--list-langs"], { encoding: "utf8" }).stdout : "";
const ocrLang = ["por", "eng"].filter((l) => new RegExp(`^${l}$`, "m").test(langs)).join("+") || "eng";
const tmpDir = ensureDir(path.join(outDir, ".tmp"));
function ocr(png, yOffset = 0) {
  if (!ocrOn) return [];
  const lines = [];
  const step = 1600;
  for (let y = 0; y < png.height; y += step) {
    const part = cropPng(png, 0, y, png.width, Math.min(step, png.height - y));
    const scale = Math.min(4, Math.max(1, Math.ceil(1100 / part.width)));
    const up = scale > 1 ? resizeToWidth(part, part.width * scale) : part;
    const k = up.width / part.width;
    const f = path.join(tmpDir, "ocr.png");
    writePng(f, up);
    const r = spawnSync("tesseract", [f, "stdout", "-l", ocrLang, "--psm", "4", "tsv"], { encoding: "utf8", maxBuffer: 1 << 26 });
    const byLine = new Map();
    for (const row of (r.stdout || "").split("\n").slice(1)) {
      const c = row.split("\t");
      if (c.length < 12 || c[0] !== "5" || Number(c[10]) < 55 || !c[11].trim()) continue;
      const key = `${c[2]}-${c[3]}-${c[4]}`;
      const top = Number(c[7]) / k, height = Number(c[9]) / k;
      const e = byLine.get(key) || { words: [], top, height: 0 };
      e.words.push(c[11]);
      e.top = Math.min(e.top, top);
      e.height = Math.max(e.height, height);
      byLine.set(key, e);
    }
    for (const e of byLine.values()) lines.push({ y: Math.round(yOffset + y + e.top), hCss: Math.round(e.height * toCss), text: e.words.join(" ") });
  }
  return lines.sort((a, b) => a.y - b.y);
}

const domainRe = /\b((?:[a-z0-9-]+\.)+(?:com\.br|net\.br|org\.br|com|net|org|io|co|app|site|online|store|shop|dev|ai|br|me|xyz|page|link|digital|club|pro|tech|studio|design))\b/gi;
const handleRe = /(^|\s)@([a-z0-9._]{3,30})/gi;
const candidates = new Map();
const addCands = (text, from) => {
  for (const m of text.matchAll(domainRe)) {
    const dmn = m[1].toLowerCase().replace(/^www\./, "");
    if (/instagram\.com|tiktok\.com|youtube\.com|facebook\.com/.test(dmn)) continue;
    if (/^(com|net|org|co)\.[a-z]{2}$/.test(dmn) || dmn.split(".")[0].length < 3) continue; // bare TLD / OCR fragment
    candidates.set(dmn, [...new Set([...(candidates.get(dmn) || []), from])]);
  }
  for (const m of text.matchAll(handleRe)) candidates.set("@" + m[2].toLowerCase(), [...new Set([...(candidates.get("@" + m[2].toLowerCase()) || []), from])]);
};
if (postInfo) addCands(`${postInfo.title || ""}\n${postInfo.description || ""}`, "post caption");

// ---------------------------------------------------------------- 7. write scenes
log("▶ writing scenes, OCR, keyframes…");
const sceneOut = [];
scenes.forEach((s, si) => {
  const cv = canvases[si];
  const rec = { id: s.id, t0: s.t0, t1: s.t1, frames: s.frames };
  if (cv) {
    const content = fromRgb(cv.rgb, aw, cv.h);
    const base = `scene-${String(s.id).padStart(2, "0")}`;
    const page = cv.header ? (() => {
      const p = blank(aw, cv.header.height + content.height);
      PNG.bitblt(cv.header, p, 0, 0, aw, cv.header.height, 0, 0);
      PNG.bitblt(content, p, 0, 0, aw, content.height, 0, cv.header.height);
      return p;
    })() : content;
    writePng(path.join(dirs.scenes, `${base}-page.png`), page);
    if (cv.header) writePng(path.join(dirs.scenes, `${base}-top-band.png`), cv.header);
    if (cv.footer) writePng(path.join(dirs.scenes, `${base}-bottom-band.png`), cv.footer);
    const css = resizeToWidth(page, cssWidth);
    writePng(path.join(dirs.scenes, `${base}-page@1x.png`), css);
    const { sections, palette } = analyseStitch(page);
    const lines = ocr(page);
    lines.forEach((l) => addCands(l.text, `scene ${s.id} page`));
    if (cv.header) ocr(cv.header).forEach((l) => addCands(l.text, `scene ${s.id} top band (address bar?)`));
    if (cv.footer) ocr(cv.footer).forEach((l) => addCands(l.text, `scene ${s.id} bottom band (address bar?)`));
    for (const sec of sections) sec.text = lines.filter((l) => l.y >= sec.y0 && l.y <= sec.y1).map((l) => l.text);
    Object.assign(rec, {
      page: `scenes/${base}-page.png`,
      pageAtCssWidth: `scenes/${base}-page@1x.png`,
      topBand: cv.header ? `scenes/${base}-top-band.png` : null,
      bottomBand: cv.footer ? `scenes/${base}-bottom-band.png` : null,
      heightCss: Math.round(page.height * toCss),
      sections,
      palette,
      ocr: lines.map((l) => ({ yCss: Math.round(l.y * toCss), textHeightCss: l.hCss, text: l.text })),
    });
  }
  sceneOut.push(rec);
});
// OCR of an uncropped frame: catches address bars / captions outside the crop
ocr(full).forEach((l) => addCands(l.text, "full frame"));

// ---------------------------------------------------------------- 8. keyframes, contact sheet, motion strips
const kfTimes = new Map();
const addKf = (t, why) => {
  t = Math.max(0, Math.min(meta.duration - 0.05, t));
  const near = [...kfTimes.keys()].find((k) => Math.abs(k - t) < 0.15);
  if (near !== undefined) kfTimes.get(near).push(why);
  else kfTimes.set(+t.toFixed(2), [why]);
};
for (const s of scenes) {
  addKf(s.t0 + 0.05, `scene ${s.id} start`);
  let lastY = -Infinity;
  for (let i = s.start; i <= s.end; i++) {
    if (Math.abs(frameY[i] - lastY) >= contentH * 0.8) {
      addKf(T(i), `scene ${s.id} scroll ${Math.round((frameY[i] - s.minY) * toCss)}px`);
      lastY = frameY[i];
    }
  }
}
timeline.filter((t) => t.kind === "still" && t.dur >= 0.5).forEach((t) => addKf((t.t0 + t.t1) / 2, `pause ${t.dur}s`));
const topMotions = [...motions].sort((a, b) => b.dur * b.maxFrac - a.dur * a.maxFrac).slice(0, 15);
topMotions.forEach((m, k) => {
  m.id = k + 1;
  addKf(m.t0, `motion ${m.id} start`);
  addKf((m.t0 + m.t1) / 2, `motion ${m.id} mid`);
  addKf(m.t1, `motion ${m.id} end`);
});
const keyframes = [];
const sortedKf = [...kfTimes.entries()].sort((a, b) => a[0] - b[0]).slice(0, 90);
for (const [t, why] of sortedKf) {
  const png = grabFrame(t, vfCrop);
  if (!png) continue;
  const f = `kf-${String(keyframes.length + 1).padStart(3, "0")}-${t.toFixed(2)}s.png`;
  writePng(path.join(dirs.keyframes, f), png);
  keyframes.push({ file: `keyframes/${f}`, t, why, png });
}
if (keyframes.length) writePng(path.join(outDir, "contact-sheet.png"), grid(keyframes.map((k) => k.png), portrait ? 8 : 4, portrait ? 180 : 360));
for (const m of topMotions) {
  const pick = (w) => keyframes.find((k) => k.why.includes(`motion ${m.id} ${w}`))?.png;
  const imgs = ["start", "mid", "end"].map(pick).filter(Boolean).map((p) => resizeToWidth(p, Math.min(480, p.width)));
  if (imgs.length) {
    m.strip = `motion/motion-${String(m.id).padStart(2, "0")}-strip.png`;
    writePng(path.join(outDir, m.strip), hstack(imgs));
  }
  if (m.dur >= 0.2) {
    m.clip = `motion/motion-${String(m.id).padStart(2, "0")}.mp4`;
    spawnSync("ffmpeg", ["-v", "error", "-y", "-ss", String(Math.max(0, m.t0 - 0.4)), "-t", String(m.dur + 0.8), "-i", file, "-vf", vfCrop + ",scale=trunc(iw/2)*2:trunc(ih/2)*2", "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "24", path.join(outDir, m.clip)]);
  }
}
keyframes.forEach((k) => delete k.png);
fs.rmSync(tmpDir, { recursive: true, force: true });

// ---------------------------------------------------------------- 9. report
const omit = (o, ...keys) => Object.fromEntries(Object.entries(o).filter(([k]) => !keys.includes(k)));
const brief = {
  source: input,
  file: path.relative(ROOT, file),
  post: postInfo,
  video: { width: srcW, height: srcH, duration: +meta.duration.toFixed(2), fps: +meta.fps.toFixed(2), hasAudio: meta.hasAudio },
  crop: cropRect,
  analysis: { width: aw, height: ah, fps, device: portrait ? "mobile" : "desktop", cssWidth, cssPerPx: +toCss.toFixed(4) },
  stickyBands: { topCss: Math.round(bandTop * toCss), bottomCss: Math.round(bandBot * toCss) },
  floatingElements: floating,
  timeline: timeline.map((t) => omit(t, "i0", "i1", "dy")),
  scenes: sceneOut,
  motions: topMotions.map((m) => omit(m, "i0", "i1")),
  revealOnScroll: revealRanges.map((r) => omit(r, "y0", "y1")),
  candidates: [...candidates.entries()].map(([value, from]) => ({ value, from })),
  keyframes,
  ocr: ocrOn ? ocrLang : "off (install tesseract-ocr for text extraction)",
};
writeJson(path.join(outDir, "video-brief.json"), brief);

const L = [];
L.push(`# Video brief — ${name}`, "");
L.push(`- Source: ${input}${postInfo?.uploader ? ` (by ${postInfo.uploader})` : ""}`);
L.push(`- Video: ${srcW}×${srcH}, ${brief.video.duration}s · crop ${cropRect.w}×${cropRect.h} at (${cropRect.x},${cropRect.y}) — check \`crop-guide.png\` (green box = analysed area)`);
L.push(`- Treated as **${brief.analysis.device}**, ${cssWidth} CSS px wide → 1 analysis px = ${brief.analysis.cssPerPx} CSS px. Override with --css-width if the device differs.`);
L.push(`- Sticky bands: top ${brief.stickyBands.topCss}px, bottom ${brief.stickyBands.bottomCss}px (CSS) — fixed header/nav, or browser/app chrome: look at the band images.`);
if (floating.length) L.push(`- Floating fixed elements at screen y≈ ${floating.map((f) => `${f.frameYcss}px (${f.framePct}%, ~${f.heightCss}px tall)`).join(", ")}`);
L.push("", "## Find the live site first", "");
if (brief.candidates.length) brief.candidates.forEach((c) => L.push(`- \`${c.value}\` — ${c.from.join(", ")}`));
else L.push("- No domain or @handle found. Look at the contact sheet for a logo / brand name and search for it.");
if (postInfo?.description) L.push("", "Post caption:", "", "> " + postInfo.description.replace(/\n+/g, "\n> ").slice(0, 1200));
L.push("", "## Timeline", "", "| Time | Event | Detail |", "|---|---|---|");
for (const t of brief.timeline) {
  const detail = t.kind.startsWith("scroll") ? `${t.distanceCss}px from y=${t.fromCss} at ~${t.speedCssPerS}px/s` : t.kind === "cut" ? `→ scene ${t.scene + 1}` : "";
  L.push(`| ${t.t0}–${t.t1}s | ${t.kind} | ${detail}${t.scene ? ` (scene ${t.scene})` : ""} |`);
}
L.push("", "## Scenes (one per page / view)", "");
for (const s of sceneOut) {
  L.push(`### Scene ${s.id} — ${s.t0}s to ${s.t1}s`, "");
  if (!s.page) {
    L.push("Too short to reconstruct (transition).", "");
    continue;
  }
  L.push(`- Reconstructed page: \`${s.page}\` (analysis px) · \`${s.pageAtCssWidth}\` (1 px = 1 CSS px, use for compare) · height ≈ ${s.heightCss} CSS px`);
  if (s.topBand) L.push(`- Top band: \`${s.topBand}\``);
  if (s.bottomBand) L.push(`- Bottom band: \`${s.bottomBand}\``);
  L.push(`- Palette (video-compressed, verify by eye): ${s.palette.map((p) => `\`${p.color}\` ${p.pct}%`).join(" · ")}`, "");
  L.push("| # | y (CSS) | Height | Background | Text (OCR) |", "|---|---|---|---|---|");
  for (const sec of s.sections) L.push(`| ${sec.index} | ${sec.y0Css} | ${sec.heightCss} | \`${sec.bg}\` | ${(sec.text || []).join(" / ").replace(/\|/g, "/").slice(0, 300)} |`);
  L.push("");
}
L.push("## Motion", "");
if (brief.revealOnScroll.length) {
  L.push("Reveal-on-scroll candidates (content that changed while scrolling into view):", "");
  brief.revealOnScroll.slice(0, 40).forEach((r) => L.push(`- scene ${r.scene}: y ${r.y0Css}–${r.y1Css} CSS px, at ${r.t}s`));
  L.push("");
}
if (brief.motions.length) {
  L.push("Animations without scrolling (strongest first):", "");
  for (const m of brief.motions) L.push(`- **motion ${m.id}** ${m.t0}–${m.t1}s (${m.dur}s), scene ${m.scene}, screen area x${m.areaPct.x}% y${m.areaPct.y}% w${m.areaPct.w}% h${m.areaPct.h}% (doc y≈${m.docYCss}px) — ${m.type}${m.strip ? ` · strip \`${m.strip}\`` : ""}${m.clip ? ` · clip \`${m.clip}\`` : ""}`);
} else L.push("No animations detected apart from scrolling.");
L.push("", "## Keyframes", "", `Contact sheet of the whole video: \`contact-sheet.png\`. Full-resolution frames in \`keyframes/\`:`, "");
keyframes.forEach((k) => L.push(`- \`${k.file}\` — ${k.why.join(", ")}`));
L.push("", "## Limits", "", "- Colors and fine detail are video-compressed: confirm against frames, never trust a single pixel.", "- Fonts must be identified visually (or from the live site). Disclose substitutes.", "- Anything not shown in the video (other pages, hover states, mobile/desktop counterpart) is unknown.");
fs.writeFileSync(path.join(outDir, "video-brief.md"), L.join("\n") + "\n");

const rel = path.relative(ROOT, outDir);
log(`\n✔ Brief:         ${rel}/video-brief.md (+ .json)`);
log(`✔ Contact sheet: ${rel}/contact-sheet.png (${keyframes.length} keyframes)`);
log(`✔ Scenes:        ${sceneOut.filter((s) => s.page).length} reconstructed page(s) in ${rel}/scenes/`);
log(`✔ Timeline:      ${timeline.length} events · ${topMotions.length} animations · ${revealRanges.length} reveal ranges`);
if (brief.candidates.length) log(`✔ Site leads:    ${brief.candidates.map((c) => c.value).slice(0, 6).join(", ")}`);
if (!ocrOn) log("⚠ OCR off — install tesseract-ocr (+ tesseract-ocr-por) to extract text");

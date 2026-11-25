#!/usr/bin/env node
// Turn AI-generated camera clips (Google Flow / Veo, Higgsfield, Kling, Runway…) into a
// scroll-scrubbed "3D" sequence: one continuous shot that plays forward and backward with
// the page scroll. Frames are exported as an image sequence (smooth both ways on every
// browser, unlike seeking a <video>), plus a poster and a manifest the player reads.
//
//   npm run scroll-video -- check <clip1> <clip2> …          durations + continuity between clips
//   npm run scroll-video -- frame <clip> --at last --out f.png   first/last/any frame, to chain the next generation
//   npm run scroll-video -- build <clip1> <clip2> … --name slug [--frames 240] [--width 1600]
//        [--quality 72] [--xfade 0.3] [--mobile m1.mp4,m2.mp4] [--mobile-width 900] [--trim 0.2]
//   npm run scroll-video -- import <frames-dir> --name slug [--mobile <frames-dir>]
//        re-pack a frame sequence downloaded from a cloned site (keeps every frame, in order)
//   npm run scroll-video -- shots <clip-or-frames-dir> --name slug
//        split the original take into camera shots (start/mid/end frames + sheet) to write
//        AI-video prompts that remake it with a different building/house
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ensureDir, parseArgs, writeJson } from "./lib.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = parseArgs(process.argv.slice(2));
const [cmd, ...rest] = args._;

const die = (msg) => {
  console.error("✖ " + msg);
  process.exit(1);
};
const run = (bin, a, opts = {}) => {
  const r = spawnSync(bin, a, { maxBuffer: 1 << 28, ...opts });
  if (r.status !== 0) die(`${bin} failed: ${(r.stderr || "").toString().slice(-600)}`);
  return r;
};

function probe(file) {
  if (!fs.existsSync(file)) die(`not found: ${file}`);
  const r = run("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,avg_frame_rate:format=duration", "-of", "json", file], { encoding: "utf8" });
  const j = JSON.parse(r.stdout);
  const s = j.streams[0];
  const [n, d] = s.avg_frame_rate.split("/").map(Number);
  return { file, width: s.width, height: s.height, fps: d ? n / d : 30, duration: Number(j.format.duration) };
}

const IMG_RE = /\.(webp|jpe?g|png|avif)$/i;
const natural = (a, b) => a.localeCompare(b, undefined, { numeric: true });
const isDir = (p) => fs.existsSync(p) && fs.statSync(p).isDirectory();

/** A folder of numbered frames -> a 30fps mp4, so every command treats sources alike. */
function framesToClip(dir, out) {
  const files = fs.readdirSync(dir).filter((f) => IMG_RE.test(f)).sort(natural);
  if (files.length < 2) die(`no frames in ${dir}`);
  const list = out + ".txt";
  fs.writeFileSync(list, files.map((f) => `file '${path.resolve(dir, f)}'\nduration 0.0333333`).join("\n") + `\nfile '${path.resolve(dir, files.at(-1))}'`);
  run("ffmpeg", ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", list, "-vf", "fps=30,scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p", "-c:v", "libx264", "-crf", "12", "-preset", "fast", out]);
  fs.rmSync(list, { force: true });
  return { out, count: files.length };
}

/** Small grayscale thumbnail of a frame (first, last or at seconds) for comparisons. */
function thumb(file, at) {
  const seek = at === "last" ? ["-sseof", "-0.08"] : ["-ss", String(at === "first" ? 0 : at)];
  const r = run("ffmpeg", ["-v", "error", ...seek, "-i", file, "-frames:v", "1", "-vf", "scale=96:54,format=gray", "-f", "rawvideo", "-"]);
  return r.stdout;
}
const diff = (a, b) => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]);
  return s / a.length;
};

// ---------------------------------------------------------------- check
if (cmd === "check") {
  if (!rest.length) die("usage: check <clip1> <clip2> …");
  const clips = rest.map(probe);
  let total = 0;
  clips.forEach((c, i) => {
    total += c.duration;
    console.log(`${i + 1}. ${path.basename(c.file)} — ${c.width}×${c.height} · ${c.duration.toFixed(2)}s · ${c.fps.toFixed(1)}fps`);
    if (i > 0) {
      const d = diff(thumb(clips[i - 1].file, "last"), thumb(c.file, "first"));
      const verdict = d < 8 ? "✔ seamless" : d < 20 ? "~ small jump (use --xfade 0.3)" : "✖ hard cut: regenerate this clip with the previous clip's LAST frame as its START frame";
      console.log(`   ↳ join ${i}→${i + 1}: difference ${d.toFixed(1)} — ${verdict}`);
    }
  });
  const sizes = new Set(clips.map((c) => `${c.width}×${c.height}`));
  if (sizes.size > 1) console.log(`⚠ mixed sizes (${[...sizes].join(", ")}): build scales them all to the same width`);
  console.log(`Total ${total.toFixed(2)}s`);
  process.exit(0);
}

// ---------------------------------------------------------------- frame
if (cmd === "frame") {
  const file = rest[0];
  if (!file) die("usage: frame <clip> --at first|last|<seconds> --out frame.png");
  const at = args.at || "last";
  const out = args.out || file.replace(/\.[^.]+$/, `-${at}.png`);
  const seek = at === "last" ? ["-sseof", "-0.08"] : ["-ss", String(at === "first" ? 0 : at)];
  run("ffmpeg", ["-v", "error", "-y", ...seek, "-i", file, "-frames:v", "1", out]);
  console.log(`✔ ${out} — use it as the START frame of the next generation`);
  process.exit(0);
}

// ---------------------------------------------------------------- shots
if (cmd === "shots") {
  const src = rest[0];
  if (!src) die("usage: shots <clip-or-frames-dir> --name slug");
  const name = (args.name || path.basename(src).replace(/\.[^.]+$/, "")).replace(/[^a-z0-9_-]+/gi, "-").toLowerCase();
  const dir = ensureDir(path.join(ROOT, "docs/scroll", name, "shots"));
  const clip = isDir(src) ? framesToClip(src, path.join(dir, ".source.mp4")).out : src;
  const info = probe(clip);
  // sample 6 fps, find cuts and big direction changes via frame differences
  const W = 96, H = Math.round((info.height * W) / info.width);
  const raw = run("ffmpeg", ["-v", "error", "-i", clip, "-vf", `fps=6,scale=${W}:${H},format=gray`, "-f", "rawvideo", "-"]).stdout;
  const n = Math.floor(raw.length / (W * H));
  const fr = (i) => raw.subarray(i * W * H, (i + 1) * W * H);
  const d = [];
  for (let i = 1; i < n; i++) d.push(diff(fr(i - 1), fr(i)));
  const sorted = [...d].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] || 1;
  const cuts = [0];
  d.forEach((v, i) => {
    if (v > Math.max(18, median * 4) && (i + 1) / 6 - cuts.at(-1) / 6 > 0.6) cuts.push(i + 1);
  });
  // long shots are split every ~4s so each AI generation stays within a clip's length
  const bounds = [];
  cuts.forEach((c, k) => {
    const end = k + 1 < cuts.length ? cuts[k + 1] : n;
    for (let s0 = c; s0 < end; s0 += 24) bounds.push([s0 / 6, Math.min(end, s0 + 24) / 6, s0 === c && k > 0]);
  });
  const shots = bounds.map(([t0, t1, cut], i) => {
    const id = String(i + 1).padStart(2, "0");
    const pics = ["start", "mid", "end"].map((w) => {
      const t = w === "start" ? t0 + 0.02 : w === "mid" ? (t0 + t1) / 2 : Math.max(t0, t1 - 0.1);
      const f = path.join(dir, `shot-${id}-${w}.jpg`);
      run("ffmpeg", ["-v", "error", "-y", "-ss", t.toFixed(3), "-i", clip, "-frames:v", "1", "-q:v", "3", f]);
      return path.relative(path.join(ROOT, "docs/scroll", name), f);
    });
    return { shot: i + 1, from: +(t0 / info.duration).toFixed(3), to: +(Math.min(t1, info.duration) / info.duration).toFixed(3), seconds: +(t1 - t0).toFixed(2), startsWithCut: cut, frames: pics };
  });
  const list = path.join(dir, ".sheet.txt");
  fs.writeFileSync(list, shots.flatMap((s) => s.frames.map((f) => `file '${path.join(ROOT, "docs/scroll", name, f)}'`)).join("\n"));
  run("ffmpeg", ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", list, "-vf", "scale=300:-2,tile=3x" + shots.length + ":padding=6:color=0x202020", "-frames:v", "1", path.join(dir, "shots-sheet.jpg")]);
  fs.rmSync(list, { force: true });
  if (isDir(src)) fs.rmSync(clip, { force: true });
  writeJson(path.join(ROOT, "docs/scroll", name, "shots.json"), { source: src, duration: info.duration, aspect: `${info.width}:${info.height}`, shots });
  console.log(`✔ ${shots.length} shot(s) · sheet docs/scroll/${name}/shots/shots-sheet.jpg (rows = shots, columns = start/mid/end)`);
  console.log(`  Next: write docs/scroll/${name}/remake.md (shot list + Flow/Higgsfield prompts) following references/scroll-video.md`);
  process.exit(0);
}

// ---------------------------------------------------------------- build / import
if (cmd !== "build" && cmd !== "import") die("commands: check | frame | shots | import | build");
if (!rest.length) die("usage: build <clip1> <clip2> … --name slug");
const name = (args.name || path.basename(rest[0]).replace(/\.[^.]+$/, "")).replace(/[^a-z0-9_-]+/gi, "-").toLowerCase();
const outDir = ensureDir(path.join(ROOT, "public/scroll", name));
let sourceCount = 0;
const toClips = (list, label) =>
  list.map((p, i) => {
    if (!isDir(p)) return p;
    const r = framesToClip(p, path.join(outDir, `.frames-${label}-${i}.mp4`));
    sourceCount = Math.max(sourceCount, r.count);
    return r.out;
  });
const desktopClips = toClips(rest, "d");
const mobileClips = args.mobile ? toClips(String(args.mobile).split(","), "m") : null;
// imported sequences keep every original frame unless --frames says otherwise
const frames = Number(args.frames || (cmd === "import" && sourceCount ? sourceCount : 240));
const quality = Number(args.quality || 72);
const xfade = Number(args.xfade || 0);
const trim = Number(args.trim || 0); // seconds cut from the start AND end of each clip (AI clips often ease in/out)

/** Concatenate clips (optionally cross-faded) into one intermediate at a fixed size. */
function joinClips(files, width, label) {
  const clips = files.map(probe);
  const h = Math.round((clips[0].height * width) / clips[0].width / 2) * 2;
  const inputs = [];
  const filters = [];
  const durs = [];
  clips.forEach((c, i) => {
    const ss = trim, dur = Math.max(0.2, c.duration - trim * 2);
    inputs.push("-ss", String(ss), "-t", String(dur), "-i", c.file);
    filters.push(`[${i}:v]fps=30,scale=${width}:${h}:force_original_aspect_ratio=increase,crop=${width}:${h},setsar=1,format=yuv420p[v${i}]`);
    durs.push(dur);
  });
  let last = "v0";
  if (clips.length > 1) {
    if (xfade > 0) {
      let offset = 0;
      for (let i = 1; i < clips.length; i++) {
        offset += durs[i - 1] - xfade;
        const out = `x${i}`;
        filters.push(`[${last}][v${i}]xfade=transition=fade:duration=${xfade}:offset=${offset.toFixed(3)}[${out}]`);
        last = out;
      }
    } else {
      filters.push(`${clips.map((_, i) => `[v${i}]`).join("")}concat=n=${clips.length}:v=1:a=0[cat]`);
      last = "cat";
    }
  }
  const tmp = path.join(outDir, `.joined-${label}.mp4`);
  run("ffmpeg", ["-v", "error", "-y", ...inputs, "-filter_complex", filters.join(";"), "-map", `[${last}]`, "-an", "-c:v", "libx264", "-crf", "14", "-preset", "fast", tmp]);
  return { tmp, ...probe(tmp) };
}

function exportSet(files, width, label) {
  const joined = joinClips(files, width, label);
  const dir = path.join(outDir, label);
  fs.rmSync(dir, { recursive: true, force: true });
  ensureDir(dir);
  // sample exactly `frames` frames evenly across the whole take
  const rate = frames / joined.duration;
  run("ffmpeg", ["-v", "error", "-y", "-i", joined.tmp, "-vf", `fps=${rate.toFixed(5)}`, "-frames:v", String(frames), "-c:v", "libwebp", "-quality", String(quality), "-compression_level", "6", path.join(dir, "f%04d.webp")]);
  const count = fs.readdirSync(dir).filter((f) => f.endsWith(".webp")).length;
  const bytes = fs.readdirSync(dir).reduce((a, f) => a + fs.statSync(path.join(dir, f)).size, 0);
  // poster + an all-keyframe mp4 (handy as a fallback or for previews)
  run("ffmpeg", ["-v", "error", "-y", "-i", path.join(dir, "f0001.webp"), path.join(outDir, `poster-${label}.webp`)]);
  run("ffmpeg", ["-v", "error", "-y", "-i", joined.tmp, "-an", "-c:v", "libx264", "-g", "1", "-crf", "26", "-pix_fmt", "yuv420p", "-movflags", "+faststart", path.join(outDir, `scrub-${label}.mp4`)]);
  fs.rmSync(joined.tmp, { force: true });
  console.log(`✔ ${label}: ${count} frames ${joined.width}×${joined.height} · ${(bytes / 1e6).toFixed(1)} MB (avg ${Math.round(bytes / count / 1024)} KB/frame) from ${joined.duration.toFixed(1)}s`);
  return { path: `${label}/f{n}.webp`, pad: 4, count, width: joined.width, height: joined.height, poster: `poster-${label}.webp`, mp4: `scrub-${label}.mp4`, bytes };
}

// imported sequences keep their native width; generated clips default to 1600
const defaultWidth = (clips, fallback) => (cmd === "import" ? Math.min(probe(clips[0]).width, 2400) : fallback);
const sets = { desktop: exportSet(desktopClips, Number(args.width || defaultWidth(desktopClips, 1600)), "desktop") };
if (mobileClips) sets.mobile = exportSet(mobileClips, Number(args["mobile-width"] || defaultWidth(mobileClips, 900)), "mobile");
for (const f of fs.readdirSync(outDir)) if (f.startsWith(".frames-")) fs.rmSync(path.join(outDir, f), { force: true });

// quick visual check: contact sheet of every 1/12th of the take
{
  const dir = path.join(outDir, "desktop");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".webp")).sort();
  const pick = Array.from({ length: 12 }, (_, i) => files[Math.round((i * (files.length - 1)) / 11)]);
  const list = path.join(outDir, ".sheet.txt");
  fs.writeFileSync(list, pick.map((f) => `file '${path.join(dir, f)}'`).join("\n"));
  run("ffmpeg", ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", list, "-vf", "scale=320:-2,tile=4x3:padding=6:color=0x202020", "-frames:v", "1", path.join(outDir, "contact-sheet.png")]);
  fs.rmSync(list, { force: true });
}

const manifest = { name, version: Date.now(), frames, sets };
writeJson(path.join(outDir, "manifest.json"), manifest);
const rel = path.relative(ROOT, outDir);
console.log(`\n✔ Manifest: ${rel}/manifest.json`);
console.log(`✔ Preview:  ${rel}/contact-sheet.png`);
console.log(`  Use it:   <ScrollVideo src="/scroll/${name}/manifest.json" sections={[…]} />  (or templates/scroll-video.html)`);
if (sets.desktop.bytes > 40e6) console.log("⚠ Over 40 MB: lower --frames (e.g. 180) or --quality (e.g. 62)");

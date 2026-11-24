#!/usr/bin/env node
// Cut a region out of a keyframe / reconstructed page to use as an asset (logo, photo, icon).
// Usage: npm run crop -- <image.png> <x> <y> <w> <h> <out.png> [--scale 2]
//        coordinates may be pixels or percentages of the image (e.g. 10% 5% 30% 8%)
import path from "node:path";
import { crop, readPng, resizeToWidth, writePng } from "./img.mjs";
import { ensureDir, parseArgs } from "./lib.mjs";

const args = parseArgs(process.argv.slice(2));
const [src, ...rest] = args._;
if (!src || rest.length < 5) {
  console.error("Usage: npm run crop -- <image.png> <x> <y> <w> <h> <out.png> [--scale 2]");
  process.exit(1);
}
const img = readPng(src);
const v = rest.slice(0, 4).map((s, i) => (String(s).endsWith("%") ? (parseFloat(s) / 100) * (i % 2 === 0 ? img.width : img.height) : Number(s)));
let out = crop(img, ...v);
if (args.scale) out = resizeToWidth(out, out.width * Number(args.scale));
ensureDir(path.dirname(path.resolve(rest[4])));
writePng(rest[4], out);
console.log(`✔ ${rest[4]} (${out.width}×${out.height})`);

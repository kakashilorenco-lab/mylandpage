#!/usr/bin/env node
// Visual diff between the source page and the local clone.
// For each viewport: same size, same scroll, motion frozen, full-page screenshots,
// pixelmatch diff, a source | local | diff montage, and a ranked list of the worst
// horizontal bands so you know WHERE to fix first. Also reports local runtime
// errors, failed requests and horizontal overflow.
//
// Usage: npm run compare -- <sourceUrl> <localUrl> [--site name] [--viewports desktop,mobile] [--no-freeze] [--band 200]
//        npm run compare -- --ref <reconstructed-page.png> <localUrl> [--viewports mobile]   (source = image from a video)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { readPng, resizeToWidth } from "./img.mjs";
import { FREEZE_CSS, VIEWPORTS, ensureDir, gotoSettled, parseArgs, routeSlug, settle, siteSlug, wheelThrough, writeJson } from "./lib.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = parseArgs(process.argv.slice(2));
const refImage = typeof args.ref === "string" ? args.ref : null;
const [sourceUrl, localUrl] = refImage ? [`file://${path.resolve(refImage)}`, args._[0]] : args._;
if (!sourceUrl || !localUrl) {
  console.error("Usage: npm run compare -- <sourceUrl> <localUrl> [--site name] [--viewports desktop,mobile] [--no-freeze] [--band 200]");
  process.exit(1);
}
const site = args.site || (refImage ? "video-ref" : siteSlug(sourceUrl));
const vpNames = (args.viewports || (refImage ? "mobile" : "desktop,mobile")).split(",");
const band = Number(args.band || 200);
const freeze = !args["no-freeze"];
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const outDir = ensureDir(path.join(ROOT, "docs/research", site, refImage ? "video" : routeSlug(sourceUrl), "compare", stamp));

async function shoot(browser, url, vp, label) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1, isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch });
  const page = await ctx.newPage();
  const issues = { consoleErrors: [], failed: [] };
  page.on("console", (m) => m.type() === "error" && issues.consoleErrors.push(m.text().slice(0, 300)));
  page.on("pageerror", (e) => issues.consoleErrors.push(String(e).slice(0, 300)));
  page.on("response", (r) => r.status() >= 400 && issues.failed.push(`${r.status()} ${r.url()}`));
  page.on("requestfailed", (r) => issues.failed.push(`${r.failure()?.errorText} ${r.url()}`));
  await gotoSettled(page, url);
  await wheelThrough(page); // trigger lazy loading + reveal animations, same as capture
  await settle(page);
  if (freeze) await page.addStyleTag({ content: FREEZE_CSS });
  await settle(page, 300);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  const file = path.join(outDir, `${label}.png`);
  await page.screenshot({ path: file, fullPage: true });
  await ctx.close();
  return { png: PNG.sync.read(fs.readFileSync(file)), overflow, issues };
}

/** Copy `src` onto a white canvas of w×h. */
function pad(src, w, h) {
  const out = new PNG({ width: w, height: h });
  out.data.fill(255);
  PNG.bitblt(src, out, 0, 0, src.width, src.height, 0, 0);
  return out;
}

const browser = await chromium.launch();
const report = { source: sourceUrl, local: localUrl, freeze, viewports: {} };

for (const name of vpNames) {
  const vp = VIEWPORTS[name];
  if (!vp) continue;
  process.stdout.write(`▶ ${name} … `);
  // A reference image (e.g. a page reconstructed from a video) is scaled to the viewport width.
  const src = refImage
    ? { png: resizeToWidth(readPng(refImage), vp.width), overflow: false, issues: { consoleErrors: [], failed: [] } }
    : await shoot(browser, sourceUrl, vp, `${name}-source`);
  if (refImage) fs.writeFileSync(path.join(outDir, `${name}-source.png`), PNG.sync.write(src.png));
  const loc = await shoot(browser, localUrl, vp, `${name}-local`);
  const w = Math.max(src.png.width, loc.png.width);
  const h = Math.max(src.png.height, loc.png.height);
  const a = pad(src.png, w, h);
  const b = pad(loc.png, w, h);
  const diff = new PNG({ width: w, height: h });
  const mismatched = pixelmatch(a.data, b.data, diff.data, w, h, { threshold: 0.1, alpha: 0.3 });
  fs.writeFileSync(path.join(outDir, `${name}-diff.png`), PNG.sync.write(diff));

  // Side-by-side montage: source | local | diff
  const gap = 16;
  const montage = new PNG({ width: w * 3 + gap * 2, height: h });
  montage.data.fill(40);
  PNG.bitblt(a, montage, 0, 0, w, h, 0, 0);
  PNG.bitblt(b, montage, 0, 0, w, h, w + gap, 0);
  PNG.bitblt(diff, montage, 0, 0, w, h, (w + gap) * 2, 0);
  fs.writeFileSync(path.join(outDir, `${name}-montage.png`), PNG.sync.write(montage));

  // Rank horizontal bands by mismatch (diff pixels are drawn red by pixelmatch).
  const bands = [];
  for (let y0 = 0; y0 < h; y0 += band) {
    const y1 = Math.min(h, y0 + band);
    let bad = 0;
    for (let y = y0; y < y1; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (diff.data[i] === 255 && diff.data[i + 1] === 0 && diff.data[i + 2] === 0) bad++;
      }
    }
    bands.push({ y: `${y0}-${y1}`, mismatchPct: +((100 * bad) / ((y1 - y0) * w)).toFixed(2) });
  }
  const worst = [...bands].sort((x, y) => y.mismatchPct - x.mismatchPct).slice(0, 6).filter((x) => x.mismatchPct > 0.5);

  report.viewports[name] = {
    similarityPct: +(100 - (100 * mismatched) / (w * h)).toFixed(2),
    heights: { source: src.png.height, local: loc.png.height, delta: loc.png.height - src.png.height },
    worstBands: worst,
    localHorizontalOverflow: loc.overflow,
    localConsoleErrors: loc.issues.consoleErrors,
    localFailedRequests: loc.issues.failed,
    files: { montage: `${name}-montage.png`, diff: `${name}-diff.png`, source: `${name}-source.png`, local: `${name}-local.png` },
  };
  console.log(`${report.viewports[name].similarityPct}% similar`);
}
await browser.close();

writeJson(path.join(outDir, "report.json"), report);
const L = [`# Compare — ${sourceUrl} vs ${localUrl}`, "", `Motion frozen: ${freeze}. Similarity is pixel-level; use the montage to judge, not the number alone.`, ""];
for (const [name, r] of Object.entries(report.viewports)) {
  L.push(`## ${name} — ${r.similarityPct}% similar`, "");
  L.push(`- Page height: source ${r.heights.source}px, local ${r.heights.local}px (Δ ${r.heights.delta > 0 ? "+" : ""}${r.heights.delta}px)`);
  if (r.worstBands.length) L.push(`- Fix first (worst bands, px from top): ${r.worstBands.map((b) => `${b.y} (${b.mismatchPct}%)`).join(", ")}`);
  if (r.localHorizontalOverflow) L.push("- ⚠️ Local page scrolls horizontally");
  if (r.localConsoleErrors.length) L.push(`- ⚠️ Local console errors: ${r.localConsoleErrors.slice(0, 5).join(" | ")}`);
  if (r.localFailedRequests.length) L.push(`- ⚠️ Local failed requests: ${r.localFailedRequests.slice(0, 8).join(" | ")}`);
  L.push(`- Montage (source | local | diff): ${r.files.montage}`, "");
}
fs.writeFileSync(path.join(outDir, "report.md"), L.join("\n"));
console.log(`\n✔ Report: ${path.relative(ROOT, outDir)}/report.md`);

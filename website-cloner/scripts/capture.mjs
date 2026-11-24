#!/usr/bin/env node
// Capture everything needed to clone a page, in one run:
//   - full-page + scroll-step screenshots at mobile / tablet / desktop / wide
//   - a structured brief (sections, typography, tokens, fonts, libs, links, forms)
//   - every image / font / video / stylesheet the browser actually loaded, saved
//     with its REAL format (magic-byte sniffed) plus a source -> local asset map
//   - inline SVGs exported as standalone files
//
// Usage: npm run capture -- <url> [--site name] [--viewports mobile,desktop] [--no-assets]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import {
  KIND_BY_EXT, VIEWPORTS, ensureDir, gotoSettled, parseArgs, routeSlug, settle,
  shortHash, siteSlug, sleep, sniffType, wheelThrough, writeJson,
} from "./lib.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = parseArgs(process.argv.slice(2));
const url = args._[0];
if (!url) {
  console.error("Usage: npm run capture -- <url> [--site name] [--viewports mobile,tablet,desktop,wide] [--no-assets]");
  process.exit(1);
}
const site = args.site || siteSlug(url);
const route = routeSlug(url);
const vpNames = (args.viewports || "mobile,tablet,desktop,wide").split(",").map((s) => s.trim());
const saveAssets = !args["no-assets"];

const researchDir = ensureDir(path.join(ROOT, "docs/research", site, route));
const screensDir = ensureDir(path.join(researchDir, "screens"));
const extractSrc = fs.readFileSync(path.join(ROOT, "scripts/extract.js"), "utf8");

const assetMap = new Map(); // source url -> record
const failed = [];
const consoleErrors = [];

function assetName(srcUrl, ext) {
  const base = path.basename(new URL(srcUrl).pathname).replace(/\.[a-z0-9]+$/i, "").replace(/[^a-z0-9_-]+/gi, "-").slice(0, 40) || "asset";
  return `${base}.${shortHash(srcUrl)}.${ext}`;
}

async function storeAsset(srcUrl, buf, contentType, via) {
  if (assetMap.has(srcUrl) || !buf?.length) return;
  const ext = sniffType(buf, contentType);
  if (ext === "html") {
    failed.push({ url: srcUrl, reason: "returned an HTML page instead of an asset" });
    return;
  }
  const kind = KIND_BY_EXT[ext] || "other";
  if (kind === "other" && !contentType.includes("json")) return;
  const rel = path.posix.join("sites", site, kind, assetName(srcUrl, ext));
  const file = path.join(ROOT, "public", rel);
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, buf);
  const urlExt = path.extname(new URL(srcUrl).pathname).slice(1).toLowerCase();
  assetMap.set(srcUrl, {
    source: srcUrl,
    local: "/" + rel,
    kind,
    format: ext,
    bytes: buf.length,
    contentType,
    via,
    ...(urlExt && urlExt !== ext && !(urlExt === "jpeg" && ext === "jpg") ? { note: `URL says .${urlExt} but bytes are ${ext}` } : {}),
  });
}

function hookNetwork(page) {
  page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text().slice(0, 300)));
  page.on("pageerror", (e) => consoleErrors.push(String(e).slice(0, 300)));
  page.on("requestfailed", (r) => failed.push({ url: r.url(), reason: r.failure()?.errorText }));
  if (!saveAssets) return;
  page.on("response", async (res) => {
    const type = res.request().resourceType();
    if (!["image", "font", "media", "stylesheet"].includes(type)) return;
    const u = res.url();
    if (u.startsWith("data:") || assetMap.has(u)) return;
    if (res.status() === 206) return; // partial media; fetched in full later
    if (res.status() >= 400) return failed.push({ url: u, reason: `HTTP ${res.status()}` });
    try {
      await storeAsset(u, await res.body(), res.headers()["content-type"] || "", "browser");
    } catch {
      /* body unavailable (redirect/cache) — fetched later if referenced */
    }
  });
}

/** Fetch assets referenced in the DOM that the browser never fully downloaded (lazy, video, alt states). */
async function fetchMissing(ctx, brief) {
  const wanted = new Set();
  const add = (u) => u && /^https?:/.test(u) && !assetMap.has(u) && wanted.add(u);
  brief.media.images.forEach((i) => add(i.src));
  brief.media.backgrounds.forEach((b) => add(b.url));
  brief.media.videos.forEach((v) => (add(v.src), add(v.poster), v.sources.forEach((s) => add(s.src))));
  brief.fonts.fontFaces.forEach((f) => add(f.src[0]));
  add(brief.meta.ogImage);
  brief.meta.icons.forEach(add);
  for (const u of wanted) {
    try {
      const res = await ctx.request.get(u, { timeout: 60_000, headers: { referer: url } });
      if (!res.ok()) {
        failed.push({ url: u, reason: `HTTP ${res.status()}` });
        continue;
      }
      await storeAsset(u, await res.body(), res.headers()["content-type"] || "", "direct");
    } catch (e) {
      failed.push({ url: u, reason: String(e.message).slice(0, 120) });
    }
  }
}

function writeSvgs(svgs) {
  const dir = ensureDir(path.join(researchDir, "svgs"));
  return svgs.map((s, i) => {
    let markup = s.markup;
    if (!/xmlns=/.test(markup)) markup = markup.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
    const name = `${String(i).padStart(2, "0")}-${(s.label || "icon").replace(/[^a-z0-9]+/gi, "-").slice(0, 30).toLowerCase()}.svg`;
    fs.writeFileSync(path.join(dir, name), markup);
    const rest = { ...s };
    delete rest.markup;
    return { ...rest, file: path.posix.join("svgs", name) };
  });
}

function toMarkdown(brief, perViewport) {
  const L = [];
  const m = brief.meta;
  L.push(`# Page brief — ${m.title || url}`, "", `- Source: ${url}`, `- Captured: ${new Date().toISOString()}`, `- Lang: ${m.lang ?? "?"} · Desktop height: ${m.scrollHeight}px`);
  const libs = Object.entries(brief.libs).filter(([, v]) => v).map(([k, v]) => (typeof v === "number" ? `${k}(${v})` : k));
  L.push(`- Detected: ${libs.join(", ") || "nothing notable"}`);
  if (brief.smoothScroll) L.push(`- Smooth scroll: ${brief.smoothScroll.lib} ${JSON.stringify(brief.smoothScroll.options)}`);
  L.push("", "## Responsive summary", "", "| Viewport | Size | Page height | Sections | H-overflow |", "|---|---|---|---|---|");
  for (const [name, v] of Object.entries(perViewport)) L.push(`| ${name} | ${v.viewport.w}×${v.viewport.h} | ${v.scrollHeight}px | ${v.sections} | ${v.horizontalOverflow ? "⚠️ yes" : "no"} |`);
  L.push("", "## Sections (desktop, top → bottom)", "");
  brief.sections.forEach((s) => L.push(`${s.index + 1}. **${s.framerName || s.heading || s.selector}** — y=${s.rect.y} h=${s.rect.h} · bg ${s.background}${s.backgroundImage ? " + image" : ""} · ${s.images} img / ${s.videos} video / ${s.links} links${s.position !== "static" ? ` · ${s.position}` : ""}\n   > ${s.textPreview}`));
  if (brief.layers.length) {
    L.push("", "## Fixed / sticky layers", "");
    brief.layers.forEach((l) => L.push(`- \`${l.selector}\` ${l.position} (z ${l.zIndex}) ${l.rect.w}×${l.rect.h}`));
  }
  L.push("", "## Typography", "", "| Selector | Sample | Family | Size / LH | Weight | Tracking | Color |", "|---|---|---|---|---|---|---|");
  for (const [sel, arr] of Object.entries(brief.typography)) for (const t of arr) L.push(`| ${sel} | ${t.text.replace(/\|/g, "/")} | ${t.fontFamily.split(",")[0]} | ${t.fontSize} / ${t.lineHeight} | ${t.fontWeight} | ${t.letterSpacing} | ${t.color} |`);
  L.push("", "## Fonts", "");
  brief.fonts.fontFaces.forEach((f) => L.push(`- ${f.family} ${f.weight} ${f.style} → ${assetMap.get(f.src[0])?.local ?? f.src[0] ?? "?"}`));
  if (!brief.fonts.fontFaces.length) L.push(`- Loaded: ${brief.fonts.loaded.join("; ") || "system fonts only"}`);
  if (brief.fonts.blockedSheets.length) L.push(`- ⚠️ Cross-origin stylesheets not inspectable: ${brief.fonts.blockedSheets.join(", ")}`);
  L.push("", "## Design tokens", "", "Top colors (weighted by area):", "");
  L.push(brief.tokens.colors.map((c) => `\`${c.color}\``).join(" · "));
  L.push("", `Container max-widths: ${brief.tokens.containerWidths.map((w) => `${w.maxWidth}×${w.count}`).join(", ") || "none"}`);
  const vars = Object.entries(brief.tokens.rootVars);
  if (vars.length) L.push("", `CSS variables on :root (${vars.length}, full list in brief.json):`, "", ...vars.slice(0, 40).map(([k, v]) => `- \`${k}: ${v}\``));
  L.push("", "## Media", "", `- ${brief.media.images.length} images, ${brief.media.backgrounds.length} CSS backgrounds, ${brief.media.videos.length} videos, ${brief.media.iframes.length} iframes, ${brief.media.svgs.length} unique inline SVGs (saved to svgs/)`);
  brief.media.videos.forEach((v) => L.push(`- video ${assetMap.get(v.src)?.local ?? v.src} autoplay=${v.autoplay} loop=${v.loop} muted=${v.muted} ${v.rect.w}×${v.rect.h}`));
  L.push("", "## Interactions to reproduce", "");
  const it = brief.interactives;
  L.push(`- Buttons: ${it.buttons.map((b) => b.text).filter(Boolean).slice(0, 15).join(" · ") || "none"}`);
  L.push(`- Expanders: ${it.expanders.length} · Tabs: ${it.tabs} · Dialogs: ${it.dialogs}`);
  it.forms.forEach((f) => L.push(`- Form → ${f.action} (${f.method}): ${f.fields.map((x) => `${x.name || x.type}`).join(", ")}`));
  if (brief.keyframes.length) L.push(`- CSS keyframes: ${brief.keyframes.join(", ")}`);
  const ext = brief.links.filter((l) => !l.internal);
  L.push("", `## Links — ${brief.links.length - ext.length} internal, ${ext.length} external`, "");
  [...new Map(brief.links.map((l) => [l.href, l])).values()].slice(0, 60).forEach((l) => L.push(`- ${l.internal ? "↳" : "↗"} ${l.text || "(no text)"} → ${l.href}`));
  L.push("", "## Assets", "", `${assetMap.size} saved under \`public/sites/${site}/\` (map: asset-map.json).`);
  const notes = [...assetMap.values()].filter((a) => a.note);
  notes.forEach((a) => L.push(`- ⚠️ ${a.local}: ${a.note}`));
  if (failed.length) L.push("", `⚠️ ${new Set(failed.map((f) => f.url)).size} failed requests — see capture-log.json`);
  if (consoleErrors.length) L.push(`⚠️ ${consoleErrors.length} console errors on the source page`);
  L.push("", "## Screenshots", "", ...fs.readdirSync(screensDir).sort().map((f) => `- screens/${f}`));
  return L.join("\n") + "\n";
}

// ---------------------------------------------------------------- main
const browser = await chromium.launch();
const perViewport = {};
let desktopBrief = null;

for (const name of vpNames) {
  const vp = VIEWPORTS[name];
  if (!vp) {
    console.warn(`skip unknown viewport ${name}`);
    continue;
  }
  process.stdout.write(`▶ ${name} ${vp.width}×${vp.height} … `);
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: vp.deviceScaleFactor,
    isMobile: !!vp.isMobile,
    hasTouch: !!vp.hasTouch,
    userAgent: vp.isMobile
      ? "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"
      : undefined,
  });
  const page = await ctx.newPage();
  hookNetwork(page);
  await gotoSettled(page, url);
  await page.screenshot({ path: path.join(screensDir, `${name}-0-initial.png`) });
  await wheelThrough(page);
  await settle(page);

  await page.screenshot({ path: path.join(screensDir, `${name}-full.png`), fullPage: true });

  // Viewport-sized frames at each scroll step on desktop: shows sticky/pinned scenes
  // and reveal states that a single full-page screenshot hides.
  if (name === "desktop") {
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    const steps = Math.min(20, Math.ceil(h / vp.height));
    for (let i = 1; i < steps; i++) {
      await page.mouse.wheel(0, vp.height);
      await sleep(500);
      await page.screenshot({ path: path.join(screensDir, `desktop-scroll-${String(i).padStart(2, "0")}.png`) });
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await sleep(300);
  }

  const brief = await page.evaluate(`(${extractSrc.replace(/^[\s\S]*?(function extractPage)/, "$1")})({ max: 300 })`);
  perViewport[name] = {
    viewport: brief.meta.viewport,
    scrollHeight: brief.meta.scrollHeight,
    horizontalOverflow: brief.meta.horizontalOverflow,
    sections: brief.sections.length,
    sectionHeights: brief.sections.map((s) => s.rect.h),
    typography: Object.fromEntries(Object.entries(brief.typography).filter(([k]) => /^h[1-3]$|^p$/.test(k)).map(([k, v]) => [k, v[0] && `${v[0].fontSize}/${v[0].lineHeight}`])),
  };
  if (name === "desktop" || !desktopBrief) desktopBrief = brief;
  if (saveAssets) await fetchMissing(ctx, brief);
  await ctx.close();
  console.log(`done (${brief.sections.length} sections, ${brief.meta.scrollHeight}px)`);
}
await browser.close();

desktopBrief.media.svgs = writeSvgs(desktopBrief.media.svgs);
writeJson(path.join(researchDir, "brief.json"), { site, route, source: url, perViewport, ...desktopBrief });
writeJson(path.join(researchDir, "asset-map.json"), [...assetMap.values()]);
writeJson(path.join(researchDir, "capture-log.json"), {
  failed: [...new Map(failed.map((f) => [f.url, f])).values()],
  consoleErrors: [...new Set(consoleErrors)],
});
fs.writeFileSync(path.join(researchDir, "brief.md"), toMarkdown(desktopBrief, perViewport));

const rel = path.relative(ROOT, researchDir);
console.log(`\n✔ Brief:       ${rel}/brief.md (+ brief.json)`);
console.log(`✔ Screenshots: ${rel}/screens/ (${fs.readdirSync(screensDir).length})`);
console.log(`✔ Assets:      public/sites/${site}/ (${assetMap.size} files, map in ${rel}/asset-map.json)`);
console.log(`✔ SVGs:        ${rel}/svgs/ (${desktopBrief.media.svgs.length})`);
const failedUnique = new Set(failed.map((f) => f.url)).size;
if (failedUnique) console.log(`⚠ ${failedUnique} failed requests (see capture-log.json)`);

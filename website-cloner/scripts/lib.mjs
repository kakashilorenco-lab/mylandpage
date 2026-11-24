// Shared helpers for the capture / compare scripts.
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const VIEWPORTS = {
  mobile: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 1 },
  tablet: { width: 768, height: 1024, isMobile: true, hasTouch: true, deviceScaleFactor: 1 },
  desktop: { width: 1440, height: 900, deviceScaleFactor: 1 },
  wide: { width: 1920, height: 1080, deviceScaleFactor: 1 },
};

/** Minimal `--flag value` / `--flag` / positional parser. */
export function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) out[key] = true;
      else {
        out[key] = next;
        i++;
      }
    } else out._.push(a);
  }
  return out;
}

export function siteSlug(url) {
  const u = new URL(url);
  if (u.protocol === "file:") return "local-" + path.basename(path.dirname(u.pathname)).toLowerCase();
  const host = u.hostname.replace(/^www\./, "").replace(/[^a-z0-9]+/gi, "-");
  return u.port ? `${host}-${u.port}` : host;
}

export function routeSlug(url) {
  const u = new URL(url);
  if (u.protocol === "file:") return path.basename(u.pathname).replace(/\.html?$/i, "").toLowerCase() || "home";
  const p = u.pathname.replace(/\/+$/, "").replace(/\/index\.html?$/i, "");
  return p ? p.slice(1).replace(/[^a-z0-9]+/gi, "-").toLowerCase() : "home";
}

export const shortHash = (s) => createHash("sha1").update(s).digest("hex").slice(0, 8);

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function writeJson(file, data) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Navigate, tolerating pages that never reach network idle (analytics, long polling). */
export async function gotoSettled(page, url) {
  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 45_000 });
  } catch {
    await page.goto(url, { waitUntil: "load", timeout: 60_000 });
  }
  await settle(page);
}

/** Wait for fonts, pending images and a short quiet period. */
export async function settle(page, extraMs = 600) {
  await page
    .evaluate(async () => {
      if (document.fonts?.ready) await document.fonts.ready;
      const imgs = [...document.images].filter((i) => !i.complete);
      await Promise.race([
        Promise.all(imgs.map((i) => new Promise((r) => i.addEventListener("load", r, { once: true }) || i.addEventListener("error", r, { once: true })))),
        new Promise((r) => setTimeout(r, 5000)),
      ]);
    })
    .catch(() => {});
  await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
  await sleep(extraMs);
}

/**
 * Scroll the page with real wheel input (not scrollTo) so smooth-scroll libraries,
 * scroll-triggered reveals and lazy loaders all fire. Returns to the top afterwards.
 */
export async function wheelThrough(page, { step = 500, pause = 120, maxSteps = 400 } = {}) {
  const vp = page.viewportSize();
  await page.mouse.move(vp.width / 2, vp.height / 2);
  let lastY = -1;
  let stuck = 0;
  for (let i = 0; i < maxSteps; i++) {
    await page.mouse.wheel(0, step);
    await sleep(pause);
    const { y, max } = await page.evaluate(() => ({
      y: window.scrollY,
      max: document.documentElement.scrollHeight - window.innerHeight,
    }));
    if (y >= max - 2) break;
    stuck = y === lastY ? stuck + 1 : 0;
    if (stuck > 8) break; // scroll-jacked / locked page
    lastY = y;
  }
  await sleep(500);
  // Fall back to scrollTo for the trip up so we do not wait twice as long.
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(400);
}

/** CSS that freezes motion so two screenshots can be compared deterministically. */
export const FREEZE_CSS = `
*,*::before,*::after{animation-play-state:paused!important;animation-delay:0s!important;
transition:none!important;caret-color:transparent!important;scroll-behavior:auto!important}
video{visibility:hidden!important}`;

/** Detect the real file type from magic bytes; CDNs often lie in the extension. */
export function sniffType(buf, contentType = "") {
  const hex = buf.subarray(0, 16).toString("hex");
  const ascii = buf.subarray(0, 64).toString("latin1");
  if (hex.startsWith("89504e47")) return "png";
  if (hex.startsWith("ffd8ff")) return "jpg";
  if (ascii.startsWith("GIF8")) return "gif";
  if (ascii.startsWith("RIFF") && ascii.slice(8, 12) === "WEBP") return "webp";
  if (ascii.slice(4, 12) === "ftypavif" || ascii.slice(4, 12) === "ftypavis") return "avif";
  if (ascii.slice(4, 8) === "ftyp") return "mp4";
  if (hex.startsWith("1a45dfa3")) return "webm";
  if (ascii.startsWith("ID3") || hex.startsWith("fffb") || hex.startsWith("fff3")) return "mp3";
  if (ascii.startsWith("OggS")) return "ogg";
  if (ascii.startsWith("RIFF") && ascii.slice(8, 12) === "WAVE") return "wav";
  if (ascii.startsWith("wOF2")) return "woff2";
  if (ascii.startsWith("wOFF")) return "woff";
  if (ascii.startsWith("OTTO")) return "otf";
  if (hex.startsWith("00010000") || ascii.startsWith("true")) return "ttf";
  if (hex.startsWith("00000100")) return "ico";
  const head = buf.subarray(0, 512).toString("utf8").trimStart().toLowerCase();
  if (head.startsWith("<svg") || (head.startsWith("<?xml") && head.includes("<svg"))) return "svg";
  if (head.startsWith("<!doctype html") || head.startsWith("<html")) return "html"; // error page
  if (contentType.includes("css")) return "css";
  if (contentType.includes("json")) return "json";
  return "bin";
}

export const KIND_BY_EXT = {
  png: "images", jpg: "images", gif: "images", webp: "images", avif: "images", svg: "images", ico: "images",
  mp4: "videos", webm: "videos",
  mp3: "audio", ogg: "audio", wav: "audio",
  woff2: "fonts", woff: "fonts", otf: "fonts", ttf: "fonts",
  css: "css",
};

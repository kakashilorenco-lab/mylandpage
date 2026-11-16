#!/usr/bin/env node
/* QA visual e técnico de um site.
   Uso:  node qa.js <pasta-do-site | URL> --out <pasta-prints> [--vendor <node_modules>]
   Gera prints rolando a página (computador e celular), duas folhas de contato
   e um relatório com: erros no console, arquivos que falharam, rolagem lateral
   no celular, imagens pesadas/sem alt e títulos. Precisa de Playwright. */
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const { serve, routeVendors, contactSheet, arg } = require("./_lib");

(async () => {
  const target = process.argv[2];
  if (!target) { console.error("uso: node qa.js <pasta|URL> --out <pasta> [--vendor <node_modules>]"); process.exit(1); }
  const out = path.resolve(arg("out", "qa-out")); fs.mkdirSync(out, { recursive: true });
  const vendor = arg("vendor");
  let url = target, server;
  if (!/^https?:/.test(target)) { server = await serve(path.resolve(target)); url = server.url; }

  const browser = await chromium.launch();
  const report = { url, desktop: {}, mobile: {} };

  for (const kind of ["desktop", "mobile"]) {
    const ctx = await browser.newContext(kind === "desktop"
      ? { viewport: { width: 1440, height: 900 } }
      : { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await routeVendors(page, vendor);
    const r = report[kind] = { console: [], failed: [], heavy: [] };
    page.on("console", (m) => ["error", "warning"].includes(m.type()) && r.console.push(`${m.type()}: ${m.text()}`.slice(0, 300)));
    page.on("pageerror", (e) => r.console.push("pageerror: " + e.message));
    page.on("requestfailed", (q) => r.failed.push(q.url().slice(0, 150) + " " + q.failure().errorText));
    page.on("response", async (res) => {
      const t = res.request().resourceType();
      if (t === "image" || t === "media") { const len = +(res.headers()["content-length"] || 0); if (len > 400 * 1024) r.heavy.push(`${Math.round(len / 1024)}KB ${res.url().slice(0, 120)}`); }
    });
    await page.goto(url, { waitUntil: "load", timeout: 60000 });
    await page.waitForTimeout(4500);

    const shots = [];
    const H = await page.evaluate(() => document.documentElement.scrollHeight);
    const vh = kind === "desktop" ? 900 : 844, step = Math.round(vh * 0.85), max = kind === "desktop" ? 40 : 24;
    for (let yy = 0, i = 0; yy < H && i < max; yy += step, i++) {
      const f = path.join(out, `${kind}-${String(i).padStart(2, "0")}.png`);
      await page.screenshot({ path: f }); shots.push(f);
      if (kind === "desktop") await page.mouse.wheel(0, step); else await page.evaluate((s) => window.scrollBy(0, s), step);
      await page.waitForTimeout(900);
    }
    await contactSheet(browser, shots, path.join(out, `sheet-${kind}.png`), { cols: kind === "desktop" ? 3 : 6, w: kind === "desktop" ? 480 : 240 });

    Object.assign(r, await page.evaluate(() => {
      const W = document.documentElement.clientWidth;
      const wide = [...document.querySelectorAll("body *")].filter((e) => {
        const b = e.getBoundingClientRect(); if (b.right <= W + 1) return false;
        for (let p = e.parentElement; p; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if (o === "hidden" || o === "clip") return false; }
        return true;
      }).slice(0, 8).map((e) => `${e.tagName.toLowerCase()}.${String(e.className).split(" ")[0]} → ${Math.round(e.getBoundingClientRect().right)}px`);
      return {
        height: document.documentElement.scrollHeight,
        horizontalScroll: document.documentElement.scrollWidth > W ? `SIM (${document.documentElement.scrollWidth}px > ${W}px)` : "não",
        overflowing: wide,
        h1: document.querySelectorAll("h1").length,
        imgsNoAlt: [...document.images].filter((i) => !i.hasAttribute("alt")).map((i) => i.src.slice(0, 80)).slice(0, 10),
        title: document.title,
        description: document.querySelector('meta[name="description"]')?.content || "(faltando)",
      };
    }));
    shots.forEach((f) => fs.unlinkSync(f)); // fica só a folha de contato
    await ctx.close();
  }
  await browser.close(); server && server.close();
  fs.writeFileSync(path.join(out, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  console.log(`\nFolhas de contato: ${path.join(out, "sheet-desktop.png")} e ${path.join(out, "sheet-mobile.png")}`);
})();

#!/usr/bin/env node
/* Analisa um site de referência: tecnologias, fontes, cores, seções e prints rolando.
   Uso:  node analisar-referencia.js <URL> --out <pasta> [--vendor <node_modules>]
   Serve para EXTRAIR PRINCÍPIOS (estrutura, ritmo, motion, tipografia), não para copiar
   textos, imagens, marca ou código do site analisado. */
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const { routeVendors, contactSheet, arg } = require("./_lib");

(async () => {
  const url = process.argv[2];
  if (!url) { console.error("uso: node analisar-referencia.js <URL> --out <pasta>"); process.exit(1); }
  const out = path.resolve(arg("out", "ref-out")); fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await routeVendors(page, arg("vendor"));
  const failed = [];
  page.on("requestfailed", (q) => failed.push(q.url().slice(0, 120) + " " + q.failure().errorText));
  await page.goto(url, { waitUntil: "load", timeout: 60000 });
  await page.waitForTimeout(8000);

  const info = await page.evaluate(() => {
    const count = (fn) => { const o = {}; for (const e of [...document.querySelectorAll("body *")].slice(0, 4000)) { const k = fn(getComputedStyle(e)); if (k) o[k] = (o[k] || 0) + 1; } return Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 10); };
    return {
      title: document.title,
      description: document.querySelector('meta[name="description"]')?.content,
      generator: document.querySelector('meta[name="generator"]')?.content,
      scripts: [...document.scripts].map((s) => s.src).filter(Boolean),
      styles: [...document.querySelectorAll('link[rel="stylesheet"]')].map((l) => l.href),
      libs: ["gsap", "ScrollTrigger", "Lenis", "THREE", "Webflow", "__NEXT_DATA__", "__NUXT__", "barba", "Swiper", "SplitType", "Flip", "Spline", "framer"].filter((k) => k in window),
      fonts: count((cs) => cs.fontFamily),
      textColors: count((cs) => cs.color),
      backgrounds: count((cs) => (cs.backgroundColor !== "rgba(0, 0, 0, 0)" ? cs.backgroundColor : null)),
      canvases: document.querySelectorAll("canvas").length,
      videos: document.querySelectorAll("video").length,
      height: document.documentElement.scrollHeight,
      sections: [...document.querySelectorAll("header, section, footer")].map((s) => `${s.tagName.toLowerCase()}.${String(s.className).slice(0, 40)} · ${Math.round(s.getBoundingClientRect().height)}px`).slice(0, 40),
      headings: [...document.querySelectorAll("h1, h2, h3")].map((h) => `${h.tagName}: ${h.innerText.replace(/\s+/g, " ").slice(0, 60)}`).filter((t) => t.length > 4).slice(0, 40),
    };
  });
  info.failed = failed.slice(0, 15);

  const shots = [];
  for (let i = 0, yy = 0; yy < info.height + 900 && i < 45; yy += 700, i++) {
    const f = path.join(out, `ref-${String(i).padStart(2, "0")}.png`);
    await page.screenshot({ path: f }); shots.push(f);
    await page.mouse.wheel(0, 700); await page.waitForTimeout(1300);
  }
  for (let k = 0; k < shots.length; k += 12) await contactSheet(browser, shots.slice(k, k + 12), path.join(out, `sheet-${k / 12}.png`));
  shots.forEach((f) => fs.unlinkSync(f));
  await browser.close();
  fs.writeFileSync(path.join(out, "info.json"), JSON.stringify(info, null, 2));
  console.log(JSON.stringify(info, null, 2));
  console.log(`\nFolhas de contato em ${out}/sheet-*.png (12 prints cada, rolando de 700 em 700px).`);
})();

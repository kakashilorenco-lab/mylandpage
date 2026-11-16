#!/usr/bin/env node
/* Estudo de MOTION de um site (referência ou o seu próprio).
   Uso:  node estudar-motion.js <URL|pasta> --out <pasta> [--vendor <node_modules>] [--seg 16]
   Faz o que uma pessoa faz: espera o carregamento, passa o mouse pela tela, rola a página
   devagar e de forma contínua do topo ao fim. Grava tudo em vídeo (motion.webm) e gera
   folhas de quadros (frames-*.png, ~6 quadros/s) para ver transições quadro a quadro.
   Também lê, com a página aberta, os parâmetros das animações:
   cenas presas (pin), quanto duram em px, se acompanham a rolagem (scrub), rolagem suave
   (Lenis: lerp/duration) e as curvas (ease) e durações mais usadas.
   Serve para medir RITMO e SENSAÇÃO — não copie código, textos ou imagens do site. */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { chromium } = require("playwright");
const { serve, routeVendors, contactSheet, arg } = require("./_lib");

(async () => {
  const target = process.argv[2];
  if (!target) { console.error("uso: node estudar-motion.js <URL|pasta> --out <pasta>"); process.exit(1); }
  const out = path.resolve(arg("out", "motion-out")); fs.mkdirSync(out, { recursive: true });
  const segs = +arg("seg", 16); // segundos de rolagem contínua
  let url = target, server;
  if (!/^https?:/.test(target)) { server = await serve(path.resolve(target)); url = server.url; }

  const browser = await chromium.launch();
  const mobile = process.argv.includes("--mobile"); // celular: 390x844, toque, rolagem por dedo
  const ctx = await browser.newContext(mobile
    ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, recordVideo: { dir: out, size: { width: 390, height: 844 } } }
    : { viewport: { width: 1440, height: 900 }, recordVideo: { dir: out, size: { width: 960, height: 600 } } });
  const page = await ctx.newPage();
  await routeVendors(page, arg("vendor"));
  // Registra tweens criados (duração/ease) assim que o GSAP aparecer na página.
  await page.addInitScript(() => {
    window.__motion = { tweens: [] };
    const hook = () => {
      const g = window.gsap; if (!g || g.__hooked) return !!(g && g.__hooked); g.__hooked = true;
      ["to", "from", "fromTo"].forEach((m) => { const o = g[m].bind(g); g[m] = (...a) => { const v = a[a.length - 1] || {}; window.__motion.tweens.push({ m, d: v.duration, e: typeof v.ease === "string" ? v.ease : undefined, st: !!v.scrollTrigger, stagger: v.stagger !== undefined }); return o(...a); }; });
      return true;
    };
    const iv = setInterval(() => hook() && clearInterval(iv), 20);
  });
  const t0 = Date.now();
  await page.goto(url, { waitUntil: "load", timeout: 60000 });
  await page.waitForTimeout(6000);
  const marks = [{ t: (Date.now() - t0) / 1000, what: "carregado" }];

  // passa o mouse pela primeira tela (hover, parallax, cursor)
  if (mobile) { await page.touchscreen.tap(195, 520); await page.waitForTimeout(1200); }
  else for (let i = 0; i <= 40; i++) { await page.mouse.move(200 + i * 26, 300 + Math.sin(i / 4) * 180); await page.waitForTimeout(40); }
  marks.push({ t: (Date.now() - t0) / 1000, what: "mouse na hero" });

  // rola de forma contínua (como uma pessoa usando a roda), do topo ao fim
  const H = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  const steps = segs * 20, per = Math.max(40, Math.round(H / steps));
  marks.push({ t: (Date.now() - t0) / 1000, what: `rolagem contínua ${per}px a cada 50ms` });
  for (let i = 0; i < steps * 1.15; i++) {
    if (mobile) await page.evaluate((s) => window.scrollBy(0, s), per); else await page.mouse.wheel(0, per);
    await page.waitForTimeout(50);
    if (await page.evaluate(() => scrollY >= document.documentElement.scrollHeight - innerHeight - 4)) break;
  }
  await page.waitForTimeout(1500);
  marks.push({ t: (Date.now() - t0) / 1000, what: "fim" });

  const info = await page.evaluate(() => {
    const out = { lenis: null, scrollTriggers: [], tweens: {} };
    const L = window.lenis || window.__lenis || Object.values(window).find((v) => v && v.constructor && v.constructor.name === "Lenis");
    if (L && L.options) out.lenis = { lerp: L.options.lerp, duration: L.options.duration, wheelMultiplier: L.options.wheelMultiplier, smoothWheel: L.options.smoothWheel };
    const ST = window.ScrollTrigger;
    if (ST) out.scrollTriggers = ST.getAll().map((s) => {
      const t = s.trigger; const name = t ? (t.id ? "#" + t.id : t.tagName.toLowerCase() + "." + String(t.className).split(" ")[0]) : "(página)";
      return { trigger: name, startPx: Math.round(s.start), lengthPx: Math.round(s.end - s.start), pin: !!s.pin, scrub: s.vars.scrub ?? false, toggle: s.vars.toggleActions || null };
    });
    const tw = window.__motion ? window.__motion.tweens : [];
    const by = (k) => tw.reduce((a, x) => { const v = x[k] ?? "(padrão)"; a[v] = (a[v] || 0) + 1; return a; }, {});
    out.tweens = { total: tw.length, comScrollTrigger: tw.filter((x) => x.st).length, comStagger: tw.filter((x) => x.stagger).length, eases: by("e"), duracoes: by("d") };
    out.alturaPagina = document.documentElement.scrollHeight;
    return out;
  });
  info.marcas = marks;
  const vid = await page.video().path();
  await ctx.close(); await browser.close(); server && server.close();
  const mv = path.join(out, "motion.webm"); fs.renameSync(vid, mv);

  // quadros do vídeo em folhas de contato (ffmpeg)
  try {
    const fdir = path.join(out, "_frames"); fs.mkdirSync(fdir, { recursive: true });
    execFileSync("ffmpeg", ["-v", "error", "-i", mv, "-vf", "fps=6,scale=480:-1", path.join(fdir, "f%04d.png")]);
    const files = fs.readdirSync(fdir).sort().map((f) => path.join(fdir, f));
    const b2 = await chromium.launch();
    for (let k = 0; k < files.length; k += 24) await contactSheet(b2, files.slice(k, k + 24), path.join(out, `frames-${String(k / 24).padStart(2, "0")}.png`), { cols: 4, w: 360 });
    await b2.close();
    files.forEach((f) => fs.unlinkSync(f)); fs.rmdirSync(fdir);
  } catch (e) { info.ffmpeg = "falhou: " + e.message; }

  fs.writeFileSync(path.join(out, "motion.json"), JSON.stringify(info, null, 2));
  console.log(JSON.stringify(info, null, 2));
  console.log(`\nVídeo: ${mv}\nQuadros: ${out}/frames-*.png (6 por segundo, 24 por folha = 4 s por folha)`);
})();

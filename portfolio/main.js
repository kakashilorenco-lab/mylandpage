/* Portfólio — efeitos e montagem do conteúdo.
   O conteúdo vem de config.js (window.PORTFOLIO). */
(() => {
  const C = window.PORTFOLIO;
  const $ = (s, r = document) => r.querySelector(s);
  const NEON = "#e4ff1a";
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasHover = matchMedia("(hover: hover)").matches;
  const G = window.gsap;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /* ---------------- conteúdo ---------------- */
  document.title = `${C.nomeCompleto} — ${C.cargo}`;
  document.querySelectorAll("[data-brand]").forEach((el) => (el.textContent = C.nome));
  document.querySelectorAll("[data-nome-completo]").forEach((el) => (el.textContent = C.nomeCompleto));
  $("[data-frase]").textContent = C.frase;
  $("#year").textContent = new Date().getFullYear();

  const words = [C.cargo, ...C.skills.map((s) => s.titulo)];
  const strip = words.map((w) => `<span>${esc(w)} <b>✦</b></span>`).join("");
  $("#marquee").innerHTML = strip + strip;

  $("#aboutText").innerHTML = C.sobre.split(/\s+/).map((w) => `<span class="w">${esc(w)}</span>`).join(" ");
  $("#stats").innerHTML = C.numeros.map((n) => `<div class="stat"><b>${esc(n.valor)}</b><span class="mono">${esc(n.rotulo)}</span></div>`).join("");

  $("#skillsGrid").innerHTML = C.skills.map((s, i) => `
    <article class="skill">
      <div class="skill__idx mono"><span>TRK ${String(i + 1).padStart(2, "0")}</span><span>↗</span></div>
      <h3>${esc(s.titulo)}</h3>
      <p>${esc(s.texto)}</p>
      <div class="skill__tags mono">${s.tags.map((t) => `<span>${esc(t)}</span>`).join("")}</div>
    </article>`).join("");

  $("#workTrack").innerHTML = C.projetos.map((p, i) => `
    <div class="proj">
      <a class="proj__inner" href="${esc(p.link || "#")}" ${p.link && p.link !== "#" ? 'target="_blank" rel="noopener"' : ""}>
        <div class="proj__img">${p.imagem ? `<img src="${esc(p.imagem)}" alt="${esc(p.titulo)}" loading="lazy">` : `<canvas data-seed="${i + 3}"></canvas>`}
          <span class="proj__num">${String(i + 1).padStart(2, "0")}</span><span class="proj__shine"></span></div>
        <div class="proj__meta">
          <header class="mono"><span>${esc(p.tipo)}</span><span>${esc(p.ano)}</span></header>
          <h3>${esc(p.titulo)}</h3><p>${esc(p.texto)}</p>
        </div>
      </a>
    </div>`).join("");

  $("#links").innerHTML = C.contatos.map((c) => `
    <a class="link-row" href="${esc(c.link)}" target="_blank" rel="noopener">
      <b>${esc(c.rotulo)}</b><span class="mono">${esc(c.valor)}</span><em>→</em>
    </a>`).join("");

  /* relógio */
  const clock = $("#clock");
  const tick = () => (clock.textContent = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
  tick(); setInterval(tick, 15000);

  /* ---------------- ruído para linhas topográficas ---------------- */
  function makeNoise(seed) {
    const p = new Uint8Array(512);
    let s = seed * 9301 + 49297;
    const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    const perm = [...Array(256).keys()].sort(() => rnd() - 0.5);
    for (let i = 0; i < 512; i++) p[i] = perm[i & 255];
    const h = (x, y) => p[p[x & 255] + (y & 255)] / 255;
    const sm = (t) => t * t * (3 - 2 * t);
    const v = (x, y) => {
      const xi = Math.floor(x), yi = Math.floor(y), xf = sm(x - xi), yf = sm(y - yi);
      const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1);
      return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
    };
    return (x, y) => v(x, y) * 0.6 + v(x * 2.1, y * 2.1) * 0.28 + v(x * 4.3, y * 4.3) * 0.12;
  }
  // segmentos do marching squares: arestas 0=topo 1=direita 2=baixo 3=esquerda
  const MS = [[], [[3, 2]], [[2, 1]], [[3, 1]], [[0, 1]], [[3, 0], [2, 1]], [[0, 2]], [[3, 0]],
    [[3, 0]], [[0, 2]], [[0, 1], [3, 2]], [[0, 1]], [[3, 1]], [[2, 1]], [[3, 2]], []];

  function drawTopo(cv, { seed = 1, scale = 0.0035, step = 0.045, color = "17,17,16", alpha = 0.13, bg = null, cell = 12 } = {}) {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = cv.clientWidth, h = cv.clientHeight;
    if (!w || !h) return;
    cv.width = w * dpr; cv.height = h * dpr;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h); }
    const n = makeNoise(seed);
    const cols = Math.ceil(w / cell) + 1, rows = Math.ceil(h / cell) + 1;
    const f = new Float32Array(cols * rows);
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) f[j * cols + i] = n(i * cell * scale, j * cell * scale);
    let k = 0;
    for (let t = 0.1; t < 0.95; t += step, k++) {
      ctx.beginPath();
      for (let j = 0; j < rows - 1; j++) for (let i = 0; i < cols - 1; i++) {
        const a = f[j * cols + i], b = f[j * cols + i + 1], c = f[(j + 1) * cols + i + 1], d = f[(j + 1) * cols + i];
        const idx = (a > t ? 8 : 0) | (b > t ? 4 : 0) | (c > t ? 2 : 0) | (d > t ? 1 : 0);
        if (!idx || idx === 15) continue;
        const x = i * cell, y = j * cell;
        const e = [
          [x + cell * ((t - a) / (b - a)), y],
          [x + cell, y + cell * ((t - b) / (c - b))],
          [x + cell * ((t - d) / (c - d)), y + cell],
          [x, y + cell * ((t - a) / (d - a))],
        ];
        for (const [p, q] of MS[idx]) { ctx.moveTo(e[p][0], e[p][1]); ctx.lineTo(e[q][0], e[q][1]); }
      }
      ctx.strokeStyle = `rgba(${color},${k % 5 === 0 ? alpha * 2 : alpha})`;
      ctx.lineWidth = k % 5 === 0 ? 1.1 : 0.7;
      ctx.stroke();
    }
  }

  const topo = $("#topo");
  const paintBg = () => drawTopo(topo, { seed: 7 });
  const projCanvases = () => document.querySelectorAll(".proj__img canvas").forEach((cv) => {
    const s = +cv.dataset.seed;
    drawTopo(cv, { seed: s, scale: 0.006, step: 0.06, color: s % 2 ? "228,255,26" : "242,242,238", alpha: 0.35, bg: s % 2 ? "#141412" : "#1d1f14", cell: 8 });
  });
  let rt;
  addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { paintBg(); projCanvases(); reveal.resize(); }, 150); });

  /* ---------------- cursor ---------------- */
  const cur = $("#cursor");
  const mouse = { x: innerWidth / 2, y: innerHeight / 2 };
  if (hasHover) {
    let cx = mouse.x, cy = mouse.y;
    addEventListener("pointermove", (e) => { mouse.x = e.clientX; mouse.y = e.clientY; cur.classList.add("is-on"); });
    document.addEventListener("pointerleave", () => cur.classList.remove("is-on"));
    document.addEventListener("pointerover", (e) => cur.classList.toggle("is-big", !!e.target.closest("a,button,.spot,.figure")));
    (function loop() { cx += (mouse.x - cx) * 0.22; cy += (mouse.y - cy) * 0.22; cur.style.transform = `translate(${cx}px,${cy}px)`; requestAnimationFrame(loop); })();
  }

  /* ---------------- efeito "desmascarar" ---------------- */
  const reveal = (() => {
    const fig = $("#figure"), cv = $("#reveal"), ctx = cv.getContext("2d");
    const ring = document.createElement("canvas"), rctx = ring.getContext("2d");
    const imgA = new Image(), imgB = new Image();
    let w = 0, h = 0, dpr = 1, ready = 0;
    const tears = [], bits = [];
    const lens = { x: 0, y: 0, tx: 0, ty: 0, k: 0, on: false, pts: jag(30, 0.22), r: 0 };
    let last = null, lastInput = 0;

    function jag(n, amt) { return Array.from({ length: n }, (_, i) => 1 - amt / 2 + Math.random() * amt + (i % 3 === 0 ? -0.1 : 0)); }
    function resize() {
      const r = fig.getBoundingClientRect();
      dpr = Math.min(devicePixelRatio || 1, 2);
      w = r.width; h = r.height;
      cv.width = ring.width = Math.round(w * dpr);
      cv.height = ring.height = Math.round(h * dpr);
      lens.r = w * 0.17;
    }
    function spawn(x, y, big = 1) {
      tears.push({ x, y, r: w * (0.1 + Math.random() * 0.06) * big, born: performance.now(), life: 1300 + Math.random() * 700, rot: Math.random() * 6.28, pts: jag(26, 0.45) });
      if (tears.length > 40) tears.shift();
      if (!reduced) for (let i = 0; i < 3; i++) bits.push({ x, y, vx: (Math.random() - 0.5) * 2.4, vy: -Math.random() * 2 - 0.4, s: 3 + Math.random() * 5, a: 1 });
    }
    const outBack = (t) => 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2);
    function scaleOf(t, now) {
      const a = (now - t.born) / t.life;
      if (a >= 1) return -1;
      if (a < 0.16) return outBack(a / 0.16);
      if (a > 0.55) return 1 - Math.pow((a - 0.55) / 0.45, 3);
      return 1;
    }
    function shape(c, x, y, r, pts, rot, pad, now) {
      const n = pts.length;
      for (let i = 0; i <= n; i++) {
        const k = i % n, ang = (k / n) * Math.PI * 2 + rot;
        const wob = 1 + 0.05 * Math.sin(now / 260 + k * 1.9);
        const rr = r * pts[k] * wob + pad;
        const px = x + Math.cos(ang) * rr, py = y + Math.sin(ang) * rr * 1.08;
        i ? c.lineTo(px, py) : c.moveTo(px, py);
      }
      c.closePath();
    }
    function paths(c, pad, now, list) { c.beginPath(); for (const s of list) shape(c, s.x, s.y, s.r * s.k, s.pts, s.rot, pad, now); }

    function frame(now) {
      requestAnimationFrame(frame);
      if (ready < 2 || !w) return;
      // auto-revelar quando ninguém mexe (bom no celular)
      if (!reduced && now - lastInput > 2600 && Math.random() < 0.018) spawn(w * (0.38 + Math.random() * 0.24), h * (0.26 + Math.random() * 0.3));
      lens.k += ((lens.on ? 1 : 0) - lens.k) * 0.14;
      lens.x += (lens.tx - lens.x) * 0.25; lens.y += (lens.ty - lens.y) * 0.25;

      const list = [];
      for (let i = tears.length - 1; i >= 0; i--) { const k = scaleOf(tears[i], now); if (k < 0) tears.splice(i, 1); else { tears[i].k = Math.max(0, k); list.push(tears[i]); } }
      if (lens.k > 0.01) list.push({ x: lens.x, y: lens.y, r: lens.r, k: lens.k, pts: lens.pts, rot: 0 });

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(imgA, 0, 0, w, h);
      if (list.length) {
        // 1) abre o buraco na máscara
        ctx.globalCompositeOperation = "destination-out";
        paths(ctx, 0, now, list); ctx.fill();
        // 2) desenha o rosto dentro do buraco
        ctx.globalCompositeOperation = "source-over";
        ctx.save(); paths(ctx, 0, now, list); ctx.clip(); ctx.drawImage(imgB, 0, 0, w, h); ctx.restore();
        // 3) borda neon só onde existe a figura
        rctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        rctx.globalCompositeOperation = "source-over";
        rctx.clearRect(0, 0, w, h);
        rctx.fillStyle = "rgba(228,255,26,.35)"; paths(rctx, 10, now, list); rctx.fill();
        rctx.fillStyle = NEON; paths(rctx, 4, now, list); rctx.fill();
        rctx.fillStyle = "#fff"; paths(rctx, 1.2, now, list); rctx.fill();
        rctx.globalCompositeOperation = "destination-out"; paths(rctx, 0, now, list); rctx.fill();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalCompositeOperation = "source-atop";
        ctx.drawImage(ring, 0, 0);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.globalCompositeOperation = "source-over";
      }
      // fragmentos neon
      for (let i = bits.length - 1; i >= 0; i--) {
        const b = bits[i]; b.x += b.vx; b.y += b.vy; b.vy += 0.03; b.a -= 0.018;
        if (b.a <= 0) { bits.splice(i, 1); continue; }
        ctx.globalAlpha = b.a; ctx.fillStyle = i % 2 ? NEON : "#111"; ctx.fillRect(b.x, b.y, b.s, b.s);
      }
      ctx.globalAlpha = 1;
    }

    function local(e) { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    cv.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") { const p = local(e); lens.x = lens.tx = p.x; lens.y = lens.ty = p.y; lens.on = true; } });
    cv.addEventListener("pointerleave", () => { lens.on = false; last = null; });
    cv.addEventListener("pointermove", (e) => {
      const p = local(e); lastInput = performance.now();
      if (e.pointerType === "mouse") { lens.tx = p.x; lens.ty = p.y; lens.on = true; }
      if (!last || Math.hypot(p.x - last.x, p.y - last.y) > w * 0.055) { spawn(p.x, p.y); last = p; }
    });
    cv.addEventListener("pointerdown", (e) => { const p = local(e); lastInput = performance.now(); spawn(p.x, p.y, 1.5); });

    let loaded = 0;
    const onLoad = () => { ready++; window.__progress && window.__progress(++loaded / 2); };
    imgA.onload = imgB.onload = onLoad;
    imgA.onerror = imgB.onerror = onLoad;
    imgA.src = C.fotos.mascarado; imgB.src = C.fotos.rosto;
    resize();
    requestAnimationFrame(frame);
    return { resize, burst: (xp, yp) => spawn((xp / 100) * w, (yp / 100) * h, 1.8) };
  })();

  /* ---------------- pontos clicáveis ---------------- */
  const card = $("#spotCard");
  let activeSpot = null;
  $("#hotspots").innerHTML = C.pecas.map((p, i) => `
    <button class="spot" style="left:${p.x}%;top:${p.y}%" data-i="${i}" aria-label="${esc(p.titulo)}"><span class="mono">${esc(p.titulo)}</span></button>`).join("");
  function openSpot(i, btn) {
    const p = C.pecas[i];
    $("#spotCode").textContent = p.codigo;
    $("#spotTitle").textContent = p.titulo;
    $("#spotText").textContent = p.texto;
    $("#spotLvl").textContent = `NÍVEL ${p.nivel}%`;
    const m = $("#spotMeter"); m.style.width = "0"; requestAnimationFrame(() => requestAnimationFrame(() => (m.style.width = p.nivel + "%")));
    activeSpot && activeSpot.classList.remove("is-active");
    activeSpot = btn; btn.classList.add("is-active");
    card.classList.add("is-open");
    reveal.burst(p.x, p.y);
  }
  $("#hotspots").addEventListener("click", (e) => { const b = e.target.closest(".spot"); if (b) openSpot(+b.dataset.i, b); });
  $("#spotClose").addEventListener("click", () => { card.classList.remove("is-open"); activeSpot && activeSpot.classList.remove("is-active"); });

  /* ---------------- cards 3D dos projetos ---------------- */
  if (hasHover && !reduced) document.querySelectorAll(".proj").forEach((el) => {
    const inner = el.querySelector(".proj__inner");
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      inner.style.transform = `rotateY(${(x - 0.5) * 14}deg) rotateX(${(0.5 - y) * 12}deg) translateZ(10px)`;
      inner.style.setProperty("--mx", x * 100 + "%"); inner.style.setProperty("--my", y * 100 + "%");
    });
    el.addEventListener("pointerleave", () => (inner.style.transform = ""));
  });

  /* ---------------- carregamento + animações ---------------- */
  const loader = $("#loader"), num = $("#loaderNum"), bar = $("#loaderBar");
  let shown = 0, target = 0.2, done = false;
  window.__progress = (p) => (target = Math.max(target, p));
  const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
  fontsReady.then(() => (target = Math.max(target, 0.5)));
  (function count() {
    shown += (target - shown) * 0.12 + 0.003;
    if (shown > target) shown = target;
    num.textContent = Math.round(shown * 100); bar.style.width = shown * 100 + "%";
    if (shown >= 0.999 && !done) { done = true; setTimeout(start, 250); } else if (!done) requestAnimationFrame(count);
  })();
  setTimeout(() => { target = 1; }, 3500); // nunca trava no carregamento

  function start() {
    paintBg(); projCanvases(); reveal.resize();
    loader.classList.add("is-done");
    if (!G || reduced) { wordsOnScroll(); return; }
    G.registerPlugin(window.ScrollTrigger);
    const tl = G.timeline({ delay: 0.35, defaults: { ease: "expo.out" } });
    tl.from(".giant", { yPercent: 40, opacity: 0, duration: 1.4 })
      .from(".figure", { y: 120, opacity: 0, duration: 1.3 }, "<0.15")
      .from(".stripe--a", { xPercent: 60, opacity: 0, duration: 1.2 }, "<")
      .from(".stripe--b", { xPercent: -60, opacity: 0, duration: 1.2 }, "<")
      .from(".hud-top > *, .intro-card, .hint, .tag", { y: 16, opacity: 0, stagger: 0.06, duration: 0.8 }, "<0.4")
      .from(".spot", { scale: 0, stagger: 0.08, duration: 0.6, ease: "back.out(2)" }, "<0.2");

    // parallax da hero com o mouse
    if (hasHover) addEventListener("pointermove", (e) => {
      const dx = e.clientX / innerWidth - 0.5, dy = e.clientY / innerHeight - 0.5;
      G.to(".giant", { x: dx * -24, y: dy * -12, duration: 1, overwrite: "auto" });
      G.to(".stripe--a", { x: dx * 40, y: dy * 20, duration: 1.2, overwrite: "auto" });
      G.to(".stripe--b", { x: dx * -30, y: dy * -16, duration: 1.2, overwrite: "auto" });
    });

    // hero sai devagar ao rolar
    G.to(".giant", { yPercent: 30, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
    G.to(".figure", { y: -60, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });

    wordsOnScroll();

    G.utils.toArray(".stat, .skill").forEach((el, i) => G.from(el, { y: 60, opacity: 0, duration: 1, ease: "expo.out", delay: (i % 3) * 0.08, scrollTrigger: { trigger: el, start: "top 90%" } }));
    G.utils.toArray(".sec-head h2, .contact__big").forEach((el) => G.from(el, { yPercent: 30, opacity: 0, duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 88%" } }));
    G.utils.toArray(".link-row").forEach((el, i) => G.from(el, { x: -40, opacity: 0, duration: 0.9, delay: i * 0.07, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 95%" } }));

    // projetos: rolagem horizontal no computador
    const mm = G.matchMedia();
    mm.add("(min-width: 900px)", () => {
        const sec = $("#projetos"), track = $("#workTrack");
        sec.classList.add("is-horizontal");
        const dist = () => Math.max(0, track.scrollWidth - innerWidth + 80);
        const tw = G.to(track, { x: () => -dist(), ease: "none",
          scrollTrigger: { trigger: "#workPin", start: "top top", end: () => "+=" + dist(), pin: true, scrub: 0.6, invalidateOnRefresh: true } });
        return () => { sec.classList.remove("is-horizontal"); };
      });
    mm.add("(max-width: 899px)", () => {
        G.utils.toArray(".proj").forEach((el) => G.from(el, { y: 60, opacity: 0, duration: 1, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 90%" } }));
      });
    window.ScrollTrigger.refresh();
  }

  // texto do "Sobre" acende palavra por palavra
  function wordsOnScroll() {
    const ws = [...document.querySelectorAll("#aboutText .w")];
    if (reduced) { ws.forEach((w) => w.classList.add("on")); return; }
    const el = $("#aboutText");
    const upd = () => {
      const r = el.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (innerHeight * 0.85 - r.top) / (r.height + innerHeight * 0.35)));
      const n = Math.round(p * ws.length);
      ws.forEach((w, i) => w.classList.toggle("on", i < n));
    };
    addEventListener("scroll", upd, { passive: true }); upd();
  }
})();

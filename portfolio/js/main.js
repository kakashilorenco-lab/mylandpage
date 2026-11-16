/* =====================================================================
   PORTFÓLIO · main.js
   1) monta o conteúdo a partir de config.js
   2) liga o motion (Lenis + GSAP/ScrollTrigger), cena por cena, na ordem da página
   Sem GSAP ou com "menos movimento", tudo continua visível.
   ===================================================================== */
(() => {
  const C = window.PORTFOLIO;
  const d = document;
  const $ = (s, r = d) => r.querySelector(s);
  const $$ = (s, r = d) => [...r.querySelectorAll(s)];
  const G = window.gsap, ST = window.ScrollTrigger;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const motion = !!(G && ST && !reduced);
  if (!motion) d.documentElement.classList.add("no-motion");

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const rich = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<mark>$1</mark>").replace(/\*(.+?)\*/g, "<em>$1</em>");
  const pad = (n) => String(n).padStart(2, "0");

  /* =================== 1) CONTEÚDO =================== */
  d.title = `${C.nomeCompleto} — ${C.cargo}`;
  $$("[data-nome]").forEach((el) => (el.textContent = C.nome));
  $$("[data-nome-completo]").forEach((el) => (el.textContent = C.nomeCompleto));
  $$("[data-cargo]").forEach((el) => (el.textContent = C.cargo));
  $$("[data-cidade]").forEach((el) => (el.textContent = C.cidade));
  $$("[data-coord]").forEach((el) => (el.textContent = C.coordenadas));
  $$("[data-frase]").forEach((el) => (el.innerHTML = rich(C.frase)));
  $$("[data-acao]").forEach((el) => { el.href = C.acaoLink; el.target = "_blank"; el.rel = "noopener"; });
  $$("[data-acao-texto]").forEach((el) => (el.textContent = C.acaoTexto));
  $("#year").textContent = new Date().getFullYear();
  const clock = $("#clock");
  const tick = () => (clock.textContent = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
  tick(); setInterval(tick, 15000);

  // manifesto: cada palavra num span (para acender com a rolagem); **x** vira marca neon
  const man = $("#manifestoText");
  man.innerHTML = C.manifesto.split(/(\*\*.+?\*\*)/).map((part) => {
    const marked = /^\*\*/.test(part), txt = part.replace(/\*\*/g, "");
    const ws = txt.split(/\s+/).filter(Boolean).map((w) => `<span class="mw">${esc(w)}</span>`).join(" ");
    const pre = /^\s/.test(txt) ? " " : "", post = /\s$/.test(txt) ? " " : ""; // mantém os espaços originais
    return marked ? `<mark>${ws}</mark>` : pre + ws + post;
  }).join("");
  if (C.retrato) $("#retrato").innerHTML = `<img src="${esc(C.retrato)}" alt="Retrato de ${esc(C.nomeCompleto)}" loading="lazy" decoding="async">`;
  $("#stats").innerHTML =C.numeros.map((n) => `<div class="stat"><b data-count="${n.valor}" data-suf="${esc(n.sufixo)}">${n.valor}${esc(n.sufixo)}</b><span class="mono">${esc(n.rotulo)}</span></div>`).join("");

  const tapeWords = [C.cargo, ...C.skills.map((s) => s.titulo), C.cidade];
  const strip = tapeWords.map((w) => `<span>${esc(w)} <b>✦</b></span>`).join("");
  $("#tape").innerHTML = strip + strip;

  // skills
  $("#skillsGrid").innerHTML = C.skills.map((s, i) => `
    <button class="sk chamfer" data-i="${i}" data-cursor="Ver detalhes">
      <span class="sk__top mono"><span>${esc(s.codigo)}</span><span>${pad(i + 1)} / ${pad(C.skills.length)}</span></span>
      <span class="sk__icon"><span>${esc(s.titulo.slice(0, 2).toUpperCase())}</span></span>
      <h3>${esc(s.titulo)}</h3>
      <span class="sk__bar"><i style="width:${s.nivel}%"></i></span>
    </button>`).join("");

  // hotspots da hero
  $("#hotspots").innerHTML = C.pecas.map((p, i) => `<button class="spot" style="left:${p.x}%;top:${p.y}%" data-i="${i}" aria-label="${esc(p.titulo)}"><span class="mono">${esc(p.titulo)}</span></button>`).join("");

  // kit
  $("#kitPieces").innerHTML = C.kit.map((k, i) => `
    <div class="piece" data-i="${i}" data-cursor="${esc(k.tipo)}">
      <div class="piece__card chamfer"><span class="mono">KIT-${pad(i + 1)}</span><span class="piece__glyph">${esc(k.nome.slice(0, 2).toUpperCase())}</span><b>${esc(k.nome)}</b></div>
      <span class="piece__tag mono"><span>${pad(i + 1)}</span><span>${esc(k.tipo)}</span></span>
    </div>`).join("");

  // trajetória
  $("#routeStops").innerHTML = C.trajetoria.map((t, i) => `
    <div class="stop ${i % 2 ? "left" : ""}" data-i="${i}">
      <span class="stop__dot"></span>
      <div class="stop__card chamfer"><span class="mono">${pad(i + 1)} / ${pad(C.trajetoria.length)}</span><b>${esc(t.ano)}</b><h3>${esc(t.titulo)}</h3><p>${esc(t.texto)}</p></div>
    </div>`).join("");

  // processo
  $("#stepList").innerHTML = C.processo.map((s, i) => `<div class="step"><span class="mono">${pad(i + 1)} / ${pad(C.processo.length)}</span><h3>${esc(s.titulo)}.</h3><p>${esc(s.texto)}</p></div>`).join("");
  $("#segbar").style.setProperty("--n", C.processo.length);
  $("#segbar").innerHTML = "<i></i>".repeat(C.processo.length);

  // contato
  $("#links").innerHTML = C.contatos.map((c) => `<a class="link-row" href="${esc(c.link)}" target="_blank" rel="noopener" data-cursor="Abrir"><b>${esc(c.rotulo)}</b><span class="mono">${esc(c.valor)}</span><em>↗</em></a>`).join("");

  /* =================== utilidades =================== */
  function splitWords(el) {
    const out = [];
    const walk = (node) => [...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const frag = d.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach((p) => {
          if (!p) return;
          if (/^\s+$/.test(p)) { frag.append(" "); return; }
          const o = d.createElement("span"); o.className = "sw";
          const i = d.createElement("span"); i.textContent = p; o.append(i); frag.append(o); out.push(i);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1 && !n.classList.contains("sr")) walk(n);
    });
    walk(el); return out;
  }
  function scramble(el, dur = 800) {
    const final = el.dataset.final = el.dataset.final && el.dataset.final === el.textContent ? el.dataset.final : el.textContent;
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/#_";
    const t0 = performance.now();
    (function f(now) {
      const p = Math.min(1, (now - t0) / dur), n = Math.floor(p * final.length);
      el.textContent = final.slice(0, n) + final.slice(n).replace(/\S/g, () => chars[(Math.random() * chars.length) | 0]);
      if (p < 1) requestAnimationFrame(f); else el.textContent = final;
    })(t0);
  }
  const setText = (el, txt, scr) => { el.textContent = txt; el.dataset.final = txt; if (scr && motion) scramble(el, 450); };

  /* =================== fundo topográfico =================== */
  const topo = $("#topo");
  const paintTopo = () => window.FX.drawTopo(topo, { seed: 7 });

  /* =================== hero: desmascarar + pontos =================== */
  let loadP = 0;
  const reveal = window.FX.makeReveal({ fig: $("#figure"), cv: $("#reveal"), srcA: C.fotos.mascarado, srcB: C.fotos.rosto, reduced, onLoad: (p) => (loadP = p) });
  const card = $("#spotCard");
  let activeSpot = null;
  function openSpot(i, btn) {
    const p = C.pecas[i];
    $("#spotCode").textContent = p.codigo; $("#spotTitle").textContent = p.titulo; $("#spotText").textContent = p.texto;
    $("#spotLvl").textContent = `NÍVEL ${p.nivel}%`;
    const m = $("#spotMeter"); m.style.width = "0"; requestAnimationFrame(() => requestAnimationFrame(() => (m.style.width = p.nivel + "%")));
    activeSpot && activeSpot.classList.remove("is-active"); activeSpot = btn; btn.classList.add("is-active");
    card.classList.add("is-open"); reveal.burst(p.x, p.y);
  }
  $("#hotspots").addEventListener("click", (e) => { const b = e.target.closest(".spot"); if (b) openSpot(+b.dataset.i, b); });
  $("#spotClose").addEventListener("click", () => { card.classList.remove("is-open"); activeSpot && activeSpot.classList.remove("is-active"); });

  /* =================== skills: painel de detalhe =================== */
  const inspect = { code: $("#inCode"), num: $("#inNum"), title: $("#inTitle"), text: $("#inText"), meter: $("#inMeter"), lvl: $("#inLvl"), tags: $("#inTags") };
  let skActive = -1;
  function showSkill(i) {
    if (i === skActive) return; skActive = i;
    const s = C.skills[i];
    $$(".sk").forEach((b, k) => b.classList.toggle("is-active", k === i));
    setText(inspect.code, s.codigo, true); setText(inspect.title, s.titulo, true);
    inspect.num.textContent = pad(i + 1); inspect.text.textContent = s.texto; inspect.lvl.textContent = s.nivel + "%";
    inspect.tags.innerHTML = s.tags.map((t) => `<span>${esc(t)}</span>`).join("");
    inspect.meter.style.width = "0"; requestAnimationFrame(() => requestAnimationFrame(() => (inspect.meter.style.width = s.nivel + "%")));
    if (motion) G.fromTo(inspect.num, { yPercent: 30, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.7, ease: "expo.out" });
  }
  $("#skillsGrid").addEventListener("click", (e) => { const b = e.target.closest(".sk"); if (b) showSkill(+b.dataset.i); });
  if (fine) $("#skillsGrid").addEventListener("pointerover", (e) => { const b = e.target.closest(".sk"); if (b) showSkill(+b.dataset.i); });
  showSkill(0);

  /* =================== espiral de projetos =================== */
  const spiral = $("#spiral");
  const ring = d.createElement("div"); ring.className = "spiral__ring";
  ring.innerHTML = C.projetos.map((p, i) => `<a class="spiral__item" href="${esc(p.link || "#")}" data-cursor="Ver projeto"><div class="media chamfer" data-ph="${esc(p.titulo.toUpperCase())}">${p.imagem ? `<img src="${esc(p.imagem)}" alt="${esc(p.titulo)}" loading="lazy">` : ""}</div><span class="num">${pad(i + 1)}</span></a>`).join("");
  spiral.append(ring);
  spiral.dataset.cursor = "Arraste";
  const STEP = 360 / 6;
  function layoutSpiral(rot) {
    const R = Math.min(innerWidth * 0.42, 640), dy = innerWidth < 900 ? 36 : 70;
    $$(".spiral__item", ring).forEach((it, i) => {
      const a = i * STEP - rot, front = Math.cos(a * Math.PI / 180);
      it.style.transform = `rotateY(${a}deg) translateZ(${R}px) translateY(${(i - rot / STEP) * dy}px)`;
      it.style.filter = `brightness(${0.3 + Math.max(0, front) * 0.7})`;
      it.style.zIndex = Math.round(front * 100);
      it.style.pointerEvents = front > 0.6 ? "auto" : "none";
    });
    return Math.max(0, Math.min(C.projetos.length - 1, Math.round(rot / STEP)));
  }
  const wi = { name: $("#workName"), text: $("#workText"), idx: $("#workIdx"), type: $("#workType"), year: $("#workYear"), count: $("#workCount"), box: $("#workInfo") };
  function showWork(i) {
    const p = C.projetos[i];
    setText(wi.name, p.titulo, true); wi.text.textContent = p.texto; wi.type.textContent = p.tipo; wi.year.textContent = p.ano;
    wi.idx.textContent = `${pad(i + 1)} / ${pad(C.projetos.length)}`; wi.count.textContent = pad(i + 1); wi.box.href = p.link || "#";
  }

  /* =================== kit: posições finais das peças =================== */
  // metade das peças em fileiras acima do título, metade abaixo (o título fica livre)
  function layoutKit() {
    const n = C.kit.length, mob = innerWidth < 760, half = Math.ceil(n / 2);
    $$(".piece").forEach((el, i) => {
      const top = i < half, k = top ? i : i - half, inRow = top ? half : n - half;
      let x, y;
      if (mob) { const col = k % 2, row = Math.floor(k / 2); x = col ? 73 : 27; y = top ? 11 + row * 19 : 70 + row * 19; }
      else { x = 10 + (80 * (k + 0.5)) / inRow; y = (top ? 19 : 81) + (k % 2 ? 4 : -4) * (top ? 1 : -1); }
      el.style.setProperty("--x", x + "%"); el.style.setProperty("--y", y + "%");
      el.querySelector(".piece__card").style.transform = `rotate(${((i * 37) % 13) - 6}deg)`;
    });
  }
  layoutKit();

  /* =================== trajetória: caminho em zigue-zague =================== */
  const map = $("#routeMap"), svg = $("#routeSvg"), path = $("#routePath"), ghost = $("#routeGhost");
  let routeLen = 0, stopFracs = [];
  function layoutRoute() {
    const W = map.clientWidth, H = map.clientHeight, n = C.trajetoria.length, mob = innerWidth < 760;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    const pts = C.trajetoria.map((_, i) => [mob ? W * (i % 2 ? 0.16 : 0.08) : W * (i % 2 ? 0.72 : 0.22), H * (0.06 + (0.88 * i) / Math.max(1, n - 1))]);
    let dStr = `M ${W * 0.5} 0 C ${W * 0.5} ${pts[0][1] * 0.6}, ${pts[0][0]} ${pts[0][1] * 0.4}, ${pts[0][0]} ${pts[0][1]}`;
    for (let i = 1; i < n; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], my = (y0 + y1) / 2;
      dStr += ` C ${x0} ${my}, ${x1} ${my}, ${x1} ${y1}`;
    }
    dStr += ` C ${pts[n - 1][0]} ${H * 0.98}, ${W * 0.5} ${H * 0.96}, ${W * 0.5} ${H}`;
    path.setAttribute("d", dStr); ghost.setAttribute("d", dStr);
    routeLen = path.getTotalLength();
    // fração do caminho em que cada parada aparece
    stopFracs = pts.map(([x, y]) => {
      let best = 0, bd = Infinity;
      for (let s = 0; s <= 200; s++) { const p = path.getPointAtLength((s / 200) * routeLen), dd = (p.x - x) ** 2 + (p.y - y) ** 2; if (dd < bd) { bd = dd; best = s / 200; } }
      return best;
    });
    $$(".stop").forEach((el, i) => { el.style.setProperty("--x", pts[i][0] + "px"); el.style.setProperty("--y", pts[i][1] + "px"); });
    path.style.strokeDasharray = routeLen; path.style.strokeDashoffset = motion ? routeLen : 0;
  }
  layoutRoute();

  /* =================== textos gigantes cabem na tela =================== */
  function fit(el, frac) {
    if (!el) return;
    el.style.fontSize = "";
    const w = el.scrollWidth, max = innerWidth * frac;
    if (w > max) el.style.fontSize = parseFloat(getComputedStyle(el).fontSize) * (max / w) + "px";
  }
  const fitAll = () => { fit($("#giant"), 0.94); fit($("#contactBig"), 0.92); fit($("#ftWord"), 0.94); };
  fitAll();
  (d.fonts ? d.fonts.ready : Promise.resolve()).then(fitAll);

  /* =================== sem motion: mostra tudo e para =================== */
  if (!motion) {
    d.documentElement.classList.add("loaded");
    paintTopo(); layoutSpiral(0); showWork(0);
    $$(".mw").forEach((w) => w.classList.add("on")); $$(".stop").forEach((s) => s.classList.add("on"));
    addEventListener("resize", () => { fitAll(); paintTopo(); reveal.resize(); layoutKit(); layoutRoute(); layoutSpiral(0); });
    return;
  }

  /* =================== 2) MOTION =================== */
  G.registerPlugin(ST);
  G.defaults({ ease: "expo.out", duration: 1 });

  // rolagem suave
  let lenis = null;
  if (window.Lenis) {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on("scroll", ST.update);
    G.ticker.add((t) => lenis.raf(t * 1000)); G.ticker.lagSmoothing(0);
    lenis.stop(); // trava até o loader terminar
  }
  $$('a[href^="#"]').forEach((a) => a.addEventListener("click", (e) => {
    const t = $(a.getAttribute("href")); if (!t) return;
    e.preventDefault(); lenis ? lenis.scrollTo(t, { duration: 1.6 }) : t.scrollIntoView({ behavior: "smooth" });
  }));

  // cursor com rótulo
  if (fine) {
    const c = $("#cursor"), lab = $("#cursorLabel");
    const xTo = G.quickTo(c, "x", { duration: 0.3, ease: "power3" }), yTo = G.quickTo(c, "y", { duration: 0.3, ease: "power3" });
    addEventListener("pointermove", (e) => { xTo(e.clientX); yTo(e.clientY); c.classList.add("on"); });
    d.addEventListener("pointerleave", () => c.classList.remove("on"));
    d.addEventListener("pointerover", (e) => {
      const t = e.target.closest("[data-cursor], a, button, .figure");
      c.classList.toggle("big", !!t);
      const label = t ? t.dataset.cursor || (t.classList.contains("figure") ? "Revelar" : "") : "";
      lab.textContent = label; c.classList.toggle("has-label", !!label);
    });
  }
  $("#figure").dataset.cursor = "Revelar";

  // botões magnéticos
  if (fine) $$("[data-magnetic]").forEach((el) => {
    el.addEventListener("pointermove", (e) => { const r = el.getBoundingClientRect(); G.to(el, { x: (e.clientX - r.left - r.width / 2) * 0.3, y: (e.clientY - r.top - r.height / 2) * 0.35, duration: 0.4, ease: "power3" }); });
    el.addEventListener("pointerleave", () => G.to(el, { x: 0, y: 0, duration: 0.8, ease: "elastic.out(1, .4)" }));
  });

  // header acompanha a cena; barra de progresso e HUD
  const hd = $("#hd"), where = $("#where"), hudBar = $("#hudBar"), hudPct = $("#hudPct");
  const themed = $$("main > section, .ft, .panel");
  function setHeader() {
    const y = 40; let cur = null;
    for (const s of themed) { const r = s.getBoundingClientRect(); if (r.top <= y && r.bottom > y) cur = s; }
    if (!cur) return;
    if (hd.dataset.theme !== cur.dataset.theme) hd.dataset.theme = cur.dataset.theme;
    const sec = cur.closest("section") || cur;
    if (sec.dataset.label && where.dataset.final !== sec.dataset.label) { setText(where, sec.dataset.label, true); $$(".hd__nav a").forEach((a) => a.classList.toggle("on", a.getAttribute("href") === "#" + sec.id)); }
  }
  ST.create({ start: 0, end: "max", onUpdate: (s) => { G.set("#progress", { scaleX: s.progress }); hudBar.style.width = s.progress * 100 + "%"; hudPct.textContent = Math.round(s.progress * 100) + "%"; setHeader(); } });

  // títulos: palavras sobem
  const heroWords = [];
  $$("[data-split]").forEach((el) => G.from(splitWords(el), { yPercent: 115, rotate: 4, duration: 1.15, stagger: 0.05, scrollTrigger: { trigger: el, start: "top 88%" } }));
  ["#giant .giant__sharp", "#giant .giant__blur"].forEach((s) => heroWords.push($(s)));

  /* ---- 01 HERO ---- */
  G.to(".giant", { yPercent: 35, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
  G.to(".figure", { y: -80, scale: 0.94, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
  G.to(".stripe--a", { xPercent: 25, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
  G.to(".stripe--b", { xPercent: -25, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
  if (fine) {
    const gx = G.quickTo(".giant", "x", { duration: 1.2, ease: "power3" });
    addEventListener("pointermove", (e) => { if (scrollY < innerHeight) gx((e.clientX / innerWidth - 0.5) * -26); });
  }

  /* ---- 02 MANIFESTO ---- */
  G.from(".panel", { clipPath: "polygon(38px 0, 38px 0, 38px 100%, 38px 100%, 0 100%, 0 38px)", duration: 1.6, ease: "expo.inOut", scrollTrigger: { trigger: ".panel", start: "top 80%" } });
  const mws = $$(".mw");
  ST.create({ trigger: "#manifestoText", start: "top 78%", end: "bottom 42%", scrub: true,
    onUpdate: (s) => { const n = Math.round(s.progress * mws.length); mws.forEach((w, i) => w.classList.toggle("on", i < n)); } });
  G.from(".panel__frame", { yPercent: 18, rotate: 4, opacity: 0, duration: 1.4, scrollTrigger: { trigger: ".panel", start: "top 60%" } });
  $$("[data-count]").forEach((b) => {
    const end = +b.dataset.count, dec = String(end).includes(".") ? 1 : 0, o = { v: 0 };
    G.to(o, { v: end, duration: 2, ease: "power3.out", scrollTrigger: { trigger: b, start: "top 92%" }, onUpdate: () => (b.textContent = o.v.toFixed(dec).replace(".", ",") + b.dataset.suf) });
  });

  /* ---- 03 SKILLS ---- */
  G.from(".sk", { y: 70, opacity: 0, duration: 1.1, stagger: { each: 0.07, grid: "auto", from: "start" }, scrollTrigger: { trigger: "#skillsGrid", start: "top 85%" } });
  G.from(".inspect", { x: 60, opacity: 0, duration: 1.2, scrollTrigger: { trigger: ".skills__wrap", start: "top 80%" } });

  /* ---- transição: faixas ---- */
  const st = $$(".t-wipe__in i");
  G.timeline({ scrollTrigger: { trigger: ".t-wipe", start: "top top", end: "bottom bottom", scrub: 0.5 } })
    .to(st[0], { x: () => -innerWidth * 2.2, ease: "none", duration: 1 }, 0)
    .to(st[1], { x: () => -innerWidth * 2.2, ease: "none", duration: 1 }, 0.1)
    .to(st[2], { x: () => -innerWidth * 1.55, ease: "none", duration: 0.9 }, 0.22);

  /* ---- 04 PROJETOS: espiral ---- */
  {
    const maxRot = (C.projetos.length - 1) * STEP;
    let target = 0, rot = 0, drag = 0, active = -1, down = null;
    ST.create({ trigger: "#workPin", start: "top top", end: "+=" + C.projetos.length * 55 + "%", pin: true, scrub: true, onUpdate: (s) => (target = s.progress * maxRot) });
    spiral.addEventListener("pointerdown", (e) => { down = e.clientX; spiral.setPointerCapture(e.pointerId); });
    spiral.addEventListener("pointermove", (e) => { if (down === null) return; drag -= (e.clientX - down) * 0.25; down = e.clientX; });
    spiral.addEventListener("pointerup", () => (down = null));
    G.ticker.add(() => {
      drag *= 0.94;
      const want = Math.max(-STEP / 2, Math.min(maxRot + STEP / 2, target + drag));
      if (Math.abs(want - rot) < 0.01 && active > -1) return;
      rot += (want - rot) * 0.08;
      const i = layoutSpiral(rot);
      if (i !== active) { active = i; showWork(i); G.fromTo(wi.count, { yPercent: 10, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.8 }); }
    });
  }

  /* ---- transição: pixels ---- */
  const px = $("#pixels");
  { const cols = innerWidth < 760 ? 8 : 14, rows = Math.ceil(cols * innerHeight / innerWidth);
    px.style.setProperty("--cols", cols); px.innerHTML = "<b></b>".repeat(cols * rows); }
  G.to($$("#pixels b"), { scale: 1.02, ease: "none", stagger: { each: 0.004, from: "random" },
    scrollTrigger: { trigger: ".t-pixels", start: "top 55%", end: "bottom bottom", scrub: 0.4 } });

  /* ---- 05 KIT: peças saem do centro ---- */
  {
    const tl = G.timeline({ scrollTrigger: { trigger: "#kitPin", start: "top top", end: "+=170%", pin: true, scrub: 0.6 } });
    $$(".piece").forEach((el, i) => {
      tl.fromTo(el, { left: "50%", top: "50%", scale: 0.2, opacity: 0, rotate: (i % 2 ? 1 : -1) * 40 },
        { left: () => el.style.getPropertyValue("--x"), top: () => el.style.getPropertyValue("--y"), scale: 1, opacity: 1, rotate: 0, ease: "power3.out", duration: 1 }, i * 0.08);
    });
    tl.from(".kit__title", { scale: 0.7, opacity: 0, duration: 0.6, ease: "power2.out" }, 0).to({}, { duration: 0.6 });
  }

  /* ---- 06 TRAJETÓRIA: linha se desenha ---- */
  ST.create({ trigger: "#routeMap", start: "top 70%", end: "bottom 60%", scrub: 0.4,
    onUpdate: (s) => {
      path.style.strokeDashoffset = routeLen * (1 - s.progress);
      $$(".stop").forEach((el, i) => el.classList.toggle("on", s.progress >= stopFracs[i] - 0.01));
    } });
  $$(".stop__card").forEach((el) => G.from(el, { y: 50, opacity: 0, duration: 1.1, scrollTrigger: { trigger: el, start: "top 85%" } }));

  /* ---- 07 PROCESSO (só no computador) ---- */
  const mm = G.matchMedia();
  mm.add("(min-width: 901px)", () => {
    const steps = $$(".step"), num = $("#stepNum"), ringEl = $("#ring"), ringTxt = $("#ringTxt"), segs = $$("#segbar i");
    let cur = 0;
    ST.create({ trigger: "#processPin", start: "top top", end: "+=" + steps.length * 80 + "%", pin: true, scrub: true,
      onUpdate: (s) => {
        const p = s.progress, i = Math.min(steps.length - 1, Math.floor(p * steps.length));
        ringEl.style.strokeDashoffset = 326.7 * (1 - p); ringTxt.textContent = Math.round(p * 100) + "%";
        segs.forEach((g, k) => g.style.setProperty("--p", Math.max(0, Math.min(1, p * steps.length - k))));
        if (i !== cur) {
          G.to(steps[cur], { opacity: 0, y: -30, duration: 0.4, ease: "power2.in" });
          G.fromTo(steps[i], { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.7, delay: 0.15 });
          G.fromTo(num, { yPercent: i > cur ? 30 : -30, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.7 });
          num.textContent = i + 1; cur = i;
        }
      } });
  });

  /* ---- 08 CONTATO ---- */
  G.from(splitWords($("#contactBig")), { yPercent: 115, duration: 1.3, stagger: 0.08, scrollTrigger: { trigger: "#contactBig", start: "top 85%" } });
  G.from(".link-row", { x: -50, opacity: 0, duration: 1, stagger: 0.07, scrollTrigger: { trigger: "#links", start: "top 90%" } });
  G.from(".contact .btn", { scale: 0.6, opacity: 0, duration: 1, ease: "back.out(1.6)", scrollTrigger: { trigger: ".contact .btn", start: "top 92%" } });

  /* ---- RODAPÉ ---- */
  const word = $("#ftWord");
  word.innerHTML = [...word.textContent].map((ch) => `<span>${esc(ch)}</span>`).join("");
  G.from($$("span", word), { yPercent: 100, opacity: 0, stagger: 0.06, duration: 1.3, scrollTrigger: { trigger: word, start: "top 98%" } });
  G.from(".ft__cols > div", { y: 40, opacity: 0, stagger: 0.08, scrollTrigger: { trigger: ".ft", start: "top 85%" } });
  if (fine) { const ft = $(".ft"); ft.addEventListener("pointermove", (e) => { const r = ft.getBoundingClientRect(); ft.style.setProperty("--gx", e.clientX - r.left + "px"); ft.style.setProperty("--gy", e.clientY - r.top + "px"); }); }

  /* =================== LOADER + entrada =================== */
  const lines = ["Calibrando sensores", "Carregando peças do kit", "Mapeando trajetória", "Sistema pronto"];
  const log = $("#loaderLog"), num = $("#loaderNum"), bar = $("#loaderBar");
  const prog = { v: 0 };
  let shownLines = 0;
  const showLog = (p) => {
    const n = Math.min(lines.length, Math.floor(p * lines.length) + 1);
    if (n !== shownLines) { shownLines = n; log.innerHTML = lines.slice(0, n).map((l, i) => `<div>&gt; ${l}${i === n - 1 && p < 1 ? "…" : ' <b>OK</b>'}</div>`).join(""); }
  };
  const upd = () => { num.textContent = Math.round(prog.v * 100); bar.style.width = prog.v * 100 + "%"; showLog(prog.v); };
  const loadTw = G.to(prog, { v: 0.9, duration: 2.2, ease: "power2.out", onUpdate: upd });
  const ready = Promise.all([d.fonts ? d.fonts.ready : 0, new Promise((r) => (d.readyState === "complete" ? r() : addEventListener("load", r))),
    new Promise((r) => { const w = () => (loadP >= 1 ? r() : setTimeout(w, 50)); w(); })]);
  Promise.race([ready, new Promise((r) => setTimeout(r, 5000))]).then(() => {
    paintTopo(); reveal.resize();
    loadTw.kill();
    G.timeline()
      .to(prog, { v: 1, duration: 0.5, ease: "none", onUpdate: upd })
      .to("#loader", { clipPath: "inset(0 0 100% 0)", duration: 1.1, ease: "expo.inOut", onComplete: () => { d.documentElement.classList.add("loaded"); lenis && lenis.start(); } }, "+=.15")
      .from(heroWords, { yPercent: 40, opacity: 0, duration: 1.5, stagger: 0.1 }, "-=.55")
      .from(".figure", { y: 140, opacity: 0, duration: 1.4 }, "<.1")
      .from(".stripe--a", { xPercent: 60, opacity: 0, duration: 1.3 }, "<")
      .from(".stripe--b", { xPercent: -60, opacity: 0, duration: 1.3 }, "<")
      .from(".glass", { scaleY: 0, transformOrigin: "top", duration: 1.2 }, "<.2")
      .from(".hd > *, .intro-card, .hint, .tag, .hud-scroll, .cross", { y: 16, opacity: 0, stagger: 0.04, duration: 0.8 }, "<.3")
      .from(".spot", { scale: 0, stagger: 0.08, duration: 0.6, ease: "back.out(2)" }, "<.2");
    ST.sort(); ST.refresh();
  });

  let rt;
  addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { fitAll(); paintTopo(); reveal.resize(); layoutKit(); layoutRoute(); ST.refresh(); }, 200); });
})();

/* =====================================================================
   SITE-PREMIUM · main.js
   Motor de motion: Lenis (rolagem suave) + GSAP/ScrollTrigger.
   Cada bloco é independente: apague o que não usar.
   Sem GSAP (CDN fora) ou com "menos movimento", o site continua legível.
   ===================================================================== */
(() => {
  const d = document;
  const $ = (s, r = d) => r.querySelector(s);
  const $$ = (s, r = d) => [...r.querySelectorAll(s)];
  const G = window.gsap, ST = window.ScrollTrigger;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const motion = !!(G && ST && !reduced);
  if (!motion) d.documentElement.classList.add("no-motion");

  /* ---------- utilidades ---------- */
  const y = $("#year"); if (y) y.textContent = new Date().getFullYear();
  const clock = $("#clock");
  const tick = () => clock && (clock.textContent = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
  tick(); setInterval(tick, 20000);

  // Divide um título em palavras (mantém <em> e outras tags). Retorna os spans internos.
  function splitWords(el) {
    const out = [];
    const walk = (node) => [...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const frag = d.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach((p) => {
          if (!p) return;
          if (/^\s+$/.test(p)) { frag.append(" "); return; }
          const o = d.createElement("span"); o.className = "sw";
          const i = d.createElement("span"); i.textContent = p;
          o.append(i); frag.append(o); out.push(i);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1) walk(n);
    });
    walk(el);
    return out;
  }

  // Texto que "embaralha" e se resolve (efeito de terminal)
  function scramble(el, dur = 900) {
    const final = el.dataset.final || (el.dataset.final = el.textContent);
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/#_";
    const t0 = performance.now();
    (function f(now) {
      const p = Math.min(1, (now - t0) / dur), n = Math.floor(p * final.length);
      el.textContent = final.slice(0, n) + final.slice(n).replace(/\S/g, () => chars[(Math.random() * chars.length) | 0]);
      if (p < 1) requestAnimationFrame(f); else el.textContent = final;
    })(t0);
  }

  /* ---------- conteúdo da espiral (troque pelos projetos reais) ---------- */
  const WORKS = [
    { name: "Atlas Café", type: "Site institucional" }, { name: "Brisa Studio", type: "Portfólio" },
    { name: "Nórdica", type: "E-commerce" }, { name: "Kairo Bikes", type: "Landing de produto" },
    { name: "Lume", type: "Identidade visual" }, { name: "Verbo", type: "Editorial" },
    { name: "Ponto Fit", type: "Sistema de agenda" }, { name: "Maré", type: "Hotelaria" },
  ];
  const spiral = $("#spiral");
  let ring;
  if (spiral) {
    ring = d.createElement("div"); ring.className = "spiral__ring";
    ring.innerHTML = WORKS.map((w, i) => `<a class="spiral__item" href="#contato" data-i="${i}"><div class="media" data-ph="${w.name.toUpperCase()}"></div></a>`).join("");
    spiral.append(ring);
  }

  /* ---------- sem motion: mostra tudo e para aqui ---------- */
  if (!motion) {
    d.documentElement.classList.add("loaded");
    if (ring) layoutSpiral(0);
    return;
  }

  G.registerPlugin(ST);
  G.defaults({ ease: "expo.out", duration: 1 });

  /* ---------- rolagem suave (Lenis) ligada ao ScrollTrigger ---------- */
  let lenis = null;
  if (window.Lenis) {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on("scroll", ST.update);
    G.ticker.add((t) => lenis.raf(t * 1000));
    G.ticker.lagSmoothing(0);
  }
  $$('a[href^="#"]').forEach((a) => a.addEventListener("click", (e) => {
    const t = $(a.getAttribute("href")); if (!t) return;
    e.preventDefault(); lenis ? lenis.scrollTo(t, { duration: 1.4 }) : t.scrollIntoView({ behavior: "smooth" });
  }));

  /* ---------- cursor ---------- */
  if (fine) {
    const c = $("#cursor"); const m = { x: innerWidth / 2, y: innerHeight / 2 };
    const xTo = G.quickTo(c, "x", { duration: 0.35, ease: "power3" }), yTo = G.quickTo(c, "y", { duration: 0.35, ease: "power3" });
    addEventListener("pointermove", (e) => { xTo(e.clientX); yTo(e.clientY); c.classList.add("on"); });
    d.addEventListener("pointerover", (e) => c.classList.toggle("big", !!e.target.closest("a, button, summary, .spiral")));
    d.addEventListener("pointerleave", () => c.classList.remove("on"));
  }

  /* ---------- botões magnéticos ---------- */
  if (fine) $$("[data-magnetic]").forEach((el) => {
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      G.to(el, { x: (e.clientX - r.left - r.width / 2) * 0.3, y: (e.clientY - r.top - r.height / 2) * 0.35, duration: 0.4, ease: "power3" });
    });
    el.addEventListener("pointerleave", () => G.to(el, { x: 0, y: 0, duration: 0.8, ease: "elastic.out(1, .4)" }));
  });

  /* ---------- header: tema e seção atual acompanham a cena ---------- */
  const hd = $("#hd"), where = $("#where");
  $$("[data-theme]").filter((s) => s !== hd).forEach((sec) => ST.create({
    trigger: sec, start: "top 40px", end: "bottom 40px",
    onToggle: (self) => {
      if (!self.isActive) return;
      hd.dataset.theme = sec.dataset.theme;
      if (sec.dataset.label && where.textContent !== sec.dataset.label) { where.textContent = sec.dataset.label; scramble(where, 500); }
      $$(".hd__nav a").forEach((a) => a.classList.toggle("on", a.getAttribute("href") === "#" + sec.id));
    },
  }));
  G.to("#progress", { scaleX: 1, ease: "none", scrollTrigger: { start: 0, end: "max", scrub: 0.3 } });

  /* ---------- títulos: palavras sobem de dentro de uma máscara ---------- */
  const heroWords = [];
  $$("[data-split]").forEach((el) => {
    const w = splitWords(el);
    if (el.closest(".hero")) { heroWords.push(...w); G.set(w, { yPercent: 110 }); return; }
    G.from(w, { yPercent: 110, rotate: 3, duration: 1.1, stagger: 0.045, scrollTrigger: { trigger: el, start: "top 86%" } });
  });
  $$("[data-scramble]").forEach((el) => { if (!el.closest(".hero")) ST.create({ trigger: el, start: "top 90%", once: true, onEnter: () => scramble(el) }); });

  // entradas genéricas
  G.utils.toArray(".lead, .chip, .acc details, .ft__cols > div, .scene .btn").forEach((el) => {
    if (el.closest(".hero")) return;
    G.from(el, { y: 36, opacity: 0, duration: 1, scrollTrigger: { trigger: el, start: "top 92%" } });
  });
  $$("[data-wipe-reveal]").forEach((el) => G.fromTo(el, { clipPath: "inset(100% 0% 0% 0% round 22px)" }, { clipPath: "inset(0% 0% 0% 0% round 22px)", duration: 1.6, scrollTrigger: { trigger: el, start: "top 80%" } }));

  /* ---------- HERO: objeto 3D que reage ao mouse ---------- */
  const prismBox = $("#prism"), prism = $(".prism");
  if (prism) {
    const size = () => prism.style.setProperty("--h", prism.offsetWidth / 2 + "px");
    size(); addEventListener("resize", size);
    let rx = -18, ry = 30, tx = 0, ty = 0;
    if (fine) addEventListener("pointermove", (e) => { tx = (e.clientY / innerHeight - 0.5) * -30; ty = (e.clientX / innerWidth - 0.5) * 50; });
    G.ticker.add(() => { ry += 0.18; rx += (-18 + tx - rx) * 0.05; prism.style.transform = `rotateX(${rx}deg) rotateY(${ry + ty}deg)`; });
    G.to(prismBox, { yPercent: -30, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
  }
  G.to(".hero__ghost", { xPercent: -12, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });

  /* ---------- PROBLEMA: cena presa com troca de palavras ---------- */
  if ($("#problemPin")) {
    const secs = $("#secs");
    const tl = G.timeline({ defaults: { ease: "power2.inOut", duration: 1 }, scrollTrigger: {
      trigger: "#problemPin", start: "top top", end: "+=240%", pin: true, scrub: 0.6,
      onUpdate: (s) => secs && (secs.textContent = 1 + Math.floor(s.progress * 7)) } });
    tl.to(".problem__copy", { opacity: 0, y: -80 }, 1.2).to(".phone", { opacity: 0, scale: 0.85 }, 1.2);
    $$(".problem__words span").forEach((s, i, all) => {
      tl.fromTo(s, { opacity: 0, yPercent: 40, scale: 0.9 }, { opacity: 1, yPercent: 0, scale: 1, duration: 0.6 }, 2 + i);
      if (i < all.length - 1) tl.to(s, { opacity: 0, yPercent: -40, duration: 0.5 }, 2.7 + i);
    });
  }

  /* ---------- TRANSIÇÃO: faixas diagonais varrem a tela ---------- */
  if ($(".t-wipe")) {
    const st = $$(".t-wipe__pin i");
    G.timeline({ scrollTrigger: { trigger: ".t-wipe", start: "top top", end: "bottom bottom", scrub: 0.5 } })
      .to(st[0], { x: () => -innerWidth * 2.1, ease: "none", duration: 1 }, 0)
      .to(st[1], { x: () => -innerWidth * 2.1, ease: "none", duration: 1 }, 0.12)
      .to(st[2], { x: () => -innerWidth * 1.45, ease: "none", duration: 0.9 }, 0.24);
  }

  /* ---------- TRANSIÇÃO: grade de pixels ---------- */
  const px = $("#pixels");
  if (px) {
    const build = () => {
      const cols = innerWidth < 760 ? 8 : 14, rows = Math.ceil(cols * innerHeight / innerWidth);
      px.style.setProperty("--cols", cols);
      px.innerHTML = "<b></b>".repeat(cols * rows);
    };
    build();
    G.to($$("#pixels b"), { scale: 1.02, ease: "none", stagger: { each: 0.004, from: "random" },
      scrollTrigger: { trigger: ".t-pixels", start: "top 55%", end: "bottom bottom", scrub: 0.4 } });
  }

  /* ---------- TRABALHOS: espiral 3D (rolagem + arrastar) ---------- */
  function layoutSpiral(rot) {
    const n = WORKS.length, step = 360 / 6, R = Math.min(innerWidth * 0.42, 620), dy = innerWidth < 860 ? 40 : 70;
    $$(".spiral__item", ring).forEach((it, i) => {
      const a = i * step - rot;
      const front = Math.cos(a * Math.PI / 180);
      it.style.transform = `rotateY(${a}deg) translateZ(${R}px) translateY(${(i - rot / step) * dy}px)`;
      it.style.filter = `brightness(${0.35 + Math.max(0, front) * 0.65})`;
      it.style.zIndex = Math.round(front * 100);
      it.style.pointerEvents = front > 0.6 ? "auto" : "none";
    });
    return Math.max(0, Math.min(n - 1, Math.round(rot / step)));
  }
  if (ring) {
    const step = 360 / 6, maxRot = (WORKS.length - 1) * step;
    let target = 0, rot = 0, drag = 0, active = -1, down = null;
    ST.create({ trigger: "#workPin", start: "top top", end: "+=260%", pin: true, scrub: true, onUpdate: (s) => (target = s.progress * maxRot) });
    spiral.addEventListener("pointerdown", (e) => { down = e.clientX; spiral.setPointerCapture(e.pointerId); });
    spiral.addEventListener("pointermove", (e) => { if (down === null) return; drag -= (e.clientX - down) * 0.25; down = e.clientX; });
    spiral.addEventListener("pointerup", () => (down = null));
    const name = $("#workName"), type = $("#workType"), idx = $("#workIdx");
    G.ticker.add(() => {
      drag *= 0.94;
      const want = Math.max(-step / 2, Math.min(maxRot + step / 2, target + drag));
      rot += (want - rot) * 0.08;
      const i = layoutSpiral(rot);
      if (i !== active) {
        active = i;
        name.textContent = WORKS[i].name; type.textContent = WORKS[i].type;
        idx.textContent = String(i + 1).padStart(2, "0") + " / " + String(WORKS.length).padStart(2, "0");
        scramble(name, 450);
      }
    });
  }

  /* ---------- telas por tamanho ---------- */
  const mm = G.matchMedia();
  mm.add("(min-width: 861px)", () => {
    // SERVIÇOS: card anterior encolhe quando o próximo sobe
    const cards = $$(".stack__card");
    cards.slice(0, -1).forEach((c, i) => G.to(c, { scale: 0.92, opacity: 0.45, ease: "none",
      scrollTrigger: { trigger: cards[i + 1], start: "top bottom", end: "top 12%", scrub: true } }));

    // PROCESSO: passos presos com número grande, anel e barra
    const steps = $$(".step"), num = $("#stepNum"), ringEl = $("#ring"), ringTxt = $("#ringTxt"), segs = $$(".segbar i");
    let cur = 0;
    ST.create({ trigger: "#processPin", start: "top top", end: "+=" + steps.length * 90 + "%", pin: true, scrub: true,
      onUpdate: (s) => {
        const p = s.progress, i = Math.min(steps.length - 1, Math.floor(p * steps.length));
        ringEl.style.strokeDashoffset = 326.7 * (1 - p); ringTxt.textContent = Math.round(p * 100) + "%";
        segs.forEach((g, k) => g.style.setProperty("--p", Math.max(0, Math.min(1, p * steps.length - k))));
        if (i !== cur) {
          G.to(steps[cur], { opacity: 0, y: -30, duration: 0.4, ease: "power2.in" });
          G.fromTo(steps[i], { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.7, delay: 0.15 });
          G.fromTo(num, { yPercent: i > cur ? 40 : -40, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.7 });
          num.textContent = i + 1; cur = i;
        }
      } });
  });

  /* ---------- INCLUI e FAQ ---------- */
  $$(".chip").forEach((c) => c.addEventListener("click", () => c.setAttribute("aria-expanded", c.getAttribute("aria-expanded") !== "true")));
  $$(".acc details").forEach((det) => det.addEventListener("toggle", () => { if (det.open) G.from(det.querySelector("div"), { height: 0, opacity: 0, duration: 0.6 }); }));

  /* ---------- FOOTER: letras sobem e brilho segue o mouse ---------- */
  const word = $("#ftWord");
  if (word) {
    word.innerHTML = [...word.textContent].map((ch) => `<span>${ch}</span>`).join("");
    G.from($$("span", word), { yPercent: 100, opacity: 0, stagger: 0.06, duration: 1.2, scrollTrigger: { trigger: word, start: "top 95%" } });
    const ft = $(".ft");
    if (fine) ft.addEventListener("pointermove", (e) => { const r = ft.getBoundingClientRect(); ft.style.setProperty("--gx", e.clientX - r.left + "px"); ft.style.setProperty("--gy", e.clientY - r.top + "px"); });
  }

  /* ---------- LOADER + entrada da hero ---------- */
  const num = $("#loaderNum"); const counter = { v: 0 };
  const ready = Promise.all([d.fonts ? d.fonts.ready : 0, new Promise((r) => (d.readyState === "complete" ? r() : addEventListener("load", r)))]);
  const load = G.to(counter, { v: 92, duration: 1.6, ease: "power2.out", onUpdate: () => (num.textContent = Math.round(counter.v)) });
  Promise.race([ready, new Promise((r) => setTimeout(r, 4000))]).then(() => {
    load.kill();
    G.timeline()
      .to(counter, { v: 100, duration: 0.4, ease: "none", onUpdate: () => (num.textContent = Math.round(counter.v)) })
      .to("#loader", { yPercent: -100, duration: 1.1, ease: "expo.inOut", onComplete: () => d.documentElement.classList.add("loaded") })
      .from(".hero__ghost", { opacity: 0, scale: 1.08, duration: 1.6 }, "-=.5")
      .to(heroWords, { yPercent: 0, duration: 1.2, stagger: 0.06 }, "<.1")
      .from(".hero__visual", { opacity: 0, scale: 0.6, duration: 1.6 }, "<")
      .from(".hero .lead, .hero .btn, .hero__hint, .hd > *", { y: 24, opacity: 0, stagger: 0.06, duration: 0.9 }, "<.4")
      .add(() => $$(".hero [data-scramble]").forEach((el) => scramble(el)), "<");
    ST.sort(); ST.refresh();
  });
  addEventListener("resize", () => ring && layoutSpiral(0));
})();

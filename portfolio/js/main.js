/* =====================================================================
   PORTFÓLIO · main.js
   1) monta o conteúdo a partir de config.js
   2) define cada cena para o motor (js/engine.js): o que acontece
      quando ela entra (t) e ao longo da rolagem (p)
   ===================================================================== */
(() => {
  const C = window.PORTFOLIO, E = window.Engine, FX = window.FX;
  const { clamp, range, ease } = E;
  const d = document, $ = (s, r = d) => r.querySelector(s), $$ = (s, r = d) => [...r.querySelectorAll(s)];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const motion = !reduced;
  if (!motion) d.documentElement.classList.add("no-motion");
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const rich = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<mark>$1</mark>").replace(/\*(.+?)\*/g, "<em>$1</em>");
  const pad = (n) => String(n).padStart(2, "0");
  const T = (el, v) => { if (el) el.style.transform = v; };

  /* =================== 1) CONTEÚDO =================== */
  d.title = `${C.nomeCompleto} — ${C.cargo}`;
  $$("[data-nome]").forEach((el) => (el.textContent = C.nome));
  $$("[data-nome-completo]").forEach((el) => (el.textContent = C.nomeCompleto));
  $$("[data-cargo]").forEach((el) => (el.textContent = C.cargo));
  $$("[data-cidade]").forEach((el) => (el.textContent = C.cidade));
  $$("[data-coord]").forEach((el) => (el.textContent = C.coordenadas));
  $$("[data-frase]").forEach((el) => (el.innerHTML = rich(C.frase)));
  $$("[data-acao]").forEach((el) => { el.href = C.acaoLink; el.target = "_blank"; el.rel = "noopener"; el.dataset.cursor = "Abrir"; });
  $$("[data-acao-texto]").forEach((el) => (el.textContent = C.acaoTexto));
  $("#year").textContent = new Date().getFullYear();
  const clock = $("#clock");
  const tick = () => (clock.textContent = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
  tick(); setInterval(tick, 15000);

  // nome gigante: uma letra por span (nas duas faixas: nítida e desfocada)
  const letters = [...C.nome];
  $$(".giant__row").forEach((row) => (row.innerHTML = letters.map((ch) => `<span class="ch">${esc(ch)}</span>`).join("")));
  const giantRows = $$(".giant__row").map((row) => $$(".ch", row));

  // manifesto
  $("#manifestoText").innerHTML = C.manifesto.split(/(\*\*.+?\*\*)/).map((part) => {
    const marked = /^\*\*/.test(part), txt = part.replace(/\*\*/g, "");
    const ws = txt.split(/\s+/).filter(Boolean).map((w) => `<span class="mw">${esc(w)}</span>`).join(" ");
    const pre = /^\s/.test(txt) ? " " : "", post = /\s$/.test(txt) ? " " : "";
    return marked ? `<mark>${ws}</mark>` : pre + ws + post;
  }).join("");
  if (C.retrato) $("#retrato").innerHTML = `<img src="${esc(C.retrato)}" alt="Retrato de ${esc(C.nomeCompleto)}" decoding="async">`;
  $("#stats").innerHTML = C.numeros.map((n) => `<div class="stat"><b data-count="${n.valor}" data-suf="${esc(n.sufixo)}">${String(n.valor).replace(".", ",")}${esc(n.sufixo)}</b><span class="mono">${esc(n.rotulo)}</span></div>`).join("");

  // skills
  $("#skillsGrid").innerHTML = C.skills.map((s, i) => `
    <button class="sk chamfer" data-i="${i}" data-cursor="Ver detalhes">
      <span class="sk__top mono"><span>${esc(s.codigo)}</span><span>${pad(i + 1)} / ${pad(C.skills.length)}</span></span>
      <span class="sk__icon"><span>${esc(s.titulo.slice(0, 2).toUpperCase())}</span></span>
      <h3>${esc(s.titulo)}</h3>
      <span class="sk__bar"><i style="width:${s.nivel}%"></i></span>
    </button>`).join("");

  $("#hotspots").innerHTML = C.pecas.map((p, i) => `<button class="spot" style="left:${p.x}%;top:${p.y}%" data-i="${i}" aria-label="${esc(p.titulo)}" data-cursor="${esc(p.titulo)}"><span class="mono">${esc(p.titulo)}</span></button>`).join("");

  $("#kitPieces").innerHTML = C.kit.map((k, i) => `
    <div class="piece" data-i="${i}" data-cursor="${esc(k.tipo)}">
      <div class="piece__card chamfer"><span class="mono">KIT-${pad(i + 1)}</span><span class="piece__glyph">${esc(k.nome.slice(0, 2).toUpperCase())}</span><b>${esc(k.nome)}</b></div>
      <span class="piece__tag mono"><span>${pad(i + 1)}</span><span>${esc(k.tipo)}</span></span>
    </div>`).join("");

  $("#routeStops").innerHTML = C.trajetoria.map((t, i) => `
    <div class="stop ${i % 2 ? "left" : ""}"><span class="stop__dot"></span>
      <div class="stop__card chamfer"><span class="mono">${pad(i + 1)} / ${pad(C.trajetoria.length)}</span><b>${esc(t.ano)}</b><h3>${esc(t.titulo)}</h3><p>${esc(t.texto)}</p></div>
    </div>`).join("");

  $("#stepList").innerHTML = C.processo.map((s, i) => `<div class="step"><span class="mono">${pad(i + 1)} / ${pad(C.processo.length)}</span><h3>${esc(s.titulo)}.</h3><p>${esc(s.texto)}</p></div>`).join("");
  $("#segbar").style.setProperty("--n", C.processo.length);
  $("#segbar").innerHTML = "<i></i>".repeat(C.processo.length);

  $("#links").innerHTML = C.contatos.map((c) => `<a class="link-row" href="${esc(c.link)}" target="_blank" rel="noopener" data-cursor="Abrir"><b>${esc(c.rotulo)}</b><span class="mono">${esc(c.valor)}</span><em>↗</em></a>`).join("");

  // contato: letras soltas
  $$("#contactBig .cb__l").forEach((l) => (l.innerHTML = [...l.textContent].map((ch) => `<span class="ch">${ch === " " ? "&nbsp;" : esc(ch)}</span>`).join("")));
  const contactChars = $$("#contactBig .ch").map((el, i) => ({ el, dx: Math.sin(i * 12.9) * 60, dy: 40 + Math.cos(i * 7.3) * 50, r: Math.sin(i * 3.1) * 40 }));

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
      } else if (n.nodeType === 1) walk(n);
    });
    walk(el); return out;
  }
  function scramble(el, txt, dur = 450) {
    el.dataset.final = txt;
    if (!motion) { el.textContent = txt; return; }
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/#_", t0 = performance.now();
    (function f(now) {
      if (el.dataset.final !== txt) return;
      const p = Math.min(1, (now - t0) / dur), n = Math.floor(p * txt.length);
      el.textContent = txt.slice(0, n) + txt.slice(n).replace(/\S/g, () => chars[(Math.random() * chars.length) | 0]);
      if (p < 1) requestAnimationFrame(f); else el.textContent = txt;
    })(t0);
  }
  // título: palavras sobem de dentro da máscara conforme t (0→1)
  const titleIn = (words, t, a = 0.3, b = 1) => {
    const n = words.length;
    words.forEach((w, i) => {
      const s = range(t, a + ((b - a) * 0.45 * i) / Math.max(1, n), a + (b - a) * (0.55 + (0.45 * i) / Math.max(1, n)));
      const v = ease.expo(s);
      w.style.transform = v >= 1 ? "" : `translate3d(0, ${((1 - v) * 112).toFixed(1)}%, 0) rotate(${((1 - v) * 5).toFixed(2)}deg)`;
    });
  };
  // mouse suavizado (−0.5 … 0.5)
  const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
  if (fine) addEventListener("pointermove", (e) => { mouse.x = e.clientX / innerWidth - 0.5; mouse.y = e.clientY / innerHeight - 0.5; });

  /* =================== peças interativas =================== */
  // topo: revelar
  let photoP = 0;
  const reveal = FX.makeReveal({ fig: $("#figure"), cv: $("#reveal"), srcA: C.fotos.mascarado || null, srcB: C.fotos.rosto, focus: C.foco || [0.5, 0.15], reduced, onLoad: (p) => (photoP = p) });
  const card = $("#spotCard"); let activeSpot = null;
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

  // skills: painel de detalhe
  const ins = { code: $("#inCode"), num: $("#inNum"), title: $("#inTitle"), text: $("#inText"), meter: $("#inMeter"), lvl: $("#inLvl"), tags: $("#inTags") };
  let skActive = -1, skHoverUntil = 0;
  function showSkill(i) {
    if (i === skActive) return; skActive = i;
    const s = C.skills[i];
    $$(".sk").forEach((b, k) => b.classList.toggle("is-active", k === i));
    scramble(ins.code, s.codigo); scramble(ins.title, s.titulo);
    ins.num.textContent = pad(i + 1); ins.text.textContent = s.texto; ins.lvl.textContent = s.nivel + "%";
    ins.tags.innerHTML = s.tags.map((t) => `<span>${esc(t)}</span>`).join("");
    ins.meter.style.width = "0"; requestAnimationFrame(() => requestAnimationFrame(() => (ins.meter.style.width = s.nivel + "%")));
  }
  const pickSkill = (e) => { const b = e.target.closest(".sk"); if (b) { skHoverUntil = performance.now() + 5000; showSkill(+b.dataset.i); } };
  $("#skillsGrid").addEventListener("click", pickSkill);
  if (fine) $("#skillsGrid").addEventListener("pointerover", pickSkill);
  showSkill(0);

  // projetos: espiral 3D
  const spiral = $("#spiral"), ring = d.createElement("div"); ring.className = "spiral__ring";
  ring.innerHTML = C.projetos.map((p, i) => `<a class="spiral__item" href="${esc(p.link || "#")}" data-cursor="Ver projeto"><div class="media chamfer" data-ph="${esc(p.titulo.toUpperCase())}">${p.imagem ? `<img src="${esc(p.imagem)}" alt="${esc(p.titulo)}" loading="lazy">` : ""}</div><span class="num">${pad(i + 1)}</span></a>`).join("");
  spiral.append(ring); spiral.dataset.cursor = "Arraste";
  const items = $$(".spiral__item", ring), STEP = 360 / 6, maxRot = (C.projetos.length - 1) * STEP;
  // capa gerada para projetos ainda sem imagem: topografia neon + tela desenhada + título
  function coverArt(media, p, i) {
    const cv = d.createElement("canvas"); media.prepend(cv);
    const paint = () => {
      FX.drawTopo(cv, { seed: 21 + i * 5, scale: 0.008, step: 0.07, color: "228,255,26", alpha: 0.2, bg: "#121310", cell: 8 });
      const w = cv.clientWidth, h = cv.clientHeight, c = cv.getContext("2d"); if (!w) return;
      const fx = w * 0.46, fy = h * 0.16, fw = w * 0.48, fh = h * 0.62; // "tela" do projeto
      c.fillStyle = "rgba(14,14,12,.88)"; c.fillRect(fx, fy, fw, fh);
      c.strokeStyle = "rgba(228,255,26,.65)"; c.lineWidth = 1; c.strokeRect(fx + 0.5, fy + 0.5, fw, fh);
      c.fillStyle = "rgba(233,233,229,.18)"; c.fillRect(fx, fy, fw, h * 0.05);
      [0.18, 0.3, 0.42].forEach((k, j) => { c.fillStyle = j ? "rgba(233,233,229,.22)" : "#e4ff1a"; c.fillRect(fx + fw * 0.08, fy + fh * k, fw * (j ? 0.6 - j * 0.12 : 0.42), fh * (j ? 0.04 : 0.09)); });
      c.fillStyle = "rgba(228,255,26,.85)"; c.fillRect(fx + fw * 0.08, fy + fh * 0.62, fw * 0.3, fh * 0.12);
      c.fillStyle = "rgba(233,233,229,.12)"; c.fillRect(fx + fw * 0.5, fy + fh * 0.58, fw * 0.42, fh * 0.32);
      c.fillStyle = "#e9e9e5"; c.font = `900 ${Math.round(h * 0.13)}px Archivo, sans-serif`; c.textBaseline = "bottom";
      const words = p.titulo.toUpperCase().split(" "); words.forEach((wd, k) => c.fillText(wd, w * 0.05, h * 0.9 - (words.length - 1 - k) * h * 0.13));
      c.fillStyle = "#e4ff1a"; c.font = `600 ${Math.max(9, Math.round(h * 0.045))}px "JetBrains Mono", monospace`; c.textBaseline = "top";
      c.fillText(`${p.tipo.toUpperCase()} · ${p.ano}`, w * 0.05, h * 0.07);
    };
    paint(); (d.fonts ? d.fonts.ready : Promise.resolve()).then(paint);
    addEventListener("resize", paint);
  }
  items.forEach((it, i) => { if (!C.projetos[i].imagem) coverArt($(".media", it), C.projetos[i], i); });
  const wi = { name: $("#workName"), text: $("#workText"), idx: $("#workIdx"), type: $("#workType"), year: $("#workYear"), count: $("#workCount"), box: $("#workInfo") };
  let spin = { target: 0, rot: -STEP * 0.6, drag: 0, active: -1, down: null, on: false };
  function layoutSpiral(rot) {
    const R = Math.min(innerWidth * 0.42, 640), dy = innerWidth < 900 ? 34 : 66;
    items.forEach((it, i) => {
      const a = i * STEP - rot, front = Math.cos((a * Math.PI) / 180);
      it.style.transform = `rotateY(${a.toFixed(2)}deg) translateZ(${R}px) translateY(${((i - rot / STEP) * dy).toFixed(1)}px)`;
      it.style.filter = `brightness(${(0.28 + Math.max(0, front) * 0.72).toFixed(3)})`;
      it.style.zIndex = Math.round(front * 100);
      it.style.pointerEvents = front > 0.6 ? "auto" : "none";
    });
    return Math.max(0, Math.min(C.projetos.length - 1, Math.round(rot / STEP)));
  }
  function showWork(i) {
    const p = C.projetos[i];
    scramble(wi.name, p.titulo); wi.text.textContent = p.texto; wi.type.textContent = p.tipo; wi.year.textContent = p.ano;
    wi.idx.textContent = `${pad(i + 1)} / ${pad(C.projetos.length)}`; wi.count.textContent = pad(i + 1); wi.box.href = p.link || "#";
  }
  spiral.addEventListener("pointerdown", (e) => { spin.down = e.clientX; spiral.setPointerCapture(e.pointerId); });
  spiral.addEventListener("pointermove", (e) => { if (spin.down === null) return; spin.drag -= (e.clientX - spin.down) * 0.25; spin.down = e.clientX; });
  spiral.addEventListener("pointerup", () => (spin.down = null));
  (function spinLoop() {
    requestAnimationFrame(spinLoop);
    if (!spin.on && motion) return;
    spin.drag *= 0.94;
    const want = clamp(spin.target + spin.drag, -STEP / 2, maxRot + STEP / 2);
    if (Math.abs(want - spin.rot) < 0.01 && spin.active > -1) return;
    spin.rot += (want - spin.rot) * (motion ? 0.09 : 1);
    const i = layoutSpiral(spin.rot);
    if (i !== spin.active) { spin.active = i; showWork(i); }
  })();

  // kit: posições finais (fileiras acima e abaixo do título)
  const pieces = $$(".piece");
  let kitFinal = [];
  function layoutKit() {
    const box = $("#kitPieces").getBoundingClientRect(), W = box.width || innerWidth, H = box.height || innerHeight;
    const n = pieces.length, mob = innerWidth < 760, half = Math.ceil(n / 2);
    kitFinal = pieces.map((_, i) => {
      const top = i < half, k = top ? i : i - half, inRow = top ? half : n - half;
      let x, y;
      if (mob) { const col = k % 2, row = Math.floor(k / 2); x = col ? 0.73 : 0.27; y = top ? 0.13 + row * 0.19 : 0.68 + row * 0.19; }
      else { x = 0.1 + (0.8 * (k + 0.5)) / inRow; y = (top ? 0.2 : 0.8) + (k % 2 ? 0.04 : -0.04) * (top ? 1 : -1); }
      return { dx: (x - 0.5) * W, dy: (y - 0.5) * H, rot: ((i * 37) % 13) - 6, spin: (i % 2 ? 1 : -1) * (30 + i * 6) };
    });
  }
  const kitAt = (p) => pieces.forEach((el, i) => {
    const f = kitFinal[i]; if (!f) return;
    const v = ease.out(range(p, i * 0.045, 0.5 + i * 0.045));
    el.style.transform = `translate3d(${(f.dx * v).toFixed(1)}px, ${(f.dy * v).toFixed(1)}px, 0) rotate(${(f.rot + f.spin * (1 - v)).toFixed(1)}deg) scale(${(0.25 + 0.75 * v).toFixed(3)})`;
    el.style.opacity = Math.min(1, v * 1.6).toFixed(3);
  });

  // trajetória: caminho em zigue-zague e paradas
  const map = $("#routeMap"), svg = $("#routeSvg"), path = $("#routePath"), ghost = $("#routeGhost"), stops = $$(".stop");
  let routeLen = 0, stopY = [], mapH = 1;
  function layoutRoute() {
    const W = map.clientWidth, H = (mapH = map.clientHeight), n = C.trajetoria.length, mob = innerWidth < 760;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    const pts = C.trajetoria.map((_, i) => [mob ? W * (i % 2 ? 0.16 : 0.07) : W * (i % 2 ? 0.7 : 0.22), H * (0.06 + (0.86 * i) / Math.max(1, n - 1))]);
    let s = `M ${W * 0.5} 0 C ${W * 0.5} ${pts[0][1] * 0.6}, ${pts[0][0]} ${pts[0][1] * 0.4}, ${pts[0][0]} ${pts[0][1]}`;
    for (let i = 1; i < n; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], my = (y0 + y1) / 2; s += ` C ${x0} ${my}, ${x1} ${my}, ${x1} ${y1}`; }
    s += ` C ${pts[n - 1][0]} ${H * 0.97}, ${W * 0.5} ${H * 0.95}, ${W * 0.5} ${H}`;
    path.setAttribute("d", s); ghost.setAttribute("d", s);
    routeLen = path.getTotalLength(); path.style.strokeDasharray = routeLen;
    stopY = pts.map((p) => p[1]);
    stops.forEach((el, i) => { el.style.setProperty("--x", pts[i][0] + "px"); el.style.setProperty("--y", pts[i][1] + "px"); });
  }
  // desenha até a altura y (em px do mapa); o caminho desce sempre, então altura ≈ comprimento
  function routeAt(yMap) {
    const f = clamp(yMap / mapH);
    let lo = 0, hi = routeLen;
    for (let k = 0; k < 18; k++) { const mid = (lo + hi) / 2; if (path.getPointAtLength(mid).y < yMap) lo = mid; else hi = mid; }
    path.style.strokeDashoffset = (routeLen - (f >= 1 ? routeLen : lo)).toFixed(1);
    stops.forEach((el, i) => el.classList.toggle("on", yMap >= stopY[i] - 10));
  }

  // processo
  const stepEls = $$(".step"), stepNum = $("#stepNum"), ringEl = $("#ring"), ringTxt = $("#ringTxt"), segs = $$("#segbar i");
  let stepCur = -1;
  function processAt(p) {
    const n = stepEls.length;
    stepEls.forEach((el, k) => {
      const dd = (p - (k + 0.5) / n) * n;
      const o = clamp(1 - Math.abs(dd) * 1.7);
      el.style.opacity = o.toFixed(3);
      el.style.transform = `translate3d(0, ${(-dd * 46).toFixed(1)}px, 0)`;
    });
    const i = Math.min(n - 1, Math.floor(p * n));
    if (i !== stepCur) { stepCur = i; stepNum.textContent = i + 1; }
    const frac = p * n - i;
    stepNum.style.transform = `translate3d(0, ${(Math.max(0, frac - 0.75) * -120).toFixed(1)}px, 0)`;
    ringEl.style.strokeDashoffset = (326.7 * (1 - p)).toFixed(1); ringTxt.textContent = Math.round(p * 100) + "%";
    segs.forEach((g, k) => g.style.setProperty("--p", clamp(p * n - k).toFixed(3)));
  }

  // textos gigantes cabem na tela
  function fit(el, frac) { if (!el) return; el.style.fontSize = ""; const w = el.scrollWidth, max = innerWidth * frac; if (w > max) el.style.fontSize = parseFloat(getComputedStyle(el).fontSize) * (max / w) + "px"; }
  const fitAll = () => { fit($("#giant"), 0.94); fit($("#contactBig"), 0.92); fit($("#ftWord"), 0.94); };

  // rodapé: brilho segue o mouse
  if (fine) { const ft = $(".ft"); ft.addEventListener("pointermove", (e) => { const r = ft.getBoundingClientRect(); ft.style.setProperty("--gx", e.clientX - r.left + "px"); ft.style.setProperty("--gy", e.clientY - r.top + "px"); }); }

  // fundos topográficos das cenas claras
  const paintTopo = () => $$(".stage > .topo").forEach((cv, i) => FX.drawTopo(cv, { seed: 7 + i * 3 }));

  /* =================== sem motor: tudo parado e visível =================== */
  fitAll(); layoutKit(); layoutRoute();
  (d.fonts ? d.fonts.ready : Promise.resolve()).then(() => { fitAll(); layoutRoute(); });
  if (!motion) {
    d.documentElement.classList.add("loaded", "ready");
    paintTopo(); kitAt(1); routeAt(mapH); processAt(0); layoutSpiral(0); showWork(0);
    $$(".mw").forEach((w) => w.classList.add("on")); $$(".man__text mark").forEach((m) => { m.classList.add("lit"); m.style.setProperty("--mk", "100%"); });
    addEventListener("resize", () => { fitAll(); paintTopo(); reveal.resize(); layoutKit(); kitAt(1); layoutRoute(); routeAt(mapH); });
    return;
  }

  /* =================== 2) CENAS =================== */
  const titles = {};
  $$("[data-split]").forEach((el) => (titles[el.closest(".scene").id] = splitWords(el)));
  const mws = $$(".mw"), marks = $$(".man__text mark").map((m) => ({ m, last: $$(".mw", m).pop() }));
  const counts = $$("[data-count]").map((b) => ({ b, end: +b.dataset.count, suf: b.dataset.suf, dec: String(b.dataset.count).includes(".") ? 1 : 0 }));
  const sk = $$(".sk");
  let heroP = 0, heroOn = true;

  const scenes = [
    { id: "topo", len: 2.2,
      update: (p) => (heroP = p),
      onToggle: (v) => { heroOn = v; reveal.setVisible(v); } },

    { id: "manifesto", len: 2.6, enterFx: "steps",
      enter: (t) => {
        T($("#manPhoto"), `translate3d(0, ${((1 - ease.out(t)) * 18).toFixed(2)}vh, 0) rotate(${((1 - ease.out(t)) * 6).toFixed(2)}deg)`);
        $(".manifesto .label").style.opacity = range(t, 0.5, 0.9).toFixed(3);
      },
      update: (p) => {
        const n = Math.round(range(p, 0.02, 0.62) * mws.length);
        mws.forEach((w, i) => w.classList.toggle("on", i < n));
        marks.forEach(({ m, last }) => { const lit = last.classList.contains("on"); if (lit !== m.classList.contains("lit")) { m.classList.toggle("lit", lit); m.style.setProperty("--mk", lit ? "100%" : "0%"); } });
        counts.forEach(({ b, end, suf, dec }) => (b.textContent = (end * ease.out(range(p, 0.5, 0.82))).toFixed(dec).replace(".", ",") + suf));
        T($(".man__frame"), `translate3d(0, ${((0.5 - p) * 10).toFixed(2)}vh, 0)`);
        T($(".chev--c"), `translate3d(${(-p * 12).toFixed(2)}vw, ${(-p * 8).toFixed(2)}vh, 0)`);
      } },

    { id: "skills", len: 3, enterFx: "diag",
      enter: (t) => titleIn(titles.skills, t),
      update: (p) => {
        sk.forEach((el, k) => {
          const v = ease.expo(range(p, k * 0.035, 0.18 + k * 0.035));
          el.style.transform = v >= 1 ? "" : `translate3d(0, ${((1 - v) * 80).toFixed(1)}px, 0) rotateX(${((1 - v) * -40).toFixed(1)}deg) scale(${(0.9 + 0.1 * v).toFixed(3)})`;
          el.style.opacity = v.toFixed(3);
        });
        T($("#inspect"), `translate3d(${((1 - ease.expo(range(p, 0.05, 0.3))) * 60).toFixed(1)}px, 0, 0)`);
        if (performance.now() > skHoverUntil) showSkill(Math.min(C.skills.length - 1, Math.floor(range(p, 0.3, 0.98) * C.skills.length)));
      } },

    { id: "projetos", len: 4.2, enterFx: "circle", enterArgs: [0.5, 0.55],
      enter: (t) => titleIn(titles.projetos, t),
      update: (p) => (spin.target = range(p, 0.04, 0.96) * maxRot),
      onToggle: (v) => (spin.on = v) },

    { id: "kit", len: 2.6, enterFx: "columns",
      enter: (t) => titleIn(titles.kit, t, 0.25, 0.9),
      update: (p) => { kitAt(range(p, 0, 0.8)); T($(".kit__title"), `scale(${(1.08 - 0.08 * ease.out(range(p, 0, 0.6))).toFixed(3)})`); },
      measure: () => { layoutKit(); } },

    { id: "trajetoria", len: 1, enterFx: "steps",
      enter: (t) => titleIn(titles.trajetoria, t),
      update: (p, s) => {
        const shift = s.overflow * range(p, 0.05, 0.95);
        const yMap = shift + innerHeight * 0.62 - map.offsetTop;
        routeAt(yMap);
      } },

    { id: "processo", len: 3.2, enterFx: "diag",
      enter: (t) => titleIn(titles.processo, t),
      update: (p) => processAt(range(p, 0.02, 0.98)) },

    { id: "contato", len: 1.8, enterFx: "circle", enterArgs: [0.85, 0.85],
      enter: (t) => contactChars.forEach(({ el, dx, dy, r }, i) => {
        const v = ease.expo(range(t, 0.35 + i * 0.018, 0.8 + i * 0.018));
        el.style.transform = v >= 1 ? "" : `translate3d(${(dx * (1 - v)).toFixed(1)}px, ${(dy * (1 - v)).toFixed(1)}%, 0) rotate(${(r * (1 - v)).toFixed(1)}deg)`;
        el.style.opacity = Math.min(1, v * 2).toFixed(3);
      }),
      update: (p) => $$(".link-row").forEach((el, i) => { const v = ease.expo(range(p, i * 0.06, 0.4 + i * 0.06)); el.style.transform = v >= 1 ? "" : `translate3d(${((1 - v) * -60).toFixed(1)}px,0,0)`; el.style.opacity = v.toFixed(3); }) },
  ].map((s) => ({ ...s, el: $("#" + s.id) }));

  /* ---------- topo: rolagem + mouse juntos, a cada quadro ---------- */
  const hero = { giant: $("#giant"), fig: $("#figure"), a: $(".chev--a"), b: $(".chev--b"), blob: $(".amb--blob"), intro: $(".hero .intro"), hint: $(".hero .hint") };
  let introT = 0; // 0→1 na entrada depois do carregamento
  (function heroLoop() {
    requestAnimationFrame(heroLoop);
    mouse.sx += (mouse.x - mouse.sx) * 0.06; mouse.sy += (mouse.y - mouse.sy) * 0.06;
    if (!heroOn) return;
    const p = heroP, pe = ease.inOut(range(p, 0, 0.9)), it = ease.expo(introT), n = letters.length;
    giantRows.forEach((row) => row.forEach((ch, i) => {
      const c = i - (n - 1) / 2;
      const rise = (1 - ease.expo(range(introT, i * 0.06, 0.55 + i * 0.06))) * 110;
      ch.style.transform = `translate3d(${(c * pe * 9 + mouse.sx * -2.4).toFixed(2)}vw, ${(rise - pe * 8).toFixed(2)}%, 0) rotate(${(c * pe * 6).toFixed(2)}deg)`;
    }));
    hero.giant.style.opacity = (1 - range(p, 0.55, 0.95)).toFixed(3);
    T(hero.fig, `translate3d(${(mouse.sx * 14).toFixed(1)}px, ${((1 - it) * 14 + -p * 6).toFixed(2)}vh, 0) scale(${(1 - 0.1 * pe).toFixed(4)})`);
    hero.fig.style.opacity = it.toFixed(3);
    T(hero.a, `translate3d(${((1 - it) * 30 + p * 14 + mouse.sx * 3).toFixed(2)}vw, ${(-p * 10 + mouse.sy * 3).toFixed(2)}vh, 0)`);
    T(hero.b, `translate3d(${(-(1 - it) * 30 - p * 16 + mouse.sx * -3).toFixed(2)}vw, ${(p * 8).toFixed(2)}vh, 0)`);
    T(hero.blob, `translate3d(${(mouse.sx * 8).toFixed(2)}vw, ${(mouse.sy * 6 - p * 10).toFixed(2)}vh, 0)`);
    const fade = (1 - range(p, 0, 0.35)).toFixed(3);
    hero.intro.style.opacity = fade; hero.hint.style.opacity = fade;
  })();

  /* ---------- rolagem suave + motor ---------- */
  let lenis = null;
  if (window.Lenis) {
    lenis = new Lenis({ lerp: 0.12, wheelMultiplier: 1, smoothWheel: true });
    (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(performance.now());
    lenis.stop();
  }
  const hd = $("#hd"), where = $("#where"), progress = $("#progress"), hudBar = $("#hudBar"), hudPct = $("#hudPct");
  let curScene = null;
  const engine = E.create({
    scenes, lenis,
    onFrame: ({ list, progress: pr }) => {
      progress.style.transform = `scaleX(${pr.toFixed(4)})`; hudBar.style.width = pr * 100 + "%"; hudPct.textContent = Math.round(pr * 100) + "%";
      let cur = null;
      for (let k = list.length - 1; k >= 0; k--) { const s = list[k]; if (s.on && s.lastT >= 0.5) { cur = s; break; } }
      const ftTop = $(".ft").getBoundingClientRect().top;
      const theme = ftTop < 40 ? "dark" : cur ? cur.el.dataset.theme : "dark";
      if (hd.dataset.theme !== theme) hd.dataset.theme = theme;
      if (cur && cur !== curScene) {
        curScene = cur; scramble(where, cur.el.dataset.label);
        $$(".hd__nav a").forEach((a) => a.classList.toggle("on", a.getAttribute("href") === "#" + cur.el.id));
      }
    },
  });
  // âncoras levam ao começo de cada cena
  $$('a[href^="#"]').forEach((a) => a.addEventListener("click", (e) => {
    const id = a.getAttribute("href").slice(1);
    if (!id) { e.preventDefault(); return; } // link de projeto ainda sem endereço
    const s = engine.list.find((x) => x.el.id === id);
    if (!s) return; e.preventDefault(); engine.scrollTo(s);
  }));

  /* ---------- cursor e botões magnéticos ---------- */
  if (fine) {
    const c = $("#cursor"), lab = $("#cursorLabel"); let cx = innerWidth / 2, cy = innerHeight / 2, tx = cx, ty = cy;
    addEventListener("pointermove", (e) => { tx = e.clientX; ty = e.clientY; c.classList.add("on"); });
    d.addEventListener("pointerleave", () => c.classList.remove("on"));
    d.addEventListener("pointerover", (e) => {
      const t = e.target.closest("[data-cursor], a, button, .figure");
      const label = t ? t.dataset.cursor || (t.classList.contains("figure") ? "Revelar" : "") : "";
      c.classList.toggle("big", !!t); lab.textContent = label; c.classList.toggle("has-label", !!label);
    });
    (function loop() { requestAnimationFrame(loop); cx += (tx - cx) * 0.2; cy += (ty - cy) * 0.2; c.style.transform = `translate3d(${cx}px, ${cy}px, 0)`; })();
    $$("[data-magnetic]").forEach((el) => {
      let mx = 0, my = 0, ox = 0, oy = 0, on = false;
      el.addEventListener("pointermove", (e) => { const r = el.getBoundingClientRect(); mx = (e.clientX - r.left - r.width / 2) * 0.3; my = (e.clientY - r.top - r.height / 2) * 0.35; on = true; });
      el.addEventListener("pointerleave", () => { mx = my = 0; });
      (function loop() { requestAnimationFrame(loop); ox += (mx - ox) * 0.15; oy += (my - oy) * 0.15; if (on) el.style.transform = `translate3d(${ox.toFixed(2)}px, ${oy.toFixed(2)}px, 0)`; if (on && !mx && Math.abs(ox) < 0.05) { on = false; el.style.transform = ""; } })();
    });
  }

  /* ---------- carregamento → entrada do topo ---------- */
  const lines = ["Calibrando sensores", "Escaneando rosto", "Carregando o kit", "Sistema pronto"];
  const log = $("#loaderLog"), num = $("#loaderNum"), bar = $("#loaderBar"), loader = $("#loader");
  let shown = 0, target = 0.15, shownLines = 0, done = false;
  const t0 = performance.now();
  const ready = () => target = Math.max(target, 1);
  Promise.all([d.fonts ? d.fonts.ready : 0, new Promise((r) => (d.readyState === "complete" ? r() : addEventListener("load", r))), new Promise((r) => { const w = () => (photoP >= 1 ? r() : setTimeout(w, 40)); w(); })]).then(ready);
  setTimeout(ready, 5000);
  (function count(now) {
    if (done) return;
    requestAnimationFrame(count);
    const cap = Math.min(target, 0.4 + (now - t0) / 2600); // nunca rápido demais para ler
    shown += (cap - shown) * 0.08 + 0.002; shown = Math.min(shown, cap);
    num.textContent = Math.round(shown * 100); bar.style.width = shown * 100 + "%";
    const nl = Math.min(lines.length, Math.floor(shown * lines.length) + 1);
    if (nl !== shownLines) { shownLines = nl; log.innerHTML = lines.slice(0, nl).map((l, i) => `<div>&gt; ${l}${i === nl - 1 && shown < 0.99 ? "…" : " <b>OK</b>"}</div>`).join(""); }
    if (shown >= 0.999) { done = true; start(); }
  })(t0);
  function start() {
    fitAll(); paintTopo(); reveal.resize(); engine.measure();
    loader.classList.add("is-out");
    setTimeout(() => { d.documentElement.classList.add("ready"); lenis && lenis.start(); }, 250);
    setTimeout(() => d.documentElement.classList.add("loaded"), 1200);
    const s0 = performance.now();
    (function intro(now) { introT = Math.min(1, (now - s0 - 350) / 1600); if (introT < 1) requestAnimationFrame(intro); })(s0);
  }
  addEventListener("resize", () => { fitAll(); paintTopo(); reveal.resize(); layoutRoute(); });
})();

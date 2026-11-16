/* =====================================================================
   MOTOR DE CENAS — cenas empilhadas controladas pela rolagem
   ---------------------------------------------------------------------
   Cada <section class="scene"> vira um "trilho" de rolagem; o conteúdo
   (.stage) fica fixo na tela. A cada quadro o motor calcula, para cada
   cena, onde a rolagem está e chama:
     enter(t)   t: 0→1 enquanto a cena CRESCE por cima da anterior
     update(p)  p: 0→1 ao longo da cena (tudo que acompanha a rolagem)
   e escreve --exit (0→1) quando a próxima cena começa a cobri-la.
   Conteúdo maior que a tela rola por dentro do palco automaticamente.
   Sem JS (ou com "menos movimento") as cenas ficam no fluxo normal.
   ===================================================================== */
window.Engine = (() => {
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const range = (p, a, b) => clamp((p - a) / (b - a));
  const ease = {
    out: (t) => 1 - Math.pow(1 - t, 3),
    expo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  };

  /* ---------- transições de entrada (clip-path desenhado pela rolagem) ---------- */
  const pct = (v) => (v * 100).toFixed(3) + "%";
  const clips = {
    // degraus crescendo do canto inferior esquerdo
    steps(t, n = 7) {
      const f = ease.inOut(t) * 2.15; // frente diagonal (x + y)
      const pts = ["0% 100%"];
      for (let i = 0; i <= n; i++) {
        const x = i / n, y = clamp(1 - Math.max(0, f - x)); // altura alcançada nesta coluna
        const yq = Math.round(y * n) / n; // quantiza em degraus
        pts.push(`${pct(x)} ${pct(yq)}`, `${pct(Math.min(1, x + 1 / n))} ${pct(yq)}`);
      }
      pts.push("100% 100%");
      return `polygon(${pts.join(",")})`;
    },
    // faixa diagonal varrendo da direita para a esquerda
    diag(t) {
      const e = ease.inOut(t), a = 1.35 - e * 1.7;
      return `polygon(${pct(a)} 0%, 100% 0%, 100% 100%, ${pct(a - 0.35)} 100%)`;
    },
    // círculo abrindo a partir de um ponto
    circle(t, x = 0.5, y = 0.6) {
      return `circle(${(ease.inOut(t) * 125).toFixed(2)}% at ${pct(x)} ${pct(y)})`;
    },
    // colunas subindo em sequência
    columns(t, n = 6) {
      const pts = [];
      for (let c = 0; c < n; c++) {
        const h = ease.out(clamp(t * 1.6 - c * 0.12));
        const x0 = c / n, x1 = (c + 1) / n;
        pts.push(`${pct(x0)} 100%`, `${pct(x0)} ${pct(1 - h)}`, `${pct(x1)} ${pct(1 - h)}`, `${pct(x1)} 100%`);
      }
      return `polygon(${pts.join(",")})`;
    },
  };

  function create({ scenes, lenis = null, onFrame = null }) {
    const root = document.documentElement;
    root.classList.add("engine");
    let vh = innerHeight, lastY = -1, dirty = true;
    const list = scenes.map((s, i) => ({
      ...s, i,
      stage: s.el.querySelector(".stage"),
      inner: s.el.querySelector(".stage__inner"),
      len: s.len || 1, on: false, lastT: -1, lastP: -1, lastE: -1,
    }));
    list.forEach((s) => { s.stage.style.zIndex = 10 + s.i; });

    function measure() {
      vh = innerHeight;
      list.forEach((s) => {
        s.inner.style.transform = "";
        const ih = s.inner.scrollHeight;
        s.overflow = Math.max(0, ih - vh);
        s.total = Math.max(s.len, 1 + s.overflow / vh + (s.overflow ? 0.35 : 0));
        s.el.style.height = s.total * vh + "px";
      });
      list.forEach((s) => (s.top = s.el.offsetTop));
      list.forEach((s) => s.measure && s.measure(s));
      dirty = true;
    }

    function frame() {
      requestAnimationFrame(frame);
      const y = lenis ? lenis.animatedScroll : scrollY;
      if (y === lastY && !dirty) return;
      lastY = y; dirty = false;
      let top = null;
      for (const s of list) {
        const local = (y - s.top) / vh;           // em telas
        const isLast = s.i === list.length - 1;
        const vis = local > -1 && (isLast ? local < s.total + 1 : local < s.total);
        if (vis !== s.on) { s.on = vis; s.stage.classList.toggle("is-on", vis); s.onToggle && s.onToggle(vis); }
        if (!vis) continue;
        top = s;
        // entrada
        const t = clamp(local + 1);
        if (t !== s.lastT) {
          s.lastT = t;
          s.stage.style.clipPath = s.i === 0 || t >= 1 ? "none" : clips[s.enterFx || "steps"](t, ...(s.enterArgs || []));
          s.enter && s.enter(t, s);
        }
        // progresso interno
        const span = Math.max(0.0001, s.total - 1);
        const p = clamp(local / span);
        if (p !== s.lastP) {
          s.lastP = p;
          if (s.overflow) s.inner.style.transform = `translate3d(0, ${(-s.overflow * range(p, 0.05, 0.95)).toFixed(1)}px, 0)`;
          s.update && s.update(p, s);
        }
        // saída (a próxima cena cobrindo)
        const e = isLast ? 0 : clamp(local - (s.total - 1));
        if (e !== s.lastE) { s.lastE = e; s.stage.style.setProperty("--exit", e.toFixed(4)); }
      }
      onFrame && onFrame({ y, vh, top, list, progress: clamp(y / Math.max(1, document.documentElement.scrollHeight - vh)) });
    }

    let rt;
    addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(measure, 150); });
    measure();
    requestAnimationFrame(frame);
    return { measure, list, scrollTo: (s) => { const y = s.top + 2; lenis ? lenis.scrollTo(y, { duration: 1.6 }) : scrollTo({ top: y, behavior: "smooth" }); } };
  }

  return { create, clamp, range, ease, clips };
})();

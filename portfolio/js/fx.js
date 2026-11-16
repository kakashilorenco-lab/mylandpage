/* Efeitos de canvas: linhas topográficas e "desmascarar" (rasgar a máscara).
   Expõe window.FX = { drawTopo, makeReveal }. */
(() => {
  const NEON = "#e4ff1a";

  /* ---------- ruído + linhas topográficas (marching squares) ---------- */
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
  const MS = [[], [[3, 2]], [[2, 1]], [[3, 1]], [[0, 1]], [[3, 0], [2, 1]], [[0, 2]], [[3, 0]],
    [[3, 0]], [[0, 2]], [[0, 1], [3, 2]], [[0, 1]], [[3, 1]], [[2, 1]], [[3, 2]], []];

  function drawTopo(cv, { seed = 1, scale = 0.0035, step = 0.045, color = "15,15,14", alpha = 0.12, bg = null, cell = 12 } = {}) {
    const dpr = Math.min(devicePixelRatio || 1, 2), w = cv.clientWidth, h = cv.clientHeight;
    if (!w || !h) return;
    cv.width = w * dpr; cv.height = h * dpr;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h); }
    const n = makeNoise(seed), cols = Math.ceil(w / cell) + 1, rows = Math.ceil(h / cell) + 1;
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
        const e = [[x + cell * ((t - a) / (b - a)), y], [x + cell, y + cell * ((t - b) / (c - b))],
          [x + cell * ((t - d) / (c - d)), y + cell], [x, y + cell * ((t - a) / (d - a))]];
        for (const [p, q] of MS[idx]) { ctx.moveTo(e[p][0], e[p][1]); ctx.lineTo(e[q][0], e[q][1]); }
      }
      ctx.strokeStyle = `rgba(${color},${k % 5 === 0 ? alpha * 2 : alpha})`;
      ctx.lineWidth = k % 5 === 0 ? 1.1 : 0.7;
      ctx.stroke();
    }
  }

  /* ---------- desmascarar: foto A por cima, buracos rasgados mostram a foto B ---------- */
  function makeReveal({ fig, cv, srcA, srcB, reduced, onLoad }) {
    const ctx = cv.getContext("2d");
    const ring = document.createElement("canvas"), rctx = ring.getContext("2d");
    const imgA = new Image(), imgB = new Image();
    let w = 0, h = 0, dpr = 1, ready = 0, last = null, lastInput = 0, visible = true;
    const tears = [], bits = [];
    const jag = (n, amt) => Array.from({ length: n }, (_, i) => 1 - amt / 2 + Math.random() * amt + (i % 3 === 0 ? -0.1 : 0));
    const lens = { x: 0, y: 0, tx: 0, ty: 0, k: 0, on: false, pts: jag(30, 0.22), r: 0 };

    function resize() {
      const r = fig.getBoundingClientRect();
      dpr = Math.min(devicePixelRatio || 1, 2); w = r.width; h = r.height;
      cv.width = ring.width = Math.round(w * dpr); cv.height = ring.height = Math.round(h * dpr);
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
        const rr = r * pts[k] * (1 + 0.05 * Math.sin(now / 260 + k * 1.9)) + pad;
        const px = x + Math.cos(ang) * rr, py = y + Math.sin(ang) * rr * 1.08;
        i ? c.lineTo(px, py) : c.moveTo(px, py);
      }
      c.closePath();
    }
    function paths(c, pad, now, list) { c.beginPath(); for (const s of list) shape(c, s.x, s.y, s.r * s.k, s.pts, s.rot, pad, now); }

    function frame(now) {
      requestAnimationFrame(frame);
      if (ready < 2 || !w || !visible) return;
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
        ctx.globalCompositeOperation = "destination-out"; paths(ctx, 0, now, list); ctx.fill();
        ctx.globalCompositeOperation = "source-over";
        ctx.save(); paths(ctx, 0, now, list); ctx.clip(); ctx.drawImage(imgB, 0, 0, w, h); ctx.restore();
        rctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        rctx.globalCompositeOperation = "source-over"; rctx.clearRect(0, 0, w, h);
        rctx.fillStyle = "rgba(228,255,26,.35)"; paths(rctx, 10, now, list); rctx.fill();
        rctx.fillStyle = NEON; paths(rctx, 4, now, list); rctx.fill();
        rctx.fillStyle = "#fff"; paths(rctx, 1.2, now, list); rctx.fill();
        rctx.globalCompositeOperation = "destination-out"; paths(rctx, 0, now, list); rctx.fill();
        ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = "source-atop"; ctx.drawImage(ring, 0, 0);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.globalCompositeOperation = "source-over";
      }
      for (let i = bits.length - 1; i >= 0; i--) {
        const b = bits[i]; b.x += b.vx; b.y += b.vy; b.vy += 0.03; b.a -= 0.018;
        if (b.a <= 0) { bits.splice(i, 1); continue; }
        ctx.globalAlpha = b.a; ctx.fillStyle = i % 2 ? NEON : "#111"; ctx.fillRect(b.x, b.y, b.s, b.s);
      }
      ctx.globalAlpha = 1;
    }

    const local = (e) => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    cv.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") { const p = local(e); lens.x = lens.tx = p.x; lens.y = lens.ty = p.y; lens.on = true; } });
    cv.addEventListener("pointerleave", () => { lens.on = false; last = null; });
    cv.addEventListener("pointermove", (e) => {
      const p = local(e); lastInput = performance.now();
      if (e.pointerType === "mouse") { lens.tx = p.x; lens.ty = p.y; lens.on = true; }
      if (!last || Math.hypot(p.x - last.x, p.y - last.y) > w * 0.055) { spawn(p.x, p.y); last = p; }
    });
    cv.addEventListener("pointerdown", (e) => { const p = local(e); lastInput = performance.now(); spawn(p.x, p.y, 1.5); });
    // pausa quando a hero sai da tela (economiza bateria)
    new IntersectionObserver(([en]) => (visible = en.isIntersecting)).observe(fig);

    const done = () => { ready++; onLoad && onLoad(ready / 2); };
    imgA.onload = imgB.onload = imgA.onerror = imgB.onerror = done;
    imgA.src = srcA; imgB.src = srcB;
    resize(); requestAnimationFrame(frame);
    return { resize, burst: (xp, yp) => spawn((xp / 100) * w, (yp / 100) * h, 1.8) };
  }

  window.FX = { drawTopo, makeReveal };
})();

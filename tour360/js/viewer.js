// =====================================================================
//  Visualizador de tour 360° (estilo Matterport)
//  - Fotos 360° projetadas sobre a geometria dos cômodos
//  - Caminhada entre pontos, casa de bonecas 3D, planta, mini-mapa,
//    marcadores, medição, tour automático e giroscópio
// =====================================================================
import * as THREE from 'three';

const PI = Math.PI;
const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const fmtM = (m) => m.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' m';

const VERT = /* glsl */`
varying vec3 vW; varying vec3 vN;
void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`;
const FRAG = /* glsl */`
uniform sampler2D tA; uniform sampler2D tB;
uniform vec3 cA; uniform vec3 cB;
uniform vec4 pA; uniform vec4 pB; // (rumo, cobertura horizontal, cobertura vertical, -)
uniform float mixT; uniform float uDoll; uniform float opacity;
varying vec3 vW; varying vec3 vN;
vec3 amostra(sampler2D t, vec3 c, vec4 p){
  vec3 d = normalize(vW - c);
  float th = atan(d.x, -d.z);
  float lon = mod(th - p.x + 3.14159265, 6.28318531) - 3.14159265;
  float lat = asin(clamp(d.y, -1.0, 1.0));
  float u = lon / p.y + 0.5;
  float v = lat / p.z + 0.5;
  float dentro = (1.0 - step(p.y * 0.5, abs(lon))) * (1.0 - step(p.z * 0.5, abs(lat)));
  // amostragem sem costura na emenda u=0/1 (truque de Tarini)
  float uA = fract(u); float uB = fract(u + 0.5) - 0.5;
  vec2 gA = vec2(dFdx(uA), dFdy(uA)); vec2 gB = vec2(dFdx(uB), dFdy(uB));
  bool usaA = dot(gA, gA) <= dot(gB, gB);
  float uu = usaA ? uA : uB; vec2 gu = usaA ? gA : gB;
  vec3 col = textureGrad(t, vec2(uu, clamp(v, 0.0, 1.0)), vec2(gu.x, dFdx(v)), vec2(gu.y, dFdy(v))).rgb;
  return mix(vec3(0.16, 0.17, 0.18) + 0.06 * d.y, col, dentro);
}
void main(){
  vec3 a = amostra(tA, cA, pA);
  vec3 c = a;
  if (mixT > 0.001) c = mix(a, amostra(tB, cB, pB), mixT);
  c *= mix(1.0, 0.86 + 0.14 * abs(vN.y), uDoll);
  gl_FragColor = vec4(c, opacity);
  #include <colorspace_fragment>
}`;

export function createViewer(container, tour, opts = {}) {
  const base = opts.base || '';
  const camH = tour.alturaCamera || 1.5;
  const rooms = tour.comodos || [];
  const pts = tour.pontos || [];
  const byId = Object.fromEntries(pts.map((p) => [p.id, p]));
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const eye = (p) => V(p.x, camH, p.z);

  // ---------- DOM ----------
  container.classList.add('tv');
  if (opts.minimal) container.classList.add('tv-min');
  container.innerHTML = `
    <canvas class="tv-canvas"></canvas>
    <div class="tv-labels"></div>
    <div class="tv-card"><b class="tv-title"></b><span class="tv-sub"></span>
      <button class="tv-rooms-btn">Ambientes ▾</button><div class="tv-rooms" hidden></div></div>
    <div class="tv-modes">
      <button data-m="360" class="on" title="Andar pelo imóvel"><svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="2.2"/><path d="M12 8v6m-3 7l3-7 3 7M8 11h8"/></svg><span>360°</span></button>
      <button data-m="doll" title="Casa de bonecas 3D"><svg viewBox="0 0 24 24"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5"/></svg><span>3D</span></button>
      <button data-m="planta" title="Planta"><svg viewBox="0 0 24 24"><path d="M4 4h16v16H4zM4 12h7m4 0h5M11 4v5m0 6v5"/></svg><span>Planta</span></button>
    </div>
    <div class="tv-play"><button class="tv-tour" title="Tour automático">▶</button><span class="tv-here"></span></div>
    <div class="tv-tools">
      <button data-t="medir" title="Medir"><svg viewBox="0 0 24 24"><path d="M3 17L17 3l4 4L7 21z"/><path d="M7 13l2 2m1-5l2 2m1-5l2 2"/></svg></button>
      <button data-t="tags" class="on" title="Marcadores"><svg viewBox="0 0 24 24"><circle cx="12" cy="10" r="3"/><path d="M12 21s7-6 7-11a7 7 0 10-14 0c0 5 7 11 7 11z"/></svg></button>
      <button data-t="giro" title="Mover o celular" hidden><svg viewBox="0 0 24 24"><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M3 8c-1 2-1 6 0 8m18-8c1 2 1 6 0 8"/></svg></button>
      <button data-t="full" title="Tela cheia"><svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg></button>
      <button data-t="share" title="Copiar link"><svg viewBox="0 0 24 24"><path d="M10 14a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1m2 5a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1"/></svg></button>
    </div>
    <canvas class="tv-mini" width="220" height="220"></canvas>
    <div class="tv-joy" title="Arraste a bolinha para andar"><div class="tv-joy-knob"></div><span class="tv-joy-up">▲</span></div>
    <a class="tv-cta" target="_blank" rel="noopener">Tenho interesse</a>
    <div class="tv-tagcard" hidden><button class="tv-x">×</button><b></b><p></p></div>
    <div class="tv-msg"></div>
    <div class="tv-loading"><div class="tv-spin"></div><span>Carregando tour…</span></div>`;
  const q = (s) => container.querySelector(s);
  const canvas = q('.tv-canvas');
  q('.tv-title').textContent = tour.titulo || 'Tour 360°';
  q('.tv-sub').textContent = tour.subtitulo || '';
  if (tour.corretor?.whatsapp) q('.tv-cta').href = `https://wa.me/${tour.corretor.whatsapp}?text=${encodeURIComponent(`Olá! Vi o tour 360° de "${tour.titulo}" e tenho interesse. Pode me passar mais informações?`)}`;
  else q('.tv-cta').hidden = true;
  q('.tv-rooms').innerHTML = pts.map((p) => `<button data-p="${p.id}">${p.nome}</button>`).join('');

  // ---------- Three ----------
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1d22);
  const camera = new THREE.PerspectiveCamera(75, 1, 0.03, 500);
  const blank = new THREE.DataTexture(new Uint8Array([120, 120, 120, 255]), 1, 1); blank.needsUpdate = true;

  const uniforms = () => ({
    tA: { value: blank }, tB: { value: blank }, cA: { value: V(0, camH, 0) }, cB: { value: V(0, camH, 0) },
    pA: { value: new THREE.Vector4(0, 2 * PI, PI, 0) }, pB: { value: new THREE.Vector4(0, 2 * PI, PI, 0) },
    mixT: { value: 0 }, uDoll: { value: 0 }, opacity: { value: 1 },
  });
  const mkMat = (side = THREE.FrontSide) => new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: uniforms(), side, toneMapped: false });

  // Geometria dos cômodos (piso, paredes voltadas para dentro e teto)
  const roomObjs = [];
  const surfaces = [];
  const floors = [];
  const center = V(0, 0, 0);
  const bb = new THREE.Box3();
  for (const c of rooms) {
    const g = new THREE.Group();
    const mat = mkMat();
    const w = c.x1 - c.x0, d = c.z1 - c.z0, h = c.altura || 2.7, cx = (c.x0 + c.x1) / 2, cz = (c.z0 + c.z1) / 2;
    const wallH = c.aberto ? 1.1 : h;
    const add = (geo, x, y, z, tipo) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.userData = { tipo, room: c }; g.add(m); surfaces.push(m); if (tipo === 'piso') floors.push(m); return m; };
    add(new THREE.PlaneGeometry(w, d).rotateX(-PI / 2), cx, 0, cz, 'piso');
    const ceil = c.aberto ? null : add(new THREE.PlaneGeometry(w, d).rotateX(PI / 2), cx, h, cz, 'teto');
    add(new THREE.PlaneGeometry(w, wallH), cx, wallH / 2, c.z0, 'parede');
    add(new THREE.PlaneGeometry(w, wallH).rotateY(PI), cx, wallH / 2, c.z1, 'parede');
    add(new THREE.PlaneGeometry(d, wallH).rotateY(PI / 2), c.x0, wallH / 2, cz, 'parede');
    add(new THREE.PlaneGeometry(d, wallH).rotateY(-PI / 2), c.x1, wallH / 2, cz, 'parede');
    scene.add(g);
    // ponto "dono" do cômodo (para a casa de bonecas)
    const inside = pts.filter((p) => p.x >= c.x0 && p.x <= c.x1 && p.z >= c.z0 && p.z <= c.z1);
    const dono = inside[0] || pts.slice().sort((a, b) => Math.hypot(a.x - cx, a.z - cz) - Math.hypot(b.x - cx, b.z - cz))[0];
    roomObjs.push({ c, g, mat, ceil, dono });
    bb.expandByPoint(V(c.x0, 0, c.z0)); bb.expandByPoint(V(c.x1, h, c.z1));
  }
  // Pontos sem cômodo desenhado ganham uma caixa padrão de 4 x 4 m
  for (const p of pts) {
    if (rooms.some((c) => p.x >= c.x0 && p.x <= c.x1 && p.z >= c.z0 && p.z <= c.z1)) continue;
    bb.expandByPoint(V(p.x - 2, 0, p.z - 2)); bb.expandByPoint(V(p.x + 2, 2.7, p.z + 2));
  }
  if (bb.isEmpty()) bb.set(V(-3, 0, -3), V(3, 2.7, 3));
  bb.getCenter(center);
  const size = bb.getSize(V(0, 0, 0));
  // esfera de segurança (onde não há cômodo desenhado)
  const sphereMat = mkMat(THREE.BackSide);
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(60, 64, 32), sphereMat);
  scene.add(sphere);
  const allMats = [...roomObjs.map((r) => r.mat), sphereMat];

  // Discos de navegação no piso
  const discGeo = new THREE.RingGeometry(0.2, 0.27, 40).rotateX(-PI / 2);
  const dotGeo = new THREE.CircleGeometry(0.2, 40).rotateX(-PI / 2);
  const discs = pts.map((p) => {
    const g = new THREE.Group();
    const ring = new THREE.Mesh(discGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false }));
    const dot = new THREE.Mesh(dotGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.18, depthWrite: false }));
    g.add(ring, dot);
    g.position.set(p.x, 0.02, p.z);
    g.userData.p = p;
    ring.userData.p = p; dot.userData.p = p;
    g.renderOrder = 2;
    scene.add(g);
    return g;
  });
  // Retícula que segue o mouse (como no Matterport)
  const ret = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.26, 40), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide }));
  ret.visible = false; ret.renderOrder = 3;
  scene.add(ret);

  // ---------- Texturas ----------
  const loader = new THREE.TextureLoader();
  const texCache = new Map();
  const loadTex = (p) => {
    if (texCache.has(p.id)) return texCache.get(p.id);
    const src = p.src || base + p.img;
    const pr = new Promise((res) => loader.load(src, (t) => {
      t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.anisotropy = 8;
      t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true;
      res(t);
    }, undefined, () => res(blank)));
    texCache.set(p.id, pr);
    return pr;
  };
  const params = (p) => new THREE.Vector4(((p.rumo || 0) * PI) / 180, ((p.hfov || 360) * PI) / 180, ((p.vfov || 180) * PI) / 180, 0);
  const setSlot = (mat, slot, p, tex) => {
    mat.uniforms['t' + slot].value = tex;
    mat.uniforms['c' + slot].value.set(p.x, camH, p.z);
    mat.uniforms['p' + slot].value.copy(params(p));
  };

  // ---------- Estado ----------
  const st = { mode: '360', cur: null, yaw: 0, pitch: -0.05, fov: matchMedia('(max-width: 760px)').matches ? 80 : 72, busy: false,
    orbit: { az: -0.6, el: 0.85, dist: Math.max(size.x, size.z) * 1.35 + 4, target: center.clone().setY(0.6) },
    tags: true, medir: false, giro: false };
  const anim = { t: 0, dur: 0, upd: null, done: null };
  const tween = (dur, upd) => new Promise((res) => { anim.t = 0; anim.dur = dur; anim.upd = upd; anim.done = res; });

  const dirOf = (yaw, pitch) => V(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
  const orbitPos = (o) => o.target.clone().add(V(Math.sin(o.az) * Math.cos(o.el), Math.sin(o.el), Math.cos(o.az) * Math.cos(o.el)).multiplyScalar(o.dist));
  const look = V(0, 0, 0);

  function aplicarModoMateriais(mode, k = 1) {
    const doll = mode !== '360';
    for (const r of roomObjs) {
      if (r.ceil) r.ceil.visible = !doll;
      r.mat.uniforms.uDoll.value = doll ? k : 0;
    }
    sphere.visible = !doll;
    if (doll) {
      for (const r of roomObjs) { if (!r.dono) continue; loadTex(r.dono).then((t) => { if (st.mode !== '360') setSlot(r.mat, 'A', r.dono, t); }); r.mat.uniforms.mixT.value = 0; }
    } else if (st.cur) {
      loadTex(st.cur).then((t) => { for (const m of allMats) { setSlot(m, 'A', st.cur, t); m.uniforms.mixT.value = 0; } });
    }
  }

  // ---------- Navegação entre pontos ----------
  async function irPara(id, o = {}) {
    const B = byId[id];
    if (!B || st.busy) return;
    if (st.mode !== '360') return entrar(id);
    if (B === st.cur) return;
    st.busy = true;
    msg('');
    const t0 = performance.now();
    const tex = await loadTex(B);
    if (performance.now() - t0 > 600) msg('');
    for (const m of allMats) { setSlot(m, 'B', B, tex); m.uniforms.mixT.value = 0; }
    const A = st.cur;
    const p0 = eye(A), p1 = eye(B);
    const fov0 = st.fov;
    const dist = p0.distanceTo(p1);
    const dur = o.rapido ? 0.01 : o.andando ? THREE.MathUtils.clamp(dist / 2.1, 0.7, 2.6) : Math.min(1.3, 0.6 + dist * 0.12);
    const curva = o.andando ? (k) => (1 - Math.cos(PI * k)) / 2 : ease;
    await tween(dur, (k) => {
      const e = curva(k);
      camera.position.lerpVectors(p0, p1, e);
      camera.fov = fov0 - Math.sin(PI * k) * (o.andando ? 4 : 8); camera.updateProjectionMatrix();
      look.copy(camera.position).add(dirOf(st.yaw, st.pitch));
      for (const m of allMats) m.uniforms.mixT.value = o.andando ? smooth(0.05, 0.95, k) : smooth(0.12, 0.88, k);
    });
    camera.fov = fov0; camera.updateProjectionMatrix();
    for (const m of allMats) { setSlot(m, 'A', B, tex); m.uniforms.mixT.value = 0; }
    st.cur = B;
    st.busy = false;
    onChange();
    preloadLinks(B);
  }
  function preloadLinks(p) { (p.links || []).forEach((id) => byId[id] && loadTex(byId[id])); }

  async function setMode(mode) {
    if (st.busy || mode === st.mode) return;
    st.busy = true;
    const from = st.mode;
    const p0 = camera.position.clone(), l0 = look.clone();
    let p1, l1;
    if (mode === '360') { /* tratado em entrar() */ st.busy = false; return entrar(st.cur.id); }
    const o = { ...st.orbit, target: st.orbit.target.clone() };
    if (mode === 'planta') { o.el = 1.5; o.az = 0; o.dist = Math.max(size.x, size.z) * 2.1 + 4; o.target = center.clone().setY(0); }
    if (mode === 'doll' && from === 'planta') { o.el = 0.85; }
    p1 = orbitPos(o); l1 = o.target.clone();
    st.mode = mode;
    st.orbit = o;
    aplicarModoMateriais(mode);
    ret.visible = false;
    const fov0 = camera.fov, fov1 = mode === 'planta' ? 34 : 45;
    await tween(1.5, (k) => {
      const e = ease(k);
      camera.position.lerpVectors(p0, p1, e);
      look.lerpVectors(l0, l1, e);
      camera.fov = fov0 + (fov1 - fov0) * e; camera.updateProjectionMatrix();
    });
    st.busy = false;
    onChange();
  }
  async function entrar(id) {
    const B = byId[id];
    if (!B) return;
    st.busy = true;
    const tex = await loadTex(B);
    const p0 = camera.position.clone(), l0 = look.clone();
    const p1 = eye(B);
    // olha na direção em que a câmera já estava "apontando" no plano
    const dir = p1.clone().sub(p0); dir.y = 0;
    const yaw = dir.lengthSq() > 0.01 ? Math.atan2(dir.x, -dir.z) : st.yaw;
    const l1 = p1.clone().add(dirOf(yaw, -0.05));
    const fov0 = camera.fov;
    await tween(1.4, (k) => {
      const e = ease(k);
      camera.position.lerpVectors(p0, p1, e);
      look.lerpVectors(l0, l1, e);
      camera.fov = fov0 + (st.fov - fov0) * e; camera.updateProjectionMatrix();
      if (k > 0.72 && st.mode !== '360') { st.mode = '360'; st.cur = B; aplicarModoMateriais('360'); for (const m of allMats) setSlot(m, 'A', B, tex); }
    });
    st.mode = '360'; st.cur = B; st.yaw = yaw; st.pitch = -0.05;
    aplicarModoMateriais('360');
    st.busy = false;
    onChange();
    preloadLinks(B);
  }

  // ---------- Medição ----------
  const medida = { pts: [], line: null, label: null, dots: [] };
  const lineMat = new THREE.LineBasicMaterial({ color: 0xffd34d, depthTest: false });
  const dotMat = new THREE.MeshBasicMaterial({ color: 0xffd34d, depthTest: false });
  function limparMedida() {
    medida.pts = [];
    if (medida.line) scene.remove(medida.line);
    medida.dots.forEach((d) => scene.remove(d)); medida.dots = [];
    medida.line = null;
    if (medida.label) { medida.label.el.remove(); labels.splice(labels.indexOf(medida.label), 1); medida.label = null; }
  }
  function medirClique(p) {
    if (medida.pts.length >= 2) limparMedida();
    medida.pts.push(p.clone());
    const d = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 8), dotMat); d.position.copy(p); d.renderOrder = 5; scene.add(d); medida.dots.push(d);
    if (medida.pts.length === 2) {
      const g = new THREE.BufferGeometry().setFromPoints(medida.pts);
      medida.line = new THREE.Line(g, lineMat); medida.line.renderOrder = 5; scene.add(medida.line);
      const mid = medida.pts[0].clone().add(medida.pts[1]).multiplyScalar(0.5);
      medida.label = addLabel('tv-measure', fmtM(medida.pts[0].distanceTo(medida.pts[1])), mid, () => true);
    }
  }

  // ---------- Rótulos (marcadores e nomes) ----------
  const labelsEl = q('.tv-labels');
  const labels = [];
  function addLabel(cls, html, pos, vis, click) {
    const el = document.createElement('div');
    el.className = 'tv-lbl ' + cls;
    el.innerHTML = html;
    if (click) el.addEventListener('click', (e) => { e.stopPropagation(); click(e); });
    labelsEl.appendChild(el);
    const L = { el, pos, vis };
    labels.push(L);
    return L;
  }
  const roomOf = (x, z) => rooms.find((c) => x >= c.x0 - 0.05 && x <= c.x1 + 0.05 && z >= c.z0 - 0.05 && z <= c.z1 + 0.05);
  for (const t of tour.tags || []) {
    const rc = roomOf(t.x, t.z);
    addLabel('tv-tag', '<i></i>', V(t.x, t.y, t.z), () => st.tags && !st.medir && (st.mode !== '360' || !rc || roomOf(st.cur.x, st.cur.z) === rc || (st.cur && Math.hypot(st.cur.x - t.x, st.cur.z - t.z) < 3.5)), (e) => abrirTag(t, e));
  }
  for (const p of pts) addLabel('tv-pname', p.nome, V(p.x, 0.35, p.z), () => st.mode !== '360', () => entrar(p.id));
  function abrirTag(t, e) {
    const c = q('.tv-tagcard');
    c.querySelector('b').textContent = t.titulo || '';
    c.querySelector('p').textContent = t.texto || '';
    c.hidden = false;
    const r = container.getBoundingClientRect();
    c.style.left = Math.min(r.width - 300, Math.max(10, e.clientX - r.left + 14)) + 'px';
    c.style.top = Math.min(r.height - 160, Math.max(10, e.clientY - r.top - 20)) + 'px';
  }
  q('.tv-x').addEventListener('click', () => (q('.tv-tagcard').hidden = true));

  // ---------- Mini-mapa ----------
  const mini = q('.tv-mini'), mctx = mini.getContext('2d');
  const mm = { s: 1, ox: 0, oz: 0 };
  {
    const pad = 16, W = mini.width - pad * 2;
    mm.s = W / Math.max(size.x, size.z, 1);
    mm.ox = pad + (W - size.x * mm.s) / 2 - bb.min.x * mm.s;
    mm.oz = pad + (W - size.z * mm.s) / 2 - bb.min.z * mm.s;
  }
  const mx = (x) => mm.ox + x * mm.s, mz = (z) => mm.oz + z * mm.s;
  function drawMini() {
    const c = mctx;
    c.clearRect(0, 0, mini.width, mini.height);
    c.fillStyle = 'rgba(16,18,22,0.72)'; c.fillRect(0, 0, mini.width, mini.height);
    for (const r of rooms) {
      c.fillStyle = r.aberto ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.13)';
      c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = 1.5;
      c.fillRect(mx(r.x0), mz(r.z0), (r.x1 - r.x0) * mm.s, (r.z1 - r.z0) * mm.s);
      c.strokeRect(mx(r.x0), mz(r.z0), (r.x1 - r.x0) * mm.s, (r.z1 - r.z0) * mm.s);
    }
    if (st.cur && st.mode === '360') {
      const x = mx(st.cur.x), z = mz(st.cur.z), a = st.yaw - PI / 2, f = (camera.fov * PI) / 180 * camera.aspect * 0.5;
      const g = c.createRadialGradient(x, z, 0, x, z, 46);
      g.addColorStop(0, 'rgba(255,211,77,0.55)'); g.addColorStop(1, 'rgba(255,211,77,0)');
      c.fillStyle = g; c.beginPath(); c.moveTo(x, z); c.arc(x, z, 46, a - Math.min(f, 1.2), a + Math.min(f, 1.2)); c.closePath(); c.fill();
    }
    for (const p of pts) {
      const cur = p === st.cur;
      c.beginPath(); c.arc(mx(p.x), mz(p.z), cur ? 5 : 3.5, 0, 7);
      c.fillStyle = cur ? '#ffd34d' : '#fff'; c.fill();
    }
  }
  mini.addEventListener('click', (e) => {
    const r = mini.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * mini.width, z = ((e.clientY - r.top) / r.height) * mini.height;
    let best = null, bd = 14;
    for (const p of pts) { const d = Math.hypot(mx(p.x) - x, mz(p.z) - z); if (d < bd) { bd = d; best = p; } }
    if (best) irPara(best.id);
  });

  // ---------- Entrada (mouse/toque) ----------
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const pointers = new Map();
  let drag = null, pinch = null, vel = { x: 0, y: 0 }, lastInteract = 0;
  const setRay = (e) => { const r = canvas.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera); };
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), fov: st.fov, dist: st.orbit.dist }; drag = null; return; }
    drag = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now(), btn: e.button };
    vel = { x: 0, y: 0 };
    stopTour(); lastInteract = performance.now();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && pointers.size === 2) {
      const [a, b] = [...pointers.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (st.mode === '360') { st.fov = THREE.MathUtils.clamp(pinch.fov * (pinch.d / d), 30, 95); }
      else st.orbit.dist = THREE.MathUtils.clamp(pinch.dist * (pinch.d / d), 2, 80);
      return;
    }
    if (drag && !st.busy) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      drag.x = e.clientX; drag.y = e.clientY;
      if (st.mode === '360') { const k = (st.fov / 75) * 0.0042; st.yaw -= dx * k; st.pitch = THREE.MathUtils.clamp(st.pitch + dy * k, -1.45, 1.45); vel = { x: -dx * k, y: dy * k }; }
      else if (st.mode === 'planta' || drag.btn === 2 || e.shiftKey) {
        const s = st.orbit.dist * 0.0016; const a = st.orbit.az;
        st.orbit.target.x -= (dx * Math.cos(a) + dy * Math.sin(a)) * s; st.orbit.target.z -= (-dx * Math.sin(a) + dy * Math.cos(a)) * s;
      } else { st.orbit.az -= dx * 0.006; st.orbit.el = THREE.MathUtils.clamp(st.orbit.el + dy * 0.005, 0.12, 1.52); }
      return;
    }
    if (e.pointerType === 'mouse' && !st.busy) hover(e);
  });
  const up = (e) => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
    if (!drag) return;
    const moved = Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy), dt = performance.now() - drag.t;
    drag = null;
    if (moved < 6 && dt < 500) clique(e);
  };
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault(); stopTour();
    if (st.mode === '360') st.fov = THREE.MathUtils.clamp(st.fov + e.deltaY * 0.04, 30, 95);
    else st.orbit.dist = THREE.MathUtils.clamp(st.orbit.dist * (1 + e.deltaY * 0.001), 2, 80);
  }, { passive: false });

  function hover(e) {
    setRay(e);
    if (st.mode !== '360') { ret.visible = false; return; }
    const hit = ray.intersectObjects(surfaces, false)[0];
    if (!hit) { ret.visible = false; return; }
    ret.visible = true;
    const n = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
    ret.position.copy(hit.point).addScaledVector(n, 0.01);
    ret.lookAt(hit.point.clone().add(n));
    const piso = hit.object.userData.tipo === 'piso';
    ret.material.opacity = piso ? 0.85 : 0.5;
    canvas.style.cursor = piso && alvoNoPiso(hit.point) ? 'pointer' : st.medir ? 'crosshair' : 'grab';
  }
  function alvoNoPiso(p) {
    let best = null, bd = 2.6;
    for (const x of pts) { if (x === st.cur) continue; const d = Math.hypot(x.x - p.x, x.z - p.z); if (d < bd) { bd = d; best = x; } }
    return best;
  }
  function clique(e) {
    setRay(e);
    q('.tv-tagcard').hidden = true;
    q('.tv-rooms').hidden = true;
    const hitSurf = ray.intersectObjects(surfaces, false)[0];
    if (st.medir) { if (hitSurf) medirClique(hitSurf.point); return; }
    const hd = ray.intersectObjects(discs.flatMap((g) => g.children), false)[0];
    if (hd && hd.object.userData.p !== st.cur) return st.mode === '360' ? irPara(hd.object.userData.p.id) : entrar(hd.object.userData.p.id);
    if (st.mode === '360' && hitSurf) {
      const alvo = hitSurf.object.userData.tipo === 'piso' ? alvoNoPiso(hitSurf.point) : null;
      if (alvo) irPara(alvo.id);
    } else if (st.mode !== '360' && hitSurf) {
      // na casa de bonecas: clicar num cômodo entra no ponto daquele cômodo
      const r = roomObjs.find((o) => o.c === hitSurf.object.userData.room);
      if (r && r.dono) entrar(r.dono.id);
    }
  }

  // ---------- Ferramentas ----------
  q('.tv-modes').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { stopTour(); setMode(b.dataset.m); } });
  q('.tv-rooms-btn').addEventListener('click', () => (q('.tv-rooms').hidden = !q('.tv-rooms').hidden));
  q('.tv-rooms').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { q('.tv-rooms').hidden = true; stopTour(); st.mode === '360' ? irPara(b.dataset.p) : entrar(b.dataset.p); } });
  let msgT;
  function msg(t, ms = 2200) { const m = q('.tv-msg'); m.textContent = t; m.classList.toggle('show', !!t); clearTimeout(msgT); if (t) msgT = setTimeout(() => m.classList.remove('show'), ms); }
  q('.tv-tools').addEventListener('click', async (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const t = b.dataset.t;
    if (t === 'medir') { st.medir = !st.medir; b.classList.toggle('on', st.medir); limparMedida(); msg(st.medir ? 'Medição: clique em dois pontos do piso ou das paredes' : '', 3500); }
    if (t === 'tags') { st.tags = !st.tags; b.classList.toggle('on', st.tags); }
    if (t === 'full') { const p = !document.fullscreenElement ? container.requestFullscreen?.() : document.exitFullscreen?.(); p?.catch?.(() => msg('Tela cheia indisponível aqui')); }
    if (t === 'share') { const url = (opts.shareUrl || location.href.split('#')[0]) + (st.cur ? '#' + st.cur.id : ''); try { await navigator.clipboard.writeText(url); msg('Link copiado!'); } catch { msg(url, 6000); } }
    if (t === 'giro') toggleGiro(b);
  });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') { limparMedida(); q('.tv-tagcard').hidden = true; } });

  // ---------- Joystick (bolinha) e teclado para andar ----------
  const joyEl = q('.tv-joy'), knob = q('.tv-joy-knob');
  const joy = { on: false, id: null, x: 0, y: 0 };
  const teclas = new Set();
  const moverKnob = (e) => {
    const r = joyEl.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    const R = r.width / 2 - 20, L = Math.hypot(dx, dy);
    if (L > R) { dx *= R / L; dy *= R / L; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    joy.x = dx / R; joy.y = -dy / R;
  };
  joyEl.addEventListener('pointerdown', (e) => {
    e.preventDefault(); e.stopPropagation();
    joyEl.setPointerCapture(e.pointerId);
    joy.on = true; joy.id = e.pointerId;
    knob.style.transition = 'none';
    joyEl.classList.add('on');
    moverKnob(e); stopTour(); lastInteract = performance.now();
  });
  joyEl.addEventListener('pointermove', (e) => { if (joy.on && e.pointerId === joy.id) moverKnob(e); });
  const soltar = (e) => {
    if (e.pointerId !== joy.id) return;
    joy.on = false; joy.x = joy.y = 0;
    knob.style.transition = ''; knob.style.transform = '';
    joyEl.classList.remove('on');
  };
  joyEl.addEventListener('pointerup', soltar);
  joyEl.addEventListener('pointercancel', soltar);
  const MAPA = { ArrowUp: 'f', KeyW: 'f', ArrowDown: 't', KeyS: 't', ArrowLeft: 'e', KeyA: 'e', ArrowRight: 'd', KeyD: 'd' };
  const alvoTexto = (e) => /input|textarea|select/i.test(e.target?.tagName || '') || e.target?.isContentEditable;
  addEventListener('keydown', (e) => { if (MAPA[e.code] && !alvoTexto(e) && st.mode === '360' && container.isConnected) { teclas.add(MAPA[e.code]); stopTour(); e.preventDefault(); } });
  addEventListener('keyup', (e) => { if (MAPA[e.code]) teclas.delete(MAPA[e.code]); });
  addEventListener('blur', () => teclas.clear());
  let avisoAt = 0;
  const difAng = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
  function pontoNaDirecao(dir, cone) {
    let best = null, bs = Infinity;
    for (const p of pts) {
      if (p === st.cur) continue;
      const dx = p.x - st.cur.x, dz = p.z - st.cur.z, d = Math.hypot(dx, dz);
      if (d < 0.25 || d > 9) continue;
      const dif = Math.abs(difAng(Math.atan2(dx, -dz), dir));
      if (dif > cone) continue;
      const s = d * (1 + 1.6 * dif);
      if (s < bs) { bs = s; best = p; }
    }
    return best;
  }
  function andar(dt) {
    let x = joy.x, y = joy.y;
    if (!joy.on) { x = (teclas.has('d') ? 1 : 0) - (teclas.has('e') ? 1 : 0); y = (teclas.has('f') ? 1 : 0) - (teclas.has('t') ? 1 : 0); }
    if (Math.abs(x) > 0.18) st.yaw += x * Math.abs(x) * dt * 1.4;            // lados: vira
    if (Math.abs(y) < 0.45 || st.busy || anim.upd) return;     // frente/trás: anda
    const dir = st.yaw + (y > 0 ? 0 : PI);
    const alvo = pontoNaDirecao(dir, 0.6) || pontoNaDirecao(dir, 1.05);
    if (alvo) { irPara(alvo.id, { andando: true }); return; }
    if (performance.now() > avisoAt) { msg(y > 0 ? 'Não há outro ponto nessa direção: vire para os lados' : 'Não há ponto atrás de você'); avisoAt = performance.now() + 2600; }
  }

  // Giroscópio (celular)
  let giro = null;
  const embutido = (() => { try { return window.self !== window.top; } catch { return true; } })();
  if (!embutido && 'DeviceOrientationEvent' in window && matchMedia('(pointer: coarse)').matches) q('[data-t="giro"]').hidden = false;
  async function toggleGiro(b) {
    if (st.giro) { st.giro = false; b.classList.remove('on'); removeEventListener('deviceorientation', onOri); return; }
    try { if (DeviceOrientationEvent.requestPermission) { const r = await DeviceOrientationEvent.requestPermission(); if (r !== 'granted') throw 0; } }
    catch { msg('O navegador não liberou o sensor de movimento'); return; }
    st.giro = true; b.classList.add('on'); giro = null;
    addEventListener('deviceorientation', onOri);
  }
  function onOri(e) {
    if (e.alpha == null || st.mode !== '360') return;
    const yaw = (-e.alpha * PI) / 180, pitch = ((e.beta - 90) * PI) / 180;
    if (!giro) giro = { yaw0: st.yaw - yaw };
    st.yaw = yaw + giro.yaw0; st.pitch = THREE.MathUtils.clamp(pitch, -1.4, 1.4);
  }

  // Tour automático
  let tourT = null, tourGiro = false;
  function stopTour() { if (!tourT && !tourGiro) return; clearTimeout(tourT); tourT = null; tourGiro = false; q('.tv-tour').textContent = '▶'; }
  q('.tv-tour').addEventListener('click', async () => {
    if (tourT || tourGiro) { stopTour(); return; }
    q('.tv-tour').textContent = '❚❚';
    if (st.mode !== '360') await entrar(st.cur.id);
    const passo = () => {
      tourGiro = true;
      tourT = setTimeout(() => {
        const i = pts.indexOf(st.cur);
        irPara(pts[(i + 1) % pts.length].id);
        tourT = setTimeout(passo, 1500);
      }, 7000);
    };
    passo();
  });

  // ---------- Atualização ----------
  function onChange() {
    for (const b of container.querySelectorAll('.tv-modes button')) b.classList.toggle('on', b.dataset.m === st.mode);
    q('.tv-here').textContent = st.mode === '360' && st.cur ? st.cur.nome : st.mode === 'doll' ? 'Casa de bonecas' : 'Planta';
    container.classList.toggle('tv-doll', st.mode !== '360');
    if (opts.onChange) opts.onChange(st);
  }
  const resize = () => {
    const w = container.clientWidth, h = container.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(1, h); camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(container);
  resize();

  const v3 = V(0, 0, 0);
  const clock = new THREE.Clock();
  let alive = true;
  function frame() {
    if (!alive) return;
    const dt = Math.min(clock.getDelta(), 0.1);
    if (st.mode === '360' && st.cur) andar(dt);
    if (anim.upd) {
      anim.t += dt / anim.dur;
      const k = Math.min(1, anim.t);
      anim.upd(k);
      if (k >= 1) { const d = anim.done; anim.upd = null; d && d(); }
    }
    if (!anim.upd) {
      if (st.mode === '360' && st.cur) {
        if (!drag && !st.giro) { st.yaw += vel.x; st.pitch = THREE.MathUtils.clamp(st.pitch + vel.y, -1.45, 1.45); vel.x *= 0.9; vel.y *= 0.9; }
        if (tourGiro) st.yaw += dt * 0.32;
        camera.position.copy(eye(st.cur));
        look.copy(camera.position).add(dirOf(st.yaw, st.pitch));
        if (Math.abs(camera.fov - st.fov) > 0.01) { camera.fov += (st.fov - camera.fov) * 0.25; camera.updateProjectionMatrix(); }
      } else if (st.mode !== '360') {
        if (!drag && performance.now() - lastInteract > 6000 && st.mode === 'doll') st.orbit.az += dt * 0.08;
        camera.position.copy(orbitPos(st.orbit));
        look.copy(st.orbit.target);
      }
    }
    camera.lookAt(look);
    // discos: visíveis por perto no 360; todos na casa de bonecas
    for (const g of discs) {
      const p = g.userData.p;
      const d = st.cur ? Math.hypot(p.x - st.cur.x, p.z - st.cur.z) : 99;
      const on = p !== st.cur || st.mode !== '360';
      g.visible = on && (st.mode !== '360' || d < 12);
      g.children[0].material.opacity = st.mode === '360' ? 0.95 * (1 - smooth(5, 12, d)) : 0.9;
      g.scale.setScalar(st.mode === '360' ? 1 : 1.8);
    }
    // rótulos
    const w = container.clientWidth, h = container.clientHeight;
    for (const L of labels) {
      if (!L.vis() || anim.upd) { L.el.style.display = 'none'; continue; }
      v3.copy(L.pos).project(camera);
      if (v3.z > 1 || Math.abs(v3.x) > 1.1 || Math.abs(v3.y) > 1.1) { L.el.style.display = 'none'; continue; }
      L.el.style.display = '';
      L.el.style.transform = `translate(${(v3.x * 0.5 + 0.5) * w}px, ${(-v3.y * 0.5 + 0.5) * h}px) translate(-50%, -50%)`;
    }
    drawMini();
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  // ---------- Início ----------
  (async () => {
    let inicio = byId[(location.hash || '').slice(1)] || byId[tour.inicio] || pts[0];
    if (!inicio) { q('.tv-loading span').textContent = 'Este tour ainda não tem fotos.'; return; }
    st.cur = inicio;
    const tex = await loadTex(inicio);
    for (const m of allMats) setSlot(m, 'A', inicio, tex);
    camera.position.copy(eye(inicio));
    look.copy(camera.position).add(dirOf(st.yaw, st.pitch));
    camera.fov = st.fov; camera.updateProjectionMatrix();
    q('.tv-loading').classList.add('off');
    onChange();
    frame();
    preloadLinks(inicio);
    setTimeout(() => pts.forEach((p) => loadTex(p)), 1500);
    if (!opts.minimal) msg(matchMedia('(pointer: coarse)').matches ? 'Use a bolinha para andar · arraste a tela para olhar' : 'Use a bolinha ou as setas para andar · arraste para olhar', 4500);
  })();

  function atualizarPonto(p) {
    Object.assign(byId[p.id] || {}, p);
    if (st.cur && st.cur.id === p.id && st.mode === '360') loadTex(st.cur).then((t) => allMats.forEach((m) => setSlot(m, 'A', st.cur, t)));
  }
  return {
    irPara, setMode, entrar, atualizarPonto, state: st, camera, scene, renderer, surfaces, ray,
    raycast(e) { setRay(e); return ray.intersectObjects(surfaces, false)[0]; },
    destroy() { alive = false; renderer.dispose(); container.innerHTML = ''; },
  };
}

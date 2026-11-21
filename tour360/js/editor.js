// =====================================================================
//  Editor de tour 360°: fotos do celular → planta → tour publicado
// =====================================================================
import { createViewer } from './viewer.js';

const $ = (s) => document.querySelector(s);
const uid = () => 'p' + Math.random().toString(36).slice(2, 8);
const rid = () => 'c' + Math.random().toString(36).slice(2, 8);
const snap = (v, s = 0.05) => Math.round(v / s) * s;
const r2 = (v) => Math.round(v * 100) / 100;
const PI = Math.PI;

const st = {
  tour: novoTour(), imgs: new Map(), urls: new Map(),
  sel: null, selRoom: null, tool: null,
  view: { s: 40, ox: 200, oz: 200 },
};
function novoTour() { return { titulo: '', subtitulo: '', corretor: { nome: '', whatsapp: '' }, alturaCamera: 1.5, inicio: null, comodos: [], pontos: [], tags: [] }; }

let toastT;
function toast(m, ms = 2600) { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), ms); }

// ---------------------------------------------------------------------
// Armazenamento local (IndexedDB) — o projeto fica salvo neste navegador
// ---------------------------------------------------------------------
const db = new Promise((res) => {
  try {
    const r = indexedDB.open('tour360', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('kv');
    r.onsuccess = () => res(r.result);
    r.onerror = () => res(null);
  } catch { res(null); }
});
async function salvar() {
  const d = await db; if (!d) return;
  try {
    const tx = d.transaction('kv', 'readwrite');
    tx.objectStore('kv').put({ tour: limpo(), imgs: [...st.imgs.entries()] }, 'atual');
  } catch { /* sem armazenamento */ }
}
async function restaurar() {
  const d = await db; if (!d) return false;
  return new Promise((res) => {
    try {
      const r = d.transaction('kv').objectStore('kv').get('atual');
      r.onsuccess = () => { const v = r.result; if (!v || !v.tour) return res(false); carregar(v.tour, new Map(v.imgs)); res(true); };
      r.onerror = () => res(false);
    } catch { res(false); }
  });
}
let saveT;
function mudou(rebuild = true) { clearTimeout(saveT); saveT = setTimeout(salvar, 700); if (rebuild) agendarPrevia(); desenhar(); }

function limpo() {
  const t = JSON.parse(JSON.stringify(st.tour));
  t.pontos.forEach((p) => { delete p.src; p.links = linksDe(p); });
  return t;
}
function linksDe(p) { return st.tour.pontos.filter((q) => q !== p && Math.hypot(q.x - p.x, q.z - p.z) < 7.5).map((q) => q.id); }

function carregar(tour, imgs) {
  st.urls.forEach((u) => URL.revokeObjectURL(u));
  st.urls.clear();
  st.tour = Object.assign(novoTour(), tour);
  st.imgs = imgs;
  for (const p of st.tour.pontos) { const b = imgs.get(p.id); if (b) { const u = URL.createObjectURL(b); st.urls.set(p.id, u); p.src = u; } }
  st.sel = st.tour.inicio || st.tour.pontos[0]?.id || null;
  st.selRoom = null;
  preencherCampos();
  listar();
  enquadrar();
  mudou();
}

async function abrirExemplo() {
  toast('Carregando o exemplo…');
  const t = await (await fetch('data/demo/tour.json')).json();
  const imgs = new Map();
  await Promise.all(t.pontos.map(async (p) => imgs.set(p.id, await (await fetch('data/demo/' + p.img)).blob())));
  carregar(t, imgs);
  toast('Exemplo aberto. Troque as fotos pelas suas.');
}

// ---------------------------------------------------------------------
// Importação das fotos 360° (celular, Insta360, Ricoh…)
// ---------------------------------------------------------------------
function lerGPano(buf) {
  const txt = new TextDecoder('latin1').decode(new Uint8Array(buf, 0, Math.min(buf.byteLength, 300000)));
  if (!/GPano/.test(txt)) return null;
  const g = (k) => { const m = txt.match(new RegExp(`GPano:${k}(?:="|>)(\\d+)`)); return m ? +m[1] : null; };
  const o = { fw: g('FullPanoWidthPixels'), fh: g('FullPanoHeightPixels'), cw: g('CroppedAreaImageWidthPixels'), ch: g('CroppedAreaImageHeightPixels'), l: g('CroppedAreaLeftPixels') ?? 0, t: g('CroppedAreaTopPixels') ?? 0 };
  return o.fw && o.fh && o.cw && o.ch ? o : null;
}
async function prepararFoto(file) {
  const buf = await file.arrayBuffer();
  const bmp = await createImageBitmap(new Blob([buf], { type: file.type || 'image/jpeg' }));
  const gp = lerGPano(buf);
  let fw, fh, l = 0, t = 0, cw = bmp.width, ch = bmp.height, aviso = '';
  if (gp) ({ fw, fh, l, t, cw, ch } = gp);
  else {
    const a = bmp.width / bmp.height;
    if (a > 2.05) { fw = bmp.width; fh = bmp.width / 2; t = (fh - bmp.height) / 2; aviso = 'panorama parcial (sem teto/piso completos)'; }
    else if (a < 1.95) { fh = bmp.height; fw = bmp.height * 2; l = (fw - bmp.width) / 2; aviso = 'não parece uma foto 360° completa'; }
    else { fw = bmp.width; fh = bmp.height; }
  }
  const W = Math.min(4096, Math.round(fw / 2) * 2), H = W / 2, k = W / fw;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#d9dbde'); g.addColorStop(0.5, '#8d9096'); g.addColorStop(1, '#4b4d51');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.drawImage(bmp, l * k, t * k, cw * k, ch * k);
  bmp.close?.();
  const blob = await new Promise((r) => cv.toBlob(r, 'image/jpeg', 0.86));
  return { blob, aviso };
}
async function importar(files) {
  const lista = [...files].filter((f) => /^image\//.test(f.type) || /\.(jpe?g|png|webp|heic)$/i.test(f.name));
  if (!lista.length) return;
  toast(`Preparando ${lista.length} foto(s)…`, 60000);
  const n0 = st.tour.pontos.length;
  for (const [i, f] of lista.entries()) {
    try {
      const { blob, aviso } = await prepararFoto(f);
      const id = uid();
      const u = URL.createObjectURL(blob);
      st.imgs.set(id, blob); st.urls.set(id, u);
      const base = st.tour.pontos[st.tour.pontos.length - 1];
      const p = { id, nome: f.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').slice(0, 40) || `Ponto ${n0 + i + 1}`, img: id + '.jpg', x: base ? r2(base.x + 3) : 0, z: base ? base.z : 0, rumo: 0, src: u };
      st.tour.pontos.push(p);
      if (!st.tour.inicio) st.tour.inicio = id;
      st.sel = id;
      if (aviso) toast(`${f.name}: ${aviso}`, 4000);
    } catch (e) { toast(`Não consegui abrir ${f.name}. Use JPG ou PNG.`, 4000); }
  }
  toast(`${lista.length} foto(s) adicionada(s). Agora posicione na planta.`);
  listar(); enquadrar(); mudou();
}
$('#files').addEventListener('change', (e) => { importar(e.target.files); e.target.value = ''; });
const drop = $('#drop');
['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
drop.addEventListener('drop', (e) => importar(e.dataTransfer.files));

// ---------------------------------------------------------------------
// Listas e campos
// ---------------------------------------------------------------------
const ponto = () => st.tour.pontos.find((p) => p.id === st.sel);
function listar() {
  $('#pontos').innerHTML = st.tour.pontos.map((p, i) => `<li data-id="${p.id}" class="${p.id === st.sel ? 'sel' : ''}"><img src="${p.src || ''}" alt=""><div><b>${i + 1}. ${esc(p.nome)}</b><small>${p.id === st.tour.inicio ? 'início do tour · ' : ''}${r2(p.x)} m, ${r2(p.z)} m</small></div></li>`).join('');
  const p = ponto();
  $('#secPonto').hidden = !p;
  if (p) { $('#pNome').value = p.nome; $('#pRumo').value = Math.round(p.rumo || 0); $('#pRumoV').textContent = Math.round(p.rumo || 0) + '°'; $('#pInicio').checked = st.tour.inicio === p.id; }
  $('#comodos').innerHTML = st.tour.comodos.map((c) => `<li data-id="${c.id}" class="${c.id === st.selRoom ? 'sel' : ''}"><input data-f="nome" value="${esc(c.nome)}"><button class="ed-del" data-del="${c.id}" title="Remover">×</button>
    <div class="dims"><input data-f="w" type="number" step="0.1" value="${r2(c.x1 - c.x0)}"> × <input data-f="d" type="number" step="0.1" value="${r2(c.z1 - c.z0)}"> m <label class="ed-check" style="margin-left:auto"><input type="checkbox" data-f="aberto" ${c.aberto ? 'checked' : ''}> aberto</label></div></li>`).join('');
  $('#tags').innerHTML = st.tour.tags.map((t, i) => `<li data-i="${i}"><input data-f="titulo" value="${esc(t.titulo)}" placeholder="Título"><button class="ed-del" data-del="${i}">×</button><textarea data-f="texto" placeholder="Descrição">${esc(t.texto || '')}</textarea></li>`).join('') || '<p class="ed-help">Nenhum marcador ainda.</p>';
}
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function preencherCampos() {
  const t = st.tour;
  $('#tTitulo').value = t.titulo || ''; $('#tSub').value = t.subtitulo || '';
  $('#tCorretor').value = t.corretor?.nome || ''; $('#tWhats').value = t.corretor?.whatsapp || '';
  $('#tAltura').value = t.alturaCamera || 1.5;
}
$('#pontos').addEventListener('click', (e) => { const li = e.target.closest('li'); if (!li) return; st.sel = li.dataset.id; listar(); mudou(); });
$('#pNome').addEventListener('input', (e) => { const p = ponto(); if (p) { p.nome = e.target.value; listarDepois(); mudou(false); } });
$('#pRumo').addEventListener('input', (e) => { const p = ponto(); if (!p) return; p.rumo = +e.target.value; $('#pRumoV').textContent = p.rumo + '°'; viewer?.atualizarPonto(p); mudou(false); });
$('#pInicio').addEventListener('change', (e) => { if (e.target.checked) st.tour.inicio = st.sel; listar(); mudou(false); });
$('#btnDelPonto').addEventListener('click', () => {
  const p = ponto(); if (!p) return;
  st.tour.pontos = st.tour.pontos.filter((x) => x !== p);
  st.imgs.delete(p.id); URL.revokeObjectURL(st.urls.get(p.id)); st.urls.delete(p.id);
  if (st.tour.inicio === p.id) st.tour.inicio = st.tour.pontos[0]?.id || null;
  st.sel = st.tour.pontos[0]?.id || null;
  listar(); mudou();
});
let lt; const listarDepois = () => { clearTimeout(lt); lt = setTimeout(listar, 400); };
$('#comodos').addEventListener('input', (e) => {
  const li = e.target.closest('li'); const c = st.tour.comodos.find((x) => x.id === li.dataset.id); if (!c) return;
  const f = e.target.dataset.f;
  if (f === 'nome') { c.nome = e.target.value; mudou(false); return; }
  if (f === 'w') c.x1 = r2(c.x0 + Math.max(0.5, +e.target.value || 0.5));
  if (f === 'd') c.z1 = r2(c.z0 + Math.max(0.5, +e.target.value || 0.5));
  if (f === 'aberto') c.aberto = e.target.checked;
  mudou();
});
$('#comodos').addEventListener('click', (e) => {
  const del = e.target.closest('[data-del]');
  if (del) { st.tour.comodos = st.tour.comodos.filter((c) => c.id !== del.dataset.del); listar(); mudou(); return; }
  const li = e.target.closest('li'); if (li) { st.selRoom = li.dataset.id; desenhar(); }
});
$('#tags').addEventListener('input', (e) => { const li = e.target.closest('li'); const t = st.tour.tags[+li.dataset.i]; if (t) { t[e.target.dataset.f] = e.target.value; mudou(); } });
$('#tags').addEventListener('click', (e) => { const d = e.target.closest('[data-del]'); if (d) { st.tour.tags.splice(+d.dataset.del, 1); listar(); mudou(); } });
const campo = (id, fn) => $(id).addEventListener('input', (e) => { fn(e.target.value); mudou(id === '#tAltura'); });
campo('#tTitulo', (v) => (st.tour.titulo = v));
campo('#tSub', (v) => (st.tour.subtitulo = v));
campo('#tCorretor', (v) => (st.tour.corretor.nome = v));
campo('#tWhats', (v) => (st.tour.corretor.whatsapp = v.replace(/\D/g, '')));
campo('#tAltura', (v) => (st.tour.alturaCamera = Math.min(2.2, Math.max(0.8, +v || 1.5))));

// ---------------------------------------------------------------------
// Planta (canvas 2D)
// ---------------------------------------------------------------------
const cv = $('#plan'), ctx = cv.getContext('2d');
const W2S = (x, z) => [st.view.ox + x * st.view.s, st.view.oz + z * st.view.s];
const S2W = (sx, sy) => [(sx - st.view.ox) / st.view.s, (sy - st.view.oz) / st.view.s];
function tamanho() { const r = cv.getBoundingClientRect(); const d = devicePixelRatio || 1; cv.width = r.width * d; cv.height = r.height * d; ctx.setTransform(d, 0, 0, d, 0, 0); desenhar(); }
new ResizeObserver(tamanho).observe(cv);
function enquadrar() {
  const r = cv.getBoundingClientRect();
  const xs = [], zs = [];
  st.tour.comodos.forEach((c) => { xs.push(c.x0, c.x1); zs.push(c.z0, c.z1); });
  st.tour.pontos.forEach((p) => { xs.push(p.x - 1, p.x + 1); zs.push(p.z - 1, p.z + 1); });
  if (!xs.length) { xs.push(-4, 4); zs.push(-4, 4); }
  const x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs);
  st.view.s = Math.min((r.width - 80) / (x1 - x0 || 1), (r.height - 80) / (z1 - z0 || 1), 90);
  st.view.ox = r.width / 2 - ((x0 + x1) / 2) * st.view.s;
  st.view.oz = r.height / 2 - ((z0 + z1) / 2) * st.view.s;
  desenhar();
}
const HANDLE = 30;
function desenhar() {
  const r = cv.getBoundingClientRect(), w = r.width, h = r.height, s = st.view.s;
  ctx.clearRect(0, 0, w, h);
  // grade (1 m e 5 m)
  const [wx0, wz0] = S2W(0, 0), [wx1, wz1] = S2W(w, h);
  for (let x = Math.floor(wx0); x <= wx1; x++) { const [sx] = W2S(x, 0); ctx.strokeStyle = x % 5 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.12)'; ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx, h); ctx.stroke(); }
  for (let z = Math.floor(wz0); z <= wz1; z++) { const [, sy] = W2S(0, z); ctx.strokeStyle = z % 5 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.12)'; ctx.beginPath(); ctx.moveTo(0, sy); ctx.lineTo(w, sy); ctx.stroke(); }
  // escala
  ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '11px Inter, sans-serif';
  ctx.fillRect(14, h - 18, s, 2); ctx.fillText('1 m', 14, h - 24);
  // cômodos
  for (const c of st.tour.comodos) {
    const [x0, y0] = W2S(c.x0, c.z0), [x1, y1] = W2S(c.x1, c.z1);
    ctx.fillStyle = c.aberto ? 'rgba(120,180,255,0.06)' : 'rgba(255,255,255,0.07)';
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    ctx.lineWidth = c.id === st.selRoom ? 2.5 : 1.5;
    ctx.strokeStyle = c.id === st.selRoom ? '#ffd34d' : 'rgba(255,255,255,0.7)';
    ctx.setLineDash(c.aberto ? [6, 4] : []); ctx.strokeRect(x0, y0, x1 - x0, y1 - y0); ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.font = '600 12px Inter, sans-serif';
    ctx.fillText(c.nome, x0 + 6, y0 + 16);
    ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.font = '11px Inter, sans-serif';
    ctx.fillText(`${r2(c.x1 - c.x0)} × ${r2(c.z1 - c.z0)} m`, x0 + 6, y0 + 30);
    if (c.id === st.selRoom) for (const [hx, hy] of [[x0, y0], [x1, y0], [x0, y1], [x1, y1]]) { ctx.fillStyle = '#ffd34d'; ctx.fillRect(hx - 5, hy - 5, 10, 10); }
  }
  // rascunho de cômodo
  if (arrasto?.tipo === 'novo') { const [x0, y0] = W2S(arrasto.a[0], arrasto.a[1]), [x1, y1] = W2S(arrasto.b[0], arrasto.b[1]); ctx.strokeStyle = '#ffd34d'; ctx.setLineDash([5, 4]); ctx.strokeRect(x0, y0, x1 - x0, y1 - y0); ctx.setLineDash([]); }
  // ligações
  ctx.strokeStyle = 'rgba(255,211,77,0.25)'; ctx.lineWidth = 1;
  for (const p of st.tour.pontos) for (const id of linksDe(p)) { const q = st.tour.pontos.find((x) => x.id === id); if (q && p.id < q.id) { const [a, b] = W2S(p.x, p.z), [c2, d] = W2S(q.x, q.z); ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c2, d); ctx.stroke(); } }
  // marcadores
  for (const t of st.tour.tags) { const [x, y] = W2S(t.x, t.z); ctx.fillStyle = '#7fd1ff'; ctx.beginPath(); ctx.moveTo(x, y - 6); ctx.lineTo(x + 6, y); ctx.lineTo(x, y + 6); ctx.lineTo(x - 6, y); ctx.fill(); }
  // pontos
  st.tour.pontos.forEach((p, i) => {
    const [x, y] = W2S(p.x, p.z);
    const sel = p.id === st.sel;
    const a = ((p.rumo || 0) * PI) / 180;
    // cone da prévia
    if (sel && viewer && viewer.state.mode === '360' && viewer.state.cur?.id === p.id) {
      const yaw = viewer.state.yaw - PI / 2;
      const g = ctx.createRadialGradient(x, y, 0, x, y, 70); g.addColorStop(0, 'rgba(255,211,77,0.4)'); g.addColorStop(1, 'rgba(255,211,77,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, 70, yaw - 0.55, yaw + 0.55); ctx.closePath(); ctx.fill();
    }
    // seta do rumo (para onde aponta o centro da foto)
    const hx = x + Math.sin(a) * HANDLE, hy = y - Math.cos(a) * HANDLE;
    ctx.strokeStyle = sel ? '#ffd34d' : 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(hx, hy); ctx.stroke();
    ctx.beginPath(); ctx.arc(hx, hy, sel ? 5 : 3.5, 0, 7); ctx.fillStyle = sel ? '#ffd34d' : 'rgba(255,255,255,0.7)'; ctx.fill();
    ctx.beginPath(); ctx.arc(x, y, 11, 0, 7);
    ctx.fillStyle = sel ? '#ffd34d' : '#fff'; ctx.fill();
    ctx.fillStyle = '#15171a'; ctx.font = '700 11px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(i + 1), x, y + 0.5);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.font = '12px Inter, sans-serif';
    ctx.fillText(p.nome, x + 15, y + 18);
  });
  if (!st.tour.pontos.length) { ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '14px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Adicione fotos 360° para começar', w / 2, h / 2); ctx.textAlign = 'left'; }
}
// interação
let arrasto = null;
const posEv = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
cv.addEventListener('pointerdown', (e) => {
  cv.setPointerCapture(e.pointerId);
  const [sx, sy] = posEv(e), [wx, wz] = S2W(sx, sy);
  if (st.tool === 'alinhar') { alinhar(wx, wz); return; }
  if (st.tool === 'desenhar') { arrasto = { tipo: 'novo', a: [snap(wx, 0.1), snap(wz, 0.1)], b: [snap(wx, 0.1), snap(wz, 0.1)] }; return; }
  // alça do rumo do ponto selecionado
  const p = ponto();
  if (p) { const [x, y] = W2S(p.x, p.z); const a = ((p.rumo || 0) * PI) / 180; if (Math.hypot(sx - (x + Math.sin(a) * HANDLE), sy - (y - Math.cos(a) * HANDLE)) < 9) { arrasto = { tipo: 'rumo', p }; return; } }
  // pontos
  for (const q of [...st.tour.pontos].reverse()) { const [x, y] = W2S(q.x, q.z); if (Math.hypot(sx - x, sy - y) < 13) { st.sel = q.id; st.selRoom = null; arrasto = { tipo: 'ponto', p: q, dx: q.x - wx, dz: q.z - wz }; listar(); desenhar(); return; } }
  // cantos do cômodo selecionado
  const c = st.tour.comodos.find((x) => x.id === st.selRoom);
  if (c) for (const [kx, kz] of [['x0', 'z0'], ['x1', 'z0'], ['x0', 'z1'], ['x1', 'z1']]) { const [x, y] = W2S(c[kx], c[kz]); if (Math.abs(sx - x) < 8 && Math.abs(sy - y) < 8) { arrasto = { tipo: 'canto', c, kx, kz }; return; } }
  // cômodos
  for (const q of [...st.tour.comodos].reverse()) if (wx > q.x0 && wx < q.x1 && wz > q.z0 && wz < q.z1) { st.selRoom = q.id; arrasto = { tipo: 'comodo', c: q, wx, wz, o: { ...q } }; listar(); desenhar(); return; }
  st.selRoom = null;
  arrasto = { tipo: 'pan', sx, sy, ox: st.view.ox, oz: st.view.oz };
  desenhar();
});
cv.addEventListener('pointermove', (e) => {
  if (!arrasto) return;
  const [sx, sy] = posEv(e), [wx, wz] = S2W(sx, sy);
  const a = arrasto;
  if (a.tipo === 'pan') { st.view.ox = a.ox + sx - a.sx; st.view.oz = a.oz + sy - a.sy; }
  if (a.tipo === 'novo') a.b = [snap(wx, 0.1), snap(wz, 0.1)];
  if (a.tipo === 'ponto') { a.p.x = r2(snap(wx + a.dx)); a.p.z = r2(snap(wz + a.dz)); a.moveu = true; }
  if (a.tipo === 'rumo') { a.p.rumo = Math.round(((Math.atan2(wx - a.p.x, -(wz - a.p.z)) * 180) / PI + 360) % 360); $('#pRumo').value = a.p.rumo; $('#pRumoV').textContent = a.p.rumo + '°'; viewer?.atualizarPonto(a.p); }
  if (a.tipo === 'canto') { a.c[a.kx] = r2(snap(wx, 0.1)); a.c[a.kz] = r2(snap(wz, 0.1)); a.moveu = true; }
  if (a.tipo === 'comodo') { const dx = snap(wx - a.wx, 0.1), dz = snap(wz - a.wz, 0.1); Object.assign(a.c, { x0: r2(a.o.x0 + dx), x1: r2(a.o.x1 + dx), z0: r2(a.o.z0 + dz), z1: r2(a.o.z1 + dz) }); a.moveu = true; }
  desenhar();
});
cv.addEventListener('pointerup', () => {
  const a = arrasto; arrasto = null;
  if (!a) return;
  if (a.tipo === 'novo') {
    const x0 = Math.min(a.a[0], a.b[0]), x1 = Math.max(a.a[0], a.b[0]), z0 = Math.min(a.a[1], a.b[1]), z1 = Math.max(a.a[1], a.b[1]);
    if (x1 - x0 > 0.6 && z1 - z0 > 0.6) {
      const c = { id: rid(), nome: `Cômodo ${st.tour.comodos.length + 1}`, x0: r2(x0), z0: r2(z0), x1: r2(x1), z1: r2(z1), altura: 2.7 };
      st.tour.comodos.push(c); st.selRoom = c.id;
      ferramenta(null);
      listar(); mudou();
    }
    desenhar();
    return;
  }
  if (a.tipo === 'canto') { const c = a.c; [c.x0, c.x1] = [Math.min(c.x0, c.x1), Math.max(c.x0, c.x1)]; [c.z0, c.z1] = [Math.min(c.z0, c.z1), Math.max(c.z0, c.z1)]; }
  if (a.moveu || a.tipo === 'rumo') { listar(); mudou(a.tipo !== 'rumo'); }
  if (a.tipo === 'ponto' && !a.moveu) mudou();
});
cv.addEventListener('wheel', (e) => {
  e.preventDefault();
  const [sx, sy] = posEv(e), [wx, wz] = S2W(sx, sy);
  st.view.s = Math.min(200, Math.max(8, st.view.s * (1 - e.deltaY * 0.0012)));
  st.view.ox = sx - wx * st.view.s; st.view.oz = sy - wz * st.view.s;
  desenhar();
}, { passive: false });
$('#zMais').addEventListener('click', () => { st.view.s *= 1.25; desenhar(); });
$('#zMenos').addEventListener('click', () => { st.view.s /= 1.25; desenhar(); });
$('#zFit').addEventListener('click', enquadrar);

function ferramenta(t) {
  st.tool = st.tool === t ? null : t;
  $('#btnDesenhar').classList.toggle('on', st.tool === 'desenhar');
  $('#btnAlinhar').classList.toggle('on', st.tool === 'alinhar');
  $('#btnTag').classList.toggle('on', st.tool === 'tag');
  $('#alinharHelp').hidden = st.tool !== 'alinhar';
  cv.style.cursor = st.tool === 'desenhar' || st.tool === 'alinhar' ? 'crosshair' : '';
  const h = $('#prevHint');
  h.textContent = st.tool === 'tag' ? 'Clique na prévia onde o marcador deve ficar' : st.tool === 'alinhar' ? 'Centralize uma referência e clique nela na planta' : 'Prévia ao vivo';
  h.classList.toggle('alert', st.tool === 'tag' || st.tool === 'alinhar');
  $('#planHint').textContent = st.tool === 'desenhar' ? 'Arraste para desenhar o cômodo (grade de 10 cm).' : 'Arraste os pontos para a posição real de cada foto. Gire a seta para indicar para onde a câmera apontava.';
}
$('#btnDesenhar').addEventListener('click', () => ferramenta('desenhar'));
$('#btnAlinhar').addEventListener('click', () => { if (!ponto()) return; if (viewer?.state.cur?.id !== st.sel) { viewer?.irPara(st.sel); } ferramenta('alinhar'); });
$('#btnTag').addEventListener('click', () => ferramenta('tag'));
function alinhar(wx, wz) {
  const p = ponto();
  if (!p || !viewer) return;
  const alvo = Math.atan2(wx - p.x, -(wz - p.z));
  const yaw = viewer.state.yaw;
  p.rumo = Math.round((((((p.rumo || 0) * PI) / 180 + alvo - yaw) * 180) / PI % 360 + 360) % 360);
  viewer.state.yaw = alvo;
  viewer.atualizarPonto(p);
  ferramenta(null);
  listar(); mudou(false);
  toast('Direção ajustada. Confira na prévia girando a vista.');
}

// ---------------------------------------------------------------------
// Prévia ao vivo
// ---------------------------------------------------------------------
let viewer = null, prevT;
function agendarPrevia() { clearTimeout(prevT); prevT = setTimeout(montarPrevia, 350); }
function montarPrevia() {
  const box = $('#preview');
  const yaw = viewer?.state?.yaw;
  viewer?.destroy();
  viewer = null;
  if (!st.tour.pontos.length) { box.innerHTML = '<p class="ed-help" style="padding:24px">A prévia aparece aqui quando você adicionar fotos.</p>'; return; }
  viewer = createViewer(box, { ...st.tour, inicio: st.sel || st.tour.inicio }, { minimal: true, onChange: () => desenhar() });
  if (yaw != null) viewer.state.yaw = yaw;
}
// marcador: clique na prévia
const prev = $('#preview');
prev.addEventListener('pointerdown', (e) => { if (st.tool === 'tag') e.stopPropagation(); }, true);
prev.addEventListener('pointerup', (e) => {
  if (st.tool !== 'tag' || !viewer) return;
  e.stopPropagation();
  const hit = viewer.raycast(e);
  if (!hit) return;
  st.tour.tags.push({ titulo: 'Novo marcador', texto: '', x: r2(hit.point.x), y: r2(hit.point.y), z: r2(hit.point.z) });
  ferramenta(null);
  listar(); mudou();
  const inputs = document.querySelectorAll('#tags input'); inputs[inputs.length - 1]?.select();
  toast('Marcador criado. Escreva o título e a descrição ao lado.');
}, true);
setInterval(() => { if (viewer && viewer.state.mode === '360') desenhar(); }, 250);

// ---------------------------------------------------------------------
// Topo: novo, exemplo, testar, publicar
// ---------------------------------------------------------------------
$('#btnNovo').addEventListener('click', () => {
  const ok = !st.tour.pontos.length || confirmarNovo();
  if (ok) { carregar(novoTour(), new Map()); toast('Projeto novo. Adicione as fotos 360°.'); }
});
let confirmou = 0;
function confirmarNovo() { if (Date.now() - confirmou < 4000) return true; confirmou = Date.now(); toast('Clique em "Novo" de novo para apagar o projeto atual', 4000); return false; }
$('#btnExemplo').addEventListener('click', abrirExemplo);
$('#btnVer').addEventListener('click', () => {
  if (!st.tour.pontos.length) return toast('Adicione fotos primeiro');
  const full = document.createElement('div'); full.className = 'ed-full';
  const close = document.createElement('button'); close.className = 'ed-full-close'; close.textContent = 'Voltar ao editor';
  document.body.append(full, close);
  const v = createViewer(full, { ...st.tour, pontos: st.tour.pontos.map((p) => ({ ...p, links: linksDe(p) })) }, {});
  close.onclick = () => { v.destroy(); full.remove(); close.remove(); };
});
$('#btnExport').addEventListener('click', () => { if (!st.tour.pontos.length) return toast('Adicione fotos primeiro'); $('#modal').hidden = false; $('#zipStatus').textContent = ''; });
$('#mClose').addEventListener('click', () => ($('#modal').hidden = true));
const slug = (s) => (s || 'tour').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'tour';
function baixar(blob, nome) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nome;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
$('#btnJson').addEventListener('click', () => baixar(new Blob([JSON.stringify(limpo(), null, 2)], { type: 'application/json' }), 'tour.json'));
$('#btnZip').addEventListener('click', async () => {
  const s = $('#zipStatus');
  if (!window.JSZip) { s.textContent = 'Não consegui carregar o compactador (JSZip). Verifique a internet e tente de novo.'; return; }
  try {
    s.textContent = 'Montando o pacote…';
    const zip = new window.JSZip();
    const pasta = slug(st.tour.titulo) + '-tour360';
    const root = zip.folder(pasta);
    const txt = async (u) => (await fetch(u)).text();
    let index = await txt('index.html');
    index = index.replace(/<meta name="tour" content="[^"]*">/, '<meta name="tour" content="data/tour/tour.json">').replace(/<title>[^<]*<\/title>/, `<title>${esc(st.tour.titulo || 'Tour 360°')}</title>`);
    root.file('index.html', index);
    root.file('css/tour.css', await txt('css/tour.css'));
    root.file('js/viewer.js', await txt('js/viewer.js'));
    root.file('vendor/three/three.module.min.js', await txt('vendor/three/three.module.min.js'));
    root.file('vendor/three/LICENSE', await txt('vendor/three/LICENSE'));
    root.file('data/tour/tour.json', JSON.stringify(limpo(), null, 2));
    for (const p of st.tour.pontos) { const b = st.imgs.get(p.id); if (b) root.file('data/tour/' + p.img, b); }
    const blob = await zip.generateAsync({ type: 'blob' }, (m) => (s.textContent = `Compactando… ${Math.round(m.percent)}%`));
    baixar(blob, pasta + '.zip');
    s.textContent = `Pronto: ${pasta}.zip (${(blob.size / 1048576).toFixed(1)} MB). Descompacte e publique a pasta.`;
  } catch (e) { s.textContent = 'Erro ao montar o pacote: ' + e.message; }
});

// ---------------------------------------------------------------------
(async () => {
  tamanho();
  if (!(await restaurar())) await abrirExemplo();
})();
window.editor = st;

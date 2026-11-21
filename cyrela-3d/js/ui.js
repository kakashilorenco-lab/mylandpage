import { CONFIG, STATUS_COR } from './config.js';
import { FONTE } from '../data/empreendimentos.js';
import { MARCOS, distLL, fmtDist, toXZ, altura } from './geo.js';
import { corDe, FLOOR_H, BASE_H } from './towers.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const norm = (t) => (t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const ORDEM = { 'Lançamento': 0, 'Em Breve': 1, 'Em obras': 2, 'Pronto para Morar': 3 };
const nums = (s) => (s || '').match(/\d+/g)?.map(Number) || [];
const limpa = (t) => (t || '').replace(/\s*(Saiba mais|Conheça já|Confira|Agende sua visita)[^.]*[!.]?\s*$/i, '').trim();

export function initUI(app) {
  const { THREE, camera, controls, devs, towers } = app;
  const ui = {};

  $('#bSub').textContent = `SÃO PAULO · ${devs.length} EMPREENDIMENTOS`;
  $('#aviso').textContent = `${CONFIG.aviso} Dados consultados em ${FONTE.consulta}.`;

  let toastT;
  const toast = (m, ms = 2400) => { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), ms); };
  let hintT;
  const hint = (m, ms = 5000) => { const h = $('#hint'); h.textContent = m; h.classList.remove('off'); clearTimeout(hintT); hintT = setTimeout(() => h.classList.add('off'), ms); };
  app.on('interact', () => { clearTimeout(hintT); hintT = setTimeout(() => $('#hint').classList.add('off'), 1200); stopTour(); });

  // ---------- Filtros ----------
  const statusList = ['Lançamento', 'Em Breve', 'Em obras', 'Pronto para Morar'];
  const fStatus = new Set(statusList);
  let mostrarVendidos = true;
  $('#fStatus').innerHTML = statusList.map((s) => `<button class="on" data-s="${s}"><i style="background:${STATUS_COR[s]}"></i>${s === 'Pronto para Morar' ? 'Prontos' : s}</button>`).join('') + `<button class="on" data-s="vendido"><i style="background:${STATUS_COR.vendido}"></i>100% vendidos</button>`;
  $('#legend').innerHTML = statusList.map((s) => `<span><i style="background:${STATUS_COR[s]}"></i>${s}</span>`).join('') + `<span><i style="background:${STATUS_COR.vendido}"></i>100% vendido</span>`;
  const bairros = [...new Set(devs.map((d) => d.bairro))].sort((a, b) => a.localeCompare(b, 'pt'));
  $('#fBairro').innerHTML += bairros.map((b) => `<option>${b}</option>`).join('');
  const tipoOk = (d, t) => {
    if (!t) return true;
    const studio = /studio/i.test(d.dorms) || (!d.dorms && !d.suites && /\b2\d m²|\b3\d m²/.test(d.area));
    const n = nums(d.dorms).length ? nums(d.dorms) : nums(d.suites);
    const lo = studio ? 0 : Math.min(...(n.length ? n : [0])), hi = Math.max(...(n.length ? n : [0]));
    if (t === 'studio') return studio;
    if (t === '1-2') return n.length && lo <= 2 && hi >= 1;
    if (t === '3') return n.length && lo <= 3 && hi >= 3;
    if (t === '4') return hi >= 4;
    return true;
  };
  const filtrados = () => {
    const q = norm($('#q').value.trim()), b = $('#fBairro').value, t = $('#fTipo').value;
    return devs.filter((d) => (d.vendido ? mostrarVendidos : fStatus.has(d.status)) && (!b || d.bairro === b) && tipoOk(d, t) && (!q || norm(`${d.nome} ${d.bairro} ${d.endereco}`).includes(q)))
      .sort((a, b2) => (a.vendido - b2.vendido) || (ORDEM[a.status] - ORDEM[b2.status]) || a.nome.localeCompare(b2.nome, 'pt'));
  };
  let atual = devs;
  function renderList() {
    atual = filtrados();
    const set = new Set(atual.map((d) => d.id));
    towers.setVisibleSet(atual.length === devs.length ? null : set);
    $('#sbCount').textContent = `${atual.length} de ${devs.length} empreendimentos`;
    $('#list').innerHTML = atual.length ? atual.map((d) => `<li><button data-id="${d.id}"><i style="background:${corDe(d)}"></i><b>${d.nome}</b><span>${d.bairro} · ${d.area || 'metragem a confirmar'} · ${d.vendido ? '100% vendido' : d.status}</span></button></li>`).join('')
      : '<li class="empty">Nenhum empreendimento com esses filtros.</li>';
  }
  $('#fStatus').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const s = b.dataset.s;
    if (s === 'vendido') mostrarVendidos = !mostrarVendidos;
    else fStatus.has(s) ? fStatus.delete(s) : fStatus.add(s);
    b.classList.toggle('on');
    renderList();
  });
  ['q', 'fBairro', 'fTipo'].forEach((id) => $('#' + id).addEventListener('input', renderList));
  $('#list').addEventListener('click', (e) => { const b = e.target.closest('button[data-id]'); if (b) { app.selecionar(devs.find((d) => d.id === b.dataset.id)); if (app.isMobile) $('#sidebar').classList.add('closed'); } });
  $('#list').addEventListener('mouseover', (e) => { const b = e.target.closest('button[data-id]'); listHover = b ? devs.find((d) => d.id === b.dataset.id) : null; if (app.state.mode === 'mapa') towers.setHover(listHover); });
  $('#list').addEventListener('mouseleave', () => { listHover = null; if (app.state.mode === 'mapa') towers.setHover(null); });
  $('#sbToggle').addEventListener('click', () => $('#sidebar').classList.toggle('closed'));
  if (app.isMobile) $('#sidebar').classList.add('closed');
  let listHover = null;
  renderList();

  // ---------- Rótulos 3D ----------
  const layer = $('#labels');
  const labels = [];
  const v3 = new THREE.Vector3();
  const addLabel = (cls, html, pos, vis, click) => {
    const el = document.createElement('div');
    el.className = 'lbl hidden ' + cls;
    el.innerHTML = html;
    if (click) el.addEventListener('click', click);
    layer.appendChild(el);
    const L = { el, pos, vis, cls };
    labels.push(L);
    return L;
  };
  for (const d of devs) {
    d.label = addLabel('dev', `<i style="color:${corDe(d)};background:${corDe(d)}"></i><b>${d.nome}</b>`, new THREE.Vector3(d.x, d.y + d.altura + 14, d.z), () => app.state.mode === 'mapa' && !app.state.cinema, () => app.selecionar(d));
  }
  const porBairro = {};
  devs.forEach((d) => { (porBairro[d.bairro] ||= []).push(d); });
  for (const [b, list] of Object.entries(porBairro)) {
    const x = list.reduce((s, d) => s + d.x, 0) / list.length, z = list.reduce((s, d) => s + d.z, 0) / list.length;
    addLabel('bairro', b, new THREE.Vector3(x, altura(x, z) + 260, z), () => app.state.mode === 'mapa' && camera.position.distanceTo(controls.target) > 3200);
  }
  for (const m of MARCOS) addLabel('marco', m.nome, new THREE.Vector3(m.xz[0], altura(...m.xz) + 120, m.xz[1]), () => app.state.mode === 'mapa' && camera.position.distanceTo(controls.target) < 9000);
  const floorLbl = addLabel('floor', '', new THREE.Vector3(), () => app.state.mode === 'predio' && !!app.state.floor);
  let hotLbls = [];

  app.on('frame', () => {
    const w = innerWidth, h = innerHeight, dTarget = camera.position.distanceTo(controls.target);
    for (const L of labels) {
      if (!L.vis()) { L.el.classList.add('hidden'); continue; }
      v3.copy(L.pos).project(camera);
      if (v3.z > 1 || Math.abs(v3.x) > 1.1 || Math.abs(v3.y) > 1.1) { L.el.classList.add('hidden'); continue; }
      L.el.classList.remove('hidden');
      const sx = (v3.x * 0.5 + 0.5) * w, sy = (-v3.y * 0.5 + 0.5) * h;
      L.el.style.transform = L.cls === 'dev' ? `translate(${sx - 5}px, ${sy - 5}px)` : L.cls === 'floor' ? `translate(${sx}px, ${sy - 18}px)` : `translate(${sx}px, ${sy}px) translate(-50%, -50%)`;
    }
    // nomes dos prédios quando a câmera está perto, no hover ou quando a lista filtrada é curta
    for (const d of devs) {
      const near = camera.position.distanceTo(d.label.pos) < 2300;
      d.label.el.classList.toggle('named', near || d === app.state.hover || d === listHover || atual.length <= 8);
      d.label.el.classList.toggle('dim', !!d.dim);
    }
  });

  // ---------- Painel do prédio ----------
  const panel = $('#floorPanel');
  function fillPanel(d) {
    $('#fpKicker').innerHTML = `<i style="background:${corDe(d)}"></i>${d.vendido ? '100% vendido' : d.status} · ${d.bairro}`;
    $('#fpTitle').textContent = d.nome;
    const tip = [d.dorms, d.suites].filter(Boolean).join(' · ');
    $('#fpSub').textContent = [tip, d.area].filter(Boolean).join(' · ') || 'Tipologias a confirmar';
    $('#fpDesc').textContent = limpa(d.descricao);
    const sl = $('#fpSlider');
    sl.max = d.andares; sl.value = Math.ceil(d.andares * 0.6);
    $('#fpMin').textContent = '1'; $('#fpMax').textContent = d.andares;
    $('#fpLevel').textContent = '—';
    const facts = [
      ['Endereço', d.endereco || 'Não informado'],
      ['Status', d.vendido ? `${d.status} · 100% vendido` : d.status],
      ['Metragem', d.area || 'Não informada'],
      ['Vagas', d.vagas || 'Não informado'],
      ['Andares', d.andaresEstimado ? `${d.andares} <small>(estimado)</small>` : `${d.andares}`],
    ];
    if (d.torres) facts.push(['Torres', d.torres]);
    if (d.entrega) facts.push(['Entrega prevista', d.entrega]);
    $('#fpFacts').innerHTML = facts.map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join('');
    const dist = MARCOS.filter((m) => ['ibirapuera', 'paulista', 'farialima', 'congonhas', 'villalobos'].includes(m.id))
      .map((m) => [m.nome.replace(' (MASP)', ''), distLL([d.lat, d.lon], m.ll)]).sort((a, b) => a[1] - b[1]).slice(0, 4);
    $('#fpDist').innerHTML = dist.map(([n, m]) => `<span>${n} · ${fmtDist(m)}</span>`).join('') + '<small>Distâncias em linha reta</small>';
    $('#fpSite').href = d.url;
    $('#fpMaps').href = `https://www.google.com/maps/search/?api=1&query=${d.lat},${d.lon}`;
    setInteresse(d, null);
  }
  function setInteresse(d, n) {
    const txt = `Olá! Vi o ${d.nome} (${d.bairro}) no Mapa 3D${n ? ` e gostei do ${n}º andar` : ''}. Pode me passar valores e disponibilidade?`;
    const href = `https://wa.me/${CONFIG.corretor.whatsapp}?text=${encodeURIComponent(txt)}`;
    $('#fpInteresse').href = href;
    $('#inInteresse').href = href;
  }
  $('#fpSlider').addEventListener('input', (e) => app.setFloor(+e.target.value));
  $('#fpEnter').addEventListener('click', () => app.entrar(+$('#fpSlider').value));
  app.on('floor', (n) => {
    const d = app.state.sel;
    $('#fpLevel').textContent = n || '—';
    if (n) $('#fpSlider').value = n;
    if (d && n) {
      const t = d.torresInfo[0];
      floorLbl.pos.set(d.x + t.ox + d.w / 2 + 4, d.y + BASE_H + (n - 0.5) * FLOOR_H, d.z);
      floorLbl.el.textContent = n;
      setInteresse(d, n);
    }
  });

  // ---------- Modos ----------
  const back = $('#btnBack');
  app.on('mode', (mode, d, n) => {
    document.body.classList.toggle('interior', mode === 'interior');
    document.body.classList.toggle('predio', mode === 'predio');
    $('#sidebar').classList.toggle('away', mode !== 'mapa');
    panel.setAttribute('aria-hidden', mode === 'predio' ? 'false' : 'true');
    $('#interiorUI').hidden = mode !== 'interior';
    $('#brand').hidden = mode !== 'mapa';
    back.hidden = mode === 'mapa';
    back.textContent = mode === 'interior' ? '← Voltar ao prédio' : '← Voltar ao mapa';
    hotLbls.forEach((L) => { L.el.remove(); labels.splice(labels.indexOf(L), 1); });
    hotLbls = [];
    if (mode === 'predio' && d) { fillPanel(d); hint('Aponte para um andar do prédio, ou use o controle do painel'); }
    if (mode === 'interior' && d) {
      $('#inTitle').textContent = `Andar ${n}, ${d.nome}`;
      $('#inDesc').textContent = 'A sala se abre para a varanda; a cozinha e o jantar ficam integrados.';
      hotLbls = app.state.interior.userData.hotspots.map((h) => addLabel('hot', `<button>${h.nome}</button>`, h.pos, () => app.state.mode === 'interior', () => app.verAmbiente(h.id)));
      hint('Arraste para olhar ao redor · toque nos pontos para mudar de ambiente');
    }
  });
  app.on('ambiente', (name) => {
    const txt = { sala: 'A sala se abre para a varanda; a cozinha e o jantar ficam integrados.', cozinha: 'Cozinha aberta com ilha, voltada para o living.', estar: 'Estar com sofá, painel de TV e luz natural da varanda.', sacada: 'A varanda e a vista real deste andar.' };
    $('#inDesc').textContent = txt[name] || '';
  });
  back.addEventListener('click', () => (app.state.mode === 'interior' ? app.voltarPredio() : app.irMapa()));
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && app.state.mode !== 'mapa') back.click(); });

  // ---------- Topo ----------
  $('#tempo').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) app.setTempo(b.dataset.t); });
  app.on('tempo', (k) => $$('#tempo button').forEach((b) => b.classList.toggle('on', b.dataset.t === k)));
  $('#btnShare').addEventListener('click', async () => {
    let base = window.SHARE_BASE; if (!base) { try { base = location.origin + location.pathname; } catch { base = ''; } }
    const url = base + (app.state.sel ? '#' + app.state.sel.id : '');
    try { await navigator.clipboard.writeText(url); toast('Link copiado!'); } catch { toast(url, 6000); }
  });

  // Tour pelos empreendimentos filtrados
  let tour = null;
  function stopTour() { if (!tour) return; clearTimeout(tour); tour = null; $('#btnTour').classList.remove('on'); $('#btnTour').textContent = '▶ Tour'; }
  $('#btnTour').addEventListener('click', () => {
    if (tour) { stopTour(); return; }
    const lista = atual.length ? atual : devs;
    let i = 0;
    $('#btnTour').classList.add('on'); $('#btnTour').textContent = '❚❚ Parar tour';
    const next = () => { app.selecionar(lista[i % lista.length], { dur: 2.6 }); i++; tour = setTimeout(next, 8000); };
    next();
  });

  // ---------- Início ----------
  app.on('ready', async () => {
    await app.fly(...app.overview(), 3.4);
    hint('Arraste para girar · role para aproximar · clique num prédio');
    let h = ''; try { h = decodeURIComponent(location.hash.slice(1)); } catch { /* */ }
    const d = devs.find((x) => x.id === h);
    if (d) app.selecionar(d);
  });
  addEventListener('hashchange', () => { const d = devs.find((x) => x.id === decodeURIComponent(location.hash.slice(1))); if (d && d !== app.state.sel) app.selecionar(d); });
  return ui;
}

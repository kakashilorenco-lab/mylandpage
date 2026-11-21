import { CONFIG, COMODOS } from './config.js';
import { STATUS, FINAIS, brl } from './data.js';
import { unitBox, PODIUM } from './towers.js';
import { heightAt } from './world.js';
import { planSVG } from './plans.js';
import { solar, hhmm, minutesToHHMM, rumo, ESTACOES, periodo } from './sun.js';
import { initCatalog } from './catalog.js';
import { initFilm } from './film.js';
import { initProposal } from './proposal.js';
import { initAssistant } from './assistant.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

export function initUI(app) {
  const { THREE, camera, units } = app;
  const ui = { app };
  app.ui = ui;

  // ---------- utilidades ----------
  let toastT;
  ui.toast = (msg, ms = 2600) => {
    const t = $('#toast');
    t.innerHTML = msg;
    t.classList.add('show');
    t.style.pointerEvents = /<a|<button/.test(msg) ? 'auto' : 'none';
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove('show'), ms);
  };
  ui.copy = async (text, msg = 'Copiado!') => {
    try { await navigator.clipboard.writeText(text); ui.toast(msg); }
    catch {
      // sem acesso à área de transferência: mostra o texto selecionado para copiar à mão
      $('#lightContent').innerHTML = `<h3>Copie o texto</h3><textarea id="copyBox" rows="8" style="width:100%;color:#111;background:#fff;border:1px solid #ccc">${text.replace(/</g, '&lt;')}</textarea>`;
      modal('lightbox', true);
      const box = $('#copyBox'); box.focus(); box.select();
    }
  };
  ui.embedded = (() => { try { return window.self !== window.top; } catch { return true; } })();
  ui.shareUrl = (id) => {
    let base = window.SHARE_BASE;
    if (!base) { try { base = location.origin + location.pathname; } catch { base = ''; } }
    return base + (id ? '#' + id : '');
  };
  const panel = (id, open) => { const el = $('#' + id); if (el) el.setAttribute('aria-hidden', open ? 'false' : 'true'); };
  const isOpen = (id) => $('#' + id).getAttribute('aria-hidden') === 'false';
  ui.panel = panel;
  const modal = (id, open) => { $('#' + id).hidden = !open; };
  ui.modal = modal;
  const store = {
    get: (k, d) => { try { return JSON.parse(localStorage.getItem('imersivo:' + k)) ?? d; } catch { return d; } },
    set: (k, v) => { try { localStorage.setItem('imersivo:' + k, JSON.stringify(v)); } catch { /* sem storage */ } },
  };
  ui.store = store;

  // Fechar por data-close
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-close]');
    if (!b) return;
    const k = b.dataset.close;
    if (k === 'unit') { panel('unitPanel', false); app.selectUnit(null, { fly: false }); }
    else if (k === 'units') { panel('unitsPanel', false); if (app.state.mode === 'unidades') setNav('explorar'); }
    else if (k === 'solar') { panel('solarPanel', false); syncToggles(); }
    else if (k === 'vistas') { panel('vistasPanel', false); app.exitVista(); setNav('explorar', true); }
    else if (k === 'lazer') { panel('lazerCard', false); app.state.mode = 'explorar'; setNav('explorar', true); }
    else if (k === 'catalogView') ui.catalog.close();
    else modal(k, false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    for (const id of ['lightbox', 'propModal', 'presModal']) if (!$('#' + id).hidden) { modal(id, false); return; }
    if (!$('#catalogView').hidden) { ui.catalog.close(); return; }
    if (app.state.interior) { app.exitInterior(); return; }
  });

  // ---------- Marcadores 3D (HTML projetado) ----------
  const labelsEl = $('#labels');
  const labels = [];
  const v3 = new THREE.Vector3();
  ui.addLabel = (cls, html, pos, visible, onClick) => {
    const el = document.createElement('div');
    el.className = 'lbl ' + cls;
    el.innerHTML = html;
    if (onClick) el.addEventListener('click', onClick);
    labelsEl.appendChild(el);
    const L = { el, pos, visible };
    labels.push(L);
    return L;
  };
  // POIs
  const poiIcon = { praia: '🌊', via: '🛣️', cidade: '🏙️', compras: '🛍️', saude: '🏥', natureza: '⛰️', escola: '🎓' };
  for (const p of CONFIG.pois) {
    const y = Math.max(heightAt(p.x, p.z), 2) + 40;
    ui.addLabel('poi', `<div class="tag">${poiIcon[p.tipo] || '📍'} ${p.nome} <small>${p.dist}</small></div><div class="stem"></div>`, new THREE.Vector3(p.x, y, p.z), () => app.state.view === 'localizacao' && app.state.labels);
  }
  ui.addLabel('poi main', `<div class="tag">📍 ${CONFIG.nome}</div><div class="stem"></div>`, new THREE.Vector3(0, 150, 0), () => (app.state.view === 'localizacao' || app.state.view === 'aerea') && app.state.labels);
  // Lazer
  for (const l of CONFIG.lazer) {
    ui.addLabel('hot', `<button><i>+</i>${l.nome}</button>`, new THREE.Vector3(l.x, PODIUM.top + 2.5, l.z), () => app.state.mode === 'lazer' && app.state.labels, () => openLazer(l.id, true));
  }
  // Etiqueta da unidade selecionada e hover
  const selTag = ui.addLabel('unit-tag', '', new THREE.Vector3(), () => !!app.state.selected && !app.state.interior && !app.state.vista && !app.state.cinema);
  const hovTag = ui.addLabel('hover-tag', '', new THREE.Vector3(), () => !!app.state.hover && app.state.hover !== app.state.selected && !app.state.cinema);

  app.on('frame', () => {
    const w = innerWidth, h = innerHeight;
    for (const L of labels) {
      const vis = L.visible();
      if (!vis) { if (!L.el.classList.contains('hidden')) L.el.classList.add('hidden'); continue; }
      v3.copy(L.pos).project(camera);
      if (v3.z > 1 || Math.abs(v3.x) > 1.2 || Math.abs(v3.y) > 1.2) { L.el.classList.add('hidden'); continue; }
      L.el.classList.remove('hidden');
      L.el.style.transform = `translate(${(v3.x * 0.5 + 0.5) * w}px, ${(-v3.y * 0.5 + 0.5) * h}px) translate(-50%, ${L.el.classList.contains('hot') ? '-50%' : L.el.classList.contains('poi') ? '-100%' : '-150%'})`;
    }
    // bússola
    const dx = app.controls.target.x - camera.position.x, dz = app.controls.target.z - camera.position.z;
    const heading = Math.atan2(dx, -dz);
    $('#compass i').style.transform = `rotate(${-heading}rad)`;
  });
  const placeUnitTag = (L, u, html) => {
    if (!u) return;
    const b = unitBox(u);
    b.getCenter(L.pos);
    L.pos.y = b.max.y + 0.5;
    L.el.innerHTML = html;
  };
  app.on('hover', (u) => placeUnitTag(hovTag, u, u ? `${u.id}<small>${STATUS[u.status].label}</small>` : ''));

  // ---------- Navegação superior ----------
  const setNavActive = (name) => $$('#mainnav button').forEach((b) => b.classList.toggle('active', b.dataset.nav === name));
  function setNav(name, onlyActive) {
    setNavActive(name);
    if (!onlyActive) ui.setMode(name);
  }
  ui.setNav = setNav;
  $('#mainnav').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setNav(b.dataset.nav); });

  ui.setMode = (name, opts = {}) => {
    const prev = app.state.mode;
    app.state.mode = name;
    setNavActive(name);
    if (name !== 'vistas' && app.state.vista) app.exitVista();
    if (name !== 'interiores' && app.state.interior) app.exitInterior(true);
    if (name !== 'unidades') panel('unitsPanel', false);
    if (name !== 'lazer') panel('lazerCard', false);
    if (name !== 'vistas') panel('vistasPanel', false);
    if (name === 'explorar') {
      if (prev !== 'explorar' || opts.reset) { app.goPreset('geral'); setView('geral', true); }
    } else if (name === 'unidades') {
      panel('unitsPanel', true);
      panel('solarPanel', false);
      if (!app.state.disp) app.setDisp(true);
      renderMirror();
      if (!app.state.selected) app.goPreset('unidades');
    } else if (name === 'lazer') {
      panel('unitPanel', false);
      panel('solarPanel', false);
      openLazer(CONFIG.lazer[0].id, false);
      app.goPreset('lazer');
    } else if (name === 'vistas') {
      panel('unitPanel', false);
      panel('solarPanel', false);
      const u = opts.unit || app.state.selected || app.findUnit('A-3202');
      openVistas(u);
    } else if (name === 'interiores') {
      const u = opts.unit || app.state.selected || app.findUnit('A-3202');
      panel('unitPanel', false);
      app.enterInterior(u);
    }
    syncToggles();
  };

  // ---------- Barra inferior ----------
  function setView(v, silent) {
    app.state.view = v;
    $$('#bottombar [data-view]').forEach((b) => b.classList.toggle('active', b.dataset.view === v));
    if (!silent) {
      if (app.state.vista) { app.exitVista(); panel('vistasPanel', false); }
      if (app.state.interior) app.exitInterior(true);
      if (app.state.mode !== 'explorar' && app.state.mode !== 'unidades') { app.state.mode = 'explorar'; setNavActive('explorar'); panel('lazerCard', false); }
      app.goPreset(v, v === 'localizacao' ? 2.4 : 1.8);
    }
  }
  ui.setView = setView;
  function syncToggles() {
    const night = (app.state.nightF || 0) > 0.5;
    const bn = $('#btnNight');
    bn.classList.toggle('on', night);
    bn.textContent = night ? 'Ver de dia' : 'Ver à noite';
    $('#btnDisp').classList.toggle('on', app.state.disp);
    $('#btnQuality').classList.toggle('on', !!app.state.hiQuality);
    $('[data-toggle="sol"]').classList.toggle('on', isOpen('solarPanel'));
    $('#legend').hidden = !app.state.disp || !!app.state.interior || !!app.state.vista;
  }
  ui.syncToggles = syncToggles;
  $('#bottombar').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.view) return setView(b.dataset.view);
    const t = b.dataset.toggle;
    if (t === 'sol') {
      const open = !isOpen('solarPanel');
      panel('solarPanel', open);
      if (open) { panel('unitsPanel', false); panel('lazerCard', false); panel('vistasPanel', isOpen('vistasPanel') && false); }
    } else if (t === 'noite') {
      const night = (app.state.nightF || 0) > 0.5;
      animateTimeTo(night ? 10 * 60 + 30 : 20 * 60 + 15);
    } else if (t === 'disp') {
      app.setDisp(!app.state.disp);
      if (app.state.disp && !app.state.selected && app.state.mode === 'explorar') app.goPreset('unidades');
    } else if (t === 'qualidade') {
      app.setQuality(!app.state.hiQuality);
      ui.toast(app.state.hiQuality ? 'Qualidade alta ativada' : 'Modo leve ativado (mais rápido)');
    }
    syncToggles();
  });
  app.on('disp', syncToggles);

  let timeAnim = null;
  function animateTimeTo(target) {
    const from = app.state.minutes;
    let diff = target - from;
    if (diff < 0) diff += 1440;
    const dur = 2.2;
    let t = 0;
    timeAnim = (dt) => {
      t += dt / dur;
      const k = Math.min(1, t);
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      app.setTime(from + diff * e);
      if (k >= 1) timeAnim = null;
    };
  }
  ui.animateTimeTo = animateTimeTo;

  // ---------- Topo: material, compartilhar, configurações, bússola ----------
  const dd = $('#ddMaterial'), ds = $('#ddSettings');
  $('#btnMaterial').addEventListener('click', (e) => { e.stopPropagation(); ds.classList.remove('open'); dd.classList.toggle('open'); });
  $('#btnSettings').addEventListener('click', (e) => { e.stopPropagation(); dd.classList.remove('open'); ds.classList.toggle('open'); });
  document.addEventListener('click', (e) => { if (!e.target.closest('.dropdown')) { dd.classList.remove('open'); ds.classList.remove('open'); } });
  dd.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    dd.classList.remove('open');
    const k = b.dataset.mat;
    if (k === 'catalogo') ui.catalog.open();
    if (k === 'filme') ui.film.open();
    if (k === 'tabela') openPriceTable();
    if (k === 'plantas') openPlans();
  });
  $('#btnShare').addEventListener('click', () => ui.copy(ui.shareUrl(app.state.selected && app.state.selected.id), 'Link copiado! Envie para o seu cliente.'));
  $('#optAutoRotate').addEventListener('change', (e) => { app.controls.autoRotate = e.target.checked; app.controls.autoRotateSpeed = 0.6; });
  $('#optLabels').addEventListener('change', (e) => { app.state.labels = e.target.checked; });
  $('#optShadows').addEventListener('change', (e) => { app.renderer.shadowMap.enabled = e.target.checked; app.scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; }); });
  $('#btnFullscreen').addEventListener('click', () => {
    const p = !document.fullscreenElement ? document.documentElement.requestFullscreen?.() : document.exitFullscreen?.();
    if (p && p.catch) p.catch(() => ui.toast('Tela cheia não disponível aqui'));
  });
  $('#compass').addEventListener('click', () => {
    if (app.state.interior || app.state.vista) return;
    const t = app.controls.target.clone();
    const d = Math.hypot(camera.position.x - t.x, camera.position.z - t.z);
    app.fly(new THREE.Vector3(t.x, camera.position.y, t.z + d), t, 1.2);
  });

  // ---------- Painel da unidade ----------
  const favs = new Set(store.get('favs', []));
  let compare = store.get('compare', []);
  function fillUnit(u) {
    const tip = u.tip;
    $('#upKicker').textContent = `APARTAMENTO · TORRE ${u.torre}`;
    $('#upCode').textContent = u.id;
    $('#upSub').textContent = `Final ${u.final} · ${tip.area} m²`;
    const st = $('#upStatus');
    st.textContent = STATUS[u.status].label.toUpperCase();
    st.className = 'badge ' + u.status;
    $('#upPrice').textContent = u.status === 'vendido' ? 'Vendida' : brl(u.preco);
    $('#upConds').innerHTML = CONFIG.condicoes.map((c) => `<span>${c}</span>`).join('');
    $('#upPlanSvg').innerHTML = planSVG(u.final, { scale: 30, numbers: false });
    const solTxt = u.final === '01' || u.final === '02' ? 'Sol da manhã' : 'Sol da tarde';
    $('#upSpecs').innerHTML = [
      ['Localização', `${u.andar}º pavimento`], ['Área privativa', `${tip.area} m²`], ['Suítes', tip.suites], ['Dormitórios', tip.dormitorios],
      ['Home office', tip.homeOffice ? 'Sim' : 'Não'], ['Lavabo', tip.lavabo ? 'Sim' : 'Não'], ['Vagas', tip.vagas], ['Vista', tip.vista], ['Insolação', solTxt],
    ].map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join('');
    $('#upProposal').disabled = u.status === 'vendido';
    $('#upProposal').style.opacity = u.status === 'vendido' ? 0.4 : 1;
    $('#upFav').classList.toggle('on', favs.has(u.id));
    $('#upFav').textContent = favs.has(u.id) ? '♥ Favorita' : '♡ Favoritar';
    $('#upCompare').classList.toggle('on', compare.includes(u.id));
  }
  app.on('select', (u) => {
    if (u) {
      fillUnit(u);
      panel('unitPanel', true);
      placeUnitTag(selTag, u, u.id);
      if (isOpen('solarPanel') && innerWidth < 1100) panel('solarPanel', false);
      renderMirror();
    } else {
      panel('unitPanel', false);
    }
  });
  const sel = () => app.state.selected;
  $('#upInside').addEventListener('click', () => { const u = sel(); if (u) { ui.setMode('interiores', { unit: u }); } });
  $('#upView').addEventListener('click', () => { const u = sel(); if (u) ui.setMode('vistas', { unit: u }); });
  $('#upProposal').addEventListener('click', () => { const u = sel(); if (u) ui.proposal.open(u); });
  $('#upPlan').addEventListener('click', () => {
    const u = sel(); if (!u) return;
    $('#lightContent').innerHTML = `<h3>${u.id} · Planta humanizada</h3><div style="background:#fff;border-radius:12px;padding:10px">${planSVG(u.final, { scale: 60, accent: CONFIG.catalogo.corPrincipal })}</div>
      <p class="tiny" style="color:#555;margin-top:10px">${COMODOS[u.final].map(([n, a], i) => `${String(i + 1).padStart(2, '0')} ${n} · ${a.toLocaleString('pt-BR')} m²`).join(' &nbsp;·&nbsp; ')}</p>`;
    modal('lightbox', true);
  });
  $('#upFav').addEventListener('click', () => {
    const u = sel(); if (!u) return;
    favs.has(u.id) ? favs.delete(u.id) : favs.add(u.id);
    store.set('favs', [...favs]);
    fillUnit(u);
    ui.toast(favs.has(u.id) ? `${u.id} salva nos favoritos` : 'Removida dos favoritos');
  });
  $('#upCompare').addEventListener('click', () => {
    const u = sel(); if (!u) return;
    if (compare.includes(u.id)) compare = compare.filter((x) => x !== u.id);
    else compare = [...compare.slice(-2), u.id];
    store.set('compare', compare);
    fillUnit(u);
    if (compare.length >= 2) openCompare(); else ui.toast('Selecione outra unidade e toque em Comparar');
  });
  $('#upShare').addEventListener('click', () => { const u = sel(); if (u) ui.copy(ui.shareUrl(u.id), `Link da ${u.id} copiado!`); });

  function openCompare() {
    const list = compare.map((id) => app.findUnit(id)).filter(Boolean);
    const rows = [['Status', (u) => STATUS[u.status].label], ['Andar', (u) => u.andar + 'º'], ['Área', (u) => u.tip.area + ' m²'], ['Suítes', (u) => u.tip.suites], ['Vagas', (u) => u.tip.vagas], ['Vista', (u) => u.tip.vista], ['Valor', (u) => brl(u.preco)], ['R$/m²', (u) => brl(u.preco / u.tip.area)]];
    $('#lightContent').innerHTML = `<h3>Comparar unidades</h3><table><tr><th></th>${list.map((u) => `<th>${u.id}</th>`).join('')}</tr>${rows.map(([n, f]) => `<tr><td>${n}</td>${list.map((u) => `<td>${f(u)}</td>`).join('')}</tr>`).join('')}</table>
      <div class="plans-grid" style="margin-top:14px">${list.map((u) => `<figure>${planSVG(u.final, { scale: 34, numbers: false })}<figcaption>${u.id}</figcaption></figure>`).join('')}</div>`;
    modal('lightbox', true);
  }
  function openPriceTable() {
    const rows = units.filter((u) => u.status !== 'vendido').map((u) => `<tr><td><b>${u.id}</b></td><td>${u.andar}º</td><td>${u.final}</td><td>${u.tip.area} m²</td><td>${u.tip.suites}</td><td>${STATUS[u.status].label}</td><td>${brl(u.preco)}</td></tr>`).join('');
    $('#lightContent').innerHTML = `<h3>Tabela de preços · ${CONFIG.nome}</h3><p style="margin:-4px 0 12px;color:#555">Condições: ${CONFIG.condicoes.join(' · ')}. Valores sujeitos a alteração.</p>
      <div style="max-height:60vh;overflow:auto"><table><tr><th>Unidade</th><th>Andar</th><th>Final</th><th>Área</th><th>Suítes</th><th>Status</th><th>Valor</th></tr>${rows}</table></div>`;
    modal('lightbox', true);
  }
  function openPlans() {
    $('#lightContent').innerHTML = `<h3>Plantas humanizadas</h3><div class="plans-grid">${FINAIS.map((f) => `<figure>${planSVG(f, { scale: 34, accent: CONFIG.catalogo.corPrincipal })}<figcaption>Final ${f} · ${CONFIG.tipologias[f].area} m² · ${CONFIG.tipologias[f].suites} suítes</figcaption></figure>`).join('')}</div>`;
    modal('lightbox', true);
  }
  ui.openPlans = openPlans;
  ui.openPriceTable = openPriceTable;

  // ---------- Espelho de vendas ----------
  let mirrorTower = CONFIG.torres[0].id;
  $('#towerSeg').innerHTML = CONFIG.torres.map((t) => `<button data-t="${t.id}" class="${t.id === mirrorTower ? 'active' : ''}">Torre ${t.id}</button>`).join('');
  $('#towerSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; mirrorTower = b.dataset.t; $$('#towerSeg button').forEach((x) => x.classList.toggle('active', x === b)); renderMirror(); });
  $('#fFinal').innerHTML += FINAIS.map((f) => `<option value="${f}">Final ${f} · ${CONFIG.tipologias[f].area} m²</option>`).join('');
  $('#fFinal').addEventListener('change', () => { renderMirror(); applyDispFilter(); });
  $('#fStatus').addEventListener('change', () => { renderMirror(); applyDispFilter(); });
  const filterFn = () => {
    const f = $('#fFinal').value, s = $('#fStatus').value;
    return (u) => (!f || u.final === f) && (!s || u.status === s);
  };
  function applyDispFilter() { if (app.state.disp) app.setDisp(true, filterFn()); }
  function renderMirror() {
    if (!isOpen('unitsPanel')) return;
    const t = CONFIG.torres.find((x) => x.id === mirrorTower);
    const ok = filterFn();
    let html = `<table><tr><th></th>${FINAIS.map((f) => `<th>${f}</th>`).join('')}</tr>`;
    for (let a = t.andares; a >= 1; a--) {
      html += `<tr><td class="fl">${a}º</td>`;
      for (const f of FINAIS) {
        const u = app.findUnit(`${t.id}-${a}${f}`);
        html += `<td><button class="${u.status} ${ok(u) ? '' : 'dim'} ${app.state.selected === u ? 'sel' : ''}" data-u="${u.id}" title="${u.id} · ${STATUS[u.status].label}">${a}${f}</button></td>`;
      }
      html += '</tr>';
    }
    $('#mirror').innerHTML = html + '</table>';
    const avail = units.filter((u) => u.torre === t.id && u.status === 'disponivel');
    const min = Math.min(...avail.map((u) => u.preco));
    $('#unitsCount').textContent = `${avail.length} unidades disponíveis na Torre ${t.id}${avail.length ? ' · a partir de ' + brl(min) : ''}`;
  }
  ui.renderMirror = renderMirror;
  $('#mirror').addEventListener('click', (e) => { const b = e.target.closest('button[data-u]'); if (b) app.selectUnit(app.findUnit(b.dataset.u)); });

  // ---------- Estudo solar ----------
  $('#solarKicker').textContent = `ESTUDO SOLAR · ${CONFIG.nomeCurto.toUpperCase()}`;
  const slider = $('#solSlider'), dateIn = $('#solDate');
  const fmtDate = ({ y, m, d }) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  dateIn.value = fmtDate(app.state.date);
  $('#seasons').innerHTML = Object.entries(ESTACOES).map(([k, s]) => `<button data-s="${k}">${s.label}</button>`).join('');
  slider.addEventListener('input', () => { timeAnim = null; dayAnim = false; $('#solAnimate').textContent = '▶ Animar dia'; app.setTime(+slider.value); });
  dateIn.addEventListener('change', () => { const [y, m, d] = dateIn.value.split('-').map(Number); if (y) app.setDate(y, m - 1, d); markSeason(); });
  $('#seasons').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const s = ESTACOES[b.dataset.s];
    app.setDate(app.state.date.y, s.m, s.d);
    dateIn.value = fmtDate(app.state.date);
    markSeason();
  });
  function markSeason() { $$('#seasons button').forEach((b) => { const s = ESTACOES[b.dataset.s]; b.classList.toggle('active', s.m === app.state.date.m && s.d === app.state.date.d); }); }
  markSeason();
  let dayAnim = false;
  $('#solAnimate').addEventListener('click', () => {
    dayAnim = !dayAnim;
    $('#solAnimate').textContent = dayAnim ? '❚❚ Pausar' : '▶ Animar dia';
  });
  app.on('time', (s) => {
    const min = Math.round(app.state.minutes);
    if (+slider.value !== min) slider.value = min;
    $('#solClock').textContent = minutesToHHMM(min);
    $('#solPeriod').textContent = periodo(s.sunAltDeg);
    $('#solRise').textContent = hhmm(s.nascer);
    $('#solNoon').textContent = hhmm(s.meioDia);
    $('#solSet').textContent = hhmm(s.poente);
    $('#solSun').textContent = s.sunAltDeg > 0 ? `${s.sunAltDeg.toFixed(0)}° de altura · ${rumo(s.sunAzN)}` : 'abaixo do horizonte';
    $('#solMoon').textContent = `${s.moonAltDeg > 0 ? s.moonAltDeg.toFixed(0) + '° · ' + rumo(s.moonAzN) : 'abaixo do horizonte'} · ${Math.round(s.moonFrac * 100)}% iluminada`;
    const durMin = (s.poente - s.nascer) / 60000;
    $('#solDay').textContent = `${hhmm(s.nascer)} – ${hhmm(s.poente)} · ${Math.floor(durMin / 60)}h${String(Math.round(durMin % 60)).padStart(2, '0')}`;
    syncToggles();
  });
  app.on('frame', (dt) => {
    if (timeAnim) timeAnim(dt);
    if (dayAnim) app.setTime(app.state.minutes + dt * 110);
  });

  // ---------- Vistas ----------
  let vistaTower = 'A', vistaFinal = '01';
  $('#vistaTower').innerHTML = CONFIG.torres.map((t) => `<button data-t="${t.id}">Torre ${t.id}</button>`).join('');
  function openVistas(u) {
    vistaTower = u.torre; vistaFinal = u.final;
    const t = CONFIG.torres.find((x) => x.id === vistaTower);
    const fl = $('#vistaFloor');
    fl.max = t.andares; fl.value = u.andar;
    panel('vistasPanel', true);
    updateVista();
  }
  function updateVista() {
    const fl = $('#vistaFloor');
    const t = CONFIG.torres.find((x) => x.id === vistaTower);
    if (+fl.value > t.andares) fl.value = t.andares;
    fl.max = t.andares;
    fl.style.setProperty('--p', ((fl.value - 1) / (fl.max - 1)) * 100 + '%');
    $$('#vistaTower button').forEach((b) => b.classList.toggle('active', b.dataset.t === vistaTower));
    $$('#vistaDir button').forEach((b) => b.classList.toggle('active', b.dataset.dir === vistaFinal));
    const u = app.findUnit(`${vistaTower}-${fl.value}${vistaFinal}`);
    $('#vistaTitle').textContent = `${fl.value}º pavimento · ${u.id}`;
    app.enterVista(u);
  }
  $('#vistaFloor').addEventListener('input', updateVista);
  $('#vistaTower').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { vistaTower = b.dataset.t; updateVista(); } });
  $('#vistaDir').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { vistaFinal = b.dataset.dir; updateVista(); } });

  // ---------- Lazer ----------
  $('#lazerList').innerHTML = CONFIG.lazer.map((l) => `<button data-l="${l.id}">${l.nome}</button>`).join('');
  $('#lazerList').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) openLazer(b.dataset.l, true); });
  function openLazer(id, fly) {
    const l = CONFIG.lazer.find((x) => x.id === id);
    if (app.state.mode !== 'lazer') { app.state.mode = 'lazer'; setNavActive('lazer'); }
    $('#lazerTitle').textContent = l.nome;
    $('#lazerDesc').textContent = l.desc;
    $$('#lazerList button').forEach((b) => b.classList.toggle('active', b.dataset.l === id));
    panel('lazerCard', true);
    panel('unitPanel', false);
    if (fly) {
      const t = new THREE.Vector3(l.x, PODIUM.top + 1, l.z);
      const dir = new THREE.Vector3(l.x >= 0 ? 1 : -1, 0, l.z >= 0 ? 0.8 : -0.8).normalize();
      app.fly(t.clone().addScaledVector(dir, 34).add(new THREE.Vector3(0, 20, 0)), t, 1.4);
    }
  }

  // ---------- Interior ----------
  app.on('interior', (u) => {
    $('#interiorBar').hidden = !u;
    if (!u) { if (app.state.mode === 'interiores') { app.state.mode = 'explorar'; setNavActive('explorar'); } syncToggles(); return; }
    $('#ibCode').textContent = u.id;
    $('#ibSub').textContent = `Final ${u.final} · ${u.andar}º pavimento · ${u.tip.area} m² · decorado`;
    $$('#interiorBar [data-iv]').forEach((b) => b.classList.toggle('active', b.dataset.iv === 'sala'));
    syncToggles();
    hint('Arraste para olhar ao redor · a vista pela janela é a real deste andar');
  });
  $('#interiorBar').addEventListener('click', (e) => {
    const b = e.target.closest('[data-iv]');
    if (!b) return;
    $$('#interiorBar [data-iv]').forEach((x) => x.classList.toggle('active', x === b));
    app.setInteriorView(b.dataset.iv);
  });
  $('#ibBack').addEventListener('click', () => app.exitInterior());
  $('#ibProposal').addEventListener('click', () => ui.proposal.open(app.state.interiorUnit));
  app.on('vista', (u) => { syncToggles(); if (u) hint('Arraste para olhar ao redor · use o controle de andar'); });

  // ---------- Dica ----------
  let hintT;
  function hint(text, ms = 5000) {
    const h = $('#hint');
    h.textContent = text;
    h.classList.remove('off');
    clearTimeout(hintT);
    hintT = setTimeout(() => h.classList.add('off'), ms);
  }
  ui.hint = hint;
  app.on('interact', () => { clearTimeout(hintT); hintT = setTimeout(() => $('#hint').classList.add('off'), 1500); });

  // ---------- Módulos ----------
  ui.catalog = initCatalog(app, ui);
  ui.film = initFilm(app, ui);
  ui.proposal = initProposal(app, ui);
  ui.assistant = initAssistant(app, ui);
  initPresentation(app, ui);

  // ---------- Início ----------
  app.setQuality(!app.isMobile);
  app.applyTime(true);
  syncToggles();
  app.on('ready', async () => {
    hint('Arraste para girar · role para aproximar · clique numa unidade', 6000);
    await app.fly(...app.presets.geral, 4.2);
    let q, hash = '';
    try { q = new URLSearchParams(location.search); hash = decodeURIComponent(location.hash.slice(1)); } catch { q = new URLSearchParams(); }
    const u = app.findUnit(q.get('unit') || hash);
    if (u) { app.setDisp(true); app.selectUnit(u); }
    if (q.has('apresentacao') || hash === 'apresentacao') ui.openPresentation();
    addEventListener('hashchange', () => {
      const h = decodeURIComponent(location.hash.slice(1));
      const x = app.findUnit(h);
      if (x && x !== app.state.selected) { app.setDisp(true); app.selectUnit(x); }
      if (h === 'apresentacao') ui.openPresentation();
    });
  });
  return ui;
}

// =====================================================================
// MODO APRESENTAÇÃO
// =====================================================================
const ICONS = {
  video: '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>',
  catalogo: '<svg viewBox="0 0 24 24"><path d="M4 4h7v16H4zM13 4h7v16h-7z"/></svg>',
  explorar: '<svg viewBox="0 0 24 24"><path d="M12 2l9 5v10l-9 5-9-5V7z"/><path d="M12 22V12m0 0l9-5M12 12L3 7"/></svg>',
  unidades: '<svg viewBox="0 0 24 24"><path d="M4 21V5l8-3 8 3v16M9 9h1M14 9h1M9 13h1M14 13h1M9 17h1M14 17h1"/></svg>',
};
const STEPS = {
  video: { t: 'Vídeo', d: 'O filme do empreendimento para abrir a conversa.' },
  catalogo: { t: 'Catálogo', d: 'Página por página, em tela cheia.' },
  explorar: { t: 'Explorar em 3D', d: 'O prédio, as vistas e o lazer no imersivo.' },
  unidades: { t: 'Unidades', d: 'Escolher a unidade, ver planta e valor.' },
};

function initPresentation(app, ui) {
  const $ = (s) => document.querySelector(s);
  let order = ui.store.get('pres-order', ['video', 'catalogo', 'explorar', 'unidades']).filter((k) => STEPS[k]);
  for (const k of Object.keys(STEPS)) if (!order.includes(k)) order.push(k);
  let off = new Set(ui.store.get('pres-off', []));
  const save = () => { ui.store.set('pres-order', order); ui.store.set('pres-off', [...off]); };
  const run = { active: false, list: [], i: 0 };

  function render() {
    $('#presSteps').innerHTML = order.map((k, i) => `
      <li data-k="${k}" class="${off.has(k) ? 'off' : ''}">
        <span class="num">${i + 1}</span><span class="ic">${ICONS[k]}</span>
        <span class="tx"><b>${STEPS[k].t}</b><span>${STEPS[k].d}</span></span>
        <span class="go">Começar aqui →</span>
        <span class="ord"><button data-a="up" title="Subir">↑</button><button data-a="down" title="Descer">↓</button><button data-a="off" title="${off.has(k) ? 'Incluir' : 'Pular'}">${off.has(k) ? '+' : '×'}</button></span>
      </li>`).join('');
  }
  $('#presSteps').addEventListener('click', (e) => {
    const li = e.target.closest('li'); if (!li) return;
    const k = li.dataset.k, i = order.indexOf(k);
    const a = e.target.closest('button')?.dataset.a;
    if (a === 'up' && i > 0) [order[i - 1], order[i]] = [order[i], order[i - 1]];
    else if (a === 'down' && i < order.length - 1) [order[i + 1], order[i]] = [order[i], order[i + 1]];
    else if (a === 'off') off.has(k) ? off.delete(k) : off.add(k);
    else { off.delete(k); start(k); return; }
    save(); render();
  });
  ui.openPresentation = () => { render(); ui.modal('presModal', true); };
  $('#btnApresentacao').addEventListener('click', ui.openPresentation);
  $('#presStart').addEventListener('click', () => start());

  function start(from) {
    run.list = order.filter((k) => !off.has(k));
    if (!run.list.length) run.list = [...order];
    run.i = from ? Math.max(0, run.list.indexOf(from)) : 0;
    run.active = true;
    ui.modal('presModal', false);
    document.body.classList.add('pres');
    $('#presBar').hidden = false;
    go(run.i);
  }
  function leave(k) {
    if (k === 'video') ui.film.close(true);
    if (k === 'catalogo') ui.catalog.close(true);
  }
  function go(i) {
    if (run.list[run.i] && run.i !== i) leave(run.list[run.i]);
    run.i = i;
    const k = run.list[i];
    const next = run.list[i + 1];
    $('#presInfo').textContent = `Apresentação · ${i + 1} de ${run.list.length} · ${STEPS[k].t}`;
    $('#presNext').textContent = next ? `Próximo: ${STEPS[next].t} →` : 'Concluir ✓';
    $('#presPrev').style.visibility = i > 0 ? 'visible' : 'hidden';
    if (k === 'video') ui.film.open();
    if (k === 'catalogo') ui.catalog.open();
    if (k === 'explorar') { ui.setMode('explorar', { reset: true }); }
    if (k === 'unidades') { ui.setMode('unidades'); }
  }
  ui.presNext = () => { if (!run.active) return; if (run.i < run.list.length - 1) go(run.i + 1); else stop(); };
  function stop() {
    leave(run.list[run.i]);
    run.active = false;
    document.body.classList.remove('pres');
    $('#presBar').hidden = true;
  }
  ui.presActive = () => run.active;
  $('#presNext').addEventListener('click', ui.presNext);
  $('#presPrev').addEventListener('click', () => { if (run.i > 0) go(run.i - 1); });
  $('#presClose').addEventListener('click', stop);
}

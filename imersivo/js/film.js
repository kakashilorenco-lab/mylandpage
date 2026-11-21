import { CONFIG } from './config.js';

// "Filme" do empreendimento: se houver um vídeo em CONFIG.videoUrl ele é
// tocado; senão, um filme cinematográfico é gerado ao vivo no próprio 3D.
export function initFilm(app, ui) {
  const $ = (s) => document.querySelector(s);
  const { THREE, camera, controls } = app;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const cidade = CONFIG.cidade.split(',')[0];

  const SHOTS = [
    { dur: 8, t0: 5 * 60 + 40, t1: 6 * 60 + 20, from: [V(2700, 70, -500), V(0, 90, 0)], to: [V(1250, 120, 80), V(0, 75, 0)], k: CONFIG.cidade.toUpperCase(), title: 'Entre o mar e a Mata Atlântica' },
    { dur: 7, t0: 9 * 60 + 30, from: [V(640, 55, -1000), V(430, 8, -200)], to: [V(600, 70, 500), V(380, 8, 150)], k: 'ORLA DE ' + cidade.toUpperCase(), title: 'A poucos passos da praia' },
    { dur: 9, t0: 11 * 60, orbit: { c: V(0, 70, 0), r: 210, h: 150, a0: -0.9, a1: 0.9 }, k: 'ARQUITETURA', title: 'Duas torres. Vista para todos os lados.' },
    { dur: 7, t0: 15 * 60 + 30, from: [V(82, 34, -60), V(20, 11, -4)], to: [V(68, 24, 44), V(18, 11, 6)], k: 'LAZER', title: 'Férias o ano todo, sem sair de casa' },
    { dur: 8, t0: 18 * 60 + 20, t1: 19 * 60 + 25, orbit: { c: V(0, 80, 0), r: 520, h: 120, a0: 0.55, a1: 0.05 }, k: 'PÔR DO SOL', title: 'Todo fim de tarde, um espetáculo' },
    { dur: 8, t0: 20 * 60 + 40, from: [V(480, 70, 300), V(0, 80, 0)], to: [V(260, 120, 150), V(0, 85, 0)], k: 'ENTREGA · ' + CONFIG.entrega.toUpperCase(), title: CONFIG.nome },
  ];
  const TOTAL = SHOTS.reduce((s, x) => s + x.dur, 0);
  let playing = false, active = false, t = 0, saved = null, lastShot = -1, titleT;
  const vid = $('#filmVideo');

  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);

  function apply(time) {
    let acc = 0, idx = 0;
    while (idx < SHOTS.length - 1 && time > acc + SHOTS[idx].dur) { acc += SHOTS[idx].dur; idx++; }
    const s = SHOTS[idx];
    const k = Math.min(1, Math.max(0, (time - acc) / s.dur));
    const e = ease(k) * 0.85 + k * 0.15;
    if (s.orbit) {
      const o = s.orbit, a = o.a0 + (o.a1 - o.a0) * e;
      camera.position.set(o.c.x + Math.cos(a) * o.r, o.h, o.c.z + Math.sin(a) * o.r);
      controls.target.copy(o.c);
    } else {
      camera.position.lerpVectors(s.from[0], s.to[0], e);
      controls.target.lerpVectors(s.from[1], s.to[1], e);
    }
    camera.lookAt(controls.target);
    app.state.minutes = s.t1 ? s.t0 + (s.t1 - s.t0) * k : s.t0;
    app.applyTime(idx !== lastShot);
    if (idx !== lastShot) {
      lastShot = idx;
      const el = $('#filmTitle');
      el.classList.remove('show');
      el.innerHTML = `<div class="k">${s.k}</div><div class="t">${s.title}</div>`;
      clearTimeout(titleT);
      titleT = setTimeout(() => el.classList.add('show'), 500);
    }
    if (time - acc > s.dur - 1.2) $('#filmTitle').classList.remove('show');
    $('#filmProg').style.width = (time / TOTAL) * 100 + '%';
    $('#filmTime').textContent = `${fmt(time)} / ${fmt(TOTAL)}`;
  }

  app.on('frame', (dt) => {
    if (!active || !playing || CONFIG.videoUrl) return;
    t += dt;
    if (t >= TOTAL) { t = TOTAL; apply(t); finish(); return; }
    apply(t);
  });

  function finish() {
    playing = false;
    if (ui.presActive && ui.presActive()) ui.presNext();
    else close();
  }

  function open() {
    if (active) return;
    if (app.state.interior) app.exitInterior(true);
    if (app.state.vista) app.exitVista();
    active = true; playing = true; t = 0; lastShot = -1;
    saved = { pos: camera.position.clone(), target: controls.target.clone(), min: app.state.minutes, disp: app.state.disp };
    app.state.cinema = true;
    if (app.state.disp) app.towers.overlay.visible = false;
    app.towers.setSelected(null);
    controls.enabled = false;
    document.body.classList.add('cinema');
    $('#filmView').hidden = false;
    $('#filmPlay').textContent = '❚❚';
    if (CONFIG.videoUrl) {
      vid.hidden = false;
      vid.src = CONFIG.videoUrl;
      vid.play().catch(() => {});
      vid.onended = finish;
      vid.ontimeupdate = () => { $('#filmProg').style.width = (vid.currentTime / (vid.duration || 1)) * 100 + '%'; $('#filmTime').textContent = fmt(vid.currentTime); };
    }
  }
  function close() {
    if (!active) return;
    active = false; playing = false;
    vid.pause(); vid.hidden = true;
    $('#filmView').hidden = true;
    $('#filmTitle').classList.remove('show');
    document.body.classList.remove('cinema');
    app.state.cinema = false;
    controls.enabled = true;
    camera.position.copy(saved.pos);
    controls.target.copy(saved.target);
    app.state.minutes = saved.min;
    app.applyTime(true);
    if (saved.disp) app.towers.overlay.visible = true;
    if (app.state.selected) app.towers.setSelected(app.state.selected);
  }
  $('#filmPlay').addEventListener('click', () => {
    playing = !playing;
    $('#filmPlay').textContent = playing ? '❚❚' : '▶';
    if (CONFIG.videoUrl) playing ? vid.play() : vid.pause();
  });
  $('#filmSkip').addEventListener('click', () => { if (ui.presActive && ui.presActive()) ui.presNext(); else close(); });
  $('#filmClose').addEventListener('click', () => close());
  document.querySelector('.film-progress').addEventListener('click', (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const k = (e.clientX - r.left) / r.width;
    if (CONFIG.videoUrl) vid.currentTime = k * (vid.duration || 0);
    else { t = k * TOTAL; lastShot = -1; apply(t); }
  });
  return { open, close, get active() { return active; } };
}

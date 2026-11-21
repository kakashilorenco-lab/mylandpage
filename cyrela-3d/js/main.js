import * as THREE from 'three';
import { OrbitControls } from '../vendor/three/addons/OrbitControls.js';
import { CONFIG } from './config.js';
import { EMPREENDIMENTOS } from '../data/empreendimentos.js';
import { createCity } from './city.js';
import { prepararEmpreendimentos, createTowers, FLOOR_H, BASE_H } from './towers.js';
import { buildInterior, disposeInterior } from './interior.js';
import { shared } from './materials.js';
import { initUI } from './ui.js';

const $ = (s) => document.querySelector(s);
const bar = $('#loaderBar'), msg = $('#loaderMsg');
const step = (p, t) => { bar.style.width = p + '%'; if (t) msg.textContent = t; return new Promise((r) => setTimeout(r, 30)); };
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

const isMobile = matchMedia('(max-width: 760px)').matches || /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
const quality = { level: isMobile ? 'low' : 'high', shadow: isMobile ? 1024 : 2048 };

async function boot() {
  await step(5, 'Preparando o mapa 3D de São Paulo…');
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas: $('#c3d'), antialias: !isMobile, powerPreference: 'high-performance' }); }
  catch { msg.textContent = 'Seu navegador não suporta WebGL. Tente Chrome, Safari ou Edge atualizados.'; return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, isMobile ? 1.5 : 2));
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 5, 90000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.screenSpacePanning = false;
  controls.zoomToCursor = true;

  const devs = prepararEmpreendimentos(EMPREENDIMENTOS);
  await step(15, 'Levantando relevo, rios e avenidas…');
  const city = createCity(scene, renderer, quality, devs.map((d) => [d.x, d.z, BASE_H + d.andares * FLOOR_H]));
  await step(65, `Posicionando ${devs.length} empreendimentos Cyrela…`);
  const towers = createTowers(scene, devs);

  // centro e enquadramento dos prédios
  const cx = devs.reduce((s, d) => s + d.x, 0) / devs.length, cz = devs.reduce((s, d) => s + d.z, 0) / devs.length;

  const app = {
    THREE, scene, camera, controls, renderer, city, towers, devs, isMobile,
    state: { mode: 'mapa', sel: null, hover: null, floor: null, interior: null, tempo: 'dia', cinema: false },
    listeners: {},
    on(e, f) { (this.listeners[e] ||= []).push(f); },
    emit(e, ...a) { (this.listeners[e] || []).forEach((f) => f(...a)); },
  };
  window.app = app;

  // ---------- Controles ----------
  const orbitMode = (min = 60, max = 26000) => {
    Object.assign(controls, { enablePan: true, enableZoom: true, rotateSpeed: 0.55, minDistance: min, maxDistance: max, minPolarAngle: 0.05, maxPolarAngle: 1.42, zoomToCursor: true, autoRotate: false });
    camera.fov = 40; camera.updateProjectionMatrix();
  };
  let tween = null;
  const cancelTween = () => { if (tween) { const t = tween; tween = null; controls.enabled = true; t.resolve && t.resolve(); } };
  const lookMode = (pos, look) => {
    cancelTween();
    camera.position.copy(pos);
    controls.target.copy(pos).addScaledVector(look.clone().sub(pos).normalize(), 0.1);
    Object.assign(controls, { enablePan: false, enableZoom: false, rotateSpeed: -0.35, minDistance: 0.1, maxDistance: 0.1, minPolarAngle: 0.35, maxPolarAngle: 2.6, zoomToCursor: false, autoRotate: false });
    camera.near = 0.05; camera.fov = 68; camera.updateProjectionMatrix();
    controls.update();
  };
  app.fly = (pos, target, dur = 2) => new Promise((resolve) => {
    cancelTween();
    const p0 = camera.position.clone(), t0 = controls.target.clone();
    const lift = Math.min(1500, p0.distanceTo(pos) * 0.15);
    tween = { t: 0, dur, update(k) {
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      camera.position.lerpVectors(p0, pos, e);
      camera.position.y += Math.sin(Math.PI * e) * lift;
      controls.target.lerpVectors(t0, target, e);
    }, resolve };
    controls.enabled = false;
  });
  app.cut = (pos, target) => { cancelTween(); camera.position.copy(pos); controls.target.copy(target); controls.update(); };
  renderer.domElement.addEventListener('wheel', (e) => {
    if (app.state.mode === 'interior') { camera.fov = THREE.MathUtils.clamp(camera.fov + e.deltaY * 0.03, 30, 85); camera.updateProjectionMatrix(); }
  }, { passive: true });

  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  app.overview = () => [V(cx + 2600, 5200, cz + 8200), V(cx, 0, cz - 300)];
  app.devCamera = (d, dist) => {
    // no celular o painel ocupa a metade de baixo: o prédio fica mais para cima na tela
    const target = V(d.x, d.y + d.altura * (isMobile ? 0.18 : 0.5), d.z);
    const dir = camera.position.clone().sub(target); dir.y = 0;
    if (dir.lengthSq() < 1) dir.set(1, 0, 1);
    dir.normalize();
    const r = dist || Math.max(d.altura * 2.3, 260);
    return [target.clone().addScaledVector(dir, r).add(V(0, r * 0.28, 0)), target];
  };

  // ---------- Hora do dia ----------
  const sunDir = new THREE.Vector3(), moonDir = new THREE.Vector3(), lastEnv = new THREE.Vector3(9, 9, 9);
  const dirFrom = (az, alt, out) => { const a = az + Math.PI; const c = Math.cos(alt); return out.set(Math.sin(a) * c, Math.sin(alt), -Math.cos(a) * c); };
  const HORAS = { dia: 10.5, tarde: 18.35, noite: 20.7 };
  const cDay = new THREE.Color(0xb7c6d6), cGold = new THREE.Color(0xd9b48f), cNight = new THREE.Color(0x0b1120);
  app.setTempo = (k, hours) => {
    app.state.tempo = k;
    const h = hours ?? HORAS[k];
    const date = new Date(Date.UTC(2026, 10, 21, 0, 0) + (h + 3) * 3600000); // UTC-3
    const SC = window.SunCalc;
    const s = SC.getPosition(date, CONFIG.centro.lat, CONFIG.centro.lon);
    const mo = SC.getMoonPosition(date, CONFIG.centro.lat, CONFIG.centro.lon);
    dirFrom(s.azimuth, s.altitude, sunDir);
    dirFrom(mo.azimuth, mo.altitude, moonDir);
    const alt = s.altitude;
    const dayF = smooth(-0.08, 0.14, alt), nightF = 1 - smooth(-0.13, 0.035, alt), gold = (1 - smooth(0.06, 0.32, alt)) * smooth(-0.1, 0.0, alt);
    app.state.nightF = nightF;
    city.sky.material.uniforms.sunPosition.value.copy(sunDir);
    city.sun.position.copy(sunDir).multiplyScalar(3000).add(city.sun.target.position);
    city.sun.intensity = 3.2 * smooth(-0.015, 0.12, alt);
    city.sun.color.set(0xff9a52).lerp(new THREE.Color(0xfff2df), smooth(0.03, 0.45, alt));
    city.moonLight.position.copy(moonDir).multiplyScalar(3000);
    city.moonLight.intensity = 0.5 * (1 - dayF) * smooth(-0.02, 0.12, mo.altitude);
    city.hemi.intensity = THREE.MathUtils.lerp(0.22, 0.5, dayF);
    city.hemi.color.set(0x24345a).lerp(new THREE.Color(0xcfe0ff), dayF);
    city.stars.material.opacity = nightF * 0.9;
    scene.fog.color.copy(cNight).lerp(cDay, dayF).lerp(cGold, gold * 0.7);
    renderer.toneMappingExposure = THREE.MathUtils.lerp(1.0, 0.55, dayF);
    shared.uNight.value = nightF;
    city.lights.material.opacity = nightF;
    if (app.state.interior) app.state.interior.userData.setNight(nightF);
    if (sunDir.angleTo(lastEnv) > 0.02) { city.updateEnv(sunDir, nightF); lastEnv.copy(sunDir); }
    app.emit('tempo', k);
  };

  // ---------- Sombras só perto do prédio em foco (desempenho) ----------
  const shadowsAt = (d) => {
    city.sun.castShadow = !!d;
    if (!d) return;
    city.sun.target.position.set(d.x, d.y, d.z);
    city.sun.position.copy(sunDir).multiplyScalar(3000).add(city.sun.target.position);
    const s = Math.max(260, d.altura * 1.6);
    Object.assign(city.sun.shadow.camera, { left: -s, right: s, top: s, bottom: -s });
    city.sun.shadow.camera.updateProjectionMatrix();
  };

  // ---------- Modos ----------
  app.irMapa = (dur = 2.2) => {
    if (app.state.interior) sairInterior();
    app.state.mode = 'mapa'; app.state.sel = null; app.state.floor = null;
    towers.setFloor(null); towers.setHover(null); shadowsAt(null);
    orbitMode();
    app.fly(...app.overview(), dur);
    setHash('');
    app.emit('mode', 'mapa');
  };
  app.selecionar = (d, opts = {}) => {
    if (app.state.interior) sairInterior();
    app.state.mode = 'predio'; app.state.sel = d; app.state.floor = null;
    towers.setFloor(null); towers.setHover(d); shadowsAt(d);
    orbitMode(Math.max(60, d.altura * 0.6), 9000);
    const [p, t] = app.devCamera(d, opts.dist);
    app.fly(p, t, opts.dur ?? 2.2).then(() => { if (app.state.sel === d && app.state.mode === 'predio') { controls.autoRotate = true; controls.autoRotateSpeed = 0.35; } });
    setHash(d.id);
    app.emit('mode', 'predio', d);
  };
  app.setFloor = (n) => {
    const d = app.state.sel;
    if (!d) return;
    app.state.floor = n;
    towers.setFloor(d, n);
    app.emit('floor', n);
  };
  app.floorWorld = (d, n) => d.y + BASE_H + (n - 0.5) * FLOOR_H;

  // Entrar no apartamento "pelo vidro"
  const fade = $('#fade');
  app.entrar = async (n) => {
    const d = app.state.sel;
    if (!d) return;
    n = n || app.state.floor || Math.ceil(d.andares * 0.6);
    app.setFloor(n);
    controls.autoRotate = false;
    // fachada voltada para a câmera
    const t = d.torresInfo[0];
    const c = V(d.x + t.ox, 0, d.z);
    const dir = camera.position.clone().sub(c); dir.y = 0;
    const ax = Math.abs(dir.x) > Math.abs(dir.z);
    const normal = ax ? V(Math.sign(dir.x), 0, 0) : V(0, 0, Math.sign(dir.z));
    const half = ax ? d.w / 2 : d.dpt / 2;
    const floorY = d.y + BASE_H + (n - 1) * FLOOR_H;
    const face = c.clone().addScaledVector(normal, half).setY(floorY);
    const rotY = Math.atan2(-normal.x, -normal.z);
    await app.fly(face.clone().addScaledVector(normal, 34).add(V(0, 2, 0)), face.clone().add(V(0, 1.5, 0)), 1.6);
    fade.classList.add('on');
    await new Promise((r) => setTimeout(r, 380));
    const room = buildInterior({ pos: face, rotY });
    scene.add(room);
    room.userData.setNight(app.state.nightF || 0);
    app.state.interior = room;
    app.state.mode = 'interior';
    towers.setFloor(null);
    towers.setShadows(false);
    Object.assign(city.sun.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40 });
    city.sun.target.position.copy(face);
    city.sun.position.copy(sunDir).multiplyScalar(3000).add(face);
    city.sun.shadow.camera.updateProjectionMatrix();
    const v = room.userData.views.sala;
    lookMode(v.pos, v.look);
    app.emit('mode', 'interior', d, n);
    setTimeout(() => fade.classList.remove('on'), 120);
  };
  app.verAmbiente = (name) => {
    const room = app.state.interior;
    if (!room) return;
    const v = room.userData.views[name];
    const p0 = camera.position.clone(), d0 = controls.target.clone().sub(p0).normalize(), d1 = v.look.clone().sub(v.pos).normalize();
    cancelTween();
    tween = { t: 0, dur: 1.1, update(k) {
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      camera.position.lerpVectors(p0, v.pos, e);
      controls.target.copy(camera.position).addScaledVector(d0.clone().lerp(d1, e).normalize(), 0.1);
    }, resolve: () => lookMode(v.pos, v.look) };
    controls.enabled = false;
    app.emit('ambiente', name);
  };
  function sairInterior() {
    if (!app.state.interior) return;
    disposeInterior(app.state.interior);
    app.state.interior = null;
    towers.setShadows(true);
    camera.near = 5; camera.updateProjectionMatrix();
  }
  app.voltarPredio = () => {
    const d = app.state.sel, n = app.state.floor;
    sairInterior();
    app.state.mode = 'predio';
    orbitMode(Math.max(60, d.altura * 0.6), 9000);
    shadowsAt(d);
    const [p, t] = app.devCamera(d);
    app.cut(p.clone().lerp(t, 0.5), t);
    app.fly(p, t, 1.3);
    app.setFloor(n);
    app.emit('mode', 'predio', d);
  };

  // ---------- Hash (#slug) para link direto ----------
  function setHash(id) { try { const u = new URL(location.href); u.hash = id || ''; history.replaceState(null, '', u.pathname + u.search + u.hash); } catch { /* */ } }

  // ---------- Picking ----------
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const setRay = (x, y) => { const r = renderer.domElement.getBoundingClientRect(); ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera); };
  let down = null, mv = null, queued = false;
  renderer.domElement.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY, performance.now()]; controls.autoRotate = false; app.emit('interact'); });
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (!down) return;
    const moved = Math.hypot(e.clientX - down[0], e.clientY - down[1]), dt = performance.now() - down[2];
    down = null;
    if (moved > 6 || dt > 600 || tween || app.state.mode === 'interior' || app.state.cinema) return;
    setRay(e.clientX, e.clientY);
    if (app.state.mode === 'predio') {
      const n = towers.pickFloor(ray, app.state.sel);
      if (n) { app.setFloor(n); return; }
    }
    const hit = towers.pick(ray);
    if (hit && hit.dev !== app.state.sel) app.selecionar(hit.dev);
  });
  renderer.domElement.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    mv = e;
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      if (down || tween || app.state.mode === 'interior' || app.state.cinema) return;
      setRay(mv.clientX, mv.clientY);
      if (app.state.mode === 'predio') {
        const n = towers.pickFloor(ray, app.state.sel);
        renderer.domElement.style.cursor = n ? 'pointer' : '';
        if (n && n !== app.state.floor) app.setFloor(n);
        return;
      }
      const hit = towers.pick(ray);
      const d = hit ? hit.dev : null;
      if (d !== app.state.hover) { app.state.hover = d; towers.setHover(d); renderer.domElement.style.cursor = d ? 'pointer' : ''; app.emit('hover', d); }
    });
  });

  // ---------- Loop ----------
  const resize = () => { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); };
  addEventListener('resize', resize);
  const clock = new THREE.Clock();
  let el = 0;
  const frame = () => {
    const dt = Math.min(clock.getDelta(), 0.1);
    el += dt;
    shared.uTime.value = el;
    city.updaters.forEach((u) => u(dt, el));
    if (tween) {
      tween.t += dt / tween.dur;
      const k = Math.min(1, tween.t);
      tween.update(k);
      if (k >= 1) { const t = tween; tween = null; controls.enabled = true; t.resolve && t.resolve(); }
    }
    if (app.state.mode !== 'interior') {
      // plano próximo acompanha a distância (precisão de profundidade no mapa grande)
      const dist = camera.position.distanceTo(controls.target);
      camera.near = THREE.MathUtils.clamp(dist * 0.004, 1, 40);
      camera.updateProjectionMatrix();
    }
    towers.update(camera, app.state.mode !== 'mapa');
    app.emit('frame', dt, el);
    if (!tween) controls.update(); else camera.lookAt(controls.target);
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  };

  await step(85, 'Calculando o sol sobre São Paulo…');
  app.setTempo('dia');
  orbitMode();
  app.cut(V(cx + 9000, 14000, cz + 22000), V(cx, 0, cz));
  initUI(app);
  renderer.compile(scene, camera);
  await step(100, 'Pronto!');
  requestAnimationFrame(frame);
  setTimeout(() => { $('#loader').classList.add('done'); app.emit('ready'); }, 250);
}

boot().catch((e) => { console.error(e); msg.textContent = 'Erro ao carregar: ' + e.message; });

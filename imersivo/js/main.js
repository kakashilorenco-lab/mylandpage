import * as THREE from 'three';
import { OrbitControls } from '../vendor/three/addons/OrbitControls.js';
import { CONFIG } from './config.js';
import { buildUnits } from './data.js';
import { createWorld, smooth } from './world.js';
import { createTowers, unitBox, unitFrame, floorY, PODIUM } from './towers.js';
import { buildInterior, disposeInterior } from './interior.js';
import { shared } from './materials.js';
import { solar, localToDate, dirFromSunCalc } from './sun.js';
import { initUI } from './ui.js';

const $ = (s) => document.querySelector(s);
const loaderBar = $('#loaderBar'), loaderMsg = $('#loaderMsg');
const step = (pct, msg) => { loaderBar.style.width = pct + '%'; if (msg) loaderMsg.textContent = msg; return new Promise((r) => setTimeout(r, 30)); };

document.querySelectorAll('[data-bind]').forEach((el) => {
  const k = el.dataset.bind;
  el.textContent = k === 'assistente' ? CONFIG.assistente.nome : k === 'assistenteCargo' ? CONFIG.assistente.cargo : CONFIG[k] || '';
});
document.title = `${CONFIG.nome} · Tour 3D`;

const isMobile = matchMedia('(max-width: 760px)').matches || /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
const quality = { level: isMobile ? 'low' : 'high', trees: isMobile ? 9000 : 26000, shadowSize: isMobile ? 1024 : 2048 };

async function boot() {
  await step(5, 'Preparando o ambiente 3D…');
  const canvas = $('#c3d');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile, powerPreference: 'high-performance' });
  } catch (e) {
    loaderMsg.textContent = 'Seu navegador não suporta WebGL. Tente o Chrome, Safari ou Edge atualizados.';
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.6;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 1, 30000);
  camera.position.set(2600, 420, 1100);

  await step(15, 'Modelando relevo, praia e Mata Atlântica…');
  const world = createWorld(scene, renderer, quality);
  await step(55, 'Levantando a cidade…');
  const units = buildUnits();
  const towers = createTowers(scene, units);
  await step(70, 'Posicionando as torres e as unidades…');

  // Domo noturno (azul profundo + horizonte)
  const nightDome = new THREE.Mesh(
    new THREE.SphereGeometry(16000, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, transparent: true, depthWrite: false, fog: false,
      uniforms: { uO: { value: 0 } },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: 'varying vec3 vP; uniform float uO; void main(){ float h = clamp(vP.y,0.0,1.0); vec3 c = mix(vec3(0.07,0.1,0.19), vec3(0.012,0.02,0.05), pow(h,0.45)); gl_FragColor = vec4(c, uO); }',
    })
  );
  nightDome.renderOrder = -2;
  scene.add(nightDome);

  // ---------------------------------------------------------------
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.target.set(0, 55, 0);
  controls.zoomToCursor = true;

  const app = {
    THREE, scene, camera, controls, renderer, world, towers, units, quality, isMobile,
    state: {
      mode: 'explorar', view: 'geral', selected: null, hover: null, disp: false,
      date: { y: 2026, m: 11, d: 21 }, minutes: 10 * 60 + 30, interior: null, vista: null, cinema: false,
      labels: true,
    },
    listeners: {},
    on(ev, fn) { (this.listeners[ev] ||= []).push(fn); },
    emit(ev, ...a) { (this.listeners[ev] || []).forEach((f) => f(...a)); },
  };
  window.app = app;

  // ---------- Controles: modos órbita e "olhar ao redor" ----------
  const orbitMode = () => {
    Object.assign(controls, { enablePan: true, enableZoom: true, rotateSpeed: 0.6, minDistance: 25, maxDistance: 5000, minPolarAngle: 0.05, maxPolarAngle: 1.47, screenSpacePanning: false, zoomToCursor: true });
    camera.near = 1; camera.far = 30000; camera.fov = 42; camera.updateProjectionMatrix();
  };
  const lookMode = (pos, look) => {
    cancelTween();
    camera.position.copy(pos);
    const dir = look.clone().sub(pos).normalize();
    controls.target.copy(pos).addScaledVector(dir, 0.1);
    Object.assign(controls, { enablePan: false, enableZoom: false, rotateSpeed: -0.35, minDistance: 0.1, maxDistance: 0.1, minPolarAngle: 0.35, maxPolarAngle: 2.6, zoomToCursor: false });
    camera.near = 0.05; camera.far = 22000; camera.fov = 70; camera.updateProjectionMatrix();
    controls.update();
  };
  app.lookMode = lookMode;
  orbitMode();
  renderer.domElement.addEventListener('wheel', (e) => {
    if (!controls.enableZoom && (app.state.interior || app.state.vista)) {
      camera.fov = THREE.MathUtils.clamp(camera.fov + e.deltaY * 0.03, 30, 85);
      camera.updateProjectionMatrix();
    }
  }, { passive: true });

  // ---------- Voo de câmera ----------
  let tween = null;
  function cancelTween() { if (tween) { const t = tween; tween = null; controls.enabled = true; t.resolve && t.resolve(); } }
  app.fly = (pos, target, dur = 1.8) => new Promise((resolve) => {
    const p0 = camera.position.clone(), t0 = controls.target.clone();
    const p1 = pos.clone(), t1 = target.clone();
    const lift = Math.min(400, p0.distanceTo(p1) * 0.18);
    tween = { t: 0, dur, update(k) {
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      camera.position.lerpVectors(p0, p1, e);
      camera.position.y += Math.sin(Math.PI * e) * lift;
      controls.target.lerpVectors(t0, t1, e);
    }, resolve };
    controls.enabled = false;
  });
  app.cut = (pos, target) => { cancelTween(); camera.position.copy(pos); controls.target.copy(target); controls.update(); };

  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  app.presets = {
    geral: [V(330, 120, 205), V(0, 58, 0)],
    aerea: [V(260, 760, 330), V(10, 0, 0)],
    localizacao: [V(1250, 1650, 1550), V(80, 0, 120)],
    unidades: [V(185, 80, 95), V(0, 68, 0)],
    lazer: [V(78, 46, 58), V(6, 12, 0)],
    intro: [V(2600, 420, 1100), V(0, 60, 0)],
  };
  app.goPreset = (name, dur) => { const [p, t] = app.presets[name]; return app.fly(p, t, dur); };

  // ---------- Hora do dia e estações ----------
  const sunDir = new THREE.Vector3(), moonDir = new THREE.Vector3(), lastEnvDir = new THREE.Vector3(9, 9, 9);
  const cDay = new THREE.Color(0xa9c3dc), cGold = new THREE.Color(0xe0b48c), cNight = new THREE.Color(0x0a1020), fogC = new THREE.Color();
  const sunWarm = new THREE.Color(0xff9a52), sunWhite = new THREE.Color(0xfff2df);
  let envTimer = 0;
  app.applyTime = (force) => {
    const { y, m, d } = app.state.date;
    const date = localToDate(y, m, d, app.state.minutes);
    const s = solar(date);
    app.state.solar = s;
    dirFromSunCalc(s.sunAz, s.sunAlt, sunDir);
    dirFromSunCalc(s.moonAz, s.moonAlt, moonDir);
    const alt = s.sunAlt;
    const dayF = smooth(-0.08, 0.14, alt);
    const nightF = 1 - smooth(-0.13, 0.035, alt);
    const gold = (1 - smooth(0.06, 0.32, alt)) * smooth(-0.1, 0.0, alt);
    app.state.dayF = dayF; app.state.nightF = nightF;

    world.sky.material.uniforms.sunPosition.value.copy(sunDir);
    world.sun.position.copy(sunDir).multiplyScalar(1600).add(world.sun.target.position);
    world.sun.intensity = 3.4 * smooth(-0.015, 0.12, alt);
    world.sun.color.copy(sunWarm).lerp(sunWhite, smooth(0.03, 0.45, alt));
    world.sun.visible = alt > -0.03;

    const moonUp = smooth(-0.02, 0.12, s.moonAlt);
    world.moonLight.position.copy(moonDir).multiplyScalar(1600);
    world.moonLight.intensity = 0.55 * (1 - dayF) * moonUp * (0.35 + 0.65 * s.moonFrac);
    world.moon.position.copy(moonDir).multiplyScalar(12000);
    world.moon.visible = s.moonAlt > -0.05;
    world.moon.material.opacity = 0.25 + 0.75 * (1 - dayF);

    world.hemi.intensity = THREE.MathUtils.lerp(0.2, 0.5, dayF);
    world.hemi.color.set(0x24345a).lerp(new THREE.Color(0xcfe3ff), dayF);
    world.hemi.groundColor.set(0x141414).lerp(new THREE.Color(0x5b5546), dayF);
    world.stars.material.opacity = nightF * 0.95;
    nightDome.material.uniforms.uO.value = nightF * 0.96;
    nightDome.visible = nightF > 0.01;

    fogC.copy(cNight).lerp(cDay, dayF).lerp(cGold, gold * 0.75);
    scene.fog.color.copy(fogC);
    renderer.toneMappingExposure = THREE.MathUtils.lerp(0.95, 0.52, dayF);

    shared.uNight.value = nightF;
    world.streetLights.material.opacity = nightF;
    world.foamMat.uniforms.uDay.value = dayF;
    towers.signMat.emissiveIntensity = 0.15 + nightF * 2.2;
    world.water.material.color.set(0x0e4c5c).lerp(new THREE.Color(0x071a24), nightF);
    if (app.state.interior) app.state.interior.userData.setNight(nightF);

    // reflexos (PMREM) só quando o sol se move o suficiente
    if (force || sunDir.angleTo(lastEnvDir) > 0.02) {
      clearTimeout(envTimer);
      const run = () => { world.updateEnv(sunDir, nightF); lastEnvDir.copy(sunDir); };
      if (force) run(); else envTimer = setTimeout(run, 90);
    }
    app.emit('time', s);
  };
  app.setTime = (min) => { app.state.minutes = ((min % 1440) + 1440) % 1440; app.applyTime(); };
  app.setDate = (y, m, d) => { app.state.date = { y, m, d }; app.applyTime(true); };

  // ---------- Disponibilidade ----------
  app.setDisp = (on, filter) => {
    app.state.disp = on;
    towers.setAvailability(on, filter);
    app.emit('disp', on);
  };

  // ---------- Seleção de unidade ----------
  const tmp = new THREE.Vector3();
  app.unitCamera = (u) => {
    const fr = unitFrame(u);
    const b = unitBox(u);
    const c = b.getCenter(new THREE.Vector3());
    const side = new THREE.Vector3(0, 0, u.final === '01' || u.final === '04' ? -1 : 1);
    const pos = c.clone().addScaledVector(fr.normal, 105).addScaledVector(side, 22).add(tmp.set(0, 8, 0));
    return [pos, c];
  };
  app.selectUnit = (u, opts = {}) => {
    app.state.selected = u;
    towers.setSelected(u);
    if (u && opts.fly !== false) { const [p, t] = app.unitCamera(u); app.fly(p, t, opts.dur || 1.6); }
    app.emit('select', u);
    const url = new URL(location.href);
    if (u) url.searchParams.set('unit', u.id); else url.searchParams.delete('unit');
    history.replaceState(null, '', url);
  };
  app.findUnit = (id) => units.find((u) => u.id.toUpperCase() === String(id).toUpperCase().replace(/\s/g, ''));

  // ---------- Picking ----------
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let downAt = null, moveQueued = false, lastMove = null;
  const pickAt = (x, y) => {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    return towers.pick(ray);
  };
  const canPick = () => !app.state.interior && !app.state.vista && !app.state.cinema && !tween;
  renderer.domElement.addEventListener('pointerdown', (e) => { downAt = [e.clientX, e.clientY, performance.now()]; app.emit('interact'); });
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (!downAt) return;
    const moved = Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]);
    const dt = performance.now() - downAt[2];
    downAt = null;
    if (moved > 6 || dt > 600 || !canPick()) return;
    const u = pickAt(e.clientX, e.clientY);
    if (u) app.selectUnit(u);
  });
  renderer.domElement.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    lastMove = e;
    if (moveQueued) return;
    moveQueued = true;
    requestAnimationFrame(() => {
      moveQueued = false;
      if (!canPick() || downAt) { if (app.state.hover) { app.state.hover = null; towers.setHover(null); app.emit('hover', null); } return; }
      const u = pickAt(lastMove.clientX, lastMove.clientY);
      if (u !== app.state.hover) {
        app.state.hover = u;
        towers.setHover(u && u !== app.state.selected ? u : null);
        renderer.domElement.style.cursor = u ? 'pointer' : '';
        app.emit('hover', u);
      }
    });
  });

  // ---------- Interior decorado ----------
  const envLoading = $('#envLoading');
  const shadowCam = world.sun.shadow.camera;
  const setShadowBox = (cx, cy, cz, half) => {
    world.sun.target.position.set(cx, cy, cz);
    shadowCam.left = -half; shadowCam.right = half; shadowCam.top = half; shadowCam.bottom = -half;
    shadowCam.updateProjectionMatrix();
    world.sun.position.copy(sunDir).multiplyScalar(1600).add(world.sun.target.position);
  };
  app.enterInterior = async (u, view = 'sala') => {
    if (app.state.interior) app.exitInterior(true);
    envLoading.hidden = false;
    envLoading.style.opacity = 1;
    await new Promise((r) => setTimeout(r, 60));
    const room = buildInterior(u);
    scene.add(room);
    app.state.interior = room;
    app.state.interiorUnit = u;
    app.state.vista = null;
    room.userData.setNight(app.state.nightF || 0);
    towers.setShadowCasting(false);
    towers.overlay.visible = false;
    towers.setSelected(null); towers.setHover(null);
    const c = unitBox(u).getCenter(new THREE.Vector3());
    setShadowBox(c.x, c.y, c.z, 45);
    document.body.classList.add('interior');
    app.setInteriorView(view, true);
    app.emit('interior', u);
    await new Promise((r) => setTimeout(r, 650));
    envLoading.style.opacity = 0;
    setTimeout(() => (envLoading.hidden = true), 450);
  };
  app.setInteriorView = (name, instant) => {
    const room = app.state.interior;
    if (!room) return;
    const v = room.userData.views[name];
    if (instant) { lookMode(v.pos, v.look); return; }
    // transição curta entre ambientes
    const p0 = camera.position.clone(), d0 = controls.target.clone().sub(camera.position).normalize();
    const d1 = v.look.clone().sub(v.pos).normalize();
    tween = { t: 0, dur: 1.0, update(k) {
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      camera.position.lerpVectors(p0, v.pos, e);
      const d = d0.clone().lerp(d1, e).normalize();
      controls.target.copy(camera.position).addScaledVector(d, 0.1);
    }, resolve: () => lookMode(v.pos, v.look) };
    controls.enabled = false;
  };
  app.exitInterior = (silent) => {
    const room = app.state.interior;
    if (!room) return;
    disposeInterior(room);
    app.state.interior = null;
    towers.setShadowCasting(true);
    setShadowBox(0, 30, 0, 330);
    document.body.classList.remove('interior');
    orbitMode();
    const u = app.state.interiorUnit;
    if (!silent) {
      if (app.state.disp) towers.overlay.visible = true;
      const [p, t] = app.unitCamera(u);
      app.cut(p.clone().multiplyScalar(0.5).add(t.clone().multiplyScalar(0.5)), t);
      app.selectUnit(u, { dur: 1.2 });
    }
    app.emit('interior', null);
  };

  // ---------- Vista real de um andar ----------
  app.enterVista = (u) => {
    if (app.state.interior) app.exitInterior(true);
    app.state.vista = u;
    towers.setSelected(null); towers.setHover(null);
    towers.overlay.visible = false;
    const fr = unitFrame(u);
    const pos = fr.pos.clone().addScaledVector(fr.normal, 1.7).add(tmp.set(0, 1.6, 0));
    const look = pos.clone().addScaledVector(fr.normal, 200).add(tmp.set(0, -25, 0));
    // pequena transição
    tween = null;
    lookMode(pos, look);
    app.emit('vista', u);
  };
  app.exitVista = () => {
    if (!app.state.vista) return;
    const u = app.state.vista;
    app.state.vista = null;
    orbitMode();
    if (app.state.disp) towers.overlay.visible = true;
    const [p, t] = app.unitCamera(u);
    app.cut(p, t);
    app.emit('vista', null);
  };

  // ---------- Snapshot para o catálogo ----------
  app.snapshot = (pos, target, minutes, w = 1280, h = 800) => {
    const saved = { min: app.state.minutes, size: renderer.getSize(new THREE.Vector2()), pr: renderer.getPixelRatio() };
    const cam = new THREE.PerspectiveCamera(40, w / h, 1, 30000);
    cam.position.copy(pos); cam.lookAt(target);
    app.state.minutes = minutes; app.applyTime(true);
    renderer.setPixelRatio(1);
    renderer.setSize(w, h, false);
    renderer.render(scene, cam);
    const url = renderer.domElement.toDataURL('image/jpeg', 0.86);
    renderer.setPixelRatio(saved.pr);
    renderer.setSize(saved.size.x, saved.size.y, false);
    app.state.minutes = saved.min; app.applyTime(true);
    return url;
  };

  // ---------- Qualidade ----------
  app.setQuality = (hi) => {
    app.state.hiQuality = hi;
    renderer.setPixelRatio(hi ? Math.min(devicePixelRatio, 2) : Math.min(devicePixelRatio, 1));
    const sz = hi ? 2048 : 1024;
    world.sun.shadow.mapSize.set(sz, sz);
    if (world.sun.shadow.map) { world.sun.shadow.map.dispose(); world.sun.shadow.map = null; }
    resize();
  };

  // ---------- Loop ----------
  const resize = () => {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
  };
  addEventListener('resize', resize);
  app.resize = resize;

  const clock = new THREE.Clock();
  let elapsed = 0;
  const frame = () => {
    const dt = Math.min(clock.getDelta(), 0.1);
    elapsed += dt;
    shared.uTime.value = elapsed;
    for (const u of world.updaters) u(dt, elapsed);
    if (tween) {
      tween.t += dt / tween.dur;
      const k = Math.min(1, tween.t);
      tween.update(k);
      if (k >= 1) { const t = tween; tween = null; controls.enabled = true; t.resolve && t.resolve(); }
    }
    app.emit('frame', dt, elapsed);
    if (!tween && !app.state.cinema) controls.update();
    else camera.lookAt(controls.target);
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  };

  await step(82, 'Calculando a posição do sol em ' + CONFIG.cidade + '…');
  app.applyTime(true);
  app.cut(...app.presets.intro);
  renderer.compile(scene, camera);
  await step(94, 'Montando a interface…');
  initUI(app);
  await step(100, 'Pronto!');
  requestAnimationFrame(frame);
  setTimeout(() => {
    $('#loader').classList.add('done');
    app.emit('ready');
  }, 250);
}

boot().catch((e) => {
  console.error(e);
  loaderMsg.textContent = 'Erro ao carregar: ' + e.message;
});

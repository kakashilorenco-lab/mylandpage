import * as THREE from 'three';
import { facadeMaterial, shared } from './materials.js';
import { toXZ, altura } from './geo.js';
import { STATUS_COR } from './config.js';
import { rng } from './city.js';

export const FLOOR_H = 3.1;
export const BASE_H = 7; // térreo/embasamento

const maxArea = (s) => { const n = (s || '').match(/\d+/g); return n ? Math.max(...n.map(Number)) : 0; };
export const corDe = (d) => (d.vendido ? STATUS_COR.vendido : STATUS_COR[d.status] || '#ffffff');

/** Prepara posição, andares e volumetria de cada empreendimento */
export function prepararEmpreendimentos(lista) {
  const r = rng(99);
  const grupos = new Map();
  return lista.map((d) => {
    const [x0, z0] = toXZ(d.lat, d.lon);
    // vários produtos no mesmo endereço viram um pequeno conjunto, sem sobrepor
    const key = Math.round(x0 / 30) + ':' + Math.round(z0 / 30);
    const k = grupos.get(key) || 0;
    grupos.set(key, k + 1);
    const off = [[0, 0], [46, 0], [-46, 0], [0, 46], [0, -46], [46, 46]][k % 6];
    const x = x0 + off[0], z = z0 + off[1];
    const area = maxArea(d.area);
    let andares = d.andares, estimado = false;
    if (!andares && d.alturaM) { andares = Math.round((d.alturaM - BASE_H) / FLOOR_H); estimado = true; }
    if (!andares) { andares = (area && area < 60 ? 20 : area > 250 ? 26 : 23) + Math.floor(r() * 7) - 3; estimado = true; }
    const w = area && area < 60 ? 24 : area > 250 ? 30 : 27;
    const torres = Math.min(Math.max(d.torres || 1, 1), 3);
    return { ...d, x, z, y: altura(x, z), andares, andaresEstimado: estimado, w, dpt: w - 2, nTorres: torres, agrupado: k > 0 };
  });
}

export function createTowers(scene, devs) {
  const group = new THREE.Group();
  scene.add(group);
  const api = { group, devs, cores: [] };
  const finMat = new THREE.MeshStandardMaterial({ color: 0xe9e4da, roughness: 0.6 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x2a2c30, roughness: 0.5 });
  // um material por prédio para alinhar as lajes da fachada ao térreo de cada um
  const towerMat = (baseY) => facadeMaterial({ color: 0x525a62, cellW: 1.6, cellH: FLOOR_H, baseY, glass: 0x2b3a45, lit: 0.45, slab: 0.1, slabColor: 0xd9d4ca, winX: [0.06, 0.94], winY: [0.12, 0.97], seed: false, glassRough: 0.05 });
  const beamGeo = new THREE.CylinderGeometry(4, 9, 1, 8, 1, true).translate(0, 0.5, 0);

  for (const d of devs) {
    const g = new THREE.Group();
    g.position.set(d.x, d.y, d.z);
    g.userData.dev = d;
    const cor = new THREE.Color(corDe(d));
    const mat = towerMat(d.y + BASE_H);
    // embasamento
    const base = new THREE.Mesh(new THREE.BoxGeometry(d.w + 16, BASE_H, d.dpt + 16).translate(0, BASE_H / 2 - 1, 0), darkMat);
    base.castShadow = base.receiveShadow = true;
    g.add(base);
    const H = d.andares * FLOOR_H;
    d.altura = BASE_H + H + 6;
    d.torresInfo = [];
    for (let t = 0; t < d.nTorres; t++) {
      const ox = (t - (d.nTorres - 1) / 2) * (d.w + 12);
      const core = new THREE.Mesh(new THREE.BoxGeometry(d.w, H, d.dpt).translate(0, H / 2, 0), mat);
      core.position.set(ox, BASE_H, 0);
      core.castShadow = core.receiveShadow = true;
      core.userData.dev = d;
      g.add(core);
      api.cores.push(core);
      d.torresInfo.push({ ox, core });
      for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const fin = new THREE.Mesh(new THREE.BoxGeometry(0.9, H + 4, 0.9).translate(0, (H + 4) / 2, 0), finMat);
        fin.position.set(ox + sx * d.w / 2, BASE_H, sz * d.dpt / 2);
        g.add(fin);
      }
      // coroamento com faixa de luz na cor do status
      const crown = new THREE.Mesh(new THREE.BoxGeometry(d.w - 2, 5, d.dpt - 2).translate(0, 2.5, 0), darkMat);
      crown.position.set(ox, BASE_H + H, 0);
      g.add(crown);
      const band = new THREE.Mesh(new THREE.BoxGeometry(d.w + 0.4, 0.9, d.dpt + 0.4), new THREE.MeshStandardMaterial({ color: cor, emissive: cor, emissiveIntensity: 0.6 }));
      band.position.set(ox, BASE_H + H + 4.2, 0);
      g.add(band);
      d.torresInfo[t].band = band;
    }
    // feixe vertical para achar o prédio de longe
    const beam = new THREE.Mesh(beamGeo, new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uColor: { value: cor }, uO: { value: 0.8 } },
      vertexShader: 'varying float vY; void main(){ vY = position.y; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: 'varying float vY; uniform vec3 uColor; uniform float uO; void main(){ gl_FragColor = vec4(uColor, (1.0 - vY) * uO * 0.55); }',
    }));
    beam.position.y = d.altura;
    beam.scale.set(1, 520, 1);
    g.add(beam);
    d.beam = beam;
    d.group = g;
    group.add(g);
  }

  // ---------- Andar aceso (escolha do andar) ----------
  const floorMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uTime: shared.uTime, uBase: { value: 0 } },
    vertexShader: `varying vec3 vW; varying vec3 vN; void main(){ vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix)*normal); gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `varying vec3 vW; varying vec3 vN; uniform float uTime;
      void main(){
        if (abs(vN.y) > 0.5) discard;
        float along = abs(vN.x) > 0.5 ? vW.z : vW.x;
        float f = fract(along / 1.6);
        float pane = step(0.08, f) * step(f, 0.92);
        float pulse = 0.85 + 0.15 * sin(uTime * 3.0);
        vec3 c = mix(vec3(1.0, 0.78, 0.45), vec3(1.0, 0.92, 0.75), pane) * (1.2 * pulse);
        gl_FragColor = vec4(c, mix(0.45, 0.95, pane));
      }`,
  });
  const floorBoxes = [];
  const floorGroup = new THREE.Group();
  group.add(floorGroup);
  api.setFloor = (d, n) => {
    floorBoxes.forEach((m) => m.removeFromParent());
    floorBoxes.length = 0;
    if (!d || !n) return;
    for (const t of d.torresInfo) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(d.w + 0.5, FLOOR_H * 0.92, d.dpt + 0.5), floorMat);
      m.position.set(d.x + t.ox, d.y + api.floorY(d, n) + FLOOR_H / 2, d.z);
      floorGroup.add(m);
      floorBoxes.push(m);
    }
  };
  api.floorY = (d, n) => BASE_H + (n - 1) * FLOOR_H; // relativo ao chão do prédio

  // contorno de destaque (hover / seleção)
  const ring = new THREE.Mesh(new THREE.RingGeometry(1, 1.05, 72).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false }));
  ring.visible = false;
  group.add(ring);
  api.setHover = (d) => {
    ring.visible = !!d;
    if (!d) return;
    const s = Math.max(d.w * d.nTorres, d.dpt) * 0.9 + 30;
    ring.scale.setScalar(s);
    ring.position.set(d.x, d.y + 1.5, d.z);
    ring.material.color.set(corDe(d));
  };

  api.pick = (ray) => {
    const hit = ray.intersectObjects(api.cores, false)[0];
    return hit ? { dev: hit.object.userData.dev, point: hit.point } : null;
  };
  api.pickFloor = (ray, d) => {
    const cores = d.torresInfo.map((t) => t.core);
    const hit = ray.intersectObjects(cores, false)[0];
    if (!hit) return null;
    const rel = hit.point.y - d.y - BASE_H;
    return Math.min(d.andares, Math.max(1, Math.floor(rel / FLOOR_H) + 1));
  };

  // filtros: esconde o feixe e escurece quem não bate com a busca
  api.setVisibleSet = (set) => {
    for (const d of devs) {
      const on = !set || set.has(d.id);
      d.beam.visible = on;
      d.torresInfo.forEach((t) => (t.band.visible = on));
      d.dim = !on;
    }
  };
  // feixes somem quando a câmera chega perto
  api.update = (camera, focus) => {
    for (const d of devs) {
      const dist = camera.position.distanceTo(d.group.position);
      d.beam.material.uniforms.uO.value = focus ? 0 : THREE.MathUtils.smoothstep(dist, 500, 2500) * 0.9;
    }
  };
  api.setShadows = (on) => api.cores.forEach((c) => (c.castShadow = on));
  return api;
}

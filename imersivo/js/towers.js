import * as THREE from 'three';
import { CONFIG } from './config.js';
import { facadeMaterial, signTexture, shared, palmCrown } from './materials.js';
import { GROUND_Y } from './world.js';
import { STATUS } from './data.js';

export const PODIUM = { x0: -36, x1: 36, z0: -46, z1: 46, top: GROUND_Y + 9 };
export const FLOOR_H = 3.15;
export const HALF_X = 12; // profundidade/2 (leste-oeste)
export const HALF_Z = 11; // largura/2 (norte-sul)

export const floorY = (andar) => PODIUM.top + (andar - 1) * FLOOR_H;
export const towerZ = (id) => CONFIG.torres.find((t) => t.id === id).z;

/** Caixa da unidade em coordenadas do mundo */
export function unitBox(u) {
  const zc = towerZ(u.torre);
  const front = u.final === '01' || u.final === '02';
  const north = u.final === '01' || u.final === '04';
  const x0 = front ? 0 : -HALF_X, x1 = front ? HALF_X : 0;
  const z0 = north ? zc - HALF_Z : zc, z1 = north ? zc : zc + HALF_Z;
  const y0 = floorY(u.andar);
  return new THREE.Box3(new THREE.Vector3(x0, y0, z0), new THREE.Vector3(x1, y0 + FLOOR_H, z1));
}

/** Referencial da fachada da unidade (para interior e vistas) */
export function unitFrame(u) {
  const b = unitBox(u);
  const front = u.final === '01' || u.final === '02';
  const normal = new THREE.Vector3(front ? 1 : -1, 0, 0);
  const pos = new THREE.Vector3(front ? HALF_X : -HALF_X, b.min.y, (b.min.z + b.max.z) / 2);
  return { pos, normal, rotY: front ? -Math.PI / 2 : Math.PI / 2, box: b };
}

export function createTowers(scene, units) {
  const group = new THREE.Group();
  group.name = 'empreendimento';
  scene.add(group);
  const api = { group, units };

  // ---------- Embasamento (pódio) ----------
  const podMat = facadeMaterial({ color: 0xd9d2c4, cellW: 2.4, cellH: 4.5, baseY: GROUND_Y, glass: 0x1c262d, lit: 0.8, slab: 0.16, slabColor: 0xbfb6a6, winX: [0.06, 0.94], winY: [0.2, 0.95], seed: false, emissiveBoost: 0.7 });
  const pw = PODIUM.x1 - PODIUM.x0, pd = PODIUM.z1 - PODIUM.z0, ph = PODIUM.top - GROUND_Y + 0.6;
  const podium = new THREE.Mesh(new THREE.BoxGeometry(pw, ph, pd).translate(0, ph / 2, 0), podMat);
  podium.position.set(0, GROUND_Y - 0.6, 0);
  podium.castShadow = podium.receiveShadow = true;
  group.add(podium);

  // Calçada / praça em volta
  const plaza = new THREE.Mesh(new THREE.BoxGeometry(108, 0.3, 128), new THREE.MeshStandardMaterial({ color: 0xbdb5a6, roughness: 0.9 }));
  plaza.position.set(0, GROUND_Y + 0.05, 0);
  plaza.receiveShadow = true;
  group.add(plaza);

  // Letreiro no embasamento (frente pro mar)
  const signTex = signTexture(CONFIG.nome, CONFIG.construtora.toUpperCase());
  const signMat = new THREE.MeshStandardMaterial({ map: signTex, transparent: true, emissive: 0xffffff, emissiveMap: signTex, emissiveIntensity: 0.2, roughness: 0.4 });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(30, 7.5), signMat);
  sign.rotation.y = Math.PI / 2;
  sign.position.set(PODIUM.x1 + 0.08, GROUND_Y + 6.2, 0);
  group.add(sign);
  api.signMat = signMat;

  // ---------- Lazer no topo do embasamento ----------
  buildLeisure(group);

  // ---------- Torres ----------
  const towerMat = facadeMaterial({ color: 0x3a3f45, cellW: 1.55, cellH: FLOOR_H, baseY: PODIUM.top, glass: 0x22313a, lit: 0.36, slab: 0.11, slabColor: 0xcfcac1, winX: [0.07, 0.93], winY: [0.12, 0.97], seed: false, glassRough: 0.06 });
  const conc = new THREE.MeshStandardMaterial({ color: 0xdcd7cd, roughness: 0.85 });
  const darkConc = new THREE.MeshStandardMaterial({ color: 0x4a4e53, roughness: 0.7 });
  const glassRail = new THREE.MeshStandardMaterial({ color: 0x9fc3cf, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.35, depthWrite: false });
  api.towerMeshes = [];

  const slabBoxes = [], railBoxes = [];
  for (const t of CONFIG.torres) {
    const zc = t.z;
    const H = t.andares * FLOOR_H;
    const tg = new THREE.Group();
    tg.name = 'torre-' + t.id;
    const core = new THREE.Mesh(new THREE.BoxGeometry(HALF_X * 2, H, HALF_Z * 2).translate(0, H / 2, 0), towerMat);
    core.position.set(0, PODIUM.top, zc);
    core.castShadow = core.receiveShadow = true;
    tg.add(core);
    api.towerMeshes.push(core);
    // pilares/aletas nas quinas e eixo central
    for (const [x, z, w, d] of [[HALF_X, -HALF_Z, 1.2, 1.2], [HALF_X, HALF_Z, 1.2, 1.2], [-HALF_X, -HALF_Z, 1.2, 1.2], [-HALF_X, HALF_Z, 1.2, 1.2], [HALF_X + 0.3, 0, 1.6, 1.4], [-HALF_X - 0.3, 0, 1.6, 1.4]]) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(w, H + 4, d).translate(0, (H + 4) / 2, 0), conc);
      fin.position.set(x, PODIUM.top, zc + z);
      fin.castShadow = fin.receiveShadow = true;
      tg.add(fin);
    }
    // coroamento
    const crownH = 8;
    const crown = new THREE.Mesh(new THREE.BoxGeometry(HALF_X * 2 - 2, crownH, HALF_Z * 2 - 2).translate(0, crownH / 2, 0), darkConc);
    crown.position.set(0, PODIUM.top + H, zc);
    crown.castShadow = true;
    tg.add(crown);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(HALF_X * 2 + 1.6, 0.8, HALF_Z * 2 + 1.6), conc);
    cap.position.set(0, PODIUM.top + H + crownH, zc);
    cap.castShadow = true;
    tg.add(cap);
    // letreiro no topo
    const topSign = new THREE.Mesh(new THREE.PlaneGeometry(18, 4.5), signMat);
    topSign.rotation.y = Math.PI / 2;
    topSign.position.set(HALF_X - 0.9, PODIUM.top + H + crownH / 2, zc);
    tg.add(topSign);
    group.add(tg);

    // sacadas (frente e fundos)
    for (let a = 1; a <= t.andares; a++) {
      const y = floorY(a);
      for (const side of [1, -1]) {
        for (const zz of [-1, 1]) {
          const zmid = zc + zz * 5.8;
          slabBoxes.push([side * (HALF_X + 1.25), y - 0.12, zmid, 2.5, 0.24, 9.2]);
          railBoxes.push([side * (HALF_X + 2.45), y + 0.55, zmid, 0.06, 1.1, 9.2]);
        }
      }
    }
  }
  const inst = (list, mat, cast) => {
    const g = new THREE.BoxGeometry(1, 1, 1);
    const m = new THREE.InstancedMesh(g, mat, list.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
    list.forEach(([x, y, z, w, h, d], i) => m.setMatrixAt(i, m4.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(w, h, d))));
    m.castShadow = cast; m.receiveShadow = true;
    group.add(m);
    return m;
  };
  api.slabs = inst(slabBoxes, conc, true);
  api.rails = inst(railBoxes, glassRail, false);

  // ---------- Unidades: seleção, disponibilidade, hover ----------
  const N = units.length;
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const picker = new THREE.InstancedMesh(boxGeo, new THREE.MeshBasicMaterial({ visible: false }), N);
  const overlayMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uTime: shared.uTime, uBaseY: { value: PODIUM.top }, uOpacity: { value: 1 } },
    vertexShader: /* glsl */`
      varying vec3 vWPos; varying vec3 vN; varying vec3 vCol;
      void main(){
        vec4 wp = modelMatrix * instanceMatrix * vec4(position,1.0);
        vWPos = wp.xyz; vN = normalize(mat3(modelMatrix * instanceMatrix) * normal);
        #ifdef USE_INSTANCING_COLOR
          vCol = instanceColor;
        #else
          vCol = vec3(1.0);
        #endif
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */`
      varying vec3 vWPos; varying vec3 vN; varying vec3 vCol; uniform float uTime; uniform float uBaseY; uniform float uOpacity;
      void main(){
        float along = abs(vN.x) > 0.5 ? vWPos.z : vWPos.x;
        vec2 g = vec2(along / 1.55, (vWPos.y - uBaseY) / 3.15);
        vec2 f = fract(g);
        float pane = step(0.1, f.x) * step(f.x, 0.9) * step(0.16, f.y) * step(f.y, 0.94);
        float top = abs(vN.y) > 0.5 ? 0.0 : 1.0;
        float pulse = 0.85 + 0.15 * sin(uTime * 2.4);
        vec3 c = vCol * mix(0.5, 1.1 * pulse, pane);
        gl_FragColor = vec4(c, mix(0.3, 0.82, pane) * top * uOpacity);
      }`,
  });
  const overlay = new THREE.InstancedMesh(boxGeo, overlayMat, N);
  overlay.visible = false;
  overlay.frustumCulled = false;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
  const zero = new THREE.Matrix4().makeScale(0, 0, 0);
  units.forEach((u, i) => {
    const b = unitBox(u);
    b.getCenter(p); b.getSize(s);
    picker.setMatrixAt(i, m4.compose(p, q, s));
    overlay.setMatrixAt(i, m4.compose(p, q, s.clone().add(new THREE.Vector3(0.5, -0.1, 0.5))));
    overlay.setColorAt(i, new THREE.Color(STATUS[u.status].cor));
  });
  picker.computeBoundingSphere();
  group.add(picker, overlay);
  api.picker = picker;
  api.overlay = overlay;

  let curFilter = (u) => u.status === 'disponivel', selUnit = null;
  api.setAvailability = (on, filter) => {
    if (filter) curFilter = filter;
    overlay.visible = on;
    units.forEach((u, i) => {
      if (curFilter(u) && u !== selUnit) {
        const b = unitBox(u); b.getCenter(p); b.getSize(s);
        overlay.setMatrixAt(i, m4.compose(p, q, s.add(new THREE.Vector3(0.5, -0.1, 0.5))));
      } else overlay.setMatrixAt(i, zero);
    });
    overlay.instanceMatrix.needsUpdate = true;
  };

  // Caixa de destaque (arestas grossas amarelas)
  const makeHighlight = (color, fillOpacity, t = 0.16) => {
    const g = new THREE.Group();
    const em = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, depthTest: true });
    const fill = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: fillOpacity, depthWrite: false }));
    g.add(fill);
    const edges = [];
    for (const sx of [-0.5, 0.5]) for (const sy of [-0.5, 0.5]) edges.push(['z', sx, sy]);
    for (const sx of [-0.5, 0.5]) for (const sz of [-0.5, 0.5]) edges.push(['y', sx, sz]);
    for (const sy of [-0.5, 0.5]) for (const sz of [-0.5, 0.5]) edges.push(['x', sy, sz]);
    const bars = edges.map(([ax, a, b]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), em); m.userData = { ax, a, b }; g.add(m); return m; });
    g.visible = false;
    g.userData.size = (sx, sy, sz) => {
      fill.scale.set(sx, sy, sz);
      bars.forEach((m) => {
        const { ax, a, b } = m.userData;
        if (ax === 'z') { m.scale.set(t, t, sz + t); m.position.set(a * sx, b * sy, 0); }
        if (ax === 'y') { m.scale.set(t, sy + t, t); m.position.set(a * sx, 0, b * sz); }
        if (ax === 'x') { m.scale.set(sx + t, t, t); m.position.set(0, a * sy, b * sz); }
      });
    };
    group.add(g);
    return g;
  };
  const hover = makeHighlight(0xffffff, 0.14, 0.14);
  const sel = makeHighlight(0xfff27a, 0.4, 0.3);
  const place = (h, u) => {
    if (!u) { h.visible = false; return; }
    const b = unitBox(u);
    b.getCenter(h.position); b.getSize(s);
    h.userData.size(s.x + 0.6, s.y, s.z + 0.6);
    h.visible = true;
  };
  api.setHover = (u) => place(hover, u);
  api.setSelected = (u) => {
    place(sel, u);
    selUnit = u;
    if (overlay.visible) api.setAvailability(true);
  };
  api.selBox = sel;
  api.hoverBox = hover;

  api.pick = (raycaster) => {
    const hit = raycaster.intersectObject(picker, false)[0];
    return hit ? units[hit.instanceId] : null;
  };

  api.setShadowCasting = (on) => { api.towerMeshes.forEach((m) => (m.castShadow = on)); };

  return api;
}

// ---------------------------------------------------------------------
function buildLeisure(group) {
  const Y = PODIUM.top;
  const add = (geo, mat, x, y, z, cast = true) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = cast; m.receiveShadow = true;
    group.add(m);
    return m;
  };
  const stone = new THREE.MeshStandardMaterial({ color: 0xe3ddd2, roughness: 0.85 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x8a6446, roughness: 0.75 });
  const grass = new THREE.MeshStandardMaterial({ color: 0x5f8a3a, roughness: 1 });
  const water = new THREE.MeshStandardMaterial({ color: 0x3fc1d6, roughness: 0.03, metalness: 0.1, emissive: 0x0b4f5e, emissiveIntensity: 0.6 });
  const white = new THREE.MeshStandardMaterial({ color: 0xf5f3ef, roughness: 0.6 });

  const tile = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const x = c.getContext('2d');
    x.fillStyle = '#cfc8ba'; x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { x.fillStyle = `hsl(36, 14%, ${74 + Math.random() * 8}%)`; x.fillRect(i * 32 + 1, j * 32 + 1, 30, 30); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(9, 11); return t;
  })();
  add(new THREE.BoxGeometry(70, 0.2, 90), new THREE.MeshStandardMaterial({ map: tile, roughness: 0.85 }), 0, Y + 0.1, 0, false);
  // deck e piscinas
  add(new THREE.BoxGeometry(16, 0.12, 40), wood, 24, Y + 0.25, -2, false);
  add(new THREE.BoxGeometry(8, 0.14, 26), water, 25, Y + 0.32, -4, false);
  add(new THREE.BoxGeometry(6.5, 0.14, 7), water, 25, Y + 0.32, 18.5, false);
  // borda da piscina
  add(new THREE.BoxGeometry(9, 0.1, 27), white, 25, Y + 0.24, -4, false);
  // espreguiçadeiras
  for (let z = -15; z <= 8; z += 2.6) {
    add(new THREE.BoxGeometry(2, 0.4, 0.8), white, 19, Y + 0.5, z);
    add(new THREE.BoxGeometry(0.7, 0.6, 0.8).rotateZ(-0.6), white, 18.2, Y + 0.75, z);
  }
  for (let x = -6; x <= 20; x += 3.2) add(new THREE.BoxGeometry(0.8, 0.4, 2), white, x, Y + 0.5, -38);
  // ombrelones
  for (const [x, z] of [[19, -12], [19, -3], [19, 6], [4, -38], [14, -38]]) {
    add(new THREE.CylinderGeometry(0.05, 0.05, 2.6), white, x, Y + 1.5, z);
    add(new THREE.ConeGeometry(1.8, 0.6, 8), new THREE.MeshStandardMaterial({ color: 0xf1ead8, roughness: 0.9 }), x, Y + 2.9, z);
  }
  // jardins nas bordas
  const planters = [[0, -44.5, 68, 1.6], [0, 44.5, 68, 1.6], [34.2, 0, 1.6, 86], [-34.2, 0, 1.6, 86]];
  for (const [x, z, w, d] of planters) add(new THREE.BoxGeometry(w, 0.9, d), grass, x, Y + 0.55, z);
  const bush = new THREE.IcosahedronGeometry(1, 1);
  const bushMat = new THREE.MeshStandardMaterial({ color: 0x41672a, roughness: 1 });
  for (let i = 0; i < 70; i++) {
    const side = i % 4;
    const t = Math.random() * 2 - 1;
    const [x, z] = side === 0 ? [t * 33, -44.5] : side === 1 ? [t * 33, 44.5] : side === 2 ? [34.2, t * 43] : [-34.2, t * 43];
    const k = 0.7 + Math.random() * 1.3;
    const b = add(bush, bushMat, x, Y + 1 + k * 0.5, z);
    b.scale.set(k, k * (0.8 + Math.random()), k);
  }
  // palmeiras no lazer
  const trunk = new THREE.MeshStandardMaterial({ color: 0x8a7a63, roughness: 1 });
  const leaf = new THREE.MeshStandardMaterial({ color: 0x3e7a30, roughness: 0.9, side: THREE.DoubleSide });
  for (const [x, z] of [[31, -20], [31, 12], [31, 26], [12, 40], [-6, 40], [12, -42], [-30, 0], [-30, -32], [-30, 32]]) {
    const h = 5 + Math.random() * 3;
    add(new THREE.CylinderGeometry(0.18, 0.28, h, 6), trunk, x, Y + h / 2, z);
    add(palmCrown(), leaf, x, Y + h, z).scale.setScalar(0.85);
  }
  // pavilhões gourmet e academia
  const pav = facadeMaterial({ color: 0xe9e4da, cellW: 2.2, cellH: 4, baseY: Y, glass: 0x24343b, lit: 0.9, winX: [0.05, 0.95], winY: [0.05, 0.85], seed: false });
  for (const z of [-18, 18]) {
    add(new THREE.BoxGeometry(14, 4, 13).translate(0, 2, 0), pav, -25, Y + 0.2, z);
    add(new THREE.BoxGeometry(15.4, 0.4, 14.4), stone, -25, Y + 4.3, z);
  }
  // pérgola
  for (let x = -18; x <= -14; x += 0.9) add(new THREE.BoxGeometry(0.2, 0.25, 22), wood, x, Y + 3.4, 0);
  for (const z of [-10, 10]) for (const x of [-18, -14]) add(new THREE.BoxGeometry(0.3, 3.4, 0.3), wood, x, Y + 1.7, z);
  // playground
  const colors = [0xf2c94c, 0xeb5757, 0x2d9cdb, 0x27ae60];
  add(new THREE.BoxGeometry(14, 0.1, 6), new THREE.MeshStandardMaterial({ color: 0x5a7fa8, roughness: 1 }), 2, Y + 0.25, 39, false);
  colors.forEach((c, i) => add(new THREE.BoxGeometry(1.2, 1.6 + i * 0.4, 1.2).translate(0, 0.8 + i * 0.2, 0), new THREE.MeshStandardMaterial({ color: c, roughness: 0.6 }), -3 + i * 3.2, Y + 0.3, 39));
}

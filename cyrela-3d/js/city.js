import * as THREE from 'three';
import { Sky } from '../vendor/three/addons/Sky.js';
import { facadeMaterial, terrainMaterial, foliageMaterial, glowTexture, waterNormalTexture, shared } from './materials.js';
import { toXZ, RIOS, LARGURA_RIO, PARQUES, JARDINS, AEROPORTO, AVENIDAS, MARCOS, altura, distRio, noParque, noAeroporto, inPoly } from './geo.js';

// Gerador pseudo-aleatório com semente
export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const GRADE = { cell: 86, angle: 0.24 };
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// Polos de verticalização (onde há mais prédios altos)
const POLOS = [
  [-23.563, -46.654, 1.0, 1300], [-23.585, -46.680, 1.0, 1200], [-23.600, -46.690, 0.95, 1300], [-23.603, -46.665, 0.8, 1300],
  [-23.535, -46.675, 0.8, 1400], [-23.585, -46.637, 0.75, 1300], [-23.618, -46.690, 0.85, 1500], [-23.562, -46.690, 0.6, 1000],
  [-23.592, -46.627, 0.7, 900], [-23.525, -46.730, 0.6, 1000], [-23.548, -46.637, 0.95, 1600], [-23.615, -46.725, 0.55, 1200],
  [-23.620, -46.672, 0.6, 1000], [-23.545, -46.615, 0.7, 1500], [-23.640, -46.700, 0.6, 1400],
].map(([la, lo, s, r]) => { const [x, z] = toXZ(la, lo); return { x, z, s, r }; });
function verticalizacao(x, z) {
  let v = 0.12;
  for (const p of POLOS) v = Math.max(v, p.s * Math.exp(-(((x - p.x) ** 2 + (z - p.z) ** 2) / (p.r * p.r))));
  const dj = Math.hypot(x - JARDINS.c[0], z - JARDINS.c[1]);
  if (dj < JARDINS.r) v *= 0.08;
  return v;
}

export function createCity(scene, renderer, quality, reservas) {
  const city = { updaters: [] };
  const R = rng(2026);
  const EXT = 9500; // meia-largura da cidade detalhada

  // ---------- Céu e luz ----------
  const sky = new Sky();
  sky.scale.setScalar(45000);
  const su = sky.material.uniforms;
  su.turbidity.value = 5.5; su.rayleigh.value = 1.3; su.mieCoefficient.value = 0.005; su.mieDirectionalG.value = 0.85;
  scene.add(sky);
  city.sky = sky;
  const envScene = new THREE.Scene();
  const envSky = new Sky();
  envSky.scale.setScalar(50);
  Object.entries({ turbidity: 5.5, rayleigh: 1.3, mieCoefficient: 0.005, mieDirectionalG: 0.85 }).forEach(([k, v]) => (envSky.material.uniforms[k].value = v));
  envScene.add(envSky);
  const pmrem = new THREE.PMREMGenerator(renderer);
  let envRT = null;
  city.updateEnv = (sunDir, nightF) => {
    envSky.material.uniforms.sunPosition.value.copy(sunDir);
    if (envRT) envRT.dispose();
    envRT = pmrem.fromScene(envScene, 0, 0.1, 100);
    scene.environment = envRT.texture;
    scene.environmentIntensity = THREE.MathUtils.lerp(0.55, 0.15, nightF);
  };

  const sun = new THREE.DirectionalLight(0xfff1dc, 3);
  sun.shadow.mapSize.set(quality.shadow, quality.shadow);
  Object.assign(sun.shadow.camera, { left: -260, right: 260, top: 260, bottom: -260, near: 10, far: 6000 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.8;
  scene.add(sun, sun.target);
  city.sun = sun;
  const hemi = new THREE.HemisphereLight(0xcfe0ff, 0x4a4842, 0.5);
  scene.add(hemi);
  city.hemi = hemi;
  const moonLight = new THREE.DirectionalLight(0x9db4ff, 0);
  scene.add(moonLight);
  city.moonLight = moonLight;
  scene.fog = new THREE.FogExp2(0xa9bccd, 0.000032);

  // estrelas
  {
    const n = 2200, pos = new Float32Array(n * 3), r = rng(5);
    for (let i = 0; i < n; i++) {
      const th = r() * Math.PI * 2, ph = Math.acos(r() * 0.95 + 0.05);
      pos.set([Math.sin(ph) * Math.cos(th) * 40000, Math.cos(ph) * 40000, Math.sin(ph) * Math.sin(th) * 40000], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    city.stars = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 1.5, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, fog: false }));
    scene.add(city.stars);
  }

  // ---------- Terreno ----------
  {
    const SEG = quality.level === 'low' ? 220 : 340;
    const S = 26000;
    const geo = new THREE.PlaneGeometry(2, 2, SEG, SEG).rotateX(-Math.PI / 2);
    const p = geo.attributes.position;
    const warp = (u) => Math.sign(u) * Math.pow(Math.abs(u), 1.6) * S;
    for (let i = 0; i < p.count; i++) {
      const x = warp(p.getX(i)), z = warp(p.getZ(i));
      p.setXYZ(i, x, altura(x, z) - 0.6, z);
    }
    geo.computeVertexNormals();
    const col = new Float32Array(p.count * 3);
    const c = new THREE.Color(), urb = new THREE.Color(0x6e6b66), urb2 = new THREE.Color(0x7d7972), verde = new THREE.Color(0x3f5a2c), grama = new THREE.Color(0x6f8a4a), varzea = new THREE.Color(0x5e6b55);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      c.copy(urb).lerp(urb2, (Math.sin(x * 0.013) * Math.cos(z * 0.011) + 1) * 0.3);
      const pq = noParque(x, z);
      if (pq) c.copy(pq.grama ? grama : verde);
      if (Math.hypot(x - JARDINS.c[0], z - JARDINS.c[1]) < JARDINS.r) c.lerp(verde, 0.45);
      const dr = distRio(x, z);
      c.lerp(varzea, smooth(220, 60, dr) * 0.6);
      if (Math.hypot(x, z) > 11000) c.lerp(urb2, 0.4);
      col.set([c.r, c.g, c.b], i * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const terrain = new THREE.Mesh(geo, terrainMaterial({ cell: GRADE.cell, angle: GRADE.angle, width: 13 }));
    terrain.receiveShadow = true;
    scene.add(terrain);
    city.terrain = terrain;
  }

  // ---------- Faixas (rios, avenidas, marginais) acompanhando o relevo ----------
  const ribbon = (pts, w, yOff, mat, step = 40) => {
    const pos = [], idx = [];
    const sub = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
      const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / step));
      for (let k = 0; k < n; k++) sub.push([ax + ((bx - ax) * k) / n, az + ((bz - az) * k) / n]);
    }
    sub.push(pts[pts.length - 1]);
    sub.forEach(([x, z], i) => {
      const a = sub[Math.max(0, i - 1)], b = sub[Math.min(sub.length - 1, i + 1)];
      let dx = b[0] - a[0], dz = b[1] - a[1];
      const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
      const nx = -dz * w / 2, nz = dx * w / 2;
      const y = altura(x, z) + yOff;
      pos.push(x + nx, y, z + nz, x - nx, y, z - nz);
      if (i) { const o = (i - 1) * 2; idx.push(o, o + 1, o + 2, o + 1, o + 3, o + 2); }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    // garante normais para cima
    const nrm = g.attributes.normal;
    if (nrm.getY(0) < 0) { for (let i = 0; i < idx.length; i += 3) [idx[i + 1], idx[i + 2]] = [idx[i + 2], idx[i + 1]]; g.setIndex(idx); g.computeVertexNormals(); }
    const m = new THREE.Mesh(g, mat);
    m.receiveShadow = true;
    scene.add(m);
    return { mesh: m, sub };
  };
  const asphalt = new THREE.MeshStandardMaterial({ color: 0x3a3b3e, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
  const asphalt2 = new THREE.MeshStandardMaterial({ color: 0x45464a, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
  const nt = waterNormalTexture(256);
  nt.repeat.set(0.02, 0.02);
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x2f4a48, roughness: 0.12, metalness: 0.05, normalMap: nt, normalScale: new THREE.Vector2(0.2, 0.2), polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6 });
  nt.wrapS = nt.wrapT = THREE.RepeatWrapping;
  city.updaters.push((dt, t) => nt.offset.set(t * 0.002, t * 0.001));
  const viasPts = [];
  for (const [k, pts] of Object.entries(RIOS)) {
    const w = LARGURA_RIO[k];
    ribbon(pts, w + 90, 0.3, asphalt);         // marginais
    ribbon(pts, w + 14, 0.5, new THREE.MeshStandardMaterial({ color: 0x5d6b52, roughness: 1, polygonOffset: true, polygonOffsetFactor: -5, polygonOffsetUnits: -5 }));
    ribbon(pts, w, 0.7, waterMat);
    viasPts.push(...offsetLine(pts, (w + 60) / 2), ...offsetLine(pts, -(w + 60) / 2));
  }
  for (const a of AVENIDAS) { const r = ribbon(a.pts, a.w, 0.6, asphalt2, 25); viasPts.push(...r.sub); }

  // ---------- Aeroporto de Congonhas ----------
  {
    const [cx, cz] = AEROPORTO.c;
    const y = altura(cx, cz);
    const g = new THREE.Group();
    g.position.set(cx, y + 0.8, cz);
    g.rotation.y = -(AEROPORTO.rumo * Math.PI) / 180;
    const area = new THREE.Mesh(new THREE.BoxGeometry(AEROPORTO.larg, 0.4, AEROPORTO.comp + 200), new THREE.MeshStandardMaterial({ color: 0x6e8150, roughness: 1 }));
    const pista = new THREE.Mesh(new THREE.BoxGeometry(48, 0.6, AEROPORTO.comp), new THREE.MeshStandardMaterial({ color: 0x2c2d30, roughness: 0.8 }));
    pista.position.x = -60;
    const pista2 = pista.clone(); pista2.position.x = 40; pista2.scale.z = 0.72;
    for (let k = -8; k <= 8; k++) { const f = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.7, 30), new THREE.MeshBasicMaterial({ color: 0xe8e8e8 })); f.position.set(-60, 0.05, k * 110); g.add(f); }
    const term = new THREE.Mesh(new THREE.BoxGeometry(90, 18, 300).translate(0, 9, 0), facadeMaterial({ color: 0xd9d6cf, cellW: 4, cellH: 6, baseY: y, seed: false, lit: 0.9 }));
    term.position.set(190, 0, 80);
    term.castShadow = true;
    g.add(area, pista, pista2, term);
    scene.add(g);
  }

  // ---------- Marcos: MASP, estádios, Ponte Estaiada ----------
  const marcosGroup = new THREE.Group();
  scene.add(marcosGroup);
  const red = new THREE.MeshStandardMaterial({ color: 0xc0242a, roughness: 0.6 });
  const conc = new THREE.MeshStandardMaterial({ color: 0xd8d4cc, roughness: 0.85 });
  const field = new THREE.MeshStandardMaterial({ color: 0x3f8a3a, roughness: 1 });
  for (const m of MARCOS) {
    const [x, z] = m.xz, y = altura(x, z);
    if (m.id === 'paulista') {
      const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = 0.85;
      const vao = new THREE.Mesh(new THREE.BoxGeometry(74, 12, 30), facadeMaterial({ color: 0x8a8f95, cellW: 3, cellH: 12, baseY: y + 8, glass: 0x1d262d, seed: false }));
      vao.position.y = 14;
      g.add(vao);
      for (const sx of [-37, 37]) { const v = new THREE.Mesh(new THREE.BoxGeometry(2.5, 3, 34), red); v.position.set(sx, 21.5, 0); g.add(v); const pl = new THREE.Mesh(new THREE.BoxGeometry(2.5, 23, 3), red); pl.position.set(sx, 11.5, -16); g.add(pl); const pl2 = pl.clone(); pl2.position.z = 16; g.add(pl2); }
      g.traverse((o) => (o.castShadow = true));
      marcosGroup.add(g);
    }
    if (['morumbi', 'pacaembu', 'allianz'].includes(m.id)) {
      const g = new THREE.Group(); g.position.set(x, y, z);
      const shape = new THREE.Shape(); shape.absellipse(0, 0, 130, 100, 0, Math.PI * 2);
      const hole = new THREE.Path(); hole.absellipse(0, 0, 78, 52, 0, Math.PI * 2); shape.holes.push(hole);
      const ring = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: m.id === 'morumbi' ? 34 : 24, bevelEnabled: false }).rotateX(-Math.PI / 2), conc);
      const f = new THREE.Mesh(new THREE.PlaneGeometry(150, 100).rotateX(-Math.PI / 2), field); f.position.y = 1;
      ring.castShadow = true;
      g.add(ring, f);
      if (m.id === 'allianz') ring.material = new THREE.MeshStandardMaterial({ color: 0xe8e6e2, roughness: 0.5 });
      marcosGroup.add(g);
    }
    if (m.id === 'estaiada') {
      const g = new THREE.Group(); g.position.set(x, y, z);
      const mastro = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 5, 138, 6).translate(0, 69, 0), conc);
      const m2 = mastro.clone(); mastro.rotation.z = 0.12; m2.rotation.z = -0.12; mastro.position.x = 8; m2.position.x = -8;
      g.add(mastro, m2);
      const cab = new THREE.LineBasicMaterial({ color: 0xffd35a, transparent: true, opacity: 0.85 });
      const pts = [];
      for (let k = 1; k <= 14; k++) for (const s of [-1, 1]) { pts.push(0, 40 + k * 6.5, 0, s * k * 18, 6, 0); }
      const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      const lines = new THREE.LineSegments(lg, cab);
      const deck = new THREE.Mesh(new THREE.BoxGeometry(560, 3, 14).translate(0, 5, 0), conc);
      g.add(lines, deck);
      g.rotation.y = 0.55;
      g.traverse((o) => (o.castShadow = true));
      marcosGroup.add(g);
      city.estaiadaCabos = cab;
    }
  }

  // ---------- Prédios genéricos: quadras numa grade com ruas ----------
  {
    const cell = GRADE.cell, ang = GRADE.angle, ca = Math.cos(ang), sa = Math.sin(ang);
    const toWorld = (u, v) => [ca * u - sa * v, sa * u + ca * v];
    const lot = cell - 15; // quadra útil (rua de 13 m + recuo)
    const boxes = [];
    const ext = quality.level === 'low' ? EXT * 0.8 : EXT;
    for (let gu = -ext; gu < ext; gu += cell) {
      for (let gv = -ext; gv < ext; gv += cell) {
        const [x, z] = toWorld(gu + cell / 2, gv + cell / 2);
        const dc = Math.hypot(x, z);
        if (R() > (dc < 7500 ? 0.9 : 0.62)) continue;
        if (noParque(x, z) || noAeroporto(x, z) || distRio(x, z) < 120) continue;
        // vizinhos dos prédios Cyrela ficam mais baixos, para o empreendimento se destacar
        let near = false, teto = Infinity;
        for (const r of reservas) {
          const dd = Math.hypot(r[0] - x, r[1] - z);
          if (dd < 80) { near = true; break; }
          if (dd < 280) teto = Math.min(teto, r[2] * (0.35 + 0.4 * (dd - 80) / 200));
        }
        if (near) continue;
        const v = verticalizacao(x, z);
        const cap = (h) => Math.max(6, Math.min(h, teto));
        const y = altura(x, z);
        if (R() < 0.05 + 0.6 * v) {
          // prédio alto ocupando a quadra (com recuo variável)
          const w = lot * (0.45 + R() * 0.4), d = lot * (0.45 + R() * 0.4);
          const ou = (R() - 0.5) * (lot - w), ov = (R() - 0.5) * (lot - d);
          const [px, pz] = toWorld(gu + cell / 2 + ou, gv + cell / 2 + ov);
          boxes.push({ x: px, z: pz, y, w, d, h: cap(3 * Math.round(9 + R() * (12 + 26 * v))), a: -ang, tall: true, s: R() });
          if (R() < 0.35) { const [qx, qz] = toWorld(gu + cell / 2 - ou, gv + cell / 2 - ov * 0.2); boxes.push({ x: qx, z: qz, y, w: lot * 0.3, d: lot * 0.35, h: 3 * (2 + Math.floor(R() * 4)), a: -ang, tall: false, s: R() }); }
        } else {
          // casas e sobrados: 2 a 4 lotes por quadra
          const n = R() < 0.5 ? 2 : 4;
          for (let k = 0; k < n; k++) {
            if (R() < 0.12) continue;
            const su = n === 2 ? (k - 0.5) * lot / 2 : ((k % 2) - 0.5) * lot / 2;
            const sv = n === 2 ? 0 : (Math.floor(k / 2) - 0.5) * lot / 2;
            const w = (lot / 2) * (0.65 + R() * 0.3), d = (n === 2 ? lot : lot / 2) * (0.55 + R() * 0.35);
            const [px, pz] = toWorld(gu + cell / 2 + su, gv + cell / 2 + sv);
            boxes.push({ x: px, z: pz, y, w, d, h: 3 * (2 + Math.floor(R() * (v > 0.3 ? 4 : 2.5))), a: -ang, tall: false, s: R() });
          }
        }
      }
    }
    const geo = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
    const mat = facadeMaterial({ cellW: 3.2, cellH: 3.0, baseY: 0, glass: 0x1c2630, lit: 0.42, roughness: 0.88 });
    // base por instância: corrigimos a origem das janelas no shader usando a altura do terreno → aceitável (padrão contínuo)
    const mesh = new THREE.InstancedMesh(geo, mat, boxes.length);
    const seedsAttr = new Float32Array(boxes.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), c = new THREE.Color();
    const pal = ['#e9e5dd', '#d8d3ca', '#c9c4bb', '#b8bcc0', '#dcd2c2', '#a9b1b8', '#efe9df', '#cfc6b6', '#9aa3ab', '#e2ddd5'];
    boxes.forEach((b, i) => {
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), b.a);
      m4.compose(p.set(b.x, b.y - 2, b.z), q, s.set(b.w, b.h + 2, b.d));
      mesh.setMatrixAt(i, m4);
      c.set(pal[Math.floor(b.s * pal.length)]);
      if (!b.tall) c.multiplyScalar(0.92);
      mesh.setColorAt(i, c);
      seedsAttr[i] = b.s * 100;
    });
    geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seedsAttr, 1));
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    scene.add(mesh);
    city.buildings = mesh;
    city.buildingCount = boxes.length;

    // telhados cerâmicos nas casas
    const roofs = boxes.filter((b) => !b.tall && b.s < 0.55);
    const rg = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1).rotateY(Math.PI / 4).translate(0, 0.5, 0);
    const rm = new THREE.InstancedMesh(rg, new THREE.MeshStandardMaterial({ roughness: 0.9 }), roofs.length);
    const tiles = ['#9c4f2e', '#a8603a', '#8a4529', '#7d756c', '#6e5a4c'];
    roofs.forEach((b, i) => {
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), b.a);
      rm.setMatrixAt(i, m4.compose(p.set(b.x, b.y + b.h, b.z), q, s.set(b.w + 0.6, 2.2, b.d + 0.6)));
      rm.setColorAt(i, c.set(tiles[i % tiles.length]));
    });
    rm.receiveShadow = true;
    scene.add(rm);
  }

  // ---------- Árvores (parques, Jardins, ruas) ----------
  {
    const N = quality.level === 'low' ? 12000 : 30000;
    const blob = new THREE.IcosahedronGeometry(1, 1);
    const trees = new THREE.InstancedMesh(blob, foliageMaterial(), N);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), c = new THREE.Color();
    let n = 0, tries = 0;
    while (n < N && tries < N * 12) {
      tries++;
      const x = (R() * 2 - 1) * EXT, z = (R() * 2 - 1) * EXT;
      const pq = noParque(x, z);
      const dj = Math.hypot(x - JARDINS.c[0], z - JARDINS.c[1]) < JARDINS.r;
      let keep = 0.035;
      if (pq) keep = pq.grama ? 0.08 : 0.95;
      else if (dj) keep = 0.6;
      if (R() > keep || noAeroporto(x, z) || distRio(x, z) < 60) continue;
      const k = 4 + R() * 6;
      const y = altura(x, z);
      m4.compose(p.set(x, y + k * 0.6, z), q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), R() * 6), s.set(k, k * (0.75 + R() * 0.3), k));
      trees.setMatrixAt(n, m4);
      trees.setColorAt(n, c.setHSL(0.25 + R() * 0.07, 0.4 + R() * 0.2, 0.1 + R() * 0.09));
      n++;
    }
    trees.count = n;
    trees.receiveShadow = true;
    scene.add(trees);
  }

  // ---------- Luzes da cidade à noite ----------
  {
    const pos = [];
    viasPts.forEach(([x, z], i) => { if (i % 1 === 0) pos.push(x, altura(x, z) + 9, z); });
    const r = rng(77);
    for (let i = 0; i < (quality.level === 'low' ? 4000 : 9000); i++) {
      const x = (r() * 2 - 1) * EXT, z = (r() * 2 - 1) * EXT;
      if (noParque(x, z) || distRio(x, z) < 90) continue;
      pos.push(x, altura(x, z) + 7, z);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    city.lights = new THREE.Points(g, new THREE.PointsMaterial({ map: glowTexture(), color: 0xffc98a, size: 34, sizeAttenuation: true, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    scene.add(city.lights);
  }

  return city;
}

function offsetLine(pts, off) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
    const L = Math.hypot(bx - ax, bz - az), n = Math.ceil(L / 45);
    const nx = -(bz - az) / L * off, nz = (bx - ax) / L * off;
    for (let k = 0; k < n; k++) out.push([ax + ((bx - ax) * k) / n + nx, az + ((bz - az) * k) / n + nz]);
  }
  return out;
}

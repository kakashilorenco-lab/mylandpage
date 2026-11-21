import * as THREE from 'three';
import { Sky } from '../vendor/three/addons/Sky.js';
import { rng } from './data.js';
import { facadeMaterial, terrainMaterial, waterNormalTexture, glowTexture, shared, foliageMaterial, palmCrown } from './materials.js';

// ---------------------------------------------------------------------
// Ruído (Perlin 2D) para relevo
// ---------------------------------------------------------------------
const R = rng(7);
const perm = new Uint8Array(512);
{
  const p = [...Array(256).keys()];
  for (let i = 255; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
}
const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
const lerp = (a, b, t) => a + (b - a) * t;
function grad(h, x, y) { const a = (h & 7) * 0.7853981; return Math.cos(a) * x + Math.sin(a) * y; }
export function noise(x, y) {
  const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
  x -= Math.floor(x); y -= Math.floor(y);
  const u = fade(x), v = fade(y);
  const a = perm[X] + Y, b = perm[X + 1] + Y;
  return lerp(lerp(grad(perm[a], x, y), grad(perm[b], x - 1, y), u), lerp(grad(perm[a + 1], x, y - 1), grad(perm[b + 1], x - 1, y - 1), u), v) * 1.4;
}
function fbm(x, y, o = 4) { let s = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { s += a * noise(x * f, y * f); f *= 2.03; a *= 0.5; } return s; }
export const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// ---------------------------------------------------------------------
// Relevo: planície urbana, morro com Mata Atlântica atrás, praia a leste,
// costões nas pontas da enseada e uma ilha no mar.
// x = leste, z = sul, y = altura (metros). Torres na origem.
// ---------------------------------------------------------------------
export const WATER_Y = 0.4;
export const GROUND_Y = 2.0;

export function coastX(z) {
  const az = Math.abs(z);
  return 470 + 40 * Math.sin(z / 260) + 22 * Math.sin(z / 97 + 1) + 380 * smooth(1700, 2900, az) + 30 * noise(z / 500, 7.3);
}
function mountainEdge(z) {
  const az = Math.abs(z);
  const base = -175 - 70 * (noise(z / 420, 3.7) * 0.5 + 0.5) - 330 * smooth(250, 1300, az);
  return lerp(base, coastX(z) + 160, smooth(1650, 2600, az));
}
export function mountainH(x, z) {
  const d = mountainEdge(z) - x;
  if (d < -90) return 0;
  const t = smooth(-90, 520, d);
  const big = 0.55 + 0.45 * fbm(x / 1500, z / 1500, 3);
  const ridge = 1 - Math.abs(noise(x / 620 + 11, z / 620 - 4));
  return Math.max(0, t * (130 + 340 * big) * (0.72 + 0.28 * ridge) + smooth(-40, 160, d) * fbm(x / 160, z / 160, 3) * 28);
}
function islandH(x, z) {
  const d = Math.hypot((x - 2350) * 1.0, (z - 650) * 1.5);
  if (d > 560) return -99;
  return 125 * Math.pow(1 - smooth(0, 540, d), 1.4) + fbm(x / 90, z / 90, 2) * 10 - 6;
}
export function heightAt(x, z) {
  const hm = mountainH(x, z);
  const cx = coastX(z);
  const s = x - cx;
  let h = GROUND_Y + hm;
  const shore = smooth(-45, 5, s);
  h = lerp(h, 0.85 + hm * (1 - smooth(-45, 260, s)), shore);
  if (s > 0) h -= Math.min(s, 500) * 0.05 + smooth(0, 40, s) * 1.6;
  return Math.max(h, islandH(x, z));
}
export function isUrban(x, z) {
  return mountainH(x, z) < 1.2 && x < coastX(z) - 78 && Math.abs(z) < 1950;
}

// ---------------------------------------------------------------------
export function createWorld(scene, renderer, quality) {
  const world = { scene, updaters: [] };
  const hi = quality.level !== 'low';

  // ---------- Céu (modelo Preetham) ----------
  const sky = new Sky();
  sky.scale.setScalar(18000);
  const su = sky.material.uniforms;
  su.turbidity.value = 2.4;
  su.rayleigh.value = 1.15;
  su.mieCoefficient.value = 0.0035;
  su.mieDirectionalG.value = 0.86;
  scene.add(sky);
  world.sky = sky;

  // Céu separado para gerar reflexos (envMap)
  const envScene = new THREE.Scene();
  const envSky = new Sky();
  envSky.scale.setScalar(50);
  envSky.material.uniforms.turbidity.value = 2.4;
  envSky.material.uniforms.rayleigh.value = 1.15;
  envSky.material.uniforms.mieCoefficient.value = 0.0035;
  envSky.material.uniforms.mieDirectionalG.value = 0.86;
  envScene.add(envSky);
  const pmrem = new THREE.PMREMGenerator(renderer);
  let envRT = null;
  world.updateEnv = (sunDir, nightF) => {
    envSky.material.uniforms.sunPosition.value.copy(sunDir);
    envScene.background = null;
    if (envRT) envRT.dispose();
    envRT = pmrem.fromScene(envScene, 0, 0.1, 100);
    scene.environment = envRT.texture;
    scene.environmentIntensity = lerp(0.55, 0.18, nightF);
  };

  // ---------- Estrelas e lua ----------
  {
    const n = 2600, pos = new Float32Array(n * 3), r = rng(99);
    for (let i = 0; i < n; i++) {
      const u = r(), v = r() * 0.95 + 0.05;
      const th = u * Math.PI * 2, ph = Math.acos(v);
      pos.set([Math.sin(ph) * Math.cos(th) * 15000, Math.cos(ph) * 15000, Math.sin(ph) * Math.sin(th) * 15000], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const m = new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, fog: false });
    world.stars = new THREE.Points(g, m);
    world.stars.renderOrder = -1;
    scene.add(world.stars);

    const moonTex = (() => {
      const c = document.createElement('canvas'); c.width = c.height = 128;
      const x = c.getContext('2d');
      const gr = x.createRadialGradient(64, 64, 20, 64, 64, 64);
      gr.addColorStop(0, 'rgba(255,255,245,1)'); gr.addColorStop(0.45, 'rgba(240,240,230,1)');
      gr.addColorStop(0.5, 'rgba(200,210,255,0.25)'); gr.addColorStop(1, 'rgba(200,210,255,0)');
      x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
      x.fillStyle = 'rgba(160,160,150,0.25)';
      for (let i = 0; i < 9; i++) { x.beginPath(); x.arc(40 + Math.random() * 48, 40 + Math.random() * 48, 4 + Math.random() * 7, 0, 7); x.fill(); }
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
    })();
    world.moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: moonTex, transparent: true, fog: false, depthWrite: false }));
    world.moon.scale.setScalar(520);
    scene.add(world.moon);
  }

  // ---------- Luzes ----------
  const sun = new THREE.DirectionalLight(0xfff3e0, 3.2);
  sun.castShadow = true;
  const sm = quality.shadowSize;
  sun.shadow.mapSize.set(sm, sm);
  const sc = sun.shadow.camera;
  sc.left = -330; sc.right = 330; sc.top = 330; sc.bottom = -330; sc.near = 10; sc.far = 3200;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.6;
  sun.target.position.set(0, 30, 0);
  scene.add(sun, sun.target);
  world.sun = sun;

  const moonLight = new THREE.DirectionalLight(0x9db4ff, 0.0);
  scene.add(moonLight, moonLight.target);
  world.moonLight = moonLight;

  const hemi = new THREE.HemisphereLight(0xcfe3ff, 0x5b5546, 0.9);
  scene.add(hemi);
  world.hemi = hemi;

  scene.fog = new THREE.FogExp2(0xa9c3dc, 0.00013);

  // ---------- Terreno ----------
  {
    const SEG = hi ? 360 : 220;
    const S = 6200;
    const geo = new THREE.PlaneGeometry(2, 2, SEG, SEG);
    geo.rotateX(-Math.PI / 2);
    const p = geo.attributes.position;
    const warp = (u) => Math.sign(u) * Math.pow(Math.abs(u), 1.75) * S;
    for (let i = 0; i < p.count; i++) {
      const x = warp(p.getX(i)), z = warp(p.getZ(i));
      p.setXYZ(i, x, heightAt(x, z), z);
    }
    geo.computeVertexNormals();
    const nrm = geo.attributes.normal;
    const col = new Float32Array(p.count * 3);
    const c = new THREE.Color(), forestA = new THREE.Color(0x182c12), forestB = new THREE.Color(0x2a4318), forestC = new THREE.Color(0x10200c);
    const rock = new THREE.Color(0x6f6a58), sand = new THREE.Color(0xdcccA4), wetSand = new THREE.Color(0xb7a682), urban = new THREE.Color(0x77736a), seabed = new THREE.Color(0x3b6a66);
    const grass = new THREE.Color(0x6b7a45);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const slope = 1 - nrm.getY(i);
      const hm = mountainH(x, z);
      const s = x - coastX(z);
      const isl = islandH(x, z);
      const nn = fbm(x / 220, z / 220, 3) * 0.5 + 0.5;
      // floresta
      c.copy(forestA).lerp(forestB, nn).lerp(forestC, smooth(0.2, 0.0, nn) * 0.8);
      c.lerp(rock, smooth(0.32, 0.6, slope) * 0.75);
      const forestAmt = Math.max(smooth(1, 14, hm), smooth(0, 10, isl));
      const flat = new THREE.Color().copy(urban).lerp(grass, smooth(0.25, 0.7, fbm(x / 140 + 5, z / 140, 2) * 0.5 + 0.5) * 0.55);
      if (Math.abs(z) > 1950) flat.lerp(grass, 0.6);
      c.lerp(flat, 1 - forestAmt);
      // praia e mar
      const beach = smooth(-60, -38, s) * (1 - smooth(140, 300, hm)) * (1 - smooth(0, 12, isl));
      c.lerp(sand, beach);
      c.lerp(wetSand, smooth(-8, 2, s) * beach);
      if (y < WATER_Y - 0.5) c.lerp(seabed, smooth(WATER_Y - 0.5, -4, y));
      col.set([c.r, c.g, c.b], i * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const terrain = new THREE.Mesh(geo, terrainMaterial());
    terrain.receiveShadow = true;
    terrain.name = 'terrain';
    scene.add(terrain);
    world.terrain = terrain;
  }

  // ---------- Mar ----------
  {
    const nt = waterNormalTexture(256);
    nt.repeat.set(70, 70);
    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(40000, 40000).rotateX(-Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0x0e4c5c, roughness: 0.06, metalness: 0.05, normalMap: nt, normalScale: new THREE.Vector2(0.16, 0.16), envMapIntensity: 1.0 })
    );
    water.position.y = WATER_Y;
    water.receiveShadow = true;
    scene.add(water);
    world.water = water;
    world.updaters.push((dt, t) => { nt.offset.set(t * 0.0045, t * 0.0021); });

    // Espuma na beira da praia
    const pts = [];
    for (let z = -2600; z <= 2600; z += 20) {
      let xs = coastX(z);
      for (let k = 0; k < 40 && heightAt(xs, z) > WATER_Y; k++) xs += 3;
      for (let k = 0; k < 40 && heightAt(xs, z) < WATER_Y; k++) xs -= 1;
      pts.push([xs, z]);
    }
    const fg = new THREE.BufferGeometry();
    const fp = [], fu = [], fi = [];
    pts.forEach(([x, z], i) => {
      fp.push(x - 1, WATER_Y + 0.05, z, x + 9, WATER_Y + 0.05, z);
      fu.push(0, i / 4, 1, i / 4);
      if (i) { const a = (i - 1) * 2; fi.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    });
    fg.setAttribute('position', new THREE.Float32BufferAttribute(fp, 3));
    fg.setAttribute('uv', new THREE.Float32BufferAttribute(fu, 2));
    fg.setIndex(fi);
    const foamMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uTime: shared.uTime, uDay: { value: 1 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `varying vec2 vUv; uniform float uTime; uniform float uDay;
        void main(){ float w = sin(vUv.y*2.0 + uTime*0.9)*0.5+0.5; float edge = smoothstep(0.0,0.15,vUv.x)*(1.0-smoothstep(0.25+0.45*w,0.95,vUv.x));
        gl_FragColor = vec4(vec3(0.95,0.97,1.0)*mix(0.15,1.0,uDay), edge*0.75); }`,
    });
    world.foamMat = foamMat;
    scene.add(new THREE.Mesh(fg, foamMat));
  }

  // ---------- Árvores (Mata Atlântica) ----------
  // Duas malhas instanciadas: copas detalhadas perto, simples ao longe (desempenho)
  {
    const count = quality.trees;
    const blob = (detail) => {
      const g = new THREE.IcosahedronGeometry(1, detail);
      const pa = g.attributes.position;
      for (let i = 0; i < pa.count; i++) pa.setXYZ(i, pa.getX(i) * (0.85 + Math.random() * 0.3), pa.getY(i) * (0.85 + Math.random() * 0.3), pa.getZ(i) * (0.85 + Math.random() * 0.3));
      g.computeVertexNormals();
      return g;
    };
    const mat = foliageMaterial();
    const near = new THREE.InstancedMesh(blob(1), mat, count);
    const far = new THREE.InstancedMesh(blob(0), mat, count);
    const r = rng(1234), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), pos = new THREE.Vector3(), c = new THREE.Color();
    let nn = 0, nf = 0, tries = 0;
    const put = (isNear) => {
      const mesh = isNear ? near : far;
      const i = isNear ? nn++ : nf++;
      mesh.setMatrixAt(i, m4);
      mesh.setColorAt(i, c);
    };
    while (nn + nf < count && tries < count * 8) {
      tries++;
      const rad = Math.pow(r(), 0.85) * 3600;
      const ang = r() * Math.PI * 2;
      const x = Math.cos(ang) * rad, z = Math.sin(ang) * rad;
      const hm = mountainH(x, z), isl = islandH(x, z);
      if (hm < 3 && isl < 3) continue;
      const y = heightAt(x, z);
      if (y < WATER_Y + 2) continue;
      const k = 3.5 + r() * 6 + (rad > 1500 ? 4 : 0);
      s.set(k, k * (0.7 + r() * 0.35), k);
      pos.set(x, y + k * 0.35, z);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * 6.28);
      m4.compose(pos, q, s);
      const g = r();
      c.setHSL(0.25 + r() * 0.07, 0.42 + r() * 0.2, 0.075 + g * 0.08);
      if (r() < 0.03) c.setHSL(0.12 + r() * 0.06, 0.45, 0.2); // ipês/flores pontuais
      put(rad < 1300);
    }
    // árvores de rua
    const rs = rng(77);
    q.identity();
    for (let i = 0; i < 1400 && nn + nf < count; i++) {
      const x = -650 + rs() * 1150, z = -1900 + rs() * 3800;
      if (!isUrban(x, z)) continue;
      if (Math.abs(x) < 60 && Math.abs(z) < 70) continue;
      const k = 2.2 + rs() * 2.5;
      m4.compose(pos.set(x, GROUND_Y + k * 1.1, z), q, s.set(k, k, k));
      c.setHSL(0.25 + rs() * 0.05, 0.4, 0.2 + rs() * 0.08);
      put(true);
    }
    near.count = nn; far.count = nf;
    for (const t of [near, far]) {
      t.receiveShadow = true;
      t.castShadow = false;
      t.frustumCulled = false;
      scene.add(t);
    }
    world.trees = near;
  }

  // ---------- Cidade ----------
  buildCity(world, quality);

  return world;
}

// ---------------------------------------------------------------------
// Cidade procedural: quadras, lotes, casas com telhado, prédios médios
// e torres altas na orla (como em Meia Praia).
// ---------------------------------------------------------------------
function buildCity(world, quality) {
  const { scene } = world;
  const r = rng(4242);
  const xs = [];
  for (let x = 52; x < 520; x += 105) xs.push(x);
  for (let x = -52; x > -760; x -= 105) xs.unshift(x);
  const zs = [];
  for (let z = 62; z < 2000; z += 86) zs.push(z);
  for (let z = -62; z > -2000; z -= 86) zs.unshift(z);
  const SW = 13; // largura das ruas

  const boxes = []; // {x,z,w,d,h,col,kind}
  const roofs = [];
  const exclude = (x, z, w, d) => Math.abs(x) - w / 2 < 56 && Math.abs(z) - d / 2 < 66;
  const okLot = (x, z, w, d) => {
    for (const [dx, dz] of [[-.5, -.5], [.5, -.5], [-.5, .5], [.5, .5], [0, 0]]) {
      const px = x + dx * w, pz = z + dz * d;
      if (!isUrban(px, pz)) return false;
    }
    return !exclude(x, z, w, d);
  };
  const palette = ['#efe9df', '#e6ddcc', '#d9d4cb', '#f3efe8', '#cfc6b6', '#e8e2d6', '#bdb6aa', '#ded2bd', '#f0e6d2', '#c9c2b8', '#b9c1c4', '#e4d7c4'];
  const tall = ['#e9e6e0', '#d2d0cc', '#c7cdd1', '#a9b3ba', '#efe7da', '#dcd5ca', '#8f9aa3', '#f5f2ec'];

  for (let i = 0; i < xs.length - 1; i++) {
    for (let j = 0; j < zs.length - 1; j++) {
      const x0 = xs[i] + SW / 2, x1 = xs[i + 1] - SW / 2;
      const z0 = zs[j] + SW / 2, z1 = zs[j + 1] - SW / 2;
      if (r() < 0.035) continue; // praças
      const halves = [[x0, (x0 + x1) / 2], [(x0 + x1) / 2, x1]];
      for (const [hx0, hx1] of halves) {
        let z = z0;
        while (z < z1 - 6) {
          const cxm = (hx0 + hx1) / 2;
          const distBeach = coastX(z) - cxm;
          const near = Math.hypot(cxm, z) < 320;
          const pHigh = near ? 0.0 : 0.02 + 0.2 * Math.exp(-Math.max(0, distBeach - 90) / 120);
          const roll = r();
          let kind = roll < pHigh ? 'high' : roll < pHigh + (near ? 0.1 : 0.14) ? 'mid' : 'house';
          let lw = kind === 'high' ? 20 + r() * 14 : kind === 'mid' ? 14 + r() * 10 : 9 + r() * 9;
          lw = Math.min(lw, z1 - z);
          const depth = hx1 - hx0;
          let w, d, h;
          if (kind === 'house') { d = Math.min(depth - 4, 10 + r() * 12); w = lw - 2; h = 3.2 * (1 + Math.floor(r() * 2.4)); }
          else if (kind === 'mid') { d = Math.min(depth - 3, 16 + r() * 14); w = lw - 2.5; h = 3 * (3 + Math.floor(r() * (near ? 5 : 9))); }
          else { d = Math.min(depth - 3, 20 + r() * 12); w = lw - 3; h = 3 * (14 + Math.floor(r() * 18)); }
          if (w < 6) { z += lw; continue; }
          const bx = kind === 'house' ? (r() < 0.5 ? hx0 + 2 + d / 2 : hx1 - 2 - d / 2) : cxm;
          const bz = z + lw / 2;
          if (okLot(bx, bz, d, w)) {
            const pal = kind === 'high' ? tall : palette;
            const col = new THREE.Color(pal[Math.floor(r() * pal.length)]);
            boxes.push({ x: bx, z: bz, w: d, d: w, h, col, kind, seed: r() });
            if (kind === 'house' && r() < 0.62) {
              const rc = new THREE.Color(['#9c4f2e', '#a8603a', '#8a4529', '#b86e44', '#7d756c', '#6e5a4c'][Math.floor(r() * 6)]);
              roofs.push({ x: bx, z: bz, w: d + 0.8, d: w + 0.8, y: GROUND_Y + h, h: 1.6 + r() * 1.4, col: rc });
            }
            if (kind !== 'house' && r() < 0.55) {
              const k = 0.35 + r() * 0.3;
              boxes.push({ x: bx + (r() - 0.5) * d * 0.3, z: bz + (r() - 0.5) * w * 0.3, w: d * k, d: w * k, h: 3 + r() * 3, col: new THREE.Color('#cfcac2'), kind: 'roof', y0: GROUND_Y + h, seed: r() });
            }
          }
          z += lw;
        }
      }
    }
  }

  // Instâncias
  const geo = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  const mat = facadeMaterial({ cellW: 3.1, cellH: 3.0, baseY: GROUND_Y, glass: 0x1b2530, lit: 0.4, roughness: 0.88, slab: 0.0 });
  const mesh = new THREE.InstancedMesh(geo, mat, boxes.length);
  const seeds = new Float32Array(boxes.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
  boxes.forEach((b, i) => {
    const y0 = b.y0 ?? GROUND_Y - 0.6;
    const hh = b.y0 ? b.h : b.h + 0.6;
    p.set(b.x, y0, b.z); s.set(b.w, hh, b.d);
    m4.compose(p, q, s);
    mesh.setMatrixAt(i, m4);
    mesh.setColorAt(i, b.col);
    seeds[i] = b.seed * 100;
  });
  geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  world.city = mesh;
  world.cityBoxes = boxes;

  // Telhados cerâmicos
  const rg = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1).rotateY(Math.PI / 4).translate(0, 0.5, 0);
  const rm = new THREE.MeshStandardMaterial({ roughness: 0.9 });
  const roofMesh = new THREE.InstancedMesh(rg, rm, roofs.length);
  roofs.forEach((b, i) => {
    p.set(b.x, b.y, b.z); s.set(b.w, b.h, b.d);
    m4.compose(p, q, s);
    roofMesh.setMatrixAt(i, m4);
    roofMesh.setColorAt(i, b.col);
  });
  roofMesh.castShadow = true;
  roofMesh.receiveShadow = true;
  scene.add(roofMesh);

  // Ruas (asfalto) + calçadão da orla
  const roadGeo = [];
  const addQuad = (arr, x0, z0, x1, z1, y) => arr.push(x0, y, z0, x0, y, z1, x1, y, z1, x0, y, z0, x1, y, z1, x1, y, z0);
  for (const x of xs) {
    let za = null;
    for (let z = -1960; z <= 1960; z += 20) {
      const ok = isUrban(x, z) || isUrban(x, z + 20);
      if (ok && za === null) za = z;
      if ((!ok || z === 1960) && za !== null) { addQuad(roadGeo, x - SW / 2, za, x + SW / 2, z, GROUND_Y + 0.12); za = null; }
    }
  }
  for (const z of zs) {
    let xa = null;
    for (let x = -780; x <= 520; x += 10) {
      const ok = isUrban(x, z) || x < coastX(z) - 60 && mountainH(x, z) < 1.2 && Math.abs(z) < 1950;
      if (ok && xa === null) xa = x;
      if ((!ok || x === 520) && xa !== null) { addQuad(roadGeo, xa, z - SW / 2, x, z + SW / 2, GROUND_Y + 0.12); xa = null; }
    }
  }
  // Av. beira-mar e calçadão (seguem a curva da praia)
  const prom = [];
  for (let z = -1950; z < 1950; z += 15) {
    const a = coastX(z) - 72, b = coastX(z + 15) - 72;
    const Y = GROUND_Y + 0.12;
    roadGeo.push(a - 8, Y, z, b - 8, Y, z + 15, b + 8, Y, z + 15, a - 8, Y, z, b + 8, Y, z + 15, a + 8, Y, z);
    prom.push(a + 8, Y - 0.02, z, b + 8, Y - 0.02, z + 15, b + 24, Y - 0.02, z + 15, a + 8, Y - 0.02, z, b + 24, Y - 0.02, z + 15, a + 24, Y - 0.02, z);
  }
  const rgeo = new THREE.BufferGeometry();
  rgeo.setAttribute('position', new THREE.Float32BufferAttribute(roadGeo, 3));
  rgeo.computeVertexNormals();
  const road = new THREE.Mesh(rgeo, new THREE.MeshStandardMaterial({ color: 0x3b3c3f, roughness: 0.92, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  road.receiveShadow = true;
  scene.add(road);
  const pgeo = new THREE.BufferGeometry();
  pgeo.setAttribute('position', new THREE.Float32BufferAttribute(prom, 3));
  pgeo.computeVertexNormals();
  const promMesh = new THREE.Mesh(pgeo, new THREE.MeshStandardMaterial({ color: 0xc9bfa9, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  promMesh.receiveShadow = true;
  scene.add(promMesh);

  // Coqueiros na orla
  {
    const trunkG = new THREE.CylinderGeometry(0.22, 0.35, 1, 5).translate(0, 0.5, 0);
    const leafG = palmCrown();
    const N = 260;
    const trunks = new THREE.InstancedMesh(trunkG, new THREE.MeshStandardMaterial({ color: 0x7a6a55, roughness: 1 }), N);
    const leaves = new THREE.InstancedMesh(leafG, new THREE.MeshStandardMaterial({ color: 0x3f6a2a, roughness: 0.9, side: THREE.DoubleSide }), N);
    let k = 0;
    for (let z = -1900; z < 1900 && k < N; z += 15) {
      const x = coastX(z) - 52 + (r() - 0.5) * 6;
      const h = 7 + r() * 4;
      m4.compose(p.set(x, GROUND_Y, z), q, s.set(1, h, 1)); trunks.setMatrixAt(k, m4);
      m4.compose(p.set(x, GROUND_Y + h, z), q, s.set(1, 1, 1)); leaves.setMatrixAt(k, m4);
      k++;
    }
    trunks.count = leaves.count = k;
    trunks.castShadow = leaves.castShadow = true;
    scene.add(trunks, leaves);
  }

  // Postes (pontos de luz à noite)
  {
    const pos = [];
    for (const x of xs) for (let z = -1950; z < 1950; z += 32) if (isUrban(x + 8, z)) pos.push(x + SW / 2 + 0.5, GROUND_Y + 8, z);
    for (const z of zs) for (let x = -760; x < 500; x += 32) if (isUrban(x, z + 8)) pos.push(x, GROUND_Y + 8, z + SW / 2 + 0.5);
    for (let z = -1950; z < 1950; z += 26) pos.push(coastX(z) - 72 + 9, GROUND_Y + 9, z);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const m = new THREE.PointsMaterial({ map: glowTexture(), color: 0xffc98a, size: 26, sizeAttenuation: true, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    const pts = new THREE.Points(g, m);
    scene.add(pts);
    world.streetLights = pts;
  }

  // Carros
  {
    const N = quality.level === 'low' ? 120 : 320;
    const cg = new THREE.BoxGeometry(4.3, 1.45, 1.8).translate(0, 0.72 + GROUND_Y + 0.12, 0);
    const cars = new THREE.InstancedMesh(cg, new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.5 }), N);
    const list = [];
    const carCols = ['#f2f2f2', '#1b1b1b', '#8e9396', '#b8bcc0', '#7a1f1f', '#203a63', '#d8d8d8', '#3b3b3b'];
    for (let i = 0; i < N; i++) {
      const axis = r() < 0.5 ? 'x' : 'z';
      let line, a0, a1;
      if (axis === 'z') { line = xs[Math.floor(r() * xs.length)]; a0 = -1900; a1 = 1900; }
      else { line = zs[Math.floor(r() * zs.length)]; a0 = -760; a1 = 480; }
      const dir = r() < 0.5 ? 1 : -1;
      list.push({ axis, line: line + dir * 3, a0, a1, t: r(), v: (8 + r() * 8) * dir / (a1 - a0) });
      cars.setColorAt(i, new THREE.Color(carCols[Math.floor(r() * carCols.length)]));
    }
    cars.castShadow = true;
    cars.frustumCulled = false;
    scene.add(cars);
    const rotZ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
    const one = new THREE.Vector3(1, 1, 1);
    world.updaters.push((dt) => {
      list.forEach((c, i) => {
        c.t = (c.t + c.v * dt + 1) % 1;
        const a = c.a0 + (c.a1 - c.a0) * c.t;
        let x, z;
        if (c.axis === 'z') { x = c.line; z = a; } else { x = a; z = c.line; }
        const vis = isUrban(x, z) || (c.axis === 'x' && x < coastX(z) - 60 && mountainH(x, z) < 1.2);
        p.set(x, vis ? 0 : -50, z);
        m4.compose(p, c.axis === 'z' ? rotZ : q, one);
        cars.setMatrixAt(i, m4);
      });
      cars.instanceMatrix.needsUpdate = true;
    });
  }
}

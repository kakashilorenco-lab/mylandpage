import * as THREE from 'three';

export const shared = {
  uNight: { value: 0 },  // 0 = dia, 1 = noite (janelas acesas)
  uTime: { value: 0 },
};

const HASH = /* glsl */ `
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(hash12(i), hash12(i+vec2(1,0)), f.x), mix(hash12(i+vec2(0,1)), hash12(i+vec2(1,1)), f.x), f.y); }
`;

const WORLD_VERT_PARS = /* glsl */ `
varying vec3 vWPos;
varying vec3 vWN;
varying float vSeed;
attribute float aSeed;
`;

const WORLD_VERT = /* glsl */ `
{
  vec4 _wp = vec4(transformed, 1.0);
  vec3 _n = objectNormal;
  #ifdef USE_INSTANCING
    _wp = instanceMatrix * _wp;
    _n = mat3(instanceMatrix) * _n;
  #endif
  _wp = modelMatrix * _wp;
  vWPos = _wp.xyz;
  vWN = normalize(mat3(modelMatrix) * _n);
  #ifdef HAS_SEED
    vSeed = aSeed;
  #else
    vSeed = 0.0;
  #endif
}
`;

/**
 * Material de fachada com janelas procedurais (dia: vidro reflexivo, noite: luzes acesas).
 * opts: cellW, cellH, baseY, glass (cor), lit (fração de janelas acesas), slab (faixa de laje), seed (bool), winX/winY (proporção da janela)
 */
export function facadeMaterial(opts = {}) {
  const o = Object.assign({
    color: 0xffffff, cellW: 3.2, cellH: 3.0, baseY: 2.0, glass: 0x1a232b, lit: 0.42,
    slab: 0.0, slabColor: 0xd6d2ca, winX: [0.14, 0.86], winY: [0.3, 0.88], seed: true,
    roughness: 0.85, glassRough: 0.12, vertexColors: false, emissiveBoost: 1.0,
  }, opts);
  const m = new THREE.MeshStandardMaterial({ color: o.color, roughness: o.roughness, metalness: 0.0, vertexColors: o.vertexColors });
  m.userData.uniforms = {
    uCell: { value: new THREE.Vector2(o.cellW, o.cellH) },
    uBaseY: { value: o.baseY },
    uGlass: { value: new THREE.Color(o.glass) },
    uLit: { value: o.lit },
    uSlab: { value: o.slab },
    uSlabColor: { value: new THREE.Color(o.slabColor) },
    uWin: { value: new THREE.Vector4(o.winX[0], o.winX[1], o.winY[0], o.winY[1]) },
    uGlassRough: { value: o.glassRough },
    uBoost: { value: o.emissiveBoost },
  };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, m.userData.uniforms, { uNight: shared.uNight });
    if (o.seed) sh.defines = Object.assign(sh.defines || {}, { HAS_SEED: '' });
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\n' + WORLD_VERT_PARS)
      .replace('#include <project_vertex>', '#include <project_vertex>\n' + WORLD_VERT);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vWPos; varying vec3 vWN; varying float vSeed;
        uniform vec2 uCell; uniform float uBaseY; uniform vec3 uGlass; uniform float uLit; uniform float uNight;
        uniform float uSlab; uniform vec3 uSlabColor; uniform vec4 uWin; uniform float uGlassRough; uniform float uBoost;
        ${HASH}
        float gWin; float gLit; float gSlab; float gRnd;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        {
          vec3 n = normalize(vWN);
          float facade = 1.0 - smoothstep(0.45, 0.6, abs(n.y));
          float along = abs(n.x) > abs(n.z) ? vWPos.z * sign(n.x) : -vWPos.x * sign(n.z);
          vec2 g = vec2(along / uCell.x, (vWPos.y - uBaseY) / uCell.y);
          vec2 cell = floor(g);
          vec2 f = fract(g);
          float aa = clamp(1.0 - max(fwidth(g.x), fwidth(g.y)) * 1.6, 0.0, 1.0);
          float w = smoothstep(uWin.x - 0.03, uWin.x, f.x) * (1.0 - smoothstep(uWin.y, uWin.y + 0.03, f.x))
                  * smoothstep(uWin.z - 0.03, uWin.z, f.y) * (1.0 - smoothstep(uWin.w, uWin.w + 0.03, f.y));
          float cover = (uWin.y - uWin.x) * (uWin.w - uWin.z);
          w = mix(cover, w, aa) * facade * step(0.0, g.y);
          gRnd = hash12(cell + vec2(vSeed * 13.7, vSeed * 7.1) + floor(n.xz * 3.0) * 17.0);
          float slab = uSlab > 0.0 ? (1.0 - smoothstep(uSlab, uSlab + 0.04, f.y)) : 0.0;
          slab = mix(uSlab, slab, aa) * facade * step(0.0, g.y);
          gSlab = slab;
          float curtain = step(0.72, gRnd) * 0.5;
          vec3 glass = uGlass * (0.85 + 0.3 * gRnd) + curtain * vec3(0.35, 0.32, 0.28);
          diffuseColor.rgb = mix(diffuseColor.rgb, uSlabColor, slab);
          diffuseColor.rgb = mix(diffuseColor.rgb, glass, w * (1.0 - slab));
          // variação sutil de sujeira/idade
          diffuseColor.rgb *= 0.92 + 0.08 * vnoise(vWPos.xz * 0.15 + vWPos.y * 0.2);
          gWin = w * (1.0 - slab);
          float litMask = step(gRnd, uLit);
          gLit = mix(uLit * cover, litMask * w, aa) * (1.0 - slab);
        }`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, uGlassRough, gWin);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        {
          vec3 warm = mix(vec3(1.0, 0.72, 0.42), vec3(1.0, 0.9, 0.75), hash12(vec2(gRnd, 3.1)));
          totalEmissiveRadiance += warm * gLit * uNight * 1.25 * uBoost;
        }`);
  };
  m.customProgramCacheKey = () => 'facade' + (o.seed ? 1 : 0);
  return m;
}

/** Terreno: cor por vértice + ruído de detalhe no fragmento */
export function terrainMaterial() {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96, metalness: 0 });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\n' + WORLD_VERT_PARS)
      .replace('#include <project_vertex>', '#include <project_vertex>\n' + WORLD_VERT);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vWPos; varying vec3 vWN; varying float vSeed; ${HASH}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        {
          float n1 = vnoise(vWPos.xz * 0.045);
          float n2 = vnoise(vWPos.xz * 0.21 + 7.0);
          float n3 = vnoise(vWPos.xz * 0.9 + 3.0);
          diffuseColor.rgb *= 0.78 + 0.22 * n1 + 0.12 * (n2 - 0.5) + 0.08 * (n3 - 0.5);
        }`);
  };
  m.customProgramCacheKey = () => 'terrain';
  return m;
}

/** Textura de normal para a água (tileável) */
export function waterNormalTexture(size = 256) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  const H = new Float32Array(size * size);
  const waves = [];
  for (let i = 0; i < 26; i++) {
    const kx = Math.round((Math.random() * 2 - 1) * 9), ky = Math.round((Math.random() * 2 - 1) * 9);
    if (!kx && !ky) continue;
    waves.push([kx, ky, Math.random() * 6.28, 1 / Math.hypot(kx, ky)]);
  }
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let h = 0;
    for (const [kx, ky, p, a] of waves) h += Math.sin(((kx * x + ky * y) / size) * 6.2832 + p) * a;
    H[y * size + x] = h;
  }
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = H[y * size + ((x + 1) % size)] - H[y * size + ((x - 1 + size) % size)];
    const dy = H[((y + 1) % size) * size + x] - H[((y - 1 + size) % size) * size + x];
    const v = new THREE.Vector3(-dx * 2.2, -dy * 2.2, 1).normalize();
    const i = (y * size + x) * 4;
    img.data[i] = (v.x * 0.5 + 0.5) * 255;
    img.data[i + 1] = (v.y * 0.5 + 0.5) * 255;
    img.data[i + 2] = (v.z * 0.5 + 0.5) * 255;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Textura radial suave para pontos de luz */
export function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.18, 'rgba(255,236,200,0.85)');
  g.addColorStop(0.45, 'rgba(255,190,120,0.18)');
  g.addColorStop(1, 'rgba(255,170,90,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Textura de piso de madeira (interiores) */
export function woodTexture(w = 1024, h = 1024) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  const plankW = w / 6, plankH = h / 2.5;
  for (let i = 0; i < 6; i++) {
    let y = -Math.random() * plankH;
    while (y < h) {
      const L = 48 + Math.random() * 14;
      ctx.fillStyle = `hsl(${30 + Math.random() * 6}, ${38 + Math.random() * 10}%, ${L}%)`;
      ctx.fillRect(i * plankW, y, plankW, plankH);
      for (let k = 0; k < 40; k++) {
        ctx.strokeStyle = `rgba(80,50,25,${Math.random() * 0.08})`;
        ctx.lineWidth = 1 + Math.random() * 2;
        const xx = i * plankW + Math.random() * plankW;
        ctx.beginPath(); ctx.moveTo(xx, y); ctx.bezierCurveTo(xx + 6, y + plankH * 0.3, xx - 6, y + plankH * 0.6, xx + 3, y + plankH); ctx.stroke();
      }
      ctx.fillStyle = 'rgba(60,35,15,0.35)';
      ctx.fillRect(i * plankW, y, plankW, 2);
      ctx.fillRect(i * plankW, y, 2, plankH);
      y += plankH;
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

/** Placa/letreiro com o nome do empreendimento */
export function signTexture(text, sub = '', w = 1024, h = 256, color = '#ffffff') {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 ${Math.round(h * 0.5)}px "Anton", "Oswald", Impact, sans-serif`;
  ctx.fillText(text, w / 2, sub ? h * 0.42 : h / 2);
  if (sub) {
    ctx.font = `600 ${Math.round(h * 0.16)}px "Inter", Arial, sans-serif`;
    ctx.fillText(sub, w / 2, h * 0.82);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Copas de árvore com ruído de folhagem (quebra o aspecto de "bola") */
export function foliageMaterial(color) {
  const m = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0, color: color ?? 0xffffff });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\n' + WORLD_VERT_PARS)
      .replace('#include <project_vertex>', '#include <project_vertex>\n' + WORLD_VERT);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vWPos; varying vec3 vWN; varying float vSeed; ${HASH}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        {
          float a = vnoise(vWPos.xz * 0.9 + vWPos.y * 0.7);
          float b = vnoise(vWPos.xy * 1.7 + vWPos.z * 0.5 + 9.0);
          float leaf = a * 0.6 + b * 0.4;
          diffuseColor.rgb *= 0.55 + 0.75 * leaf;
          diffuseColor.rgb *= 0.75 + 0.35 * clamp(vWN.y, 0.0, 1.0);
        }`);
  };
  m.customProgramCacheKey = () => 'foliage';
  return m;
}

/** Copa de coqueiro: folhas longas arqueadas em volta do tronco */
export function palmCrown() {
  const geos = [];
  const N = 9;
  for (let i = 0; i < N; i++) {
    const g = new THREE.PlaneGeometry(0.7, 3.4, 1, 4);
    g.translate(0, 1.7, 0);
    const p = g.attributes.position;
    for (let k = 0; k < p.count; k++) {
      const y = p.getY(k);
      p.setZ(k, -0.12 * y * y);
      p.setX(k, p.getX(k) * (1 - y / 3.6));
    }
    g.rotateX(-Math.PI / 2 + 0.35);
    g.rotateY((i / N) * Math.PI * 2 + (i % 2) * 0.2);
    geos.push(g);
  }
  let total = 0; geos.forEach((g) => (total += g.attributes.position.count));
  const pos = new Float32Array(total * 3); const idx = [];
  let off = 0;
  geos.forEach((g) => {
    pos.set(g.attributes.position.array, off * 3);
    g.index.array.forEach((v) => idx.push(v + off));
    off += g.attributes.position.count;
  });
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setIndex(idx);
  out.computeVertexNormals();
  return out;
}

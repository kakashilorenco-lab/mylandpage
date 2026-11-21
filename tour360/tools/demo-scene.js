// Gera um apartamento 3D decorado e renderiza panoramas 360° (equirretangulares)
// para o tour de demonstração. Uso: abrir tools/gerar-demo.html (feito uma vez).
import * as THREE from 'three';
import { Sky } from '../vendor/three/addons/Sky.js';
import { woodTexture, facadeMaterial, shared } from './materials.js';

export const FLOOR_Y = 32; // apartamento no 11º andar (vista da cidade)
export const H = 2.7;

// Cômodos (x0, z0, x1, z1) em metros — mesmos usados no tour.json
export const ROOMS = [
  { id: 'sala', nome: 'Sala e cozinha', r: [0, 0, 9, 7] },
  { id: 'corredor', nome: 'Corredor', r: [5.6, 7, 7, 10.5] },
  { id: 'suite', nome: 'Suíte', r: [0, 7, 5.6, 11] },
  { id: 'banho', nome: 'Banheiro', r: [7, 7, 9, 10.5] },
  { id: 'varanda', nome: 'Varanda', r: [1, -2, 8, 0], aberto: true },
];
export const POINTS = [
  { id: 'p1', nome: 'Sala', x: 6.4, z: 2.6, room: 'sala' },
  { id: 'p2', nome: 'Cozinha e jantar', x: 4.0, z: 4.0, room: 'sala' },
  { id: 'p3', nome: 'Varanda', x: 4.6, z: -1.0, room: 'varanda' },
  { id: 'p4', nome: 'Corredor', x: 6.3, z: 8.6, room: 'corredor' },
  { id: 'p5', nome: 'Suíte', x: 4.3, z: 8.25, room: 'suite' },
  { id: 'p6', nome: 'Banheiro', x: 8.0, z: 9.3, room: 'banho' },
];

export function buildScene(renderer) {
  const scene = new THREE.Scene();
  const Y = FLOOR_Y;
  const mat = (o) => new THREE.MeshStandardMaterial(o);
  const wood = woodTexture(); wood.repeat.set(4, 4);
  const M = {
    floor: mat({ map: wood, roughness: 0.4 }), wall: mat({ color: 0xf0ebe3, roughness: 0.95 }), ceil: mat({ color: 0xfbf9f5, roughness: 1 }),
    tile: mat({ color: 0xd9d6d0, roughness: 0.35 }), cab: mat({ color: 0xc89f74, roughness: 0.5 }), quartz: mat({ color: 0xf4f2ee, roughness: 0.2 }),
    black: mat({ color: 0x1a1a1a, roughness: 0.35, metalness: 0.4 }), steel: mat({ color: 0xcccccc, roughness: 0.2, metalness: 0.9 }),
    fabric: mat({ color: 0xd9cfbf, roughness: 1 }), fabric2: mat({ color: 0x7c8f86, roughness: 1 }), rug: mat({ color: 0xcbbca5, roughness: 1 }),
    table: mat({ color: 0x9c6f4a, roughness: 0.45 }), frame: mat({ color: 0x2a2a2a, roughness: 0.4, metalness: 0.6 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.02, transparent: true, opacity: 0.1, depthWrite: false }),
    plant: mat({ color: 0x3f6b33, roughness: 0.9 }), pot: mat({ color: 0xd8cbb8, roughness: 0.9 }),
    lamp: mat({ color: 0xfff1d6, emissive: 0xffd9a0, emissiveIntensity: 2.2 }), art: mat({ color: 0xc46f4b, roughness: 0.9 }),
    art2: mat({ color: 0x35566b, roughness: 0.9 }), bed: mat({ color: 0xf5f3ef, roughness: 1 }), headboard: mat({ color: 0x8c6a4f, roughness: 0.8 }),
    mirror: mat({ color: 0xbfd0d8, roughness: 0.02, metalness: 1 }), deck: mat({ color: 0xa27c58, roughness: 0.8 }), tv: mat({ color: 0x0b0b0b, roughness: 0.15 }),
  };
  const g = new THREE.Group();
  g.position.y = Y;
  scene.add(g);
  const box = (w, h, d, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y + h / 2, z); o.castShadow = o.receiveShadow = true; g.add(o); return o; };
  const cyl = (rt, rb, h, m, x, y, z, s = 16) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, s), m); o.position.set(x, y + h / 2, z); o.castShadow = o.receiveShadow = true; g.add(o); return o; };
  const T = 0.14;
  // pisos e tetos
  for (const rm of ROOMS) {
    const [x0, z0, x1, z1] = rm.r;
    const fm = rm.id === 'banho' ? M.tile : rm.id === 'varanda' ? M.deck : M.floor;
    box(x1 - x0, 0.1, z1 - z0, fm, (x0 + x1) / 2, -0.1, (z0 + z1) / 2);
    if (!rm.aberto) { const c = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(Math.PI / 2), M.ceil); c.position.set((x0 + x1) / 2, H, (z0 + z1) / 2); g.add(c); }
  }
  // paredes (com vãos de portas e janelas)
  const wallX = (x, z0, z1, gaps = []) => { let z = z0; for (const [a, b, top = H, bot = 0] of [...gaps, [z1, z1]].sort((p, q) => p[0] - q[0])) { if (a > z) box(T, H, a - z, M.wall, x, 0, (z + a) / 2); if (b > a) { if (top < H) box(T, H - top, b - a, M.wall, x, top, (a + b) / 2); if (bot > 0) box(T, bot, b - a, M.wall, x, 0, (a + b) / 2); } z = b; } };
  const wallZ = (z, x0, x1, gaps = []) => { let x = x0; for (const [a, b, top = H, bot = 0] of [...gaps, [x1, x1]].sort((p, q) => p[0] - q[0])) { if (a > x) box(a - x, H, T, M.wall, (x + a) / 2, 0, z); if (b > a) { if (top < H) box(b - a, H - top, T, M.wall, (a + b) / 2, top, z); if (bot > 0) box(b - a, bot, T, M.wall, (a + b) / 2, 0, z); } x = b; } };
  wallZ(0, 0, 9, [[0.5, 8.5, 2.5]]);           // fachada com porta de correr
  wallX(0, 0, 7); wallX(9, 0, 7);
  wallZ(7, 0, 9, [[5.75, 6.85, 2.15]]);         // passagem sala → corredor
  wallX(0, 7, 11, [[8.0, 10.0, 2.1, 0.9]]);     // janela da suíte
  wallZ(11, 0, 5.6);
  wallX(5.6, 7, 11, [[8.1, 9.0, 2.1]]);         // porta da suíte
  wallX(7, 7, 10.5, [[7.5, 8.3, 2.1]]);         // porta do banheiro
  wallX(9, 7, 10.5, [[8.8, 9.8, 2.1, 1.4]]);    // janelinha do banheiro
  wallZ(10.5, 5.6, 9);
  // vidros e caixilhos
  const glassZ = (z, x0, x1, y0, y1) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, y1 - y0), M.glass); p.position.set((x0 + x1) / 2, Y + (y0 + y1) / 2, z); scene.add(p); for (let x = x0; x <= x1 + 0.01; x += (x1 - x0) / 4) box(0.05, y1 - y0, 0.08, M.frame, x, y0, z); };
  const glassX = (x, z0, z1, y0, y1) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(z1 - z0, y1 - y0).rotateY(Math.PI / 2), M.glass); p.position.set(x, Y + (y0 + y1) / 2, (z0 + z1) / 2); scene.add(p); box(0.08, 0.05, z1 - z0, M.frame, x, y0, (z0 + z1) / 2); box(0.08, 0.05, z1 - z0, M.frame, x, y1, (z0 + z1) / 2); };
  glassZ(0, 0.5, 8.5, 0, 2.5);
  glassX(0, 8.0, 10.0, 0.9, 2.1);
  glassX(9, 8.8, 9.8, 1.4, 2.1);
  // varanda
  const rail = new THREE.Mesh(new THREE.BoxGeometry(7, 1.05, 0.03), M.glass); rail.position.set(4.5, Y + 0.55, -2); scene.add(rail);
  box(7, 0.05, 0.06, M.frame, 4.5, 1.05, -2);
  box(0.6, 0.45, 0.6, M.fabric, 2.4, 0, -1.2); box(0.6, 0.45, 0.6, M.fabric, 3.6, 0, -1.2); cyl(0.3, 0.3, 0.5, M.table, 3.0, 0, -1.5);
  cyl(0.2, 0.15, 0.45, M.pot, 7.4, 0, -1.5); { const l = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 1), M.plant); l.position.set(7.4, Y + 0.9, -1.5); scene.add(l); }

  // ---- Sala: estar ----
  box(3.6, 0.02, 2.6, M.rug, 6.4, 0, 2.7);
  box(2.8, 0.42, 1.0, M.fabric, 6.4, 0.05, 4.1); box(2.8, 0.85, 0.25, M.fabric, 6.4, 0.05, 4.55); box(0.22, 0.62, 1.0, M.fabric, 4.95, 0.05, 4.1); box(0.22, 0.62, 1.0, M.fabric, 7.85, 0.05, 4.1);
  for (const x of [5.7, 6.4, 7.1]) box(0.55, 0.42, 0.18, M.fabric2, x, 0.47, 4.35);
  box(1.1, 0.35, 0.7, M.table, 6.4, 0, 2.9); cyl(0.1, 0.12, 0.14, M.pot, 6.2, 0.35, 2.8);
  box(0.85, 0.42, 0.85, M.fabric2, 8.2, 0.05, 1.6); box(0.18, 0.75, 0.85, M.fabric2, 8.6, 0.05, 1.6);
  box(0.08, 2.0, 3.0, M.cab, 8.93, 0.3, 3.2); box(0.05, 0.85, 1.5, M.tv, 8.86, 1.0, 3.2); box(0.45, 0.35, 2.6, M.cab, 8.7, 0.12, 3.2);
  // ---- Cozinha e jantar ----
  box(0.62, 0.88, 3.4, M.cab, 0.32, 0.08, 5.2); box(0.66, 0.04, 3.4, M.quartz, 0.34, 0.96, 5.2); box(0.36, 0.8, 3.0, M.cab, 0.18, 1.65, 5.2);
  box(0.7, 2.5, 1.0, M.cab, 0.36, 0, 6.45); box(0.5, 0.02, 0.8, M.black, 0.36, 1.0, 5.6); box(0.42, 0.03, 0.6, M.steel, 0.36, 0.985, 4.4);
  box(2.4, 0.9, 1.0, M.cab, 2.3, 0, 5.4); box(2.6, 0.05, 1.15, M.quartz, 2.3, 0.9, 5.4);
  for (const x of [1.5, 2.3, 3.1]) { cyl(0.2, 0.2, 0.06, M.fabric2, x, 0.7, 4.65); cyl(0.02, 0.02, 0.7, M.black, x, 0, 4.65, 6); }
  for (const x of [1.7, 2.9]) { cyl(0.004, 0.004, 0.9, M.black, x, H - 0.9, 5.4, 4); cyl(0.12, 0.16, 0.22, M.lamp, x, H - 1.12, 5.4); }
  box(2.0, 0.04, 0.95, M.table, 2.4, 0.74, 2.5);
  for (const [x, z] of [[1.55, 2.15], [3.25, 2.15], [1.55, 2.85], [3.25, 2.85]]) box(0.06, 0.74, 0.06, M.black, x, 0, z);
  for (const x of [1.8, 2.4, 3.0]) for (const s of [-1, 1]) { box(0.45, 0.06, 0.45, M.fabric, x, 0.45, 2.5 + s * 0.78); box(0.42, 0.45, 0.06, M.fabric, x, 0.45, 2.5 + s * 1.0); }
  box(1.6, 0.08, 0.12, M.lamp, 2.4, H - 1.15, 2.5); cyl(0.005, 0.005, 1.1, M.black, 2.4, H - 1.1, 2.5, 4);
  box(1.4, 0.95, 0.04, M.art, 2.4, 1.2, 6.92);
  for (const [x, z, k] of [[0.6, 0.6, 1.2], [8.5, 6.4, 1.0]]) { cyl(0.22 * k, 0.17 * k, 0.45 * k, M.pot, x, 0, z); const l = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42 * k, 1), M.plant); l.position.set(x, Y + 0.9 * k, z); l.scale.y = 1.5; scene.add(l); }
  // ---- Suíte ----
  box(2.0, 0.45, 2.1, M.bed, 2.8, 0.15, 9.9); box(2.0, 0.25, 0.9, M.fabric2, 2.8, 0.6, 9.4); box(2.3, 1.2, 0.1, M.headboard, 2.8, 0.15, 10.93);
  for (const x of [2.3, 3.3]) box(0.6, 0.15, 0.35, M.bed, x, 0.6, 10.6);
  for (const x of [1.35, 4.25]) { box(0.5, 0.5, 0.45, M.cab, x, 0, 10.7); cyl(0.1, 0.14, 0.3, M.lamp, x, 0.5, 10.7); }
  box(3.6, 2.4, 0.6, M.cab, 2.6, 0, 7.35); box(0.04, 0.9, 1.3, M.art2, 0.09, 1.2, 9.0);
  box(2.4, 0.02, 1.6, M.rug, 2.8, 0, 8.6);
  // ---- Banheiro ----
  box(1.4, 0.85, 0.55, M.cab, 8.0, 0, 7.35); box(1.45, 0.05, 0.58, M.quartz, 8.0, 0.85, 7.35); box(1.2, 0.8, 0.03, M.mirror, 8.0, 1.2, 7.1);
  const sg = new THREE.Mesh(new THREE.PlaneGeometry(2, 2.1).rotateY(0), M.glass); sg.position.set(8.0, Y + 1.05, 9.6); scene.add(sg);
  box(0.4, 0.4, 0.6, M.quartz, 8.55, 0, 8.7); cyl(0.12, 0.12, 0.02, M.steel, 8.0, 2.15, 10.1);

  // ---- Luzes ----
  const sun = new THREE.DirectionalLight(0xfff1dc, 3.3);
  sun.position.set(-40, Y + 60, -50); sun.target.position.set(4.5, Y, 4);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 10, far: 200 });
  sun.shadow.bias = -0.0004;
  scene.add(sun, sun.target);
  scene.add(new THREE.HemisphereLight(0xdfeaff, 0x7a6a58, 0.55));
  for (const [x, z, i] of [[4.5, 3.5, 9], [2.8, 9.2, 6], [8, 8.6, 4], [6.3, 8.8, 3]]) { const l = new THREE.PointLight(0xffe2bd, i, 9, 1.6); l.position.set(x, Y + H - 0.25, z); scene.add(l); }

  // ---- Lá fora: céu e cidade ----
  const sky = new Sky(); sky.scale.setScalar(5000);
  const su = sky.material.uniforms; su.turbidity.value = 3; su.rayleigh.value = 1.2; su.mieCoefficient.value = 0.004; su.mieDirectionalG.value = 0.85;
  su.sunPosition.value.set(-0.45, 0.55, -0.7);
  scene.add(sky);
  const pm = new THREE.PMREMGenerator(renderer);
  const es = new THREE.Scene(); const s2 = new Sky(); s2.scale.setScalar(50); Object.keys(su).forEach((k) => s2.material.uniforms[k].value = su[k].value); es.add(s2);
  scene.environment = pm.fromScene(es, 0, 0.1, 100).texture;
  scene.environmentIntensity = 0.5;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000).rotateX(-Math.PI / 2), mat({ color: 0x6f6c65, roughness: 1 }));
  scene.add(ground);
  const bm = facadeMaterial({ cellW: 3.2, cellH: 3, baseY: 0, glass: 0x1c2630, lit: 0.4 });
  const N = 900, ig = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  const inst = new THREE.InstancedMesh(ig, bm, N);
  const seeds = new Float32Array(N);
  let k = 0; const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), c = new THREE.Color();
  const pal = ['#e9e5dd', '#d8d3ca', '#c9c4bb', '#b8bcc0', '#dcd2c2', '#a9b1b8'];
  for (let i = 0; k < N && i < 5000; i++) {
    const a = Math.random() * Math.PI * 2, r = 40 + Math.pow(Math.random(), 0.7) * 1400;
    const x = 4.5 + Math.cos(a) * r, z = 4 + Math.sin(a) * r;
    if (Math.abs(x - 4.5) < 30 && Math.abs(z - 4) < 30) continue;
    const h = r < 120 ? 10 + Math.random() * 25 : 8 + Math.random() * (Math.random() < 0.3 ? 90 : 35);
    inst.setMatrixAt(k, m4.compose(p.set(x, 0, z), q, s.set(16 + Math.random() * 20, h, 16 + Math.random() * 18)));
    inst.setColorAt(k, c.set(pal[k % pal.length])); seeds[k] = Math.random() * 100; k++;
  }
  ig.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1));
  scene.add(inst);
  // o próprio prédio (por fora do apartamento)
  const own = new THREE.Mesh(new THREE.BoxGeometry(26, FLOOR_Y + 30, 24).translate(4.5, (FLOOR_Y + 30) / 2 - 0.2, 5), bm);
  own.scale.set(1, 1, 1);
  // laje inferior/superior para não ver o vazio
  box(30, 0.3, 26, M.wall, 4.5, -0.45, 4.5); box(30, 0.3, 26, M.wall, 4.5, H + 0.02, 4.5);
  scene.fog = new THREE.Fog(0xc9d6e2, 200, 2600);
  return scene;
}

// Renderiza um panorama equirretangular a partir de um ponto
export function renderPano(renderer, scene, pos, width = 3072) {
  const cubeRT = new THREE.WebGLCubeRenderTarget(Math.round(width / 3), { type: THREE.HalfFloatType });
  const cam = new THREE.CubeCamera(0.05, 6000, cubeRT);
  cam.position.copy(pos);
  scene.add(cam);
  cam.update(renderer, scene);
  scene.remove(cam);
  const W = width, Hh = width / 2;
  const rt = new THREE.WebGLRenderTarget(W, Hh);
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms: { env: { value: cubeRT.texture }, flipX: { value: window.__flipX ?? 1 }, exposure: { value: window.__exposure ?? 0.66 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    // mesma convenção do visualizador: u = 0.5 olha para -Z; u cresce no sentido horário (para +X)
    fragmentShader: `uniform samplerCube env; uniform float flipX; uniform float exposure; varying vec2 vUv;
      vec3 RRTAndODTFit(vec3 v){ vec3 a = v * (v + 0.0245786) - 0.000090537; vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081; return a / b; }
      vec3 aces(vec3 color){
        const mat3 IM = mat3(vec3(0.59719, 0.07600, 0.02840), vec3(0.35458, 0.90834, 0.13383), vec3(0.04823, 0.01566, 0.83777));
        const mat3 OM = mat3(vec3(1.60475, -0.10208, -0.00327), vec3(-0.53108, 1.10813, -0.07276), vec3(-0.07367, -0.00605, 1.07602));
        color *= exposure / 0.6; color = IM * color; color = RRTAndODTFit(color); color = OM * color; return clamp(color, 0.0, 1.0);
      }
      vec3 toSRGB(vec3 c){ return mix(c * 12.92, 1.055 * pow(c, vec3(1.0/2.4)) - 0.055, step(vec3(0.0031308), c)); }
      void main(){
        float lon = (vUv.x - 0.5) * 6.2831853; float lat = (vUv.y - 0.5) * 3.1415926;
        vec3 d = vec3(sin(lon) * cos(lat), sin(lat), -cos(lon) * cos(lat));
        vec3 c = textureCube(env, vec3(flipX * d.x, d.y, d.z)).rgb;
        gl_FragColor = vec4(toSRGB(aces(c)), 1.0);
      }`,
  }));
  const s = new THREE.Scene(); s.add(quad);
  const oc = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  renderer.setRenderTarget(rt); renderer.render(s, oc); renderer.setRenderTarget(null);
  const buf = new Uint8Array(W * Hh * 4);
  renderer.readRenderTargetPixels(rt, 0, 0, W, Hh, buf);
  const cv = document.createElement('canvas'); cv.width = W; cv.height = Hh;
  const ctx = cv.getContext('2d'); const img = ctx.createImageData(W, Hh);
  for (let y = 0; y < Hh; y++) img.data.set(buf.subarray((Hh - 1 - y) * W * 4, (Hh - y) * W * 4), y * W * 4);
  ctx.putImageData(img, 0, 0);
  cubeRT.dispose(); rt.dispose();
  return cv.toDataURL('image/jpeg', 0.86);
}

import * as THREE from 'three';
import { woodTexture } from './materials.js';

// Apartamento decorado montado DENTRO da torre, na posição real da unidade.
// A vista pela janela é a cena 3D real -> "vista real" daquele andar.
let mats = null;
function getMats() {
  if (mats) return mats;
  const woodFloor = woodTexture();
  woodFloor.repeat.set(5, 3.2);
  const cabTex = woodTexture(512, 512);
  cabTex.repeat.set(1, 1);
  mats = {
    floor: new THREE.MeshStandardMaterial({ map: woodFloor, roughness: 0.42, metalness: 0 }),
    wall: new THREE.MeshStandardMaterial({ color: 0xf1ece4, roughness: 0.95 }),
    ceiling: new THREE.MeshStandardMaterial({ color: 0xfbf9f5, roughness: 1 }),
    cab: new THREE.MeshStandardMaterial({ map: cabTex, color: 0xe8c9a2, roughness: 0.55 }),
    quartz: new THREE.MeshStandardMaterial({ color: 0xf4f2ee, roughness: 0.18 }),
    black: new THREE.MeshStandardMaterial({ color: 0x161616, roughness: 0.35, metalness: 0.4 }),
    steel: new THREE.MeshStandardMaterial({ color: 0xc8c8c8, roughness: 0.2, metalness: 0.9 }),
    fabric: new THREE.MeshStandardMaterial({ color: 0xd9cfbf, roughness: 1 }),
    fabric2: new THREE.MeshStandardMaterial({ color: 0x8a6e55, roughness: 1 }),
    rug: new THREE.MeshStandardMaterial({ color: 0xcbbca5, roughness: 1 }),
    table: new THREE.MeshStandardMaterial({ map: cabTex, color: 0xb88a5f, roughness: 0.45 }),
    frame: new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.4, metalness: 0.6 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.02, metalness: 0, transparent: true, opacity: 0.08, depthWrite: false }),
    plant: new THREE.MeshStandardMaterial({ color: 0x3f6b33, roughness: 0.9 }),
    pot: new THREE.MeshStandardMaterial({ color: 0xd8cbb8, roughness: 0.9 }),
    lampOn: new THREE.MeshStandardMaterial({ color: 0xfff1d6, emissive: 0xffd9a0, emissiveIntensity: 2.2 }),
    curtain: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }),
    art: new THREE.MeshStandardMaterial({ color: 0xc46f4b, roughness: 0.9 }),
    tv: new THREE.MeshStandardMaterial({ color: 0x0b0b0b, roughness: 0.15, metalness: 0.3 }),
  };
  return mats;
}

/** frame = { pos: Vector3 (fachada, no piso), rotY } */
export function buildInterior(frame) {
  const M = getMats();
  const g = new THREE.Group();
  g.name = 'interior';
  const W = 10.9, D = 11.7, H = 2.85, hw = W / 2;
  const box = (w, h, d, mat, x, y, z, cast = true) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y + h / 2, z);
    m.castShadow = cast; m.receiveShadow = true;
    g.add(m);
    return m;
  };
  const cyl = (rt, rb, h, mat, x, y, z, seg = 16) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
    m.position.set(x, y + h / 2, z);
    m.castShadow = true; m.receiveShadow = true;
    g.add(m);
    return m;
  };

  // Piso, teto e paredes
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D).rotateX(-Math.PI / 2), M.floor);
  floor.position.set(0, 0.012, D / 2);
  floor.receiveShadow = true;
  g.add(floor);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D).rotateX(Math.PI / 2), M.ceiling);
  ceil.position.set(0, H, D / 2);
  g.add(ceil);
  box(0.15, H, D, M.wall, -hw - 0.075, 0, D / 2);
  box(0.15, H, D, M.wall, hw + 0.075, 0, D / 2);
  box(W + 0.3, H, 0.15, M.wall, 0, 0, D + 0.075);
  // parede da janela com vão grande (porta de correr até o teto)
  const ow = 4.55;
  box(hw - ow, H, 0.2, M.wall, -(hw + ow) / 2, 0, 0.1);
  box(hw - ow, H, 0.2, M.wall, (hw + ow) / 2, 0, 0.1);
  box(ow * 2, 0.22, 0.2, M.wall, 0, H - 0.22, 0.1);
  // caixilhos
  for (const x of [-ow, -ow / 2, 0, ow / 2, ow]) box(0.06, H - 0.22, 0.1, M.frame, x, 0, 0.05);
  box(ow * 2, 0.05, 0.12, M.frame, 0, 0, 0.05);
  box(ow * 2, 0.06, 0.12, M.frame, 0, H - 0.28, 0.05);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(ow * 2, H - 0.25), M.glass);
  glass.position.set(0, (H - 0.25) / 2, 0.04);
  g.add(glass);
  // cortinas leves
  for (const x of [-ow + 0.5, ow - 0.5]) {
    const c = new THREE.Mesh(new THREE.PlaneGeometry(1.1, H - 0.1, 12, 1), M.curtain);
    const p = c.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 14) * 0.05);
    c.geometry.computeVertexNormals();
    c.position.set(x, (H - 0.1) / 2, 0.35);
    g.add(c);
  }

  // Cozinha (parede esquerda)
  const kx = -hw + 0.32;
  box(0.62, 0.88, 6.2, M.cab, kx, 0.08, 8.3);
  box(0.66, 0.04, 6.2, M.quartz, kx + 0.02, 0.96, 8.3);
  box(0.36, 0.8, 4.6, M.cab, -hw + 0.18, 1.65, 7.5);
  box(0.7, 2.5, 1.2, M.cab, kx, 0, 11.0); // coluna geladeira
  box(0.5, 0.02, 0.8, M.black, kx + 0.05, 1.0, 9.0); // cooktop
  box(0.42, 0.03, 0.7, M.steel, kx + 0.05, 0.985, 6.6); // cuba
  cyl(0.015, 0.015, 0.35, M.steel, kx - 0.2, 1.0, 6.6, 8);
  // ilha
  box(1.0, 0.9, 2.6, M.cab, -3.0, 0, 8.0);
  box(1.15, 0.05, 2.8, M.quartz, -3.0, 0.9, 8.0);
  for (const z of [7.2, 8.0, 8.8]) { cyl(0.2, 0.2, 0.06, M.fabric2, -2.2, 0.7, z); cyl(0.02, 0.02, 0.7, M.black, -2.2, 0, z, 6); }
  // pendentes sobre a ilha
  for (const z of [7.3, 8.7]) { cyl(0.004, 0.004, 0.9, M.black, -3.0, H - 0.9, z, 4); cyl(0.12, 0.16, 0.22, M.lampOn, -3.0, H - 1.12, z); }

  // Jantar
  box(0.95, 0.04, 2.1, M.table, 1.2, 0.74, 7.2);
  for (const [x, z] of [[1.2 - 0.38, 6.4], [1.2 + 0.38, 6.4], [1.2 - 0.38, 8.0], [1.2 + 0.38, 8.0]]) box(0.06, 0.74, 0.06, M.black, x, 0, z);
  for (const z of [6.5, 7.2, 7.9]) for (const s of [-1, 1]) {
    box(0.45, 0.06, 0.45, M.fabric, 1.2 + s * 0.78, 0.45, z);
    box(0.06, 0.45, 0.42, M.fabric, 1.2 + s * 1.0, 0.45, z);
    box(0.04, 0.45, 0.04, M.black, 1.2 + s * 0.78, 0, z);
  }
  cyl(0.005, 0.005, 1.1, M.black, 1.2, H - 1.1, 7.2, 4);
  box(0.12, 0.08, 1.6, M.lampOn, 1.2, H - 1.18, 7.2);
  // vaso na mesa
  cyl(0.07, 0.05, 0.22, M.pot, 1.2, 0.78, 7.2);

  // Sala de estar
  box(3.4, 0.02, 2.6, M.rug, 2.2, 0, 2.9, false);
  box(1.0, 0.42, 2.9, M.fabric, 0.65, 0.05, 2.9); // assento sofá
  box(0.25, 0.85, 2.9, M.fabric, 0.2, 0.05, 2.9); // encosto
  box(1.0, 0.62, 0.22, M.fabric, 0.65, 0.05, 1.45);
  box(1.0, 0.62, 0.22, M.fabric, 0.65, 0.05, 4.35);
  for (const z of [2.2, 3.0, 3.8]) box(0.18, 0.4, 0.55, M.fabric2, 0.4, 0.47, z);
  box(1.1, 0.35, 1.1, M.table, 2.45, 0, 2.9); // mesa de centro
  cyl(0.1, 0.12, 0.12, M.pot, 2.3, 0.35, 2.7);
  // poltrona
  box(0.85, 0.42, 0.85, M.fabric2, 3.8, 0.05, 1.1);
  box(0.85, 0.75, 0.18, M.fabric2, 3.8, 0.05, 0.75);
  // painel de TV na parede direita
  box(0.08, 2.1, 3.2, M.cab, hw - 0.05, 0.3, 3.0);
  box(0.05, 0.85, 1.55, M.tv, hw - 0.12, 1.05, 3.0);
  box(0.45, 0.35, 2.6, M.cab, hw - 0.25, 0.12, 3.0);
  // plantas
  for (const [x, z, k] of [[-4.6, 0.8, 1.2], [4.7, 5.4, 1.0], [-1.0, 0.7, 0.8]]) {
    cyl(0.22 * k, 0.17 * k, 0.45 * k, M.pot, x, 0, z);
    const leaves = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42 * k, 1), M.plant);
    leaves.position.set(x, 0.45 * k + 0.45 * k, z);
    leaves.scale.y = 1.5;
    leaves.castShadow = true;
    g.add(leaves);
  }
  // luminária de piso
  cyl(0.01, 0.01, 1.5, M.black, -0.3, 0, 0.9, 6);
  cyl(0.14, 0.2, 0.25, M.lampOn, -0.3, 1.5, 0.9);
  // quadro e porta para o corredor
  box(1.4, 0.95, 0.04, M.art, -1.4, 1.2, D - 0.04);
  box(0.95, 2.15, 0.05, M.cab, 3.4, 0, D - 0.04);
  // spots no teto
  for (const x of [-3, 0, 3]) for (const z of [2, 5, 8, 10.5]) {
    const s = new THREE.Mesh(new THREE.CircleGeometry(0.06, 12).rotateX(Math.PI / 2), M.lampOn);
    s.position.set(x, H - 0.005, z);
    g.add(s);
  }
  // mobiliário da sacada
  box(0.6, 0.45, 0.6, M.fabric, -2.4, 0, -1.2);
  box(0.6, 0.45, 0.6, M.fabric, -1.0, 0, -1.2);
  cyl(0.3, 0.3, 0.5, M.table, -1.7, 0, -1.6);
  cyl(0.18, 0.14, 0.4, M.pot, 3.6, 0, -1.4);
  const bl = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4, 1), M.plant);
  bl.position.set(3.6, 0.85, -1.4);
  g.add(bl);

  // Luzes internas
  const l1 = new THREE.PointLight(0xffe2bd, 10, 14, 1.6);
  l1.position.set(0.5, H - 0.3, 4);
  const l2 = new THREE.PointLight(0xffe2bd, 8, 12, 1.6);
  l2.position.set(-2.5, H - 0.3, 8.5);
  g.add(l1, l2);
  g.userData.lights = [l1, l2];

  // Sacada com guarda-corpo de vidro (as torres do mapa não têm sacadas por andar)
  box(W - 0.6, 0.22, 2.4, M.quartz, 0, -0.22, -1.2);
  const rail = new THREE.Mesh(new THREE.BoxGeometry(W - 0.6, 1.05, 0.04), M.glass);
  rail.position.set(0, 0.55, -2.38);
  g.add(rail);
  box(W - 0.6, 0.05, 0.08, M.frame, 0, 1.05, -2.38);

  // Posiciona no andar escolhido, virado para a fachada
  g.position.copy(frame.pos);
  g.rotation.y = frame.rotY;
  g.updateMatrixWorld(true);

  const toWorld = (x, y, z) => new THREE.Vector3(x, y, z).applyMatrix4(g.matrixWorld);
  g.userData.views = {
    sala: { pos: toWorld(-1.2, 1.55, 10.6), look: toWorld(0.8, 1.25, 0) },
    cozinha: { pos: toWorld(2.6, 1.55, 10.4), look: toWorld(-3.5, 1.0, 6.5) },
    estar: { pos: toWorld(4.4, 1.5, 6.2), look: toWorld(0.3, 0.9, 2.2) },
    sacada: { pos: toWorld(0.4, 1.55, -1.0), look: toWorld(0.4, 1.0, -30) },
  };
  // pontos clicáveis dentro do apartamento (como no vídeo de referência)
  g.userData.hotspots = [
    { id: 'cozinha', nome: 'Cozinha', pos: toWorld(-3.0, 1.35, 8.0) },
    { id: 'estar', nome: 'Estar', pos: toWorld(1.0, 1.0, 2.9) },
    { id: 'sacada', nome: 'Varanda', pos: toWorld(0.0, 1.3, -1.2) },
    { id: 'sala', nome: 'Jantar', pos: toWorld(1.2, 1.25, 7.2) },
  ];
  g.userData.setNight = (n) => {
    l1.intensity = 6 + n * 22;
    l2.intensity = 5 + n * 18;
  };
  return g;
}

export function disposeInterior(g) {
  g.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
  g.removeFromParent();
}

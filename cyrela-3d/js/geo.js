import { CONFIG } from './config.js';

// Projeção simples (equiretangular local): x = leste, z = sul, em metros
const LAT0 = CONFIG.centro.lat, LON0 = CONFIG.centro.lon;
const MX = 111320 * Math.cos((LAT0 * Math.PI) / 180);
const MZ = 110574;
export const toXZ = (lat, lon) => [(lon - LON0) * MX, -(lat - LAT0) * MZ];
export const toLL = (x, z) => [LAT0 - z / MZ, LON0 + x / MX];
const P = (list) => list.map(([la, lo]) => toXZ(la, lo));

// ---------------------------------------------------------------------
// Geografia de referência (coordenadas aproximadas, uso ilustrativo)
// ---------------------------------------------------------------------
export const RIOS = {
  pinheiros: P([[-23.526, -46.756], [-23.536, -46.744], [-23.546, -46.734], [-23.556, -46.722], [-23.565, -46.712], [-23.572, -46.7035], [-23.580, -46.700], [-23.589, -46.698], [-23.600, -46.697], [-23.6107, -46.699], [-23.620, -46.704], [-23.630, -46.712], [-23.6445, -46.7255], [-23.655, -46.724], [-23.669, -46.712], [-23.690, -46.703]]),
  tiete: P([[-23.522, -46.800], [-23.524, -46.775], [-23.526, -46.756], [-23.521, -46.744], [-23.514, -46.730], [-23.512, -46.710], [-23.515, -46.690], [-23.517, -46.670], [-23.516, -46.650], [-23.516, -46.632], [-23.520, -46.610], [-23.527, -46.585]]),
};
export const LARGURA_RIO = { pinheiros: 75, tiete: 95 };

export const PARQUES = [
  { nome: 'Parque Ibirapuera', poly: P([[-23.5808, -46.6598], [-23.5815, -46.6552], [-23.5852, -46.6528], [-23.5895, -46.6535], [-23.5925, -46.6560], [-23.5945, -46.6600], [-23.5925, -46.6648], [-23.5875, -46.6668], [-23.5830, -46.6650]]) },
  { nome: 'Parque Villa-Lobos', poly: P([[-23.5435, -46.7275], [-23.5430, -46.7210], [-23.5480, -46.7195], [-23.5510, -46.7240], [-23.5490, -46.7285]]) },
  { nome: 'Cidade Universitária (USP)', poly: P([[-23.551, -46.742], [-23.552, -46.727], [-23.560, -46.719], [-23.571, -46.722], [-23.572, -46.736], [-23.565, -46.745]]) },
  { nome: 'Jockey Club', poly: P([[-23.5815, -46.7095], [-23.5810, -46.7030], [-23.5880, -46.7010], [-23.5905, -46.7060], [-23.5870, -46.7105]]), grama: true },
  { nome: 'Parque do Povo', poly: P([[-23.5852, -46.6912], [-23.5858, -46.6880], [-23.5895, -46.6870], [-23.5890, -46.6902]]) },
  { nome: 'Parque da Aclimação', poly: P([[-23.5700, -46.6320], [-23.5705, -46.6280], [-23.5745, -46.6285], [-23.5740, -46.6325]]) },
];

// Bairro-jardim de casas baixas e muitas árvores (Jardins)
export const JARDINS = { c: toXZ(-23.5745, -46.6765), r: 900 };

export const AEROPORTO = { c: toXZ(-23.6267, -46.6556), comp: 1940, larg: 520, rumo: -10 }; // Congonhas

export const AVENIDAS = [
  { nome: 'Av. Paulista', pts: P([[-23.5550, -46.6627], [-23.5711, -46.6449]]), w: 34 },
  { nome: 'Av. Faria Lima', pts: P([[-23.5662, -46.6937], [-23.5737, -46.6895], [-23.5800, -46.6855], [-23.5865, -46.6818], [-23.5933, -46.6858]]), w: 30 },
  { nome: 'Av. Rebouças', pts: P([[-23.5545, -46.6625], [-23.5617, -46.6727], [-23.5665, -46.6820], [-23.5690, -46.6905]]), w: 28 },
  { nome: 'Av. Sumaré', pts: P([[-23.5535, -46.6760], [-23.5440, -46.6770], [-23.5350, -46.6810]]), w: 26 },
  { nome: 'Av. 23 de Maio', pts: P([[-23.5560, -46.6395], [-23.5720, -46.6440], [-23.5865, -46.6480], [-23.6000, -46.6530], [-23.6150, -46.6570], [-23.6350, -46.6620]]), w: 36 },
  { nome: 'Av. dos Bandeirantes', pts: P([[-23.6110, -46.6985], [-23.6080, -46.6800], [-23.6050, -46.6640], [-23.6010, -46.6450], [-23.5980, -46.6250]]), w: 34 },
  { nome: 'Av. Ibirapuera', pts: P([[-23.5925, -46.6540], [-23.6030, -46.6620], [-23.6130, -46.6680], [-23.6230, -46.6700]]), w: 26 },
];

export const MARCOS = [
  { id: 'ibirapuera', nome: 'Parque Ibirapuera', ll: [-23.5874, -46.6576] },
  { id: 'paulista', nome: 'Av. Paulista (MASP)', ll: [-23.5614, -46.6559] },
  { id: 'farialima', nome: 'Faria Lima', ll: [-23.5800, -46.6855] },
  { id: 'congonhas', nome: 'Aeroporto de Congonhas', ll: [-23.6267, -46.6556] },
  { id: 'estaiada', nome: 'Ponte Estaiada', ll: [-23.6107, -46.6988] },
  { id: 'morumbi', nome: 'Estádio do Morumbi', ll: [-23.6000, -46.7200] },
  { id: 'pacaembu', nome: 'Estádio do Pacaembu', ll: [-23.5478, -46.6653] },
  { id: 'allianz', nome: 'Allianz Parque', ll: [-23.5276, -46.6786] },
  { id: 'villalobos', nome: 'Parque Villa-Lobos', ll: [-23.5466, -46.7240] },
].map((m) => ({ ...m, xz: toXZ(...m.ll) }));

// Espigão da Paulista (cumeeira da cidade) — usado no relevo
const CUMEEIRA = P([[-23.5470, -46.6900], [-23.5520, -46.6740], [-23.5555, -46.6640], [-23.5650, -46.6520], [-23.5720, -46.6440], [-23.5850, -46.6380], [-23.6000, -46.6360], [-23.6200, -46.6400]]);

// ---------------------------------------------------------------------
export function distSeg(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
}
export function distPoly(px, pz, pts) {
  let d = Infinity;
  for (let i = 0; i < pts.length - 1; i++) d = Math.min(d, distSeg(px, pz, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]));
  return d;
}
export function inPoly(px, pz, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if (zi > pz !== zj > pz && px < ((xj - xi) * (pz - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}
export const distRio = (x, z) => Math.min(distPoly(x, z, RIOS.pinheiros), distPoly(x, z, RIOS.tiete));
export const noParque = (x, z) => PARQUES.find((p) => inPoly(x, z, p.poly));
export function noAeroporto(x, z) {
  const [cx, cz] = AEROPORTO.c;
  const a = (AEROPORTO.rumo * Math.PI) / 180;
  const dx = x - cx, dz = z - cz;
  const u = dx * Math.cos(a) + dz * Math.sin(a), v = -dx * Math.sin(a) + dz * Math.cos(a);
  return Math.abs(u) < AEROPORTO.larg / 2 && Math.abs(v) < AEROPORTO.comp / 2 + 120;
}

// Relevo suave: cumeeira da Paulista mais alta, várzeas dos rios mais baixas
export function altura(x, z) {
  const dc = distPoly(x, z, CUMEEIRA);
  const dr = distRio(x, z);
  const h = 70 * Math.exp(-((dc / 2600) ** 2)) + 18 * Math.exp(-((dc / 900) ** 2)) - 14 * Math.exp(-((dr / 900) ** 2));
  const n = Math.sin(x * 0.0011 + 1.3) * Math.cos(z * 0.0009 - 0.4) * 9 + Math.sin(x * 0.0031 - z * 0.0024) * 4;
  return Math.max(0, h + n + 16);
}

// Distância em linha reta (m) entre duas coordenadas
export function distLL(a, b) {
  const R = 6371000, toR = Math.PI / 180;
  const dLat = (b[0] - a[0]) * toR, dLon = (b[1] - a[1]) * toR;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * toR) * Math.cos(b[0] * toR) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
export const fmtDist = (m) => (m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1).replace('.', ',')} km`);

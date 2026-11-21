import { CONFIG } from './config.js';

// Gerador pseudo-aleatório com semente (mesmo resultado em todo aparelho)
export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s += 0x6D2B79F5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const STATUS = {
  disponivel: { label: 'Disponível', cor: '#ffcf1f' },
  reservado: { label: 'Reservado', cor: '#d9d9d9' },
  contrato: { label: 'Reservado (contrato)', cor: '#8a8a8a' },
  vendido: { label: 'Vendido', cor: '#4a4a4a' },
};

export const FINAIS = ['01', '02', '03', '04'];

export function codigo(torre, andar, final) {
  return `${torre}-${andar}${final}`;
}

export function buildUnits() {
  const r = rng(20261121);
  const units = [];
  for (const t of CONFIG.torres) {
    for (let andar = 1; andar <= t.andares; andar++) {
      for (const final of FINAIS) {
        const tip = CONFIG.tipologias[final];
        const id = codigo(t.id, andar, final);
        let status;
        const x = r();
        // Andares baixos vendem primeiro
        const pressao = 0.35 - andar * 0.006;
        if (x < pressao) status = 'vendido';
        else if (x < pressao + 0.12) status = 'contrato';
        else if (x < pressao + 0.27) status = 'reservado';
        else status = 'disponivel';
        if (CONFIG.statusFixo[id]) status = CONFIG.statusFixo[id];
        const frente = final === '01' || final === '02';
        const m2 = CONFIG.precoM2Base * (1 + CONFIG.reajustePorAndar * (andar - 1)) * (frente ? 1 + CONFIG.premioVistaMar : 1);
        const preco = Math.round((tip.area * m2) / 25) * 25;
        units.push({ id, torre: t.id, andar, final, tip, status, preco, index: units.length });
      }
    }
  }
  return units;
}

export const brl = (v) => 'R$ ' + Math.round(v).toLocaleString('pt-BR');
export const m2 = (v) => v.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + ' m²';

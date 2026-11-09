/**
 * Glifos da marca — desenhados como TRAÇOS (stroke), não como contornos.
 *
 * [[TODO: substituir pelo SVG oficial]] — esta é uma reconstrução fiel do
 * logotipo (traço fino uniforme, tracking largo, "Λ" sem barra). Quando o
 * arquivo oficial chegar, basta trocar os `d` abaixo: todo o site consome
 * a marca a partir daqui.
 *
 * Sistema de coordenadas: altura de caixa-alta = 100 unidades (y=0 topo,
 * y=100 base). As pontas das diagonais ultrapassam a faixa 0–100 de
 * propósito: um clipPath corta tudo na linha de base e na altura de caixa,
 * produzindo terminais horizontais limpos, como no logotipo.
 *
 * Por serem traços, cada glifo pode ser desenhado com DrawSVG (preloader).
 */

export type Glyph = {
  /** Largura de avanço, sem espaçamento lateral. */
  w: number;
  /** Traços recortados na faixa de caixa-alta. `h` = meia espessura do traço. */
  d: (h: number) => string;
  /** Traços fora da faixa (acentos), sem recorte. */
  over?: (h: number) => string;
};

const ARC = 40; // abertura do "C", em graus para cada lado

export const GLYPHS: Record<string, Glyph> = {
  V: { w: 80, d: () => "M-4,-10 L40,100 L84,-10" },
  // O "A" da Valentim: um chevron puro, sem barra.
  Λ: { w: 80, d: () => "M-4,110 L40,0 L84,110" },
  // "A" convencional — usado apenas no descritor "ÓTICA".
  A: { w: 80, d: () => "M-4,110 L40,0 L84,110 M12.8,68 H67.2" },
  L: { w: 48, d: (h) => `M0,0 V${100 - h} H48` },
  E: { w: 52, d: (h) => `M52,${h} H0 V${100 - h} H52 M0,50 H46` },
  N: { w: 70, d: () => "M0,100 V0 L70,100 V0" },
  T: { w: 68, d: (h) => `M0,${h} H68 M34,0 V100` },
  I: { w: 0, d: () => "M0,0 V100" },
  M: { w: 92, d: () => "M0,100 V0 L46,100 L92,0 V100" },
  O: {
    w: 100,
    d: (h) => {
      const r = 50 - h;
      return `M${50 - r},50 a${r},${r} 0 1 0 ${2 * r},0 a${r},${r} 0 1 0 ${-2 * r},0`;
    },
  },
  Ó: {
    w: 100,
    d: (h) => GLYPHS.O.d(h),
    over: () => "M45,-16 L63,-38",
  },
  C: {
    w: 88,
    d: (h) => {
      const r = 50 - h;
      const rad = (ARC * Math.PI) / 180;
      const x = (50 + r * Math.cos(rad)).toFixed(2);
      const dy = r * Math.sin(rad);
      return `M${x},${(50 - dy).toFixed(2)} A${r},${r} 0 1 0 ${x},${(50 + dy).toFixed(2)}`;
    },
  },
};

/** Ajustes ópticos entre pares (diagonais paralelas parecem mais distantes). */
const KERN: Record<string, number> = {
  VΛ: -30,
  ΛL: -10,
  TI: -4,
  ÓT: -2,
  CA: -12,
};

export type PlacedGlyph = { char: string; x: number; glyph: Glyph };

export type WordLayout = { glyphs: PlacedGlyph[]; width: number };

/**
 * Posiciona uma palavra com tracking uniforme (em unidades; 100 = caixa-alta).
 */
export function layoutWord(word: string, tracking: number): WordLayout {
  const chars = Array.from(word);
  const glyphs: PlacedGlyph[] = [];
  let x = 0;
  chars.forEach((char, i) => {
    const glyph = GLYPHS[char];
    if (!glyph) throw new Error(`Glifo de marca inexistente: "${char}"`);
    glyphs.push({ char, x, glyph });
    const next = chars[i + 1];
    if (next) x += glyph.w + tracking + (KERN[char + next] ?? 0);
    else x += glyph.w;
  });
  return { glyphs, width: x };
}

/** Tracking da assinatura (≈0.42em do logotipo, medido entre traços). */
export const BRAND_TRACKING = 64;

/**
 * Espessuras de traço por tamanho óptico. Traço fino demais em tamanhos
 * pequenos vira cinza na tela — por isso a marca engrossa ao encolher.
 */
export const STROKE = {
  /** Hero, preloader, rodapé: > 240px de largura. */
  display: 2.4,
  /** Navegação, cartões: 120–240px. */
  text: 4.2,
  /** Favicon, selos: < 120px. */
  micro: 7,
} as const;

export type OpticalSize = keyof typeof STROKE;

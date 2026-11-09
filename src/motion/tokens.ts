/**
 * Tokens de movimento — linguagem "Foco".
 * Espelham as custom properties em `src/app/globals.css`. Qualquer mudança
 * aqui deve ser refletida lá (e vice-versa).
 */

/** Durações em segundos (unidade do GSAP). */
export const DUR = {
  /** 240ms — micro-interações: hover, sublinhados, cursor. */
  fast: 0.24,
  /** 700ms — entradas padrão (focus-in, máscaras de linha). */
  base: 0.7,
  /** 1.4s — cenas: íris, inversão, preloader. */
  scene: 1.4,
} as const;

/** Intervalo entre linhas/itens. Sempre lento e composto. */
export const STAGGER = 0.08;

/**
 * Curvas no formato CustomEase (path SVG normalizado 0–1).
 * - lensPull: arranque rápido, assentamento longo e preciso. Sem bounce.
 *   É o anel de foco de uma lente: gira depressa, depois acerta no milímetro.
 * - settle: simétrica e pesada no fim. Para cenas e transições de íris.
 */
export const EASE_PATH = {
  lensPull: "M0,0 C0.1,0.7 0.16,0.955 0.38,0.985 0.6,1 0.8,1 1,1",
  settle: "M0,0 C0.62,0 0.1,1 1,1",
} as const;

/** Aproximações cubic-bezier para CSS (mesmas de globals.css). */
export const EASE_CSS = {
  lensPull: "cubic-bezier(0.14, 0.9, 0.2, 1)",
  settle: "cubic-bezier(0.62, 0, 0.1, 1)",
} as const;

/** Estado inicial do focus-in. O estado final é o estilo natural do elemento. */
export const FOCUS_FROM = {
  blur: 12,
  /** Tracking fechado, em em. Abre até o tracking da marca. */
  tracking: "0.02em",
  opacity: 0,
} as const;

export const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

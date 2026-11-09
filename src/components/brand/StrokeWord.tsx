import { useId } from "react";
import type { WordLayout } from "./glyphs";

type Props = {
  layout: WordLayout;
  /** Espessura do traço, em unidades do glifo (caixa-alta = 100). */
  stroke: number;
  /** Prefixo de `data-glyph` — alvo para DrawSVG / SplitText-like stagger. */
  name: string;
};

/**
 * Renderiza uma palavra de marca como <g> de traços, dentro de um <svg> pai.
 * Cada letra é um <path data-glyph> independente, pronto para DrawSVG.
 * Cor: sempre `currentColor` — branco puro sobre preto ou preto sobre pérola.
 */
export function StrokeWord({ layout, stroke, name }: Props) {
  const clipId = useId();
  const h = stroke / 2;
  const pad = stroke * 2;

  return (
    <g
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="butt"
      strokeLinejoin="miter"
      strokeMiterlimit={10}
    >
      <clipPath id={clipId}>
        <rect x={-pad} y={0} width={layout.width + pad * 2} height={100} />
      </clipPath>
      <g clipPath={`url(#${clipId})`}>
        {layout.glyphs.map(({ char, x, glyph }, i) => (
          <path
            key={i}
            data-glyph={`${name}-${i}`}
            data-char={char}
            transform={`translate(${x} 0)`}
            d={glyph.d(h)}
          />
        ))}
      </g>
      {layout.glyphs.map(({ x, glyph }, i) =>
        glyph.over ? (
          <path
            key={i}
            data-glyph={`${name}-${i}-over`}
            transform={`translate(${x} 0)`}
            d={glyph.over(h)}
          />
        ) : null,
      )}
    </g>
  );
}

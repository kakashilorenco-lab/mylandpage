import type { SVGProps } from "react";
import { BRAND_TRACKING, STROKE, layoutWord, type OpticalSize } from "./glyphs";
import { StrokeWord } from "./StrokeWord";

type Props = Omit<SVGProps<SVGSVGElement>, "children"> & {
  /** Tamanho óptico: ajusta a espessura do traço ao tamanho de uso. */
  optical?: OpticalSize;
  /** Inclui o descritor "ÓTICA" centralizado acima. */
  descriptor?: boolean;
  /** Marca decorativa (o nome já está em texto ao lado). */
  decorative?: boolean;
};

const VALENTIM = layoutWord("VΛLENTIM", BRAND_TRACKING);

const DESC_SCALE = 0.3;
const DESC_GAP = 62;
const OTICA = layoutWord("ÓTICA", 58);

/**
 * Assinatura "VALENTIM" — a única forma permitida de escrever a marca.
 * Nunca use texto vivo: a fonte de títulos tem "A" com barra.
 * Sem efeitos, gradientes ou sombras. A cor vem de `currentColor`.
 */
export function Wordmark({
  optical = "display",
  descriptor = false,
  decorative = false,
  ...svg
}: Props) {
  const stroke = STROKE[optical];
  const pad = stroke;
  const descH = descriptor ? 100 * DESC_SCALE + DESC_GAP + 14 : 0;
  const descW = OTICA.width * DESC_SCALE;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`${-pad} ${-descH} ${VALENTIM.width + pad * 2} ${100 + descH}`}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : "Ótica Valentim"}
      data-brand="wordmark"
      {...svg}
    >
      {descriptor && (
        <g
          data-brand="descriptor"
          transform={`translate(${(VALENTIM.width - descW) / 2} ${-DESC_GAP - 100 * DESC_SCALE}) scale(${DESC_SCALE})`}
        >
          {/* "Regular" no logotipo: traço proporcionalmente mais firme. */}
          <StrokeWord layout={OTICA} stroke={Math.max(stroke * 2.6, 7)} name="otica" />
        </g>
      )}
      <StrokeWord layout={VALENTIM} stroke={stroke} name="valentim" />
    </svg>
  );
}

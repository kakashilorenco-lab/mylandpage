import type { SVGProps } from "react";
import { BRAND_TRACKING, layoutWord } from "./glyphs";
import { StrokeWord } from "./StrokeWord";

type Props = Omit<SVGProps<SVGSVGElement>, "children"> & {
  /** `ink`: branco sobre disco preto (avatar). `pearl`: preto sobre pérola. */
  tone?: "ink" | "pearl";
  /** Só o anel, sem a assinatura — para máscaras, cursor e transições. */
  ringOnly?: boolean;
  decorative?: boolean;
};

const SIZE = 1000;
const R = SIZE / 2;

const VALENTIM = layoutWord("VΛLENTIM", BRAND_TRACKING);
const OTICA = layoutWord("ÓTICA", 58);

// A assinatura ocupa 62% do diâmetro, como no avatar.
const WORD_SCALE = (SIZE * 0.62) / VALENTIM.width;
const DESC_SCALE = WORD_SCALE * 0.3;

/**
 * Selo circular — o avatar da marca. O círculo é o segundo motivo:
 * lente, íris, foco. Sempre monocromático, sem efeitos.
 */
export function CircleMark({
  tone = "ink",
  ringOnly = false,
  decorative = false,
  ...svg
}: Props) {
  const bg = tone === "ink" ? "#000000" : "#F2F2F0";
  const fg = tone === "ink" ? "#FFFFFF" : "#000000";
  const wordH = 100 * WORD_SCALE;
  const wordY = R - wordH / 2 + 18;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : "Ótica Valentim"}
      data-brand="circle-mark"
      color={fg}
      {...svg}
    >
      <circle data-brand="disc" cx={R} cy={R} r={R} fill={bg} />
      <circle
        data-brand="ring"
        cx={R}
        cy={R}
        r={R - 4}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
      />
      {!ringOnly && (
        <>
          <g
            data-brand="descriptor"
            transform={`translate(${R - (OTICA.width * DESC_SCALE) / 2} ${wordY - 100 * DESC_SCALE - 56}) scale(${DESC_SCALE})`}
          >
            <StrokeWord layout={OTICA} stroke={8} name="otica" />
          </g>
          <g
            transform={`translate(${R - (VALENTIM.width * WORD_SCALE) / 2} ${wordY}) scale(${WORD_SCALE})`}
          >
            <StrokeWord layout={VALENTIM} stroke={3.2} name="valentim" />
          </g>
        </>
      )}
    </svg>
  );
}

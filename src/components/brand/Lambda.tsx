import type { SVGProps } from "react";
import { useId } from "react";

type Props = Omit<SVGProps<SVGSVGElement>, "children"> & {
  /** Espessura do traço (caixa-alta = 100). Padrão pensado para 12–24px. */
  weight?: number;
  /** Nome acessível. Sem ele, o glifo é decorativo. */
  label?: string;
};

/**
 * "Λ" — o glifo-assinatura (o A sem barra; a ponte de uma armação).
 * Usos previstos: preloader, estado do cursor em links, marcador de seção,
 * marcador de lista, estados de carregamento, favicon. Com parcimônia.
 */
export function Lambda({ weight = 7, label, ...svg }: Props) {
  const clipId = useId();
  const pad = weight;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`${-pad} 0 ${80 + pad * 2} 100`}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      data-brand="lambda"
      {...svg}
    >
      <clipPath id={clipId}>
        <rect x={-pad} y={0} width={80 + pad * 2} height={100} />
      </clipPath>
      <path
        clipPath={`url(#${clipId})`}
        d="M-4,110 L40,0 L84,110"
        fill="none"
        stroke="currentColor"
        strokeWidth={weight}
        strokeLinejoin="miter"
        strokeMiterlimit={10}
      />
    </svg>
  );
}

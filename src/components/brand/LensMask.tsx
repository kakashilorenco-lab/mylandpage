import type { CSSProperties, HTMLAttributes } from "react";

type Props = HTMLAttributes<HTMLDivElement> & {
  /** Raio da abertura (qualquer unidade CSS). 0 = íris fechada. */
  radius?: string;
  /** Centro da abertura. */
  x?: string;
  y?: string;
};

/**
 * Máscara circular — a lente. Base das transições de íris, dos momentos de
 * inversão e das máscaras de imagem. Anime as variáveis `--lens-r`,
 * `--lens-x` e `--lens-y` (GSAP anima custom properties diretamente);
 * só `clip-path` muda, então fica no compositor.
 */
export function LensMask({
  radius = "50%",
  x = "50%",
  y = "50%",
  style,
  ...div
}: Props) {
  return (
    <div
      data-brand="lens-mask"
      style={
        {
          "--lens-r": radius,
          "--lens-x": x,
          "--lens-y": y,
          clipPath: "circle(var(--lens-r) at var(--lens-x) var(--lens-y))",
          ...style,
        } as CSSProperties
      }
      {...div}
    />
  );
}

"use client";

import { useRef, type PointerEvent } from "react";
import { LensMask } from "@/components/brand";

const LINE = "Precisão que se usa no rosto";

/**
 * O círculo como lente: o texto vive fora de foco; a lente o resolve.
 * Duas cópias empilhadas — a nítida é recortada por <LensMask>, cujo centro
 * segue o ponteiro via custom properties (sem re-render do React).
 * Sem ponteiro (toque/teclado), a lente repousa no centro.
 */
export function LensDemo() {
  const root = useRef<HTMLDivElement>(null);

  const move = (e: PointerEvent<HTMLDivElement>) => {
    const el = root.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--px", `${e.clientX - r.left}px`);
    el.style.setProperty("--py", `${e.clientY - r.top}px`);
  };

  const text =
    "font-extralight uppercase leading-[1.2] tracking-heading text-[clamp(1.5rem,5.2vw,4.5rem)] text-center";

  return (
    <div
      ref={root}
      onPointerMove={move}
      className="relative grid min-h-[22rem] place-items-center overflow-hidden px-6 py-20 [--px:50%] [--py:50%]"
    >
      <p aria-hidden className={`${text} opacity-60 blur-[10px] select-none`}>
        {LINE}
      </p>
      <LensMask
        radius="clamp(5rem, 14vw, 9rem)"
        x="var(--px)"
        y="var(--py)"
        className="absolute inset-0 grid place-items-center px-6 py-20"
      >
        <p className={text}>{LINE}</p>
      </LensMask>
      {/* O anel da lente — 1px, como tudo na marca. */}
      <span
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 size-[calc(clamp(5rem,14vw,9rem)*2)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-current opacity-40"
        style={{ left: "var(--px)", top: "var(--py)" }}
      />
    </div>
  );
}

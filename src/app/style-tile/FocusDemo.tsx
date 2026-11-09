"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { registerEases } from "@/motion/eases";
import { DUR, FOCUS_FROM, REDUCED_MOTION } from "@/motion/tokens";

/**
 * Demonstração do focus-in (prévia; o primitivo reutilizável chega no marco
 * do motion layer). O tracking faz parte do foco: fechado e borrado →
 * aberto e nítido. Com movimento reduzido: apenas crossfade.
 */
export function FocusDemo() {
  const scope = useRef<HTMLDivElement>(null);
  const [run, setRun] = useState(0);

  useGSAP(
    () => {
      registerEases();
      const mm = gsap.matchMedia();
      mm.add(
        { reduce: REDUCED_MOTION, full: "(prefers-reduced-motion: no-preference)" },
        (ctx) => {
          if (ctx.conditions?.reduce) {
            gsap.from("[data-focus]", { opacity: 0, duration: DUR.fast });
            return;
          }
          gsap.from("[data-focus]", {
            opacity: FOCUS_FROM.opacity,
            filter: `blur(${FOCUS_FROM.blur}px)`,
            letterSpacing: FOCUS_FROM.tracking,
            duration: DUR.scene,
            ease: "lensPull",
            stagger: 0.12,
            clearProps: "filter,letterSpacing",
          });
        },
      );
    },
    { scope, dependencies: [run], revertOnUpdate: true },
  );

  return (
    <div ref={scope} className="flex flex-col items-center gap-10 text-center">
      <p data-focus className="t-micro text-mist">
        Focus-in · lensPull · 1.4s
      </p>
      <p
        data-focus
        className="font-extralight uppercase leading-[1.1] tracking-display mr-[-0.28em] text-[clamp(1.5rem,6vw,5.5rem)] will-change-[filter,opacity]"
      >
        Veja com clareza
      </p>
      <button
        type="button"
        onClick={() => setRun((n) => n + 1)}
        className="t-micro hairline-link cursor-pointer"
      >
        Focar de novo
      </button>
    </div>
  );
}

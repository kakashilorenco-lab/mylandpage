"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createScrollVideo, sectionOpacity } from "./engine";
import "./scroll-video.css";

export type ScrollSection = {
  from: number; // scroll progress 0..1 where the caption appears
  to: number; // …and where it leaves
  align?: "left" | "center" | "right";
  eyebrow?: string;
  title: ReactNode;
  text?: ReactNode;
};

/**
 * A pinned, scroll-scrubbed camera move. `length` is the scroll distance in viewport
 * heights (≈ 1 per second of footage reads well). Captions fade in at their progress range.
 */
export function ScrollVideo({ src, length = 6, sections = [], children }: { src: string; length?: number; sections?: ScrollSection[]; children?: ReactNode }) {
  const track = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [p, setP] = useState(0);

  useEffect(() => {
    if (!track.current || !canvas.current) return;
    let last = -1;
    const player = createScrollVideo({
      canvas: canvas.current,
      track: track.current,
      manifestUrl: src,
      onProgress: (v) => {
        // re-render captions only when progress moves visibly
        if (Math.abs(v - last) > 0.002) {
          last = v;
          setP(v);
        }
      },
    });
    return () => player.destroy();
  }, [src]);

  return (
    <section ref={track} className="sv-track" style={{ height: `${(length + 1) * 100}dvh` }}>
      <div className="sv-sticky">
        <canvas ref={canvas} className="sv-canvas" aria-hidden />
        <div className="sv-shade" />
        {sections.map((s, i) => {
          const o = sectionOpacity(p, s.from, s.to);
          return (
            <div key={i} className={`sv-caption sv-${s.align ?? "left"}`} style={{ opacity: o, transform: `translateY(${(1 - o) * 18}px)` }} aria-hidden={o < 0.5}>
              {s.eyebrow && <p className="sv-eyebrow">{s.eyebrow}</p>}
              <h2 className="sv-title">{s.title}</h2>
              {s.text && <p className="sv-text">{s.text}</p>}
            </div>
          );
        })}
        {children}
        <div className="sv-progress" style={{ transform: `scaleX(${p})` }} />
      </div>
    </section>
  );
}

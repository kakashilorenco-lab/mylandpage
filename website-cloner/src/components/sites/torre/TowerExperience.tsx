"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ASSETS, BATHROOM_COPY, DEFAULT_LEVEL, DETAIL_COPY, HOTSPOTS, LIVING_COPY, MAX_LEVEL, MIN_LEVEL,
  floorBox, levelAt, unitFor, type RoomId,
} from "./data";
import "./torre.css";

type View = "tower" | "entering" | "living" | "toBath" | "bath" | "toLiving" | "detail" | "leaving";
type Clip = "enter" | "toBath" | "toLiving";

const CLIP_SRC: Record<Clip, string> = { enter: ASSETS.enter, toBath: ASSETS.toBathroom, toLiving: ASSETS.toLiving };
const CLIP_DONE: Record<Clip, View> = { enter: "living", toBath: "bath", toLiving: "living" };

export function TowerExperience() {
  const [view, setView] = useState<View>("tower");
  const [level, setLevel] = useState(DEFAULT_LEVEL); // panel + slider
  const [hover, setHover] = useState<number | null>(null); // floor under the pointer
  const [entered, setEntered] = useState(DEFAULT_LEVEL); // level being visited
  const [detail, setDetail] = useState<Exclude<RoomId, "bathroom">>("kitchen");
  const [clip, setClip] = useState<Clip | null>(null);
  const [register, setRegister] = useState(false);
  const [sent, setSent] = useState(false);
  const videos = useRef<Partial<Record<Clip, HTMLVideoElement | null>>>({});
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  // Play a transition clip, then land on the next view. Falls back to a cut when
  // motion is reduced or playback is refused.
  const playClip = useCallback((c: Clip, during: View) => {
    if (reduced.current) {
      setView(CLIP_DONE[c]);
      return;
    }
    setView(during);
    setClip(c);
    const v = videos.current[c];
    if (!v) return;
    v.currentTime = 0;
    v.play().catch(() => {
      setClip(null);
      setView(CLIP_DONE[c]);
    });
  }, []);

  const onClipEnd = (c: Clip) => {
    setView(CLIP_DONE[c]);
    // keep the last frame up for a beat so the still underneath takes over without a flash
    window.setTimeout(() => setClip((cur) => (cur === c ? null : cur)), 60);
  };

  const enter = useCallback(
    (n: number) => {
      setEntered(n);
      setLevel(n);
      setHover(null);
      // panel fades first, then the camera flies in through the glass
      setView("entering");
      window.setTimeout(() => playClip("enter", "entering"), 450);
    },
    [playClip],
  );

  const backToTower = useCallback(() => {
    setView("leaving");
    window.setTimeout(() => {
      setClip(null);
      setView("tower");
    }, 500);
  }, []);

  // keyboard: arrows move the level, Enter goes in, Escape steps back
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (register) {
        if (e.key === "Escape") setRegister(false);
        return;
      }
      if (view === "tower") {
        if (e.key === "ArrowUp") setLevel((l) => Math.min(MAX_LEVEL, l + 1));
        if (e.key === "ArrowDown") setLevel((l) => Math.max(MIN_LEVEL, l - 1));
        if (e.key === "Enter" && !(e.target instanceof HTMLButtonElement)) enter(level);
      } else if (e.key === "Escape") {
        if (view === "bath") playClip("toLiving", "toLiving");
        else if (view === "detail") setView("living");
        else if (view === "living") backToTower();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view, level, register, enter, playClip, backToTower]);

  const pointerLevel = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return levelAt(((e.clientX - r.left) / r.width) * 100, ((e.clientY - r.top) / r.height) * 100);
  };

  const shown = hover ?? level;
  const unit = unitFor(shown);
  const band = floorBox(shown);
  const atTower = view === "tower";
  const inside = view !== "tower" && view !== "leaving";
  const living = LIVING_COPY(entered);
  const caption =
    view === "living" ? living : view === "bath" ? BATHROOM_COPY : view === "detail" ? DETAIL_COPY[detail] : null;
  const backLabel = view === "bath" || view === "detail" || view === "toBath" ? "Back to the living room" : "Back to the tower";

  const still = view === "bath" || view === "toLiving" ? ASSETS.bathroom : view === "tower" || view === "entering" || view === "leaving" ? ASSETS.tower : ASSETS.living;
  const detailOrigin = HOTSPOTS.find((h) => h.id === detail)!;

  return (
    <div className={`tr-root tr-view-${view}`}>
      {/* ---------- stage: image-space layer (stills, clips, floor band, hotspots) ---------- */}
      <div className={`tr-stage ${atTower || view === "entering" ? "tr-focus-tower" : ""}`}>
        <div
          className={`tr-still ${view === "leaving" ? "tr-fade-out" : ""} ${view === "detail" ? "tr-zoomed" : ""}`}
          style={{ backgroundImage: `url(${still})`, transformOrigin: `${detailOrigin.left + 3}% ${detailOrigin.top + 2}%` }}
        />

        {(Object.keys(CLIP_SRC) as Clip[]).map((c) => (
          <video
            key={c}
            ref={(el) => {
              videos.current[c] = el;
            }}
            className={`tr-clip ${clip === c ? "tr-clip-on" : ""}`}
            src={CLIP_SRC[c]}
            poster={c === "enter" ? ASSETS.enterPoster : undefined}
            muted
            playsInline
            preload="auto"
            onEnded={() => onClipEnd(c)}
            aria-hidden
          />
        ))}

        {atTower && (
          <div
            className="tr-hit"
            onPointerMove={(e) => setHover(pointerLevel(e))}
            onPointerLeave={() => setHover(null)}
            onClick={(e) => {
              const n = pointerLevel(e as unknown as React.PointerEvent<HTMLDivElement>);
              if (n === null) return;
              if (e.nativeEvent instanceof PointerEvent && e.nativeEvent.pointerType === "touch" && n !== level) setLevel(n);
              else enter(n);
            }}
            role="presentation"
          >
            <div className="tr-band" style={{ top: `${band.top}%`, left: `${band.left}%`, width: `${band.width}%`, height: `${band.height}%` }} />
            <div className="tr-floor-label" style={{ top: `${band.top}%`, left: `${band.labelLeft}%` }}>
              <span className="tr-dash" />
              {shown}
            </div>
          </div>
        )}

        {view === "entering" && !clip && (
          <div className="tr-floor-label tr-floor-label-hold" style={{ top: `${floorBox(entered).top}%`, left: `${floorBox(entered).labelLeft}%` }}>
            <span className="tr-dash" />
            {entered}
          </div>
        )}

        {view === "living" &&
          HOTSPOTS.map((h, i) => (
            <button
              key={h.id}
              className="tr-hotspot"
              style={{ left: `${h.left}%`, top: `${h.top}%`, animationDelay: `${1.1 + i * 0.15}s` }}
              onClick={() => {
                if (h.id === "bathroom") playClip("toBath", "toBath");
                else {
                  setDetail(h.id);
                  setView("detail");
                }
              }}
            >
              {h.label}
              <span className="tr-hotspot-dot" />
            </button>
          ))}
      </div>

      {/* ---------- floor picker panel ---------- */}
      <aside className={`tr-panel ${atTower ? "" : "tr-panel-hidden"}`} aria-hidden={!atTower}>
        <h1 className="tr-panel-title">
          Choose
          <br />
          your floor
        </h1>
        <p className="tr-panel-intro">
          Point at a floor and its rooms light up. Click it, or slide to a level and press enter, and you go in through the glass.
        </p>
        <div className="tr-level">
          <span className="tr-level-word">Level</span>
          <span className="tr-level-num">{shown}</span>
        </div>
        <h2 className="tr-unit">{unit.type}</h2>
        <p className="tr-unit-text">{unit.description}</p>
        <div className="tr-slider">
          <input
            type="range"
            min={MIN_LEVEL}
            max={MAX_LEVEL}
            value={level}
            onChange={(e) => {
              setLevel(Number(e.target.value));
              setHover(null);
            }}
            aria-label="Level"
            style={{ ["--p" as string]: `${((level - MIN_LEVEL) / (MAX_LEVEL - MIN_LEVEL)) * 100}%` }}
          />
          <div className="tr-slider-ends">
            <span>{MIN_LEVEL}</span>
            <span>{MAX_LEVEL}</span>
          </div>
        </div>
        <button className="tr-enter" onClick={() => enter(level)} tabIndex={atTower ? 0 : -1}>
          Enter
        </button>
      </aside>

      {/* ---------- top bar (inside the residence) ---------- */}
      <nav className={`tr-topbar ${inside ? "tr-topbar-on" : ""}`}>
        <button
          className="tr-link"
          onClick={() => {
            if (view === "bath") playClip("toLiving", "toLiving");
            else if (view === "detail") setView("living");
            else if (view === "living" || view === "entering") backToTower();
          }}
        >
          {backLabel}
        </button>
        <button className="tr-link" onClick={() => setRegister(true)}>
          Register interest <span className="tr-dot" />
        </button>
      </nav>

      {/* ---------- room caption ---------- */}
      {caption && (
        <div className="tr-caption" key={`${view}-${detail}-${entered}`}>
          <h2 className="tr-caption-title">{caption.title}</h2>
          <p className="tr-caption-text">{caption.text}</p>
        </div>
      )}

      {/* ---------- register interest ---------- */}
      {register && (
        <div className="tr-modal" role="dialog" aria-modal aria-label="Register interest" onClick={() => setRegister(false)}>
          <form
            className="tr-form"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              setSent(true);
            }}
          >
            {sent ? (
              <>
                <h2 className="tr-form-title">Thank you</h2>
                <p className="tr-unit-text">We will be in touch about level {entered}.</p>
                <button type="button" className="tr-enter" onClick={() => setRegister(false)}>
                  Close
                </button>
              </>
            ) : (
              <>
                <h2 className="tr-form-title">Register interest</h2>
                <p className="tr-unit-text">
                  Level {entered}, {unitFor(entered).short}.
                </p>
                <input className="tr-input" name="name" placeholder="Name" required autoComplete="name" />
                <input className="tr-input" name="email" type="email" placeholder="Email" required autoComplete="email" />
                <input className="tr-input" name="phone" type="tel" placeholder="Phone" autoComplete="tel" />
                <button className="tr-enter" type="submit">
                  Send
                </button>
              </>
            )}
          </form>
        </div>
      )}
    </div>
  );
}

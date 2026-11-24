// Content and geometry measured from the source video (perspective-corrected frames).
// Image space: every still and clip is the same 1488×866 crop of the screen, so
// overlay positions are stored as percentages of that box.

export const STAGE_ASPECT = 1488 / 866;

export const MIN_LEVEL = 4;
export const MAX_LEVEL = 32;
export const DEFAULT_LEVEL = 14;

export type Unit = {
  type: string; // panel heading, e.g. "Two bedrooms"
  short: string; // used in "Level 14, two bedrooms"
  description: string;
};

/**
 * Levels 10, 13, 14 and 21 are shown in the video. Other levels reuse the nearest
 * observed unit type. 30–32 (penthouse) never appear and are an assumption.
 */
export function unitFor(level: number): Unit {
  if (level <= 11)
    return {
      type: "One bedroom",
      short: "one bedroom",
      description: "A one-bedroom residence, 880 sq ft, from AED 2.5M, with the Corniche and the old harbour.",
    };
  if (level <= 19)
    return {
      type: "Two bedrooms",
      short: "two bedrooms",
      description: "A two-bedroom residence, 1,460 sq ft, from AED 3.9M, with the Corniche and the old harbour.",
    };
  if (level <= 29)
    return {
      type: "Three bedrooms",
      short: "three bedrooms",
      description: "A three-bedroom residence, 2,140 sq ft, from AED 5.8M, with the open sea to the west.",
    };
  return {
    type: "Penthouse",
    short: "the penthouse",
    description: "A four-bedroom penthouse, 3,900 sq ft, from AED 12M, with the sea on three sides.",
  };
}

// ---- tower geometry (source frame px, 1600×900 rectified) ---------------------------
const CROP = { x: 24, y: 14, w: 1488, h: 866 };
const px = (x: number) => ((x - CROP.x) / CROP.w) * 100;
const py = (y: number) => ((y - CROP.y) / CROP.h) * 100;

/** Floor centre line in source px: 22.5 px per floor, level 10 at y=557 (measured). */
function floorYSrc(level: number) {
  if (level >= 7) return 557 - (level - 10) * 22.5;
  return 624.5 + (7 - level) * 5; // lowest floors sit behind the podium palms
}

// The tower twists: its left/right edges at a few heights (source px).
const EDGES: [y: number, left: number, right: number][] = [
  [80, 615, 795],
  [310, 635, 810],
  [557, 675, 825],
  [640, 680, 830],
];
function edgesAt(y: number) {
  const e = EDGES;
  if (y <= e[0][0]) return { l: e[0][1], r: e[0][2] };
  for (let i = 1; i < e.length; i++) {
    if (y <= e[i][0]) {
      const t = (y - e[i - 1][0]) / (e[i][0] - e[i - 1][0]);
      return { l: e[i - 1][1] + t * (e[i][1] - e[i - 1][1]), r: e[i - 1][2] + t * (e[i][2] - e[i - 1][2]) };
    }
  }
  const last = e[e.length - 1];
  return { l: last[1], r: last[2] };
}

/** Band + label placement for a level, in % of the stage. */
export function floorBox(level: number) {
  const y = floorYSrc(level);
  const { l, r } = edgesAt(y);
  return { top: py(y), left: px(l), width: px(r) - px(l), labelLeft: px(r + 28), height: (17 / CROP.h) * 100 };
}

/** Level under a point given in % of the stage, or null when outside the tower. */
export function levelAt(xPct: number, yPct: number): number | null {
  const y = CROP.y + (yPct / 100) * CROP.h;
  const x = CROP.x + (xPct / 100) * CROP.w;
  if (y < floorYSrc(MAX_LEVEL) - 14 || y > floorYSrc(MIN_LEVEL) + 8) return null;
  const { l, r } = edgesAt(y);
  if (x < l - 12 || x > r + 12) return null;
  let best = MIN_LEVEL;
  let dist = Infinity;
  for (let n = MIN_LEVEL; n <= MAX_LEVEL; n++) {
    const d = Math.abs(floorYSrc(n) - y);
    if (d < dist) {
      dist = d;
      best = n;
    }
  }
  return best;
}

// ---- living room hotspots (left/top of the label, % of stage) -----------------------
export type RoomId = "bedroom" | "kitchen" | "bathroom";
export const HOTSPOTS: { id: RoomId; label: string; left: number; top: number }[] = [
  { id: "bedroom", label: "Bedroom", left: px(155), top: py(395) },
  { id: "kitchen", label: "Kitchen", left: px(728), top: py(473) },
  { id: "bathroom", label: "Bathroom", left: px(1257), top: py(410) },
];

export const LIVING_COPY = (level: number) => {
  const u = unitFor(level);
  const rooms = u.short === "one bedroom" ? "the bedroom" : "the bedrooms";
  return {
    title: `Level ${level}, ${u.short}`,
    text: `The living room opens onto the terrace; the kitchen, ${rooms} and the primary bathroom lead off it.`,
  };
};

export const BATHROOM_COPY = {
  title: "The primary bathroom",
  text: "A stone bath against lit travertine, beside a window to the sea.",
};

// Kitchen and bedroom are clickable in the video but never opened: copy is an assumption.
export const DETAIL_COPY: Record<Exclude<RoomId, "bathroom">, { title: string; text: string }> = {
  kitchen: { title: "The kitchen", text: "An oak and travertine island, open to the living room and the sea beyond." },
  bedroom: { title: "The bedroom", text: "A quiet room off the living space, with soft light and its own wardrobe wall." },
};

export const ASSETS = {
  tower: "/sites/torre/tower.jpg",
  living: "/sites/torre/living.jpg",
  bathroom: "/sites/torre/bathroom.jpg",
  enter: "/sites/torre/enter.mp4",
  enterPoster: "/sites/torre/enter-poster.jpg",
  toBathroom: "/sites/torre/to-bathroom.mp4",
  toLiving: "/sites/torre/to-living.mp4",
};

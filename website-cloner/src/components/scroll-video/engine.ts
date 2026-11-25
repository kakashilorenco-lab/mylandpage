// Framework-free scroll-scrubbed image-sequence player.
// A tall "track" element sets the scroll distance; a sticky canvas inside it draws the
// frame that matches scroll progress, eased so wheel steps feel like a camera move.
// templates/scroll-video.html carries a copy of this logic for plain HTML pages.

export type FrameSet = { path: string; pad: number; count: number; width: number; height: number; poster: string };
export type Manifest = { name: string; version: number; sets: { desktop: FrameSet; mobile?: FrameSet } };

export type Player = { destroy: () => void };

export function createScrollVideo(opts: {
  canvas: HTMLCanvasElement;
  track: HTMLElement;
  manifestUrl: string;
  onProgress?: (p: number) => void;
  ease?: number; // 0..1 per frame; 1 = no smoothing
}): Player {
  const { canvas, track, manifestUrl, onProgress } = opts;
  const ctx = canvas.getContext("2d");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ease = reduced ? 1 : (opts.ease ?? 0.16);
  const base = manifestUrl.slice(0, manifestUrl.lastIndexOf("/") + 1);
  let set: FrameSet | null = null;
  let images: (HTMLImageElement | null)[] = [];
  let loaded: boolean[] = [];
  let current = 0;
  let target = 0;
  let drawn = -1;
  let raf = 0;
  let alive = true;
  let visible = true;

  const url = (i: number) => base + set!.path.replace("{n}", String(i + 1).padStart(set!.pad, "0"));

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const r = canvas.getBoundingClientRect();
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    drawn = -1;
  }

  function nearestLoaded(i: number) {
    for (let d = 0; d < loaded.length; d++) {
      if (loaded[i - d]) return i - d;
      if (loaded[i + d]) return i + d;
    }
    return -1;
  }

  function draw(i: number) {
    const k = nearestLoaded(i);
    if (k < 0 || k === drawn || !ctx) return;
    const img = images[k]!;
    // object-fit: cover
    const s = Math.max(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight);
    const w = img.naturalWidth * s;
    const h = img.naturalHeight * s;
    ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
    drawn = k;
  }

  function progress() {
    const r = track.getBoundingClientRect();
    const total = r.height - window.innerHeight;
    return total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0;
  }

  function tick() {
    if (!alive) return;
    if (set && visible) {
      const p = progress();
      target = p * (set.count - 1);
      current += (target - current) * ease;
      if (Math.abs(target - current) < 0.01) current = target;
      draw(Math.round(current));
      onProgress?.(set.count > 1 ? current / (set.count - 1) : 0);
    }
    raf = requestAnimationFrame(tick);
  }

  // Load the first frame, then coarse-to-fine (every 16th, 8th, 4th…) so scrubbing works
  // almost immediately and sharpens as the rest arrives.
  function load() {
    const n = set!.count;
    const order: number[] = [];
    const seen = new Set<number>();
    for (const stride of [n, 16, 8, 4, 2, 1]) {
      for (let i = 0; i < n; i += stride) {
        if (!seen.has(i)) {
          seen.add(i);
          order.push(i);
        }
      }
    }
    let next = 0;
    const pump = () => {
      if (!alive || next >= order.length) return;
      const i = order[next++];
      const img = new Image();
      img.decoding = "async";
      img.onload = img.onerror = () => {
        loaded[i] = img.naturalWidth > 0;
        if (loaded[i]) images[i] = img;
        if (i === 0) draw(0);
        pump();
      };
      img.src = url(i);
    };
    for (let c = 0; c < 6; c++) pump();
  }

  const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), { rootMargin: "200px" });
  io.observe(track);
  window.addEventListener("resize", resize);

  fetch(manifestUrl)
    .then((r) => r.json() as Promise<Manifest>)
    .then((m) => {
      if (!alive) return;
      const portrait = window.innerWidth / window.innerHeight < 0.8;
      set = portrait && m.sets.mobile ? m.sets.mobile : m.sets.desktop;
      images = new Array(set.count).fill(null);
      loaded = new Array(set.count).fill(false);
      resize();
      load();
    })
    .catch(() => {});

  raf = requestAnimationFrame(tick);
  return {
    destroy() {
      alive = false;
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("resize", resize);
    },
  };
}

/** Opacity for a caption shown between `from` and `to` (progress 0..1), with soft edges. */
export function sectionOpacity(p: number, from: number, to: number, edge = 0.04) {
  if (p < from - edge || p > to + edge) return 0;
  if (p < from + edge) return Math.min(1, (p - (from - edge)) / (2 * edge));
  if (p > to - edge) return Math.min(1, ((to + edge) - p) / (2 * edge));
  return 1;
}

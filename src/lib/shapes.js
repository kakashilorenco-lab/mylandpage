// Formas orgânicas: blobs gerados por seed e os traçados da fita de tinta.

function mulberry32(a) {
  return () => {
    let t = (a += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Blob fechado e suave (Catmull-Rom → Bézier cúbica) em um viewBox 500×500. */
export function blobPath(seed, { points = 9, radius = 190, variance = 0.34 } = {}) {
  const rand = mulberry32(seed)
  const pts = Array.from({ length: points }, (_, i) => {
    const a = (i / points) * Math.PI * 2
    const r = radius * (1 - variance / 2 + rand() * variance)
    return [250 + Math.cos(a) * r, 250 + Math.sin(a) * r]
  })
  const at = (i) => pts[(i + points) % points]
  const f = (n) => n.toFixed(1)
  let d = `M${f(pts[0][0])},${f(pts[0][1])}`
  for (let i = 0; i < points; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)]
    d += ` C${f(p1[0] + (p2[0] - p0[0]) / 6)},${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(
      p2[0] - (p3[0] - p1[0]) / 6,
    )},${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])},${f(p2[1])}`
  }
  return d + 'Z'
}

export const BLOBS = [11, 27, 42, 58, 73].map((seed) => blobPath(seed))

// Traçados da fita — desenhados em um canvas de 1440 de largura.
export const RIBBONS = {
  heroA:
    'M -60 330 C 140 110 420 90 600 250 C 760 390 940 470 1090 360 C 1230 255 1170 90 1010 110 C 850 130 800 330 930 450 C 1080 590 1300 560 1500 400',
  heroB:
    'M 1500 560 C 1240 700 1040 560 840 680 C 640 800 420 660 240 780 C 100 872 80 1010 260 1040 C 420 1066 480 940 380 900',
  problem:
    'M 1500 120 C 1180 60 980 200 900 380 C 820 560 980 700 1140 620 C 1300 540 1240 340 1060 330 C 800 315 620 520 420 640 C 260 735 80 720 -60 620',
  method:
    'M -60 200 C 200 80 420 220 520 400 C 640 620 900 700 1080 560 C 1240 435 1160 240 1000 250 C 820 262 760 480 900 640 C 1040 800 1300 800 1500 700',
  mentor:
    'M 1500 160 C 1240 100 1100 260 1180 420 C 1260 580 1100 720 900 660 C 700 600 560 760 360 800 C 200 832 60 780 -60 860',
  pricing:
    'M -60 140 C 240 60 480 180 620 330 C 760 480 700 640 560 620 C 420 600 420 430 580 400 C 800 360 1100 520 1500 380',
  cta: 'M 760 -40 C 740 100 560 150 430 290 C 280 450 340 700 600 780 C 860 860 1120 720 1130 500 C 1140 300 940 180 740 220 C 560 256 470 400 520 520',
  footer:
    'M -60 310 C 200 370 380 130 560 110 C 760 88 800 290 960 270 C 1140 248 1200 50 1500 90',
}

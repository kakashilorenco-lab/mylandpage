# Remake — torre-demo → casa de praia

Original: `public/scroll/torre-demo/`. A drone flies from a wide view of the tower up the facade, onto a level-14 balcony and through the glass into the living room, then walks to the primary bathroom. The shot sheet is `shots/shots-sheet.jpg`.

New subject (example, swap for the real project): **a modern beach house on the coast of Santa Catarina, Brazil**, three storeys, white board-formed concrete, freijó wood louvres, glass walls and an infinity pool, at blue hour.

The camera path and the caption rhythm stay the same, so the page only needs new captions.

| Shot | Progress (page) | Seconds | Camera move (copied from the original) | New subject |
|---|---|---|---|---|
| 0 | — | still | Hero still: wide view from the water, building centred | The house from the beach |
| 1 | 0 → 0.35 | 6–8 | Slow drone push-in and rise from the wide shot to the upper facade | Facade, pool terrace |
| 2 | 0.35 → 0.7 | 6–8 | Continue the rise and turn toward one balcony, then glide through the open glass door into the living room | Main suite terrace → living room |
| 3 | 0.7 → 1 | 5–6 | Slow walk forward across the living room toward the bathroom door, then into the bathroom | Living room → stone bathroom with sea view |

## Shot 0 — hero still (image generation, used as shot 1's start frame)

Flow (image) / Higgsfield (image) / any image model:

```
Photorealistic architectural photograph, wide shot from the calm water at blue hour:
a three-storey modern beach house on a green hillside on the coast of Santa Catarina,
Brazil. White board-formed concrete, horizontal freijó wood louvres, floor-to-ceiling
glass, infinity pool on the middle terrace, warm interior lights glowing, palm trees,
gentle sky gradient from deep blue to peach. House centred in frame, 16:9, 24mm lens,
eye level slightly above the water. No people, no boats, no text.
```

## Shot 1 — rise toward the facade

**Start frame:** the shot 0 image. **End frame (optional):** none, let it land.

Google Flow (Frames to Video, first frame = shot 0):
```
[Shot 1 of 3 — continuous single take, no cuts]
Camera: slow steady drone push-in combined with a gentle rise, starting from the wide
view over the water and ending close to the upper facade at the middle terrace, camera
always facing the house, 24mm wide lens, constant speed.
Subject: the same three-storey modern beach house — white board-formed concrete, freijó
wood louvres, floor-to-ceiling glass, infinity pool on the middle terrace.
Setting: coast of Santa Catarina, Brazil, blue hour, warm interior lights, calm sea.
Style: photorealistic architectural visualization, cinematic, high detail, natural
reflections, stable geometry, no motion blur.
Continuity: starts exactly on the provided start frame; ends framing the glass doors of
the upper-floor suite terrace.
Avoid: people, vehicles, boats, text, logos, camera shake, cuts, warping architecture.
```

Higgsfield (start frame = shot 0, camera preset: **crane up** or **dolly in**):
```
Continuous single take. Slow steady push-in and rise toward a modern three-storey beach
house of white board-formed concrete, freijó wood louvres and glass, infinity pool,
coast of Santa Catarina at blue hour, warm interior lights. Ends framing the upper-floor
terrace glass doors. Photorealistic architectural visualization, stable geometry, no
people, no text, no camera shake.
```

Then: `npm run scroll-video -- frame shot1.mp4 --at last --out shot1-last.png`

## Shot 2 — onto the terrace and through the glass

**Start frame:** `shot1-last.png`.

Google Flow:
```
[Shot 2 of 3 — continuous single take, no cuts]
Camera: the drone keeps gliding forward at the same speed, crosses the suite terrace and
passes through the open sliding glass door into the double-height living room, ending at
eye level facing the room, 24mm wide lens, constant speed.
Subject: same beach house; interior of light travertine floors, oak cabinetry, a low white
linen sofa, a stone kitchen island, warm cove lighting, sea visible through glass walls.
Style: photorealistic architectural visualization, cinematic, stable geometry.
Continuity: starts exactly on the provided start frame; ends in the living room looking
toward an open door on the right that leads to the bathroom.
Avoid: people, text, camera shake, cuts, warping furniture.
```

Higgsfield (start frame = `shot1-last.png`, preset: **FPV drone** or **dolly in**):
```
Continuous single take. Glide forward across a terrace and through an open sliding glass
door into a double-height living room with travertine floors, oak cabinetry, white linen
sofa, stone kitchen island and warm cove lighting, sea behind glass walls. End at eye
level facing an open door on the right. Photorealistic, stable geometry, no people.
```

Then: `npm run scroll-video -- frame shot2.mp4 --at last --out shot2-last.png`

## Shot 3 — walk to the bathroom

**Start frame:** `shot2-last.png`.

Google Flow:
```
[Shot 3 of 3 — continuous single take, no cuts]
Camera: slow steady walk-through at eye level, moving forward across the living room and
through the open door on the right into the primary bathroom, ending facing a freestanding
stone bathtub under a lit travertine wall beside a window to the sea, 24mm lens, gimbal
smooth, constant speed.
Subject: same house interior; bathroom of warm travertine, brushed bronze taps, oak vanity.
Style: photorealistic architectural visualization, cinematic, stable geometry.
Continuity: starts exactly on the provided start frame.
Avoid: people, text, mirrors showing a camera, camera shake, cuts.
```

Higgsfield (start frame = `shot2-last.png`, preset: **dolly in**):
```
Continuous single take, smooth eye-level walk forward through a living room and an open
door into a primary bathroom with a freestanding stone bathtub, lit travertine wall,
bronze taps and a window to the sea at blue hour. Photorealistic, stable geometry, no
people, no text.
```

## Build

```bash
npm run scroll-video -- check shot1.mp4 shot2.mp4 shot3.mp4
npm run scroll-video -- build shot1.mp4 shot2.mp4 shot3.mp4 --name casa-praia --frames 240 --trim 0.15
```

Point the demo at `/scroll/casa-praia/manifest.json` and swap the captions, for example:

- 0 → 0.22 "Casa Atlântica" (eyebrow: "Santa Catarina · Brasil")
- 0.3 → 0.55 "Três andares sobre o mar"
- 0.66 → 0.82 "Entre pela suíte"
- 0.88 → 1 "Banho com vista"

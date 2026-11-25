# Scroll-driven "3D" sites: clone, then remake with AI video

Most "3D websites" that show a camera flying around a house, a product or a building are not running real-time 3D. They show **one continuous camera shot** (a video or a numbered image sequence) and map scroll progress to the frame. Scrolling down moves the camera forward and scrolling up moves it back. Captions fade in at fixed points of the take.

That gives a two-step workflow:

1. **Clone faithfully** with the source's own footage.
2. **Offer a remake.** Generate a new take with AI video (Google Flow / Veo, Higgsfield, or any tool that accepts start/end frames) that copies the original's camera path and rhythm but shows the user's house, building or product. Then swap the footage. The page logic does not change.

Tooling: `npm run scroll-video -- check | frame | shots | import | build`, the `ScrollVideo` component (`src/components/scroll-video/`), and the framework-free `templates/scroll-video.html`. A working demo is `/scroll-demo` (`public/scroll/torre-demo/`).

## 1. Recognise it

- **From a URL.** `npm run capture` reports a `🎬 Scroll-driven 3D media` section in `brief.md` when it finds either of these:
  - **Image sequences:** 20 or more numbered image URLs. They are saved in order to `public/sites/<site>/sequence-N/`, and gaps between the lowest and highest index are fetched directly.
  - **Pinned media:** a big canvas or a non-autoplay video inside a sticky or fixed parent, with the height of the scroll track in screens.

  Also look for GSAP ScrollTrigger with `scrub`, or for `video.currentTime` set in a scroll handler. A `<video>` that is scrubbed by scroll can be downloaded with the other assets.
- **From a video of the site** (Reels, etc.): during scroll segments the camera keeps moving while the page does not scroll, and captions fade at points along the take. Cut those segments out of the rectified recording (see `from-video.md`) and use them as interim footage. The quality will be lower, so say so and offer the remake.

## 2. Clone with the original footage

```bash
# numbered frames from the capture
npm run scroll-video -- import public/sites/<site>/sequence-1 --name <site>
# or a scrubbed video / clips (several clips are joined in order)
npm run scroll-video -- build public/sites/<site>/videos/<file>.mp4 --name <site> --frames 240
```

Each command writes `public/scroll/<name>/`: WebP frames (desktop, plus mobile when `--mobile` is given), a poster, an all-keyframe mp4 and `manifest.json`. Check `contact-sheet.png`.

Then build the section with the component:

```tsx
<ScrollVideo
  src="/scroll/<name>/manifest.json"
  length={6} // scroll distance in screen heights: match the source's track height from the brief
  sections={[{ from: 0, to: 0.2, title: "…", text: "…" }, …]} // caption ranges as fractions of the take
/>
```

Copy the caption ranges from the source. Scroll to a caption, read `scrollY / (track height − viewport)` and use that as `from` / `to`. For plain HTML pages, edit `MANIFEST`, `LENGTH` and `SECTIONS` at the top of `templates/scroll-video.html`. Then compare as usual.

## 3. Offer the remake

After the faithful clone works, ask the user whether they want the same experience with **their own** subject: another house, building, product or interior. If they say yes:

### 3a. Break the original into shots

```bash
npm run scroll-video -- shots <original clip | public/sites/<site>/sequence-1> --name <slug>
```

This writes `docs/scroll/<slug>/shots/` with start, mid and end frames per shot, plus `shots-sheet.jpg` (one row per shot) and `shots.json` (progress range and seconds). A shot is split wherever the original cuts, and long moves are split about every 4 s so that each one fits a single AI generation. Read the sheet and describe every shot:

- what the camera does: dolly in or out, crane up or down, orbit, truck sideways, drone ascent, push through glass, walk-through
- the lens: wide or tele
- the speed
- the subject and the light: time of day, materials

### 3b. Write `docs/scroll/<slug>/remake.md`

Write one block per shot, in order:

| Shot | Progress | Seconds | Camera move (copied) | New subject in this shot |
|---|---|---|---|---|

Under the table, write per shot: the **Flow prompt**, the **Higgsfield prompt**, the **start frame** to use, and the **end frame** if the tool supports one.

Rules that make the result feel like real 3D when scrubbed:

1. **One continuous camera move per shot**, at constant speed. Do not use cuts, fast whips, zoom pumps or handheld shake. Scrubbing exaggerates every jitter.
2. **Chain the shots.** The last frame of shot N is the start frame of shot N+1. After each generation run `npm run scroll-video -- frame shotN.mp4 --at last --out shotN-last.png` and upload that image as the next shot's start/first frame. Use **Frames to Video** with a first frame in Flow (and a last frame where it is offered), and the start/end frame option in Higgsfield. Run `npm run scroll-video -- check shot*.mp4` to verify that every join says seamless.
3. **Lock the look first.** Generate one hero still of the new subject, with the same angle and time of day as shot 1. Use it as shot 1's start frame and repeat the same style words in every prompt.
4. **No moving people, cars, water splashes, text or logos** unless they are the point. They morph between shots and are distracting when played backwards.
5. **Format.** Use 16:9 for desktop and keep the subject centred so the mobile crop (cover) still works. When mobile matters, also generate 9:16 versions and pass them with `--mobile`. Use the highest resolution available (1080p) and 24–30 fps.
6. **Length.** About 1 second of footage per screen of scroll reads well. A typical page uses 4–8 shots of 4–8 s each (Veo clips are about 8 s).

Prompt template (English works best in both tools):

```
[Shot N of M — continuous single take, no cuts]
Camera: <exact move copied from the original, e.g. "slow steady drone ascent along the
facade, camera facing the building, 24mm wide lens, constant speed">.
Subject: <new subject, e.g. "a three-storey modern beach house of white board-formed
concrete, oak louvres and floor-to-ceiling glass, infinity pool on the terrace">.
Setting: <surroundings + time of day, e.g. "tropical coastline at blue hour, warm interior
lights glowing, calm sea in the background">.
Style: photorealistic architectural visualization, cinematic, high detail, natural
reflections, stable geometry, no motion blur.
Continuity: starts exactly on the provided start frame; ends <where the next shot begins,
e.g. "facing the living-room glass doors at terrace level">.
Avoid: people, vehicles, text, logos, camera shake, cuts, warping architecture.
```

- **Higgsfield:** pick the matching camera preset (for example dolly in, crane up, orbit or FPV drone) instead of describing the move. Keep the rest of the prompt.
- **Flow:** use the same text. To grow a single take, use **Extend** to continue it, or chain new generations from the last frame.
- Preset and feature names change often. Check the current UI and describe the move in words if a preset is missing.

If the user has no credits, still deliver `remake.md` with every prompt ready to paste, plus the start-frame images. Generation can be done later.

Other generators work the same way, for example Kling, Runway, Luma or the ElevenLabs video tools if that connector is enabled. Never start paid generations without the user's go-ahead.

### 3c. Swap the footage

```bash
npm run scroll-video -- check shot1.mp4 shot2.mp4 …              # every join should be seamless
npm run scroll-video -- build shot1.mp4 shot2.mp4 … --name <slug>-v2 --frames 240 [--xfade 0.3] [--trim 0.15]
```

- `--trim` drops the ease-in and ease-out that many generators add at the start and end of a clip.
- `--xfade` hides small jumps.

Point the component or template at the new manifest. Rewrite the captions for the new subject, adjust the `from` / `to` ranges to where its rooms appear, and check the page again.

## Budget

- 240 WebP frames at 1600 px ≈ 8–15 MB, which is fine for a hero.
- Keep each set under about 40 MB. Use `--frames 180` or `--quality 62` when needed.
- The player loads frame 1, then every 16th, 8th, 4th… frame, so scrubbing works within the first second and sharpens as the rest arrives.
- With `prefers-reduced-motion` the player jumps straight to the target frame instead of easing.

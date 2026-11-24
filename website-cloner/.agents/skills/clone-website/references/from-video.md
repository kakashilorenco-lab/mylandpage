# Clone a site from a video

Use when the source is a **video**, not a URL. Examples: a Reel, TikTok, Short or tweet that shows someone scrolling a website, a screen recording, or a file the user uploaded.

## 1. Get the video and watch it

```bash
npm run video -- "<instagram/tiktok/youtube/x link or path/to/video.mp4>" --name <slug>
```

- Links are downloaded with `yt-dlp`, together with the post caption (`--write-info-json`). Instagram often needs a login. If the download fails, retry with `--cookies-from-browser chrome` (or `firefox` / `safari`) on the user's machine. Otherwise ask the user for the video file.
- The analysis goes to `docs/research/<slug>/video/`. Read `video-brief.md` first.
- **Check the crop before anything else.** Open `crop-guide.png`. The green box is the area that was analysed, and guide lines mark every 5% (red lines every 10%). The automatic crop removes black bars and flat, static borders. If the website sits inside a busy edit (face cam, captions, a phone mockup or a blurred background), re-run with `--crop x%,y%,w%,h%` taken from the guide, e.g. `--crop 12%,18%,76%,64%`. Everything after this depends on the crop.
- The default assumption is that a portrait video shows a 390 CSS px phone and a landscape video shows a 1440 CSS px desktop. Pass `--css-width` when the device is clearly different, for example a tablet at 768, or 1280 / 1920.

## 2. Look at the evidence (you can read images)

| File | Use |
|---|---|
| `contact-sheet.png` | The whole video in one image: scenes, scroll positions, pauses, animation start/mid/end |
| `scenes/scene-NN-page.png` | **Full page rebuilt from the scroll.** Frames are aligned by measured scroll offset, each row comes from the frame where it was closest to the screen centre, and sticky bands are kept out |
| `scenes/scene-NN-page@1x.png` | The same page at CSS width (1 px = 1 CSS px). Use it for measuring and for `compare --ref` |
| `scenes/scene-NN-top-band.png` / `bottom-band.png` | Fixed header/nav, or browser/app chrome, which can show the address bar |
| `keyframes/*.png` | Full-resolution frames, best for reading small text and cutting assets |
| `motion/motion-NN-strip.png` + `.mp4` | Start / mid / end of each animation that happens without scrolling |
| `video-brief.md` | Timeline, sections with y-positions, background colours and OCR text, palette, reveal-on-scroll ranges, floating fixed elements, and domain / @handle leads |

Read the reconstructed page(s) and several keyframes at full size. A thumbnail alone is not evidence.

## 3. Find the live site, which is always better

Check the `Find the live site first` leads: domains read from the page, the address bar or the caption, plus @handles. Also check logos and brand names in the keyframes, and search the web for them. If a candidate loads and matches the video, **switch to the normal URL workflow** (`npm run capture -- <url>`). The live site gives the real fonts, images, text, breakpoints and interactions, which the video can only approximate. Use the video afterwards to confirm the animations and states the user saw. Tell the user which site you found.

## 4. Rebuild from the video when no live site is available

Work section by section from `scene-NN-page@1x.png` and the section table in the brief. All y-positions and heights in the brief are already in CSS px.

- **Layout:** measure widths, paddings, gaps and radii on the @1x page. Detected sticky bands and floating elements become `position: sticky` / `fixed`.
- **Text:** use the OCR lines and check them against the keyframes. OCR is wrong on stylised type. Text height in CSS px is in `video-brief.json`; font-size ≈ text height × 1.3–1.4.
- **Fonts:** identify them visually (serif / sans / geometric / grotesk, x-height, distinctive letters) and pick the closest Google Font. List every substitute for the user.
- **Colours:** the palette is video-compressed. Sample flat areas, round to clean values, and prefer consistent tokens over noisy pixels.
- **Images and logos:** cut them from full-resolution keyframes with `npm run crop -- <keyframe.png> x y w h public/sites/<slug>/images/<name>.png` (pixels or %). Use them as placeholders and tell the user which ones should be replaced by originals, because video frames are low quality and may be copyrighted.
- **Motion:**
  - Reveal ranges are content that changed while scrolling into view. Use an IntersectionObserver and an opacity/translate transition, and match the timing seen in the keyframes.
  - Animations without scrolling (carousel, counter, typing, hover) come with time ranges and screen areas. Read their strips. A large transition is usually a slide, fade or page change.
  - The timeline's scroll speed and pauses tell you what the creator wanted to show off.
- **Multiple scenes** are usually multiple pages or states (menu open, modal, another route). Map each one to a route or a state.
- **Responsive:** a video shows one device. Build that one faithfully, then derive the other breakpoint conservatively, and say so.

## 5. Compare against the video

```bash
npm run dev
npm run compare -- --ref docs/research/<slug>/video/scenes/scene-01-page@1x.png http://localhost:3000 --viewports mobile   # or desktop
```

The reference image is scaled to the viewport width and diffed like a live source. Use the worst bands and the montage to fix geometry and spacing first. Expect lower similarity than with a live source because of compression, carousels caught mid-slide and floating buttons. Judge by eye at full size.

## Deliver

Report:
- the site lead(s), and whether the live site was used
- the scenes rebuilt
- the fonts and assets that were substituted
- the animations reproduced
- the parts of the site the video never showed

Remind the user to replace cropped media with their own, and not to republish someone else's brand, copy or photos as their own.

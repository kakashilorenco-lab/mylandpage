---
name: copiar-site
description: Copiar / clonar um site e reconstruí-lo igual, a partir de uma URL OU de um VÍDEO em que o site aparece (link do Instagram, Reels, TikTok, YouTube, X, ou gravação de tela). Use quando o usuário disser "copia esse site", "clona esse site", "usa a skill de copy", "reproduz o site que aparece no vídeo", "vi um site no insta", ou mandar um link de vídeo/site pedindo uma réplica. Clone websites from a URL or from a video of the site.
argument-hint: "<url-do-site | link-do-video | caminho/do/video.mp4>"
---

# Copiar site (URL ou vídeo)

The tooling lives in `website-cloner/` (Next.js template + capture/video/compare scripts). Work inside that folder.

1. Setup (once per machine): `cd website-cloner && npm install`. Video input also needs `ffmpeg`, `yt-dlp` (`pip install yt-dlp`) and, for text extraction, `tesseract-ocr` + `tesseract-ocr-por`. Check them with `which` and install what is missing.
2. Read `website-cloner/.agents/skills/clone-website/SKILL.md` completely and follow it, using the user's input as the source:
   - a website URL → the normal capture workflow
   - a video link or file → step 0 of that skill (`references/from-video.md`)
3. Talk to the user in Portuguese and in an informal tone. At the end, list what was copied, what had to be approximated (fonts, images, sections the video never showed) and how to preview it (`npm run dev`).

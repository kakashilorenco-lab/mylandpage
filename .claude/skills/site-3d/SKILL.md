---
name: site-3d
description: Criar ou recriar sites "3D" em que um vídeo de câmera (voo, órbita, aproximação) avança e volta com o scroll do mouse — gerando o vídeo com IA no Google Flow (Veo) ou Higgsfield e sincronizando com a rolagem. Use quando o usuário falar em "site 3D", "vídeo sincronizado com o scroll", "vídeo que anda com a rolagem", "criar vídeo no Flow/Higgsfield pro site", "trocar a casa do vídeo", ou quiser o remake de um site 3D clonado com outro imóvel/produto.
argument-hint: "<descrição do site | link do site 3D | clipes .mp4 gerados>"
---

# Site 3D com vídeo de IA sincronizado ao scroll

Tooling lives in `website-cloner/` (run `npm install` there once; needs `ffmpeg`).

Read `website-cloner/.agents/skills/clone-website/references/scroll-video.md` completely and follow it:

- **Cloning a 3D site** (URL or video): run the normal copiar-site flow first, rebuild the scroll section with the original footage, then offer the remake.
- **Remake / new site**: shot list → `docs/scroll/<slug>/remake.md` with Google Flow and Higgsfield prompts chained by start/end frames → the user generates the clips → `npm run scroll-video -- check` → `build` → `ScrollVideo` component or `templates/scroll-video.html`.
- **The user already has clips**: `check`, then `build`, then wire them up with captions.

Never start paid AI generations without the user's go-ahead. If they have no credits, deliver the prompts and start frames ready to paste.

Talk to the user in Portuguese, informally. At the end, tell them how to preview it (`npm run dev` → the page, or open the template) and what still depends on them (generating the clips, choosing the captions).

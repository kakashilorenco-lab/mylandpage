# HackSchool — landing page (demo)

Demo de landing page do curso da HackSchool, com foco em motion design.
Todo o conteúdo (textos, módulos, depoimentos, preços) é placeholder.

## Rodando

```bash
npm install
npm run dev      # desenvolvimento
npm run build    # gera dist/
npm run preview  # serve o build
```

## Stack

React + Vite + Tailwind CSS v4, GSAP (ScrollTrigger, DrawSVG, MorphSVG, SplitText, CustomEase) e Lenis para scroll suave.

## Estrutura

```
src/
  App.jsx            tema light/dark por scroll, Lenis, reveals globais
  lib/gsap.js        plugins, easings e o hook useMotion (respeita prefers-reduced-motion)
  lib/motion.js      helpers: splitReveal, fadeReveal, scrubDraw, floatCards, popCards
  lib/shapes.js      gerador de blobs e traçados da fita de tinta
  components/        Nav, Ribbon, FloatCard, Button magnético
  sections/          Hero, Problem, Method, Mentor, Proof, Pricing, Faq, Closing
legacy/index.html    página antiga (Método JPS), preservada
```

Onde editar o conteúdo: os textos ficam no topo de cada arquivo em `src/sections/`
(arrays `MODULES`, `PLANS`, `QUOTES`, `STATS`, `ITEMS`). Cores e fontes ficam em `src/index.css` (`@theme`).

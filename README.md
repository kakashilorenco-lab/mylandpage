# Ótica Valentim

Site institucional da Ótica Valentim — "A clareza como assinatura".
Next.js (App Router) · TypeScript estrito · Tailwind CSS v4 · GSAP.

```bash
npm install
npm run dev      # http://localhost:3000  →  /style-tile
npm run build
npm run lint
```

## Estado

**Marco 1 — fundação (aguardando aprovação):** estrutura de pastas, tokens,
componentes de marca em SVG e o style tile em `/style-tile`.

## Estrutura

Pastas marcadas com `·` ainda não existem; entram no marco indicado.

```
src/
  app/
    layout.tsx            fonte (Jost), metadados, <html lang="pt-BR">
    globals.css           TOKENS: cor, tipografia, movimento, grade
    icon.svg              favicon (Λ no círculo)
    page.tsx              página de espera (vira a Home no marco 2)
    style-tile/           style tile de uma página
  · colecoes/ armacoes/ provador-virtual/ lentes/ exame-de-vista/
  · agendar/ lojas/ a-valentim/ journal/ privacidade/ api/
  components/
    brand/                Wordmark, Lambda, CircleMark, LensMask, glyphs
  · layout/               navegação, rodapé, CTAs persistentes   (marco 2)
  · ui/                   botões, campos, cursor                  (marco 2)
  · catalog/ booking/ tryon/ lens-lab/                            (marcos 4–6)
  motion/
    tokens.ts             durações, curvas, estado inicial do focus-in
    eases.ts              registra lensPull e settle (CustomEase)
  · primitives/           Preloader, FocusIn, LineMask, Iris,
                          Inversion, FlipLink, Magnetic           (marco 3)
· lib/                    sanity, supabase, whatsapp, analytics
· sanity/                 schemas: frame, collection, unit, service, post
· e2e/                    Playwright (agendamento)
· .storybook/             primitivos de movimento e marca
```

## Regras da marca (resumo)

- Preto, branco e cinza. Sem cor de destaque.
- A palavra **VALENTIM** nunca é texto vivo: use `<Wordmark />`.
- Marca sem efeitos, gradientes ou sombras — só `currentColor`.
- Animar apenas `transform`, `opacity`, `filter`, `clip-path` e
  `letter-spacing` em títulos curtos.

## Pendências

- `[[TODO: substituir pelo SVG oficial]]` — `src/components/brand/glyphs.ts`
- `[[TODO: CIDADE]]`, endereço, unidades, WhatsApp, fotos, modelos GLB
- `index.html` na raiz é a página antiga do repositório (outro projeto);
  o Next.js a ignora. Decidir se sai.

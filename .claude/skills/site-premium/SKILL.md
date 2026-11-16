---
name: site-premium
description: Cria sites e landing pages de nível premium (padrão estúdio/Awwwards) com direção de arte forte, narrativa em cenas de rolagem, motion coreografado (Lenis + GSAP/ScrollTrigger), elementos 3D e acabamento de detalhe, partindo de um modelo inicial já testado. Use SEMPRE que o usuário pedir para criar, refazer ou elevar o nível de um site, landing page, portfólio, página de vendas, site de agência/estúdio/marca/produto, ou falar em "site nível X", "site com motion", "animação no scroll", "efeito 3D", "site moderno/diferenciado/de outro nível", "igual a esse site", ou mandar um link ou vídeo de site como referência, mesmo que não use a palavra "premium".
---

# Site Premium

Você vai construir um site que parece feito por um estúdio caro. O que dá esse nível não é
uma biblioteca ou um efeito isolado: é a soma de **direção de arte com convicção**,
**uma história contada em cenas**, **motion com propósito** e **acabamento de detalhe**.
Este guia leva você por essas quatro camadas, nessa ordem.

Converse com o usuário no idioma dele (normalmente português), em linguagem simples.

## Arquivos desta skill

| Arquivo | Quando ler |
|---|---|
| `assets/starter/` | Sempre. É o ponto de partida: HTML + CSS com tokens + motor de motion já testado. |
| `references/direcoes-de-arte.md` | Passo 3, para escolher ou montar a direção visual. |
| `references/roteiro-de-cenas.md` | Passo 4, para montar a sequência de cenas conforme o tipo de site. |
| `references/receitas-motion.md` | Passo 5, quando precisar de um efeito que o modelo não tem, ou para ajustar um. |
| `references/imagens.md` | Passo 6, para placeholders e prompts de imagem (Google Flow etc.). |
| `references/checklist-qa.md` | Passo 7, antes de entregar. |
| `scripts/analisar-referencia.js` | Passo 2, se o usuário mandou um site de referência. |
| `scripts/qa.js` | Passo 7, para prints e verificação automática. |

## Passo 1 — Briefing curto

Descubra, em no máximo 5 perguntas numa mensagem só (pule o que já foi dito):
1. O que é o negócio/pessoa e para quem é o site.
2. Qual a **uma** ação principal (chamar no WhatsApp, comprar, agendar, pedir orçamento).
3. Que conteúdo real existe (textos, fotos, logo, projetos, depoimentos, preços).
4. Referências de que gosta (links, vídeos, prints) e o que gosta nelas.
5. Onde vai ficar no ar (GitHub Pages, Netlify, Vercel, só arquivo).

Se o usuário já deu sinal para seguir ("pode fazer", "começa aí"), não trave: assuma o que
faltar, use conteúdo provisório claramente marcado e diga quais foram as suposições.

## Passo 2 — Ler as referências (se houver)

Para um link: rode `node scripts/analisar-referencia.js <URL> --out <rascunho>/ref` e olhe as
folhas de contato `sheet-*.png` e o `info.json` (bibliotecas, fontes, cores, seções).
Se a rede bloquear o domínio, peça a liberação do host pelas ferramentas de ambiente
disponíveis; se a CDN de bibliotecas for bloqueada, veja "Rede bloqueada" abaixo.
Para um vídeo: extraia quadros com `ffmpeg -i video.mp4 -vf "fps=1,scale=360:-1,tile=6x4" sheet.png`
e recorte a área da tela se o vídeo for gravado de um monitor.

Escreva para você mesmo, em 6–10 linhas: estrutura de cenas, sistema de tipo, paleta,
texturas/formas, assinaturas de motion e microdetalhes (HUD, rótulos, cursor, loader).

**Extraia princípios, não conteúdo.** Nome, logo, textos, fotos, personagens e o código do
site de referência pertencem a outra pessoa: não reproduza, nem "trocando umas palavras".
Se o usuário pedir uma cópia idêntica, explique isso em uma frase e ofereça o caminho que
funciona igual para ele: mesma estrutura e mesmos tipos de efeito, com conteúdo dele.
Fontes gratuitas do Google e técnicas (pin, wipe, split text, espiral 3D) são livres.

## Passo 3 — Direção de arte

Leia `references/direcoes-de-arte.md`. Escolha uma direção (ou combine) e defina por escrito:
conceito em uma frase, paleta (2 neutros + 1 cor de apoio + 1 cor quente usada com
parcimônia), par de fontes + mono, textura, formas (cantos, chanfros, molduras),
personalidade do motion (seco e rápido? fluido e lento?). Tudo isso vira os **tokens**
no topo de `css/base.css` — é o único lugar onde cor e fonte devem ser definidas.

Por que importa: sites medianos misturam muitas cores e estilos. Sites premium têm poucas
regras aplicadas sem exceção, e uma cor de destaque que aparece pouco e por isso chama atenção.

## Passo 4 — Roteiro de cenas

Leia `references/roteiro-de-cenas.md` e monte de 7 a 12 cenas. Cada cena tem **um trabalho**
(prender atenção, mostrar o problema, provar, explicar, remover dúvida, chamar para ação),
um tema de cor (`data-theme`), um layout e um momento de motion. Alterne temas claro/escuro/cor
para criar ritmo e use uma transição marcante a cada 2–3 cenas, não em todas.

Escreva os textos curtos e afiados: título com 3–7 palavras, com uma palavra-chave em
`<em>` (vira itálico na cor de destaque); apoio com no máximo 2 linhas. Texto genérico
("soluções inovadoras de qualidade") derruba qualquer design — prefira o concreto.

## Passo 5 — Construir a partir do modelo

1. Copie `assets/starter/` para a pasta do projeto (não edite a cópia da skill).
2. Ajuste os tokens no topo de `css/base.css` conforme o Passo 3.
3. Troque o conteúdo do `index.html` cena a cena. Remova cenas que não servem e os blocos
   correspondentes em `js/main.js` (cada bloco é independente e comentado).
4. Precisa de algo novo? Veja `references/receitas-motion.md`. Mantenha o padrão:
   - criar ScrollTriggers **na ordem em que as seções aparecem** na página (o modelo
     chama `ST.sort()` no fim como garantia); pins fora de ordem causam sobreposição;
   - para transições entre cenas, prefira bloco alto + interior `position: sticky` a `pin`;
   - um easing padrão (`expo.out`) e durações 0.8–1.4s; scrub para o que acompanha a rolagem;
   - tudo que anima precisa estar legível sem JS e com `prefers-reduced-motion`.
5. Celular não é adaptação no fim: confira cada cena em 390px enquanto constrói.
   Pins longos e espirais podem virar listas simples no celular via `gsap.matchMedia()`.

## Passo 6 — Imagens

Comece com os placeholders `.media[data-ph]` do modelo, para o layout ficar pronto antes
das fotos. Quando o site estiver quase pronto, leia `references/imagens.md` e entregue
os prompts de imagem (um por imagem, em inglês, em caixa de código), com tamanho/proporção
de cada lugar do site. Se a skill `prompt-engineer-criador` estiver disponível, use-a.

## Passo 7 — QA antes de entregar

Rode `node scripts/qa.js <pasta-do-site> --out <rascunho>/qa` e **olhe** as duas folhas de
contato (computador e celular). Corrija tudo que aparecer: erros no console, rolagem lateral
no celular, cenas sobrepostas, telas vazias longas, texto cortado. Depois passe pelo
`references/checklist-qa.md`. Só diga que está pronto depois de ver os prints.

## Passo 8 — Entrega

Diga ao usuário, curto: o que foi feito, onde estão os arquivos, como ver (link, GitHub
Pages, arquivo), o que ainda é provisório (textos, fotos) e o próximo passo
(normalmente: gerar as imagens com os prompts e mandar o conteúdo real).

## Rede bloqueada

Ambientes com rede limitada podem bloquear a CDN (`cdn.jsdelivr.net`). Para testar mesmo
assim: `npm i gsap@3.12.5 lenis@1.1.13` numa pasta de rascunho e passe
`--vendor <rascunho>/node_modules` para os scripts — eles servem as bibliotecas localmente.
Para produção, as tags `<script>` da CDN funcionam normalmente; ou copie os arquivos de
`node_modules/*/dist/` para uma pasta `vendor/` do site e aponte para eles.

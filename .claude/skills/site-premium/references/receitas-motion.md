# Receitas de motion

Código pronto para colar. Todas assumem GSAP + ScrollTrigger + Lenis carregados, como no
modelo (`G = gsap`, `ST = ScrollTrigger`, `$`/`$$` = querySelector/All). As que já existem
no `assets/starter/js/main.js` estão marcadas com ★ — lá estão completas.

## Índice
1. Base: Lenis + ScrollTrigger ★
2. Regras que evitam bugs
3. Títulos: palavras sobem ★ · texto embaralha ★ · texto acende com a rolagem
4. Botão magnético ★ · cursor ★ · brilho que segue o mouse ★
5. Cena presa com timeline ★ · troca de passos com anel ★
6. Transições: faixas ★ · pixels ★ · cortina circular · cortina de imagem ★
7. Cards empilhados ★ · rolagem horizontal · espiral 3D ★
8. Peças que explodem do centro · pontos clicáveis na foto
9. Revelar com o mouse (máscara rasgando) · tilt 3D em card
10. Linha que se desenha · contador · marquee
11. Formas e texturas: chanfro, grão ★, grade ★, linhas topográficas
12. Loader com fonte de pontos

---

## 1. Base ★
```js
const lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
lenis.on("scroll", ScrollTrigger.update);
gsap.ticker.add((t) => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);
// âncoras: lenis.scrollTo(alvo, { duration: 1.4 })
```

## 2. Regras que evitam bugs
- **Crie ScrollTriggers na ordem do DOM.** Um pin criado depois de um gatilho que fica abaixo dele desloca tudo (cenas sobrepostas). Se não der, chame `ScrollTrigger.sort()` e `refresh()` no fim.
- **Transição entre cenas = bloco alto + filho `position: sticky`**, animado com `start: "top top", end: "bottom bottom", scrub`. Mais estável que `pin` e não cria espaço extra inesperado.
- **Nunca `overflow: hidden` no `body`/`html` para esconder rolagem lateral** — quebra o sticky. Use `overflow-x: clip`.
- **Elementos centralizados com `translateX(-50%)` + GSAP mexendo em `x`** brigam. Centralize com `left:0; right:0; margin-inline:auto; width:max-content` e deixe o `transform` livre para o GSAP.
- **`gsap.matchMedia()`** para ter pins só no computador e versões simples no celular; ele desfaz tudo ao mudar de tamanho.
- **`prefers-reduced-motion`**: sem Lenis, sem pins, tudo visível. O modelo faz isso com a classe `no-motion`.
- **Fontes mudam alturas**: chame `ScrollTrigger.refresh()` depois de `document.fonts.ready`.

## 3. Títulos
**Palavras sobem ★** — `splitWords(el)` envolve cada palavra em `.sw > span` (máscara com `overflow:hidden`), depois:
```js
gsap.from(words, { yPercent: 110, rotate: 3, duration: 1.1, stagger: 0.045, ease: "expo.out",
  scrollTrigger: { trigger: el, start: "top 86%" } });
```
**Texto embaralha ★** — `scramble(el, 900)`: troca caracteres aleatórios até resolver. Bom para rótulos mono, nomes de projeto, seção atual no header.

**Texto acende com a rolagem** (manifesto):
```js
const w = splitWords(el); // ou spans simples por palavra
gsap.fromTo(w, { opacity: 0.12 }, { opacity: 1, stagger: 0.1, ease: "none",
  scrollTrigger: { trigger: el, start: "top 75%", end: "bottom 45%", scrub: true } });
```
Marque 2–3 palavras com fundo na cor de destaque (`<mark>`), como marca-texto.

## 4. Interação com mouse
**Magnético ★** — `gsap.to(el, { x: dx*.3, y: dy*.35 })` no `pointermove`, volta com `elastic.out(1,.4)`.
**Cursor ★** — `gsap.quickTo(c, "x")` + classe `.big` sobre links. `mix-blend-mode: difference` dá contraste em qualquer fundo. Esconda em `(hover: none)`.
**Brilho que segue o mouse ★** — pseudo-elemento com `radial-gradient` + `filter: blur(40px)`, posição por variáveis CSS `--gx/--gy` atualizadas no `pointermove`.

## 5. Cenas presas
**Timeline presa ★**
```js
const tl = gsap.timeline({ scrollTrigger: { trigger: "#cena", start: "top top", end: "+=240%", pin: true, scrub: 0.6 } });
tl.to(".copy", { opacity: 0, y: -80 }, 1.2)
  .fromTo(".palavra-1", { opacity: 0, yPercent: 40 }, { opacity: 1, yPercent: 0 }, 2)
  .to(".palavra-1", { opacity: 0, yPercent: -40 }, 2.7);
```
A posição (o número no fim) é o "tempo" dentro da rolagem: planeje como um storyboard.

**Passos com anel ★** — `ScrollTrigger.create({ pin:true, scrub:true, onUpdate })`: com `progress` calcule o passo atual, `stroke-dashoffset` do anel (`2πr * (1-p)`) e o preenchimento de cada segmento da barra. Troque o passo só quando o índice muda.

## 6. Transições
**Faixas diagonais ★** — 3 faixas `skewX(-24deg)` começando à direita; a última é larga e da cor da próxima cena, então a troca fica perfeita.
**Grade de pixels ★** — quadrados `scale(0→1)` com `stagger: { each: .004, from: "random" }`, cor da próxima cena.
**Cortina circular:**
```js
gsap.fromTo(".proxima", { clipPath: "circle(0% at 50% 50%)" }, { clipPath: "circle(75% at 50% 50%)", ease: "none",
  scrollTrigger: { trigger: ".proxima", start: "top bottom", end: "top top", scrub: true } });
```
**Cortina de imagem ★** — `clipPath: "inset(100% 0 0 0 round 22px)" → "inset(0% 0 0 0 round 22px)"`, 1.6s.

## 7. Listas que se movem
**Cards empilhados ★** — cards `position: sticky; top: 12vh`; o anterior faz `scale: .92, opacity: .45` enquanto o próximo sobe (`trigger: proximo, start: "top bottom", end: "top 12%", scrub`).

**Rolagem horizontal:**
```js
const track = $(".trilho");
gsap.to(track, { x: () => -(track.scrollWidth - innerWidth + 80), ease: "none",
  scrollTrigger: { trigger: ".secao", start: "top top", end: () => "+=" + (track.scrollWidth - innerWidth), pin: true, scrub: 0.6, invalidateOnRefresh: true } });
```
Números gigantes (01, 02…) na cor de destaque sobre cada foto dão o ar de "diário".

**Espiral 3D ★** — itens com `rotateY(i*60 - rot) translateZ(R) translateY((i - rot/60) * dy)`; `rot` persegue um alvo = progresso da rolagem + arrasto com inércia (`drag *= .94`). Brilho pelo `cos` do ângulo (frente clara, fundo escuro); só o da frente recebe clique.

## 8. Produto em peças
**Peças que explodem do centro:**
```js
gsap.utils.toArray(".peca").forEach((p) => {
  gsap.from(p, { x: 0, y: 0, left: "50%", top: "50%", scale: 0.4, rotate: gsap.utils.random(-20, 20), ease: "none",
    scrollTrigger: { trigger: ".desmontar", start: "top top", end: "+=150%", scrub: true } });
});
// peças com position:absolute e left/top finais no CSS; a seção presa com pin.
```
Etiquetas mono (`PEÇA-03 · NOME`) coladas em cada peça.

**Pontos clicáveis na foto** — botões com `left/top` em % da foto (o wrapper precisa ter a mesma proporção da imagem). Losango na cor de destaque + anel pulsando (`@keyframes` scale 0.5→1.8, opacity 1→0); clique abre um card com título, texto e barra de nível.

## 9. Revelar e inclinar
**Máscara rasgando (revelar outra foto com o mouse):** duas fotos alinhadas (mesma pose) num `<canvas>`. A cada movimento, crie "rasgos" (polígonos irregulares de 24–30 pontos com raio variando ±20%) que crescem com `back.out`, ficam e encolhem em ~1.5s. Desenho por quadro:
1. `drawImage(fotoA)`;
2. `globalCompositeOperation = "destination-out"` + preencher rasgos (abre buraco);
3. `clip()` nos rasgos + `drawImage(fotoB)`;
4. borda: noutro canvas, preencher rasgos com raio +4px na cor de destaque e apagar o miolo; colar com `source-atop` (a borda só aparece sobre a figura).
Fotos em PNG com fundo transparente. Sem mouse (celular), dispare rasgos sozinhos a cada ~1s.

**Tilt 3D em card:**
```js
card.addEventListener("pointermove", (e) => { const r = card.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
  gsap.to(card, { rotateY: x * 14, rotateX: -y * 12, transformPerspective: 900, duration: .4 }); });
card.addEventListener("pointerleave", () => gsap.to(card, { rotateX: 0, rotateY: 0, duration: .8, ease: "elastic.out(1,.5)" }));
```

## 10. Detalhes
**Linha que se desenha** (trajetória, rota):
```js
const path = $("svg path"), L = path.getTotalLength();
gsap.fromTo(path, { strokeDasharray: L, strokeDashoffset: L }, { strokeDashoffset: 0, ease: "none",
  scrollTrigger: { trigger: path, start: "top 70%", end: "bottom 40%", scrub: true } });
```
**Contador:** `gsap.from(obj, { v: 0, snap: { v: 1 }, onUpdate: () => el.textContent = obj.v })` com `scrollTrigger` de entrada.
**Marquee:** conteúdo duplicado lado a lado + `@keyframes { to { transform: translateX(-50%) } }`. Leve rotação (-1.5deg) e fundo na cor de destaque viram uma "fita".

## 11. Formas e texturas
**Chanfro** (canto cortado em diagonal):
```css
.chanfro { clip-path: polygon(18px 0, 100% 0, 100% calc(100% - 18px), calc(100% - 18px) 100%, 0 100%, 0 18px); }
```
**Grão ★** — `body::after` com SVG `feTurbulence` em data URI, `opacity: .07`, animado em `steps(4)`.
**Grade ★** — dois `linear-gradient` de 1px a cada 64px.
**Linhas topográficas** — gere em `<canvas>` com ruído + *marching squares*: para cada limiar (0.1 a 0.95, passo ~0.045) percorra uma grade de células de 12px, calcule o caso (4 cantos acima/abaixo do limiar) e ligue os pontos interpolados nas arestas. Linha a cada 5 limiares mais grossa. Desenhe uma vez e redesenhe no `resize`.

## 12. Loader
Fonte de pontos (Google Fonts: **Doto**) para o nome, contador 0→100 sincronizado com `document.fonts.ready` + `load` (com limite de 4s para nunca travar), depois o painel sobe (`yPercent: -100, ease: "expo.inOut"`) e a abertura começa no mesmo timeline.

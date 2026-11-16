# Direções de arte

Cada direção abaixo é um ponto de partida com tokens prontos. Escolha pela personalidade
do negócio, não pelo gosto pessoal: uma clínica pede calma e confiança; um estúdio criativo
pode ousar. Combine à vontade (ex.: tipografia de uma, paleta de outra), mas mantenha as
regras de ouro.

## Regras de ouro (valem para todas)

- **Contraste de escala.** Títulos enormes (8–12vw) ao lado de textos pequenos e mono. O meio-termo é o que deixa um site com cara de modelo pronto.
- **Uma cor quente, pouca.** Ela marca o que importa: palavra-chave do título, botão, número, progresso. Se aparece em tudo, deixa de destacar.
- **Duas fontes + uma mono.** Display (personalidade), texto (leitura) e mono (rótulos, números, HUD).
- **Texturas sutis.** Grão a 5–8% de opacidade, grade fina, linhas topográficas. Dão matéria às cores chapadas.
- **Um vocabulário de formas.** Escolha uma: cantos arredondados grandes, chanfros diagonais, molduras finas com cruzes de mira. E use-a em tudo.
- **Microtipografia.** Rótulos mono pequenos (`01 / 04`, `SEÇÃO 03`, hora local, coordenadas) fazem o site parecer "projetado", não montado.

---

## 1. Estúdio Bold (padrão do modelo)
**Para:** agência, freelancer, estúdio, serviços com oferta clara.
**Conceito:** confiança com energia; cenas que trocam de cor como capítulos.
```css
--ink:#121417; --ink-2:#0b0c0e; --paper:#eef0f2; --paper-2:#fff; --deep:#1d1fb0; --accent:#ff5c1a;
--f-display:"Barlow Condensed"; --f-body:"Manrope"; --f-mono:"IBM Plex Mono";
```
**Assinaturas:** títulos condensados em caixa alta com uma palavra em itálico colorido;
temas alternando escuro/azul profundo/claro/laranja; botões em pílula com ícone quadrado
quente; faixas diagonais e grade de pixels como transição; rodapé com marca gigante e brilho.
**Motion:** firme e rápido (`expo.out`, 0.9–1.2s), cenas presas com troca de palavras.

## 2. Técnico de Campo
**Para:** moda técnica, outdoor, esporte, produto físico, marcas "engenheiradas".
**Conceito:** ficha técnica de equipamento; cada peça tem código e função.
```css
--ink:#111110; --paper:#e9e9e5; --deep:#2a2b26; --accent:#e4ff1a;
--f-display:"Archivo" (wdth 125, 900) ou "Unbounded"; --f-body:"Inter"; --f-mono:"JetBrains Mono";
```
**Assinaturas:** fundo cinza com linhas topográficas; neon verde-limão em faixas diagonais com
grão; cantos chanfrados (clip-path) em cards e molduras; etiquetas `TRK 02 / PEÇA`; cruzes de
mira espalhadas; pontos clicáveis sobre a foto; foto "desmontada" em peças que se espalham.
**Motion:** preciso, com hover que revela (máscara rasgando, raio-x), loader em fonte de pontos (Doto).

## 3. Editorial Luxo
**Para:** arquitetura, hotelaria, moda autoral, joias, gastronomia.
**Conceito:** revista impressa cara; silêncio e espaço.
```css
--ink:#16130f; --paper:#f3efe8; --deep:#3b3127; --accent:#b8743a;
--f-display:"Fraunces" ou "Playfair Display" (itálico); --f-body:"Inter"; --f-mono:"DM Mono";
```
**Assinaturas:** serifas grandes com itálico expressivo; fotos grandes com recorte em arco ou
retângulo alto; colunas de texto estreitas; numeração romana ou de capítulo; muito espaço.
**Motion:** lento e fluido (1.4–2s, `power3.out`), revelação de imagem por cortina (clip-path),
parallax suave, nada pula.

## 4. Neo Minimal Claro
**Para:** SaaS, tecnologia, saúde, consultoria, finanças.
**Conceito:** clareza; o produto é o herói.
```css
--ink:#0d1117; --paper:#f7f8fa; --deep:#e8ecf3; --accent:#3b5bff;
--f-display:"Inter Tight" ou "Geist"; --f-body:"Inter"; --f-mono:"Geist Mono";
```
**Assinaturas:** mockups de interface em perspectiva 3D leve; cards com borda de 1px e sombra
longa suave; gradiente de luz atrás do herói; números grandes de resultado; selos de confiança.
**Motion:** discreto e preciso; contadores; telas que deslizam dentro de um mockup; tilt 3D leve.

## 5. Noturno Neon
**Para:** música, eventos, games, bares, criadores de conteúdo.
**Conceito:** palco à noite.
```css
--ink:#07070a; --paper:#f1f1f4; --deep:#16132b; --accent:#ff2e88; (segunda cor opcional #19f0ff)
--f-display:"Clash Display"* ou "Syne"; --f-body:"Space Grotesk"; --f-mono:"Space Mono";
```
(*Clash Display vem do Fontshare, não do Google; se precisar só do Google, use Syne.)
**Assinaturas:** brilhos difusos (blur 60–120px) que seguem o mouse; texto com contorno; vídeo
de fundo escurecido; marquee grande; cartazes em grade.
**Motion:** pulsante; glitch curto em títulos; transições por máscara circular.

---

## Montando uma direção própria

Escreva 6 linhas e só depois codifique:
1. **Conceito** em uma frase ("ficha técnica de equipamento", "revista de arquitetura").
2. **Paleta**: 2 neutros + 1 apoio + 1 quente, com hex.
3. **Tipos**: display + texto + mono, com pesos.
4. **Textura**: grão / grade / topografia / papel / nenhuma.
5. **Formas**: arredondado grande / chanfro / moldura fina / arco.
6. **Motion**: velocidade, easing e um efeito-assinatura.

Confira o contraste do texto (mínimo 4.5:1 para texto comum) — o destaque quente sobre
fundo claro costuma falhar: use-o em títulos grandes ou como fundo, não em texto pequeno.

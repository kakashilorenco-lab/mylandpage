# Clonador de Sites com IA (versão aprimorada)

Baseado no [ai-website-cloner-template](https://github.com/JCodesMore/ai-website-cloner-template) (licença MIT). Você passa uma URL e o agente de IA recria o site como um app Next.js limpo e editável.

## O que esta versão tem a mais

O original deixava todo o trabalho de "olhar o site" na mão do agente. Esta versão automatiza isso com dois comandos:

### 1. `npm run capture -- <url>`: raio-X completo do site

Em um comando só ele gera:

- **Prints** em 4 tamanhos de tela (celular, tablet, desktop e tela grande), da página inteira e quadro a quadro conforme rola. Assim aparecem as animações que só surgem durante a rolagem.
- **Brief da página** (`brief.md`), com:
  - as seções na ordem, com o texto de cada uma
  - a tipografia (fonte, tamanho e cor de cada título e parágrafo)
  - a paleta de cores e as variáveis CSS
  - as fontes usadas
  - os botões, formulários e links
  - a tecnologia usada (Framer, Webflow, WordPress, Elementor, GSAP, Lenis, Swiper…)
- **Arquivos reais** (imagens, fontes, vídeos, áudios e CSS), baixados direto do navegador e salvos no formato verdadeiro. Exemplo: um `.png` que na real é AVIF é salvo como `.avif`.
- **Ícones SVG** exportados como arquivos separados.

Tudo vai para `docs/research/<site>/<página>/` e os arquivos para `public/sites/<site>/`.

### 2. `npm run compare -- <url-original> <url-do-clone>`: o clone ficou igual?

- Tira print das duas versões no mesmo tamanho de tela, com as animações congeladas.
- Gera uma imagem **original | clone | diferenças em vermelho**.
- Dá uma % de semelhança e a diferença de altura da página.
- Lista **as regiões que mais diferem** (em pixels a partir do topo), pra você saber por onde começar a corrigir.
- Avisa sobre erros no console, arquivos que não carregaram e rolagem lateral no clone.

### 3. `npm run video -- <link-ou-arquivo>`: copiar um site a partir de um VÍDEO 🎬

Viu um site num Reels, TikTok ou YouTube? Manda o link ou o arquivo do vídeo. O analisador **assiste o vídeo frame a frame** e entrega:

- **Linha do tempo**: cada rolagem (direção, distância e velocidade), pausa, corte e animação, com o segundo exato.
- **Página inteira reconstruída**: emenda os frames conforme a rolagem pra formar um "print de página inteira" do site, mesmo que ele nunca tenha aparecido inteiro no vídeo. Separa o header fixo e os botões flutuantes (tipo WhatsApp).
- **Seções** com posição, cor de fundo e **todo o texto** lido por OCR (em português).
- **Animações**: o que aparece ao rolar, carrosséis e contadores, com imagens de início/meio/fim e um clipe curto de cada uma.
- **Pistas do site original**: domínios e @perfis lidos na tela, na barra de endereço e na legenda do post. Se achar o site real, o Claude copia direto dele, o que fica ainda mais fiel.
- **Corte automático** que tira bordas pretas e molduras paradas. Se o site aparece no meio de uma edição (cara do criador, legendas), dá pra ajustar com `--crop 10%,15%,80%,70%`, olhando o `crop-guide.png`.

Testado num vídeo de 18 segundos em formato Reels, com header fixo, animações, carrossel e troca de página. A página reconstruída ficou com **3582px contra 3569px do original** (0,4% de diferença), e o analisador achou o domínio do site sozinho.

Depois de montar o clone, compare com o vídeo:

```bash
npm run compare -- --ref docs/research/<nome>/video/scenes/scene-01-page@1x.png http://localhost:3000
```

E pra recortar logo ou imagem de um frame: `npm run crop -- frame.png 10% 5% 30% 8% public/logo.png`

A skill `/clone-website` já sabe usar todos esses comandos sozinha.

### Instagram

O Instagram costuma exigir login pra baixar. No seu computador, use `--cookies-from-browser chrome` (ele usa o login do seu navegador). Ou baixe o vídeo manualmente e passe o arquivo: `npm run video -- ~/Downloads/reel.mp4`.

### Requisitos para vídeo

`ffmpeg`, `yt-dlp` (`pip install yt-dlp`) e, pra ler textos, `tesseract-ocr` + `tesseract-ocr-por`.

## Como usar

```bash
npm install
# no Claude Code, dentro desta pasta:
/clone-website https://site-que-voce-quer.com
```

Ou rode as etapas na mão:

```bash
npm run capture -- https://exemplo.com --site exemplo
npm run dev
npm run compare -- https://exemplo.com http://localhost:3000 --site exemplo
```

Opções úteis:

- `--viewports mobile,desktop` captura só esses tamanhos (fica mais rápido)
- `--no-assets` não baixa arquivos, só tira prints e gera o brief
- `--no-freeze` (no compare) mantém as animações rodando
- Também funciona com arquivo local: `npm run capture -- file:///caminho/index.html`

## Uso responsável

Use para estudar, como referência e para migrar sites **seus**. Copiar marca, textos, fotos ou vídeos de outra pessoa e publicar como se fosse seu viola direito autoral. Clone, aprenda a estrutura e troque pelo seu conteúdo.

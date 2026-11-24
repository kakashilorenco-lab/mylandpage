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

A skill `/clone-website` já sabe usar os dois comandos sozinha.

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

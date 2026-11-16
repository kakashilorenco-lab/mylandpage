# Checklist de QA

Rode `node scripts/qa.js <pasta> --out <rascunho>/qa` e olhe as folhas de contato antes de
marcar qualquer item. O script já verifica os itens com (auto).

## Técnico
- [ ] (auto) Nenhum erro no console, nenhum arquivo falhando.
- [ ] (auto) Sem rolagem lateral no celular (390px).
- [ ] (auto) Um `<h1>`, `<title>` e `meta description` preenchidos, `lang` correto.
- [ ] (auto) Imagens com `alt` e abaixo de ~400 KB.
- [ ] Bibliotecas com versão fixa (`gsap@3.12.5`, `lenis@1.1.13`), nunca "latest".
- [ ] Sem JS (ou com CDN fora do ar) o conteúdo continua legível.
- [ ] `prefers-reduced-motion`: sem pins, sem rolagem suave, tudo visível.

## Visual (olhando os prints)
- [ ] Nenhuma cena sobreposta a outra; nenhuma tela vazia por mais de ~1 viewport.
- [ ] Títulos não cortados em nenhuma largura; nada encostando na borda (respiro ≥ 16px no celular).
- [ ] A cor de destaque aparece pouco e só onde importa.
- [ ] Tipos, cantos e espaçamentos consistentes de ponta a ponta.
- [ ] Header legível em todos os temas (troca de cor junto com a cena).
- [ ] Botões e links com área de toque ≥ 44px no celular.

## Conteúdo
- [ ] Uma ação principal clara, repetida no topo, no meio e no fim.
- [ ] Textos concretos, sem lorem ipsum; o que é provisório está avisado ao usuário.
- [ ] Links de contato funcionando (WhatsApp `https://wa.me/55DDDNUMERO`, `mailto:`).
- [ ] Nada copiado de site de referência (nome, textos, imagens, código).

## Entrega
- [ ] Usuário sabe onde estão os arquivos e como ver o site.
- [ ] Lista do que falta: fotos (com prompts), textos reais, domínio.

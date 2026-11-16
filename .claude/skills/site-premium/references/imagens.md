# Imagens

Fotos e mockups decidem metade da percepção de nível. Um layout excelente com fotos de banco
genéricas parece modelo pronto; um layout simples com fotos coerentes parece marca.

## Fluxo

1. **Construa com placeholders.** Use `.media[data-ph="NOME"]` do modelo: gradiente escuro com
   rótulo mono. O layout fica pronto e o usuário vê onde cada imagem entra.
2. **Liste os lugares** com proporção e uso. Exemplo:
   | Lugar | Proporção | Observação |
   |---|---|---|
   | Abertura | 4:5 vertical, PNG transparente | personagem/produto recortado |
   | Cards de serviço | 16:10 | mockup de tela em ambiente |
   | Espiral de trabalhos | 16:10 | um por projeto |
   | Retrato | 4:5 | luz lateral, fundo neutro |
3. **Entregue os prompts** no fim (o usuário pediu isso explicitamente em outros projetos):
   um prompt por imagem, **em inglês**, dentro de caixa de código, com título curto antes.
   Se a skill `prompt-engineer-criador` existir, siga o template de IMAGEM dela.
4. **Ao receber as imagens:** converta para WebP/AVIF (alvo < 300 KB cada, 1600px no maior lado),
   recorte o fundo quando o efeito pedir transparência (ex.: ferramenta de remover fundo do Canva
   se disponível, ou o usuário usa remove.bg), troque os placeholders por `<img alt="..." loading="lazy">`
   e reajuste posições que dependem da foto (pontos clicáveis, recortes).

## Estrutura de um bom prompt de imagem

1. **Referência** (se houver): "Use the uploaded image ONLY as reference for face identity / composition. Do not copy …".
2. **Sujeito**: quem/o quê, idade adulta explícita para pessoas, expressão, roupa, objetos.
3. **Enquadramento**: proporção (4:5, 16:9, 9:16), ângulo, distância, onde fica o sujeito no quadro (ex.: "eyes at 42% height").
4. **Fundo**: liso e com cor exata (hex) quando a imagem vai ser recortada ou combinar com o site.
5. **Luz**: tipo, direção, temperatura.
6. **Estilo**: "photorealistic editorial", "studio product shot", paleta do site.
7. **Negativo**: pessoa diferente, rosto alterado, texto inventado, marca d'água, mãos deformadas, fundo poluído.

## Séries consistentes

- Repita o mesmo bloco de identidade/estilo em todos os prompts da série.
- Para duas versões alinhadas da mesma foto (ex.: com e sem máscara, antes/depois):
  gere a primeira e **edite** a partir dela pedindo para manter pose, enquadramento e fundo idênticos.
  Gerar as duas do zero quase nunca alinha.
- Mockups de projetos: mesma superfície, mesma luz, mesmo ângulo em todos, só muda a tela.

## O que não pedir

- Rosto de pessoa real que não seja o próprio usuário (com foto dele de referência).
- Logos, personagens ou produtos de outras marcas.
- Texto legível dentro da imagem (IAs erram letras); coloque texto no HTML.

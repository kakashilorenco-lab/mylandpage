# Roteiro de cenas

Um site premium é lido como uma sequência de cenas, não como uma pilha de seções.
Cada cena tem um trabalho, um tema de cor, um layout e um momento de motion.

## Catálogo de cenas

| Cena | Trabalho | Layout típico | Motion típico | No modelo |
|---|---|---|---|---|
| **Abertura (hero)** | Prender em 3 s e dizer o que é | Título gigante + objeto/foto forte + CTA | Loader → palavras sobem; objeto 3D reage ao mouse | `.hero` |
| **Tensão / problema** | Mostrar a dor que o cliente sente | Texto à esquerda + prova visual (celular carregando, número) | Cena presa: copy sai, palavras grandes entram uma a uma | `.problem` |
| **Manifesto** | Dizer no que acredita | Painel com frase grande, palavras marcadas | Palavras acendem com a rolagem | receita "texto que acende" |
| **Serviços / ofertas** | O que você entrega | Cards grandes empilhados (imagem + texto) | Card anterior encolhe quando o próximo sobe | `.stack` |
| **Trabalhos / portfólio** | Provar nível | Espiral 3D, carrossel horizontal ou grade | Girar com rolagem + arrastar; info troca com scramble | `.work` |
| **Produto em peças** | Explicar o que vem junto | Foto com pontos numerados / peças espalhadas | Hotspots; peças "explodem" do centro na rolagem | receita "explodir peças" |
| **Sobre / rosto** | Criar confiança humana | Retrato alto + texto curto + 2 botões | Retrato revela por cortina | `.about` |
| **Processo** | Tirar o medo do "como" | Número gigante + passo + anel de progresso | Cena presa trocando passos | `.process` |
| **O que inclui** | Reduzir objeções | Chips/etiquetas | Entram em cascata | `.includes` |
| **Prova social** | Mostrar que funciona | Depoimentos, logos, números | Marquee; contadores | receitas "marquee" e "contador" |
| **Ferramentas / iscas** | Dar valor antes de vender | Cards de ferramenta (calculadora, teste) | Cards sobem e se sobrepõem | — |
| **Dúvidas (FAQ)** | Remover a última objeção | Acordeão + imagem | Abre com altura animada | `.faq` |
| **Chamada final** | Uma ação, sem distração | Cor cheia, título gigante, 1 botão | Palavras sobem; botão magnético | `.cta` |
| **Rodapé** | Fechar com marca | Colunas + marca gigante + brilho | Letras sobem; brilho segue o mouse | `.ft` |

## Roteiros prontos

**Estúdio / freelancer (vende serviço):**
Abertura → Problema (presa) → *faixas* → Serviços (empilhados) → *pixels* → Trabalhos (espiral) → Sobre → Processo (preso) → Inclui → Dúvidas → Chamada → Rodapé.

**Portfólio pessoal:**
Abertura com foto/efeito de revelação → Manifesto → Habilidades (cards ou pontos na foto) → Trabalhos (horizontal ou espiral) → Trajetória (linha que se desenha) → Contato gigante → Rodapé.

**Produto físico / marca:**
Abertura (produto + nome gigante) → Manifesto → Em uso (colagem de fotos em molduras) → Peças (grade + painel de detalhe) → Kit completo (foto com pontos numerados) → Diário (horizontal com números gigantes) → Desmontar (peças se espalham) → Comprar → Rodapé.

**Página de vendas / infoproduto:**
Abertura (promessa + prova) → Para quem é → Problema (presa) → Método em passos (preso) → O que recebe (chips) → Depoimentos (marquee) → Garantia → Preço (card único em destaque) → Dúvidas → Chamada → Rodapé.

**Negócio local (clínica, restaurante, hotel):**
Abertura (foto do lugar + ação) → Diferenciais → Serviços/cardápio → Ambiente (galeria) → Equipe → Depoimentos → Localização/horário → Chamada (WhatsApp) → Rodapé.

## Ritmo

- Alterne temas: escuro → cor → claro → escuro... Duas cenas seguidas no mesmo tema pedem uma divisória forte (linha, marquee, mudança de layout).
- Uma cena presa (pin) a cada 2–3 cenas. Muitos pins seguidos cansam; nenhum deixa o site "chapado".
- Transições marcantes (faixas, pixels, cortina) entre mudanças grandes de tema, não entre todas as cenas.
- Varie a composição: centralizada → dividida → grade → em tela cheia.

## Escrita

- Título: 3–7 palavras, concreto, com UMA palavra em `<em>`. Ex.: "Bonito não basta. *Precisa converter.*"
- Apoio: até 2 linhas, linguagem de conversa.
- Botões com verbo + resultado ("Mandar mensagem", "Ver os trabalhos"), nunca "Saiba mais".
- Rótulos mono numerados (`03 / Serviços`) ajudam a pessoa a saber onde está.
- Nada de lorem ipsum na entrega: se faltar conteúdo, escreva provisório plausível e marque como provisório para o usuário.

/*
  Catálogo da Ótica Valentim
  ---------------------------
  Para adicionar um produto, copie um bloco { ... } e troque os dados.

  id         texto curto, sem espaço (usado no link do produto)
  nome       como o cliente vai ler: "Oval em tartaruga"
  marca      opcional: "Miu Miu", "Ray-Ban"...
  categoria  "Óculos de sol", "Óculos de grau" ou outra (o filtro é criado sozinho)
  descricao  uma ou duas frases sobre a peça
  detalhes   lista curta: cor da armação, lente, material...
  preco      opcional, ex.: "R$ 1.290" (vazio mostra "Consulte na loja")
  fotos      lista de imagens em assets/produtos/ (a primeira é a capa, formato 4:5)
*/
window.PRODUTOS = [
  {
    id: "oval-tartaruga-miu-miu",
    nome: "Oval em tartaruga",
    marca: "Miu Miu",
    categoria: "Óculos de sol",
    descricao: "Armação oval em acetato tartaruga com lente marrom.",
    detalhes: ["Armação tartaruga", "Lente marrom", "Formato oval"],
    preco: "",
    fotos: ["assets/produtos/oval-tartaruga.jpg"]
  },
  {
    id: "gatinho-azul-marinho",
    nome: "Gatinho azul-marinho",
    marca: "",
    categoria: "Óculos de sol",
    descricao: "Armação gatinho em acetato azul-marinho com detalhe dourado na haste e lente escura.",
    detalhes: ["Acetato azul-marinho", "Detalhe dourado na haste", "Lente escura"],
    preco: "",
    fotos: ["assets/produtos/gatinho-azul.jpg"]
  }
];

/* =========================================================
   CONTEÚDO DO PORTFÓLIO — edite só este arquivo.
   Tudo que está aqui é PROVISÓRIO: troque pelos seus dados.
   ========================================================= */
window.PORTFOLIO = {
  // Aparece GIGANTE no topo. Curto fica melhor (3 a 6 letras).
  nome: "NOME",
  nomeCompleto: "Seu Nome Completo",
  cargo: "Marketing Digital & Design",

  // Frase do cartão no canto do topo
  frase: "Estratégia na cabeça. Resultado na tela.",

  // Texto da seção "Sobre"
  sobre:
    "Eu transformo ideias em páginas, campanhas e conteúdos que vendem. Começo pela estratégia, passo pelo design e só paro quando o resultado aparece no número.",

  numeros: [
    { valor: "3+", rotulo: "anos criando" },
    { valor: "40+", rotulo: "projetos entregues" },
    { valor: "100%", rotulo: "foco em resultado" },
  ],

  // As duas fotos do topo (mesma pose!).
  // Depois troque por: "img/mascarado.png" e "img/rosto.png"
  fotos: {
    mascarado: "img/mascarado.svg",
    rosto: "img/rosto.svg",
  },

  // Pontos clicáveis em cima da foto. x e y em % da foto (0 a 100).
  pecas: [
    { x: 50, y: 29, codigo: "TRK 01 / CABEÇA", titulo: "Estratégia", nivel: 90,
      texto: "Planejamento de lançamentos, funis e posicionamento de marca." },
    { x: 50, y: 41, codigo: "TRK 02 / VISÃO", titulo: "Design", nivel: 85,
      texto: "Identidade visual, criativos para anúncios e páginas que convertem." },
    { x: 50, y: 73, codigo: "TRK 03 / PEITO", titulo: "Copywriting", nivel: 80,
      texto: "Textos de venda, roteiros e mensagens que fazem a pessoa agir." },
    { x: 35, y: 88, codigo: "TRK 04 / FLASK L", titulo: "Tráfego pago", nivel: 75,
      texto: "Campanhas no Meta Ads e Google Ads com foco em custo por venda." },
    { x: 65, y: 88, codigo: "TRK 05 / FLASK R", titulo: "Conteúdo", nivel: 85,
      texto: "Reels, carrosséis e edição de vídeo para crescer nas redes." },
  ],

  // Seção "Skills"
  skills: [
    { titulo: "Estratégia", texto: "Funis, lançamentos e posicionamento.", tags: ["Funil", "Oferta", "Lançamento"] },
    { titulo: "Design", texto: "Marcas, criativos e interfaces.", tags: ["Figma", "Canva", "Branding"] },
    { titulo: "Copywriting", texto: "Textos que vendem sem parecer venda.", tags: ["VSL", "Anúncios", "E-mail"] },
    { titulo: "Tráfego pago", texto: "Anúncios que trazem cliente, não só clique.", tags: ["Meta Ads", "Google Ads"] },
    { titulo: "Conteúdo", texto: "Vídeos curtos e posts que prendem atenção.", tags: ["Reels", "TikTok", "Edição"] },
    { titulo: "Sites", texto: "Landing pages rápidas e com motion.", tags: ["HTML", "CSS", "Animação"] },
  ],

  // Seção "Projetos". imagem: null usa um fundo gerado; ou "img/projeto1.jpg"
  projetos: [
    { titulo: "Método JPS", tipo: "Landing page", ano: "2026", imagem: null, link: "#",
      texto: "Página de vendas para infoproduto de marketing digital." },
    { titulo: "Projeto Dois", tipo: "Identidade visual", ano: "2026", imagem: null, link: "#",
      texto: "Marca completa: logo, cores, tipografia e aplicações." },
    { titulo: "Projeto Três", tipo: "Campanha", ano: "2025", imagem: null, link: "#",
      texto: "Campanha de tráfego pago com criativos em vídeo." },
    { titulo: "Projeto Quatro", tipo: "Conteúdo", ano: "2025", imagem: null, link: "#",
      texto: "Série de reels para perfil no Instagram." },
  ],

  // Seção "Contato"
  contatos: [
    { rotulo: "Instagram", valor: "@seuusuario", link: "https://instagram.com/" },
    { rotulo: "WhatsApp", valor: "(00) 00000-0000", link: "https://wa.me/" },
    { rotulo: "E-mail", valor: "seuemail@exemplo.com", link: "mailto:seuemail@exemplo.com" },
    { rotulo: "LinkedIn", valor: "/in/seuusuario", link: "https://linkedin.com/" },
  ],
};

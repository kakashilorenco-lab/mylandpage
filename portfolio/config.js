/* =========================================================
   CONTEÚDO DO PORTFÓLIO — edite só este arquivo.
   Tudo aqui é PROVISÓRIO: troque pelos seus dados.
   Dica: *palavra* vira destaque (itálico/neon) nos títulos.
   ========================================================= */
window.PORTFOLIO = {
  // Nome curto que aparece GIGANTE no topo e no rodapé (3 a 6 letras fica melhor)
  nome: "NOME",
  nomeCompleto: "Seu Nome Completo",
  cargo: "Marketing digital & design",
  cidade: "Brasil",
  coordenadas: "23.55°S / 46.63°W", // aparece no rodapé, como detalhe técnico

  // Ação principal do site (botões "Fale comigo")
  acaoTexto: "Chamar no WhatsApp",
  acaoLink: "https://wa.me/5500000000000",

  // Topo
  frase: "Estratégia na cabeça. *Resultado* na tela.",

  // As duas fotos do topo (mesma pose!). Depois troque por .png com fundo transparente.
  fotos: { mascarado: "img/mascarado.svg", rosto: "img/rosto.svg" },

  // Pontos clicáveis em cima da foto do topo (x/y em % da foto)
  pecas: [
    { x: 50, y: 29, codigo: "TRK 01 / CABEÇA", titulo: "Estratégia", nivel: 90, texto: "Planejamento de lançamentos, funis e posicionamento." },
    { x: 50, y: 41, codigo: "TRK 02 / VISÃO", titulo: "Design", nivel: 85, texto: "Identidade visual, criativos e páginas que convertem." },
    { x: 50, y: 73, codigo: "TRK 03 / PEITO", titulo: "Copywriting", nivel: 80, texto: "Textos de venda e roteiros que fazem a pessoa agir." },
    { x: 35, y: 88, codigo: "TRK 04 / FLASK L", titulo: "Tráfego pago", nivel: 75, texto: "Campanhas no Meta Ads e Google Ads com foco em venda." },
    { x: 65, y: 88, codigo: "TRK 05 / FLASK R", titulo: "Conteúdo", nivel: 85, texto: "Reels, carrosséis e edição de vídeo para crescer." },
  ],

  // Retrato do painel "Manifesto" (vertical). Deixe "" para mostrar o espaço reservado.
  retrato: "img/retrato.webp",

  // Manifesto: **palavra** fica marcada em neon
  manifesto: "Eu não faço post bonito. Eu construo **sistemas que vendem**: estratégia, design e conteúdo trabalhando juntos, do **primeiro clique** até a **venda**.",
  numeros: [
    { valor: 3, sufixo: "+", rotulo: "anos criando" },
    { valor: 40, sufixo: "+", rotulo: "projetos entregues" },
    { valor: 1.2, sufixo: "M", rotulo: "pessoas alcançadas" },
  ],

  // Seis habilidades (cards + painel de detalhe)
  skills: [
    { titulo: "Estratégia", codigo: "SK-01", nivel: 90, texto: "Funis, lançamentos e posicionamento de marca.", tags: ["Funil", "Oferta", "Lançamento"] },
    { titulo: "Design", codigo: "SK-02", nivel: 85, texto: "Marcas, criativos e interfaces com identidade.", tags: ["Figma", "Canva", "Branding"] },
    { titulo: "Copywriting", codigo: "SK-03", nivel: 80, texto: "Textos que vendem sem parecer venda.", tags: ["Anúncios", "VSL", "E-mail"] },
    { titulo: "Tráfego pago", codigo: "SK-04", nivel: 75, texto: "Anúncios que trazem cliente, não só clique.", tags: ["Meta Ads", "Google Ads"] },
    { titulo: "Conteúdo", codigo: "SK-05", nivel: 85, texto: "Vídeos curtos e posts que prendem atenção.", tags: ["Reels", "TikTok", "Edição"] },
    { titulo: "Sites", codigo: "SK-06", nivel: 80, texto: "Landing pages rápidas, com motion e foco em conversão.", tags: ["HTML", "CSS", "Animação"] },
  ],

  // Projetos (espiral 3D). imagem: null usa fundo gerado; ou "img/projeto1.webp"
  projetos: [
    { titulo: "Método JPS", tipo: "Landing page", ano: "2026", imagem: null, link: "#", texto: "Página de vendas de infoproduto." },
    { titulo: "Projeto Dois", tipo: "Identidade visual", ano: "2026", imagem: null, link: "#", texto: "Marca completa e aplicações." },
    { titulo: "Projeto Três", tipo: "Campanha", ano: "2025", imagem: null, link: "#", texto: "Tráfego pago com criativos em vídeo." },
    { titulo: "Projeto Quatro", tipo: "Conteúdo", ano: "2025", imagem: null, link: "#", texto: "Série de reels para Instagram." },
    { titulo: "Projeto Cinco", tipo: "E-commerce", ano: "2025", imagem: null, link: "#", texto: "Loja virtual com foco no celular." },
    { titulo: "Projeto Seis", tipo: "Lançamento", ano: "2024", imagem: null, link: "#", texto: "Estratégia completa de lançamento." },
  ],

  // Kit de ferramentas (cena "desmontar")
  kit: [
    { nome: "Figma", tipo: "Design" }, { nome: "Canva", tipo: "Criativos" }, { nome: "CapCut", tipo: "Vídeo" },
    { nome: "Meta Ads", tipo: "Tráfego" }, { nome: "Google Ads", tipo: "Tráfego" }, { nome: "Notion", tipo: "Organização" },
    { nome: "ChatGPT", tipo: "IA" }, { nome: "Claude", tipo: "IA" },
  ],

  // Trajetória (linha que se desenha)
  trajetoria: [
    { ano: "2022", titulo: "Primeiro cliente", texto: "Um perfil local, zero orçamento e muita vontade." },
    { ano: "2023", titulo: "Primeiro lançamento", texto: "Funil completo do anúncio à página de vendas." },
    { ano: "2024", titulo: "Design + tráfego", texto: "Juntei criativo e campanha num serviço só." },
    { ano: "2025", titulo: "Método próprio", texto: "Um processo que se repete com resultado." },
    { ano: "2026", titulo: "Agora", texto: "Projetos maiores e sites com outro nível." },
  ],

  // Como eu trabalho (4 passos)
  processo: [
    { titulo: "Conversa", texto: "Entendo seu negócio, seu público e o que precisa acontecer." },
    { titulo: "Plano", texto: "Estratégia, conceito visual e cronograma, tudo por escrito." },
    { titulo: "Criação", texto: "Design, conteúdo e páginas, com prévias para você aprovar." },
    { titulo: "Resultado", texto: "Publicação, campanha no ar e ajustes com base nos números." },
  ],

  contatos: [
    { rotulo: "WhatsApp", valor: "(00) 00000-0000", link: "https://wa.me/5500000000000" },
    { rotulo: "Instagram", valor: "@seuusuario", link: "https://instagram.com/" },
    { rotulo: "E-mail", valor: "seuemail@exemplo.com", link: "mailto:seuemail@exemplo.com" },
    { rotulo: "LinkedIn", valor: "/in/seuusuario", link: "https://linkedin.com/" },
  ],
};

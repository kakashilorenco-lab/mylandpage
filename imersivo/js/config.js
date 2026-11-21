// =====================================================================
//  CONFIGURAÇÃO DO EMPREENDIMENTO
//  Troque aqui nome, cidade, preços, contatos e textos. Todo o site
//  (3D, painéis, catálogo, proposta e assistente) lê deste arquivo.
// =====================================================================

export const CONFIG = {
  nome: 'ATLÂNTICA TOWERS',
  nomeCurto: 'Atlântica',
  subtitulo: 'ITAPEMA · SC',
  construtora: 'Sua Construtora',
  cidade: 'Itapema, Santa Catarina',
  endereco: 'Av. Nereu Ramos, 1000 · Meia Praia · Itapema/SC',
  entrega: 'Dezembro de 2028',

  // Coordenadas reais usadas no estudo solar (sol e lua astronômicos)
  lat: -27.1086,
  lon: -48.6134,
  fusoHorario: -3, // UTC-3 (Brasília)

  // Contatos
  whatsappComercial: '5547999999999', // só números, com DDI + DDD
  emailComercial: 'comercial@suaconstrutora.com.br',
  portalConstrutora: '', // URL (POST JSON) para receber propostas. Vazio = modo demonstração

  // Assistente virtual (canto inferior direito)
  assistente: { nome: 'Theo', cargo: 'Consultor virtual' },

  // Filme do empreendimento. Deixe vazio para usar o filme 3D gerado ao vivo.
  videoUrl: '',

  // Tabela de preços
  precoM2Base: 15800,     // R$/m² no 1º pavimento
  reajustePorAndar: 0.011, // +1,1% por andar
  premioVistaMar: 0.07,    // finais de frente pro mar
  condicoes: ['Tabela zero', '30% até as chaves', '70% em até 72x'],

  // Torres. Frente das torres = leste (mar).
  torres: [
    { id: 'A', andares: 36, z: -19 },
    { id: 'B', andares: 32, z: 19 },
  ],

  // Tipologias por final (iguais nas duas torres)
  tipologias: {
    '01': { nome: 'Tipo 1', area: 98, suites: 3, dormitorios: 3, homeOffice: false, lavabo: true, vagas: 2, vista: 'Mar' },
    '02': { nome: 'Tipo 2', area: 73, suites: 2, dormitorios: 2, homeOffice: true, lavabo: false, vagas: 2, vista: 'Mar e cidade' },
    '03': { nome: 'Tipo 3', area: 76, suites: 2, dormitorios: 3, homeOffice: false, lavabo: false, vagas: 2, vista: 'Morro' },
    '04': { nome: 'Tipo 4', area: 112, suites: 3, dormitorios: 3, homeOffice: true, lavabo: true, vagas: 3, vista: 'Morro e cidade' },
  },

  // Unidades com status fixo (o resto é gerado automaticamente)
  statusFixo: {
    'A-3202': 'disponivel',
    'A-1202': 'disponivel',
    'A-2801': 'disponivel',
    'B-2004': 'disponivel',
  },

  // Pontos de interesse do mapa (x = leste, z = sul, em metros a partir das torres)
  pois: [
    { nome: 'Praia de Meia Praia', dist: '380 m', x: 470, z: -60, tipo: 'praia' },
    { nome: 'Av. Beira-Mar', dist: '350 m', x: 410, z: 260, tipo: 'via' },
    { nome: 'Centro', dist: '1,2 km', x: 120, z: 1150, tipo: 'cidade' },
    { nome: 'Shopping', dist: '900 m', x: 260, z: -860, tipo: 'compras' },
    { nome: 'Hospital', dist: '1,8 km', x: -60, z: 1700, tipo: 'saude' },
    { nome: 'Morro do Encanto', dist: '1,5 km', x: -1100, z: -500, tipo: 'natureza' },
    { nome: 'BR-101', dist: '2,6 km', x: -900, z: 1500, tipo: 'via' },
    { nome: 'Escola', dist: '650 m', x: -120, z: -620, tipo: 'escola' },
  ],

  // Áreas de lazer (posição sobre o embasamento)
  lazer: [
    { id: 'piscina', nome: 'Piscina com raia', desc: 'Piscina adulto aquecida com 25 m de raia e deck molhado.', x: 25, z: -4 },
    { id: 'infantil', nome: 'Piscina infantil', desc: 'Prainha rasa ao lado do solário, com vista para o mar.', x: 25, z: 18.5 },
    { id: 'gourmet', nome: 'Espaço gourmet', desc: 'Churrasqueira, forno de pizza e mesa para 20 pessoas.', x: -25, z: -18 },
    { id: 'academia', nome: 'Academia', desc: 'Equipamentos completos e vista para o morro.', x: -25, z: 18 },
    { id: 'playground', nome: 'Playground', desc: 'Brinquedos em madeira certificada e piso emborrachado.', x: 2, z: 39 },
    { id: 'solario', nome: 'Solário', desc: 'Espreguiçadeiras e jardim tropical com paisagismo assinado.', x: 8, z: -38 },
  ],

  // Catálogo (book de vendas)
  catalogo: {
    corPrincipal: '#6b1734',
    corClara: '#f4ecee',
  },
};

// Os cômodos de cada tipologia (usados no catálogo e na planta humanizada)
export const COMODOS = {
  '01': [['Living', 26.4], ['Sacada gourmet', 9.8], ['Suíte master', 15.2], ['Banho suíte master', 5.6], ['Suíte 2', 11.1], ['Suíte 3', 10.4], ['Cozinha', 8.9], ['Lavabo', 2.3]],
  '02': [['Living', 22.23], ['Sacada', 6.12], ['Suíte principal', 11.6], ['Banheiro suíte principal', 3.12], ['Dormitório 2', 9.1], ['Banheiro social', 2.84], ['Home office', 6.4]],
  '03': [['Living', 23.5], ['Sacada', 7.2], ['Suíte principal', 12.1], ['Dormitório 2', 8.6], ['Dormitório 3', 8.2], ['Banheiro social', 3.1]],
  '04': [['Living', 31.2], ['Sacada gourmet', 12.6], ['Suíte master', 17.4], ['Closet', 4.8], ['Suíte 2', 11.8], ['Suíte 3', 11.2], ['Home office', 7.1], ['Lavabo', 2.4]],
};

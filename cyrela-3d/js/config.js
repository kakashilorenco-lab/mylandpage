// =====================================================================
//  CONFIGURAÇÃO DO MAPA 3D
//  Troque aqui os dados do corretor/imobiliária e os textos.
//  A lista de prédios fica em data/empreendimentos.js.
// =====================================================================

export const CONFIG = {
  titulo: 'Mapa 3D Cyrela',
  subtitulo: 'SÃO PAULO',

  // Quem atende os clientes (aparece no botão "Tenho interesse")
  corretor: {
    nome: 'Seu Nome · Corretor',
    creci: 'CRECI 000000-F',
    whatsapp: '5511999999999', // só números: 55 + DDD + número
  },

  // Centro do mapa (graus). Os prédios são posicionados pelas coordenadas reais.
  centro: { lat: -23.585, lon: -46.675 },

  aviso: 'Mapa independente feito com dados públicos de cyrela.com.br e apto.vc. Posições aproximadas; cidade, volumetria e interiores são ilustrativos. Confirme preços, plantas e disponibilidade com a Cyrela.',
};

// Cores por status (mesmas no 3D, nos marcadores e na lista)
export const STATUS_COR = {
  'Lançamento': '#f2c46d',
  'Em Breve': '#c7a6ff',
  'Em obras': '#5fd3c6',
  'Pronto para Morar': '#f4f1ea',
  vendido: '#8a8f98',
};

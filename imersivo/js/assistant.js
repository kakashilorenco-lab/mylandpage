import { CONFIG } from './config.js';
import { brl, STATUS } from './data.js';

// Consultor virtual: responde perguntas sobre o empreendimento usando os
// dados do config.js e aciona o 3D (mostra unidades, noite, lazer…).
export function initAssistant(app, ui) {
  const $ = (s) => document.querySelector(s);
  const log = $('#assistLog');
  const units = app.units;
  const disp = () => units.filter((u) => u.status === 'disponivel');
  const nome = CONFIG.assistente.nome;
  $('#assistBtn .avatar').textContent = nome[0];
  $('#assist .avatar').textContent = nome[0];

  const say = (html, me = false) => {
    const d = document.createElement('div');
    d.className = 'msg' + (me ? ' me' : '');
    d.innerHTML = html;
    log.appendChild(d);
    log.scrollTop = log.scrollHeight;
  };
  const wa = (txt) => `https://wa.me/${CONFIG.whatsappComercial}?text=${encodeURIComponent(txt)}`;

  const intents = [
    { k: /(dispon|livre|sobr|quais unidades|tem unidade)/, a: () => {
      const d = disp();
      app.ui.setMode('unidades');
      const byTower = CONFIG.torres.map((t) => `Torre ${t.id}: <b>${d.filter((u) => u.torre === t.id).length}</b>`).join(' · ');
      return `Temos <b>${d.length} unidades disponíveis</b> (${byTower}). Deixei elas acesas em amarelo no prédio e abri o espelho de vendas. Toque numa para ver planta e valor.`;
    } },
    { k: /(barat|menor (valor|preço)|em conta|mais acess)/, a: () => {
      const u = disp().sort((a, b) => a.preco - b.preco)[0];
      app.setDisp(true); app.selectUnit(u);
      return `A mais acessível agora é a <b>${u.id}</b> (${u.tip.area} m², ${u.andar}º andar) por <b>${brl(u.preco)}</b>. Já mostrei ela no prédio.`;
    } },
    { k: /(pre[çc]o|valor|quanto custa|custa|tabela|m²|metro)/, a: () => {
      const d = disp(); const min = Math.min(...d.map((u) => u.preco)), max = Math.max(...d.map((u) => u.preco));
      return `Os valores vão de <b>${brl(min)}</b> a <b>${brl(max)}</b>, conforme andar, final e vista. Condições: ${CONFIG.condicoes.join(' · ')}. <a href="#" data-act="tabela">Abrir tabela completa</a>`;
    } },
    { k: /(entrega|pronto|obra|quando fica)/, a: () => `A previsão de entrega é <b>${CONFIG.entrega}</b>. Realização: ${CONFIG.construtora}.` },
    { k: /(lazer|piscina|academia|gourmet|playground|crian)/, a: () => { app.ui.setMode('lazer'); return `O lazer fica no topo do embasamento: ${CONFIG.lazer.map((l) => l.nome.toLowerCase()).join(', ')}. Te levei até lá, toque nos pontos amarelos.`; } },
    { k: /(noite|anoitecer|ilumina)/, a: () => { app.ui.animateTimeTo(20 * 60 + 15); return 'Pronto, coloquei o empreendimento à noite. Dá pra ver as janelas acesas e a orla iluminada.'; } },
    { k: /(sol|sombra|insola|manh[ãa]|tarde)/, a: () => { app.ui.panel('solarPanel', true); app.ui.syncToggles(); return 'Abri o <b>estudo solar</b>. Arraste o horário e troque a estação: os finais 01 e 02 recebem sol da manhã; 03 e 04, sol da tarde.'; } },
    { k: /(vista|mar|praia)/, a: () => { const u = app.findUnit('A-3202'); app.ui.setMode('vistas', { unit: u }); return 'Te coloquei na sacada da <b>A-3202</b>, de frente pro mar. Use o controle de andar para comparar a vista de outros pavimentos.'; } },
    { k: /(planta|tipolog|metragem|tamanho|quartos?|su[ií]tes?)/, a: () => { app.ui.openPlans(); return `São 4 tipologias: ${Object.entries(CONFIG.tipologias).map(([f, t]) => `final ${f} com ${t.area} m² e ${t.suites} suítes`).join('; ')}. Abri as plantas humanizadas.`; } },
    { k: /(vaga|garagem|carro)/, a: () => `As unidades têm de 2 a 3 vagas: ${Object.entries(CONFIG.tipologias).map(([f, t]) => `final ${f}: ${t.vagas}`).join(' · ')}.` },
    { k: /(onde|endere|local|localiza)/, a: () => { app.ui.setView('localizacao'); return `Fica em ${CONFIG.endereco}. Mostrei no mapa os pontos próximos: ${CONFIG.pois.slice(0, 3).map((p) => `${p.nome} (${p.dist})`).join(', ')}.`; } },
    { k: /(financ|parcel|entrada|proposta|negoci)/, a: () => `Dá para simular na hora: escolha a unidade e toque em <b>Simular proposta</b>. Você ajusta valor ofertado, entrada, parcelas, reforços e até permuta, e envia direto no WhatsApp do comercial.` },
    { k: /(dentro|decorad|interior|360)/, a: () => { app.ui.setMode('interiores', { unit: app.state.selected || app.findUnit('A-3202') }); return 'Abri o apartamento decorado. Arraste para olhar ao redor: a vista pela janela é a real daquele andar.'; } },
    { k: /(corretor|falar|humano|whats|contato|atendente)/, a: () => `Claro! <a href="${wa('Olá! Estou no tour 3D do ' + CONFIG.nome + ' e quero falar com um corretor.')}" target="_blank">Falar com um corretor no WhatsApp</a>` },
  ];

  function answer(q) {
    const t = q.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const m = q.toUpperCase().match(/\b([AB])\s*-?\s*(\d{3,4})\b/);
    if (m) {
      const u = app.findUnit(`${m[1]}-${m[2]}`);
      if (u) {
        app.selectUnit(u);
        return `A <b>${u.id}</b> fica no ${u.andar}º andar, final ${u.final}, com ${u.tip.area} m² e ${u.tip.suites} suítes. Status: <b>${STATUS[u.status].label}</b>${u.status !== 'vendido' ? ` · ${brl(u.preco)}` : ''}. Abri os detalhes dela.`;
      }
      return 'Não encontrei essa unidade. Os códigos são assim: A-3202 (torre A, 32º andar, final 02).';
    }
    for (const it of intents) if (it.k.test(t)) return it.a();
    return `Boa pergunta! Posso te mostrar <b>unidades disponíveis</b>, <b>valores</b>, <b>lazer</b>, <b>estudo solar</b> ou a <b>vista de um andar</b>. Se preferir, <a href="${wa('Olá! Tenho uma dúvida sobre o ' + CONFIG.nome + ': ' + q)}" target="_blank">mando sua dúvida para um corretor</a>.`;
  }

  const chips = ['Unidades disponíveis', 'A mais barata', 'Valores', 'Lazer', 'Vista mar', 'Ver à noite', 'Entrega'];
  $('#assistChips').innerHTML = chips.map((c) => `<button>${c}</button>`).join('');
  $('#assistChips').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) ask(b.textContent); });
  log.addEventListener('click', (e) => { const a = e.target.closest('[data-act]'); if (a) { e.preventDefault(); if (a.dataset.act === 'tabela') app.ui.openPriceTable(); } });

  function ask(q) {
    if (!q.trim()) return;
    say(q.replace(/</g, '&lt;'), true);
    setTimeout(() => say(answer(q)), 350);
  }
  $('#assistForm').addEventListener('submit', (e) => { e.preventDefault(); const i = $('#assistInput'); ask(i.value); i.value = ''; });
  let greeted = false;
  $('#assistBtn').addEventListener('click', () => {
    $('#assist').hidden = false;
    $('#assistBtn').hidden = true;
    if (!greeted) { greeted = true; say(`Oi! Eu sou o ${nome}, ${CONFIG.assistente.cargo.toLowerCase()} do <b>${CONFIG.nome}</b>. Posso te mostrar unidades, valores, lazer, o sol em cada horário… O que você quer ver?`); }
    setTimeout(() => $('#assistInput').focus(), 50);
  });
  $('#assistClose').addEventListener('click', () => { $('#assist').hidden = true; $('#assistBtn').hidden = false; });
  return { ask };
}

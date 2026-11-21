import { CONFIG } from './config.js';
import { brl } from './data.js';

// Simulador de proposta: o corretor preenche valores, entrada, parcelas,
// reforços e permuta; envia no WhatsApp do comercial e/ou para o portal.
export function initProposal(app, ui) {
  const $ = (s) => document.querySelector(s);
  let unit = null;
  const num = (s) => Number(String(s || '').replace(/[^\d,]/g, '').replace(',', '.')) || 0;
  const fields = ['pCorretor', 'pCreci', 'pCorretorTel', 'pCorretorEmail'];

  function calc() {
    if (!unit) return null;
    const tabela = unit.preco;
    const pctOffer = +$('#propOffer').value;
    const oferta = tabela * pctOffer / 100;
    const pctDown = +$('#propDown').value;
    const entrada = oferta * pctDown / 100;
    const n = Math.max(1, Math.min(120, Math.round(+$('#propParcelas').value || 1)));
    const tipoRef = +$('#propReforco').value;
    const qtdRef = tipoRef === 1 ? Math.floor(n / 12) : tipoRef === 2 ? Math.floor(n / 6) : 0;
    const valRef = tipoRef ? num($('#propReforcoVal').value) : 0;
    const permuta = $('#propPermuta').hidden ? 0 : num($('#propPermutaVal').value);
    const saldo = Math.max(0, oferta - entrada - qtdRef * valRef - permuta);
    const parcela = saldo / n;
    return { tabela, pctOffer, oferta, pctDown, entrada, n, tipoRef, qtdRef, valRef, permuta, parcela, desconto: tabela - oferta };
  }

  function render() {
    const c = calc();
    if (!c) return;
    const setP = (el) => el.style.setProperty('--p', ((el.value - el.min) / (el.max - el.min)) * 100 + '%');
    setP($('#propOffer')); setP($('#propDown'));
    $('#propOfferVal').textContent = brl(c.oferta);
    $('#propOfferPct').textContent = `${c.pctOffer.toLocaleString('pt-BR')}% da tabela${c.desconto > 0 ? ' · desconto de ' + brl(c.desconto) : ''}`;
    $('#propDownVal').textContent = brl(c.entrada);
    $('#propDownPct').textContent = `${c.pctDown}% do valor ofertado`;
    $('#propParcela').textContent = brl(c.parcela);
    $('#propReforcoVal').hidden = !c.tipoRef;
    const rows = [['Entrada', brl(c.entrada)], [`${c.n}× parcelas mensais`, brl(c.parcela)]];
    if (c.qtdRef) rows.push([`${c.qtdRef}× reforços ${c.tipoRef === 1 ? 'anuais' : 'semestrais'}`, brl(c.valRef)]);
    if (c.permuta) rows.push(['Permuta', brl(c.permuta)]);
    $('#propSum').innerHTML = rows.map(([a, b]) => `<span>${a}</span><b>${b}</b>`).join('') + `<span class="total">Total ofertado</span><b>${brl(c.oferta)}</b>`;
  }

  function text() {
    const c = calc();
    const v = (id) => $('#' + id).value.trim();
    const lines = [
      `*PROPOSTA · ${CONFIG.nome}*`,
      `Unidade *${unit.id}* · Torre ${unit.torre} · ${unit.andar}º pav. · Final ${unit.final} · ${unit.tip.area} m²`,
      '',
      `Valor de tabela: ${brl(c.tabela)}`,
      `*Valor ofertado: ${brl(c.oferta)}* (${c.pctOffer}% da tabela)`,
      `Entrada: ${brl(c.entrada)} (${c.pctDown}%)`,
      `Parcelas: ${c.n}× de ${brl(c.parcela)}`,
    ];
    if (c.qtdRef) lines.push(`Reforços: ${c.qtdRef}× ${c.tipoRef === 1 ? 'anuais' : 'semestrais'} de ${brl(c.valRef)}`);
    if (c.permuta) lines.push(`Permuta: ${v('propPermutaDesc') || 'bem'} · ${brl(c.permuta)}`);
    lines.push('', `Cliente: ${v('pCliente')}${v('pClienteTel') ? ' · ' + v('pClienteTel') : ''}`);
    lines.push(`Corretor: ${v('pCorretor')}${v('pCreci') ? ' · CRECI ' + v('pCreci') : ''} · ${v('pCorretorTel')}${v('pCorretorEmail') ? ' · ' + v('pCorretorEmail') : ''}`);
    if (v('pObs')) lines.push(`Obs.: ${v('pObs')}`);
    lines.push('', '_Estimativa simples, sem correção monetária nem juros._');
    return lines.join('\n');
  }

  ['propOffer', 'propDown', 'propParcelas', 'propReforco', 'propReforcoVal', 'propPermutaVal'].forEach((id) => $('#' + id).addEventListener('input', render));
  $('#propReforco').addEventListener('change', render);
  $('#propPermutaBtn').addEventListener('click', () => { $('#propPermuta').hidden = !$('#propPermuta').hidden; $('#propPermutaBtn').textContent = $('#propPermuta').hidden ? '+ Incluir permuta (carro, moto, imóvel…)' : '− Remover permuta'; render(); });
  const money = (el) => el.addEventListener('blur', () => { const n = num(el.value); el.value = n ? n.toLocaleString('pt-BR') : ''; render(); });
  money($('#propReforcoVal')); money($('#propPermutaVal'));

  const saveBroker = () => ui.store.set('corretor', Object.fromEntries(fields.map((f) => [f, $('#' + f).value])));
  const validate = () => {
    const f = $('#propForm');
    if (!f.reportValidity()) return false;
    saveBroker();
    return true;
  };

  $('#propForm').addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validate()) return;
    const msg = encodeURIComponent(text());
    window.open(`https://wa.me/${CONFIG.whatsappComercial}?text=${msg}`, '_blank');
    const tel = $('#pCorretorTel').value.replace(/\D/g, '');
    const me = tel ? `https://wa.me/${tel.length <= 11 ? '55' + tel : tel}?text=${msg}` : null;
    ui.toast(`Proposta enviada ao comercial! ${me ? `<a href="${me}" target="_blank" style="color:inherit;text-decoration:underline;margin-left:6px">Mandar cópia pro meu WhatsApp</a>` : ''}`, 9000);
  });
  $('#propCopy').addEventListener('click', () => ui.copy(text().replace(/[*_]/g, ''), 'Resumo da proposta copiado!'));
  $('#propPrint').addEventListener('click', () => { if (validate()) window.print(); });
  $('#propPortal').addEventListener('click', async () => {
    if (!validate()) return;
    const c = calc();
    const payload = { empreendimento: CONFIG.nome, unidade: unit.id, ...c, cliente: $('#pCliente').value, clienteTelefone: $('#pClienteTel').value, corretor: $('#pCorretor').value, creci: $('#pCreci').value, corretorTelefone: $('#pCorretorTel').value, corretorEmail: $('#pCorretorEmail').value, obs: $('#pObs').value, permutaDescricao: $('#propPermutaDesc').value, enviadoEm: new Date().toISOString() };
    if (!CONFIG.portalConstrutora) {
      const log = ui.store.get('propostas', []);
      log.push(payload);
      ui.store.set('propostas', log);
      ui.toast('Proposta registrada (modo demonstração: configure o portal em config.js)', 4500);
      return;
    }
    try {
      const r = await fetch(CONFIG.portalConstrutora, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      ui.toast(r.ok ? 'Proposta enviada ao portal da construtora ✓' : 'O portal recusou a proposta (' + r.status + ')', 4000);
    } catch { ui.toast('Não foi possível falar com o portal agora.', 4000); }
  });

  return {
    open(u) {
      unit = u;
      const saved = ui.store.get('corretor', {});
      fields.forEach((f) => { if (saved[f] && !$('#' + f).value) $('#' + f).value = saved[f]; });
      $('#propKicker').textContent = `PROPOSTA · ${CONFIG.nome}`;
      $('#propTitle').textContent = `${u.id} · ${u.tip.area} m²`;
      $('#propTabela').textContent = brl(u.preco);
      render();
      ui.modal('propModal', true);
    },
  };
}

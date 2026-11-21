import { CONFIG, COMODOS } from './config.js';
import { planSVG } from './plans.js';
import { FINAIS, brl } from './data.js';

// Catálogo (book de vendas) em tela cheia. As imagens são renderizadas
// do próprio modelo 3D na primeira abertura.
export function initCatalog(app, ui) {
  const $ = (s) => document.querySelector(s);
  const { THREE } = app;
  const C = CONFIG.catalogo;
  let pages = null, i = 0, shots = null, building = false;

  async function makeShots(onStep) {
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    const list = [
      ['capa', V(340, 135, 360), V(0, 75, 0), 17 * 60 + 35],
      ['conceito', V(120, 60, 150), V(0, 80, 0), 10 * 60],
      ['aerea', V(700, 900, 700), V(60, 0, 0), 11 * 60],
      ['lazer', V(62, 30, 42), V(14, 11, -2), 14 * 60 + 30],
      ['noite', V(380, 110, -260), V(0, 70, 0), 20 * 60 + 40],
    ];
    const out = {};
    for (let k = 0; k < list.length; k++) {
      onStep(k + 1, list.length);
      await new Promise((r) => setTimeout(r, 30));
      const [name, p, t, min] = list[k];
      out[name] = app.snapshot(p, t, min);
    }
    return out;
  }

  function build() {
    const n = CONFIG.nome;
    const P = [];
    P.push(`<div class="page pg-cover" style="background-image:url(${shots.capa})"><div class="in"><h1>${n}</h1><p>${CONFIG.cidade.toUpperCase()}</p></div></div>`);
    P.push(`<div class="page pg-split" style="background:${C.corClara};color:#2a1a20"><div class="l"><div class="pg-kick" style="color:${C.corPrincipal}">O CONCEITO</div><div class="pg-h">Morar entre o mar<br>e a Mata Atlântica</div>
      <p class="pg-p">Duas torres com vista para todos os lados: o mar de ${CONFIG.cidade.split(',')[0]} à frente e o verde do morro ao fundo.</p>
      <p class="pg-p">Plantas inteligentes de ${Math.min(...FINAIS.map((f) => CONFIG.tipologias[f].area))} a ${Math.max(...FINAIS.map((f) => CONFIG.tipologias[f].area))} m², lazer completo e acabamento de alto padrão.</p></div>
      <div class="r" style="background-image:url(${shots.conceito})"></div></div>`);
    P.push(`<div class="page pg-split" style="background:${C.corClara};color:#2a1a20"><div class="l"><div class="pg-kick" style="color:${C.corPrincipal}">LOCALIZAÇÃO</div><div class="pg-h">Tudo perto.<br>A praia, mais ainda.</div>
      <ul class="pg-list">${CONFIG.pois.map((p) => `<li><span class="pg-pill" style="background:${C.corPrincipal}">${p.nome}</span><b>${p.dist}</b></li>`).join('')}</ul></div>
      <div class="r" style="background-image:url(${shots.aerea})"></div></div>`);
    const dif = [['Vista mar', 'Finais 01 e 02 de frente para a orla'], ['Estudo solar', 'Sol da manhã nas unidades de frente'], ['2 a 3 vagas', 'Garagem no embasamento com box para bike'], ['Home office', 'Ambiente dedicado nas tipologias 02 e 04'], ['Sacada gourmet', 'Churrasqueira a carvão nas plantas maiores'], ['Lazer no rooftop', 'Piscina com raia, gourmet e academia']];
    P.push(`<div class="page pg-full" style="background:${C.corClara};color:#2a1a20"><div class="pg-kick" style="color:${C.corPrincipal}">DIFERENCIAIS</div><div class="pg-h">Pensado em cada detalhe</div>
      <div class="pg-grid4">${dif.map(([a, b]) => `<div><b style="color:${C.corPrincipal}">${a}</b><span>${b}</span></div>`).join('')}</div></div>`);
    P.push(`<div class="page pg-split" style="background:${C.corPrincipal};color:#fff"><div class="l"><div class="pg-kick">LAZER</div><div class="pg-h">Férias o ano todo,<br>sem sair de casa</div>
      <ul class="pg-list">${CONFIG.lazer.map((l) => `<li><span class="pg-pill" style="background:rgba(255,255,255,.14)">${l.nome}</span></li>`).join('')}</ul></div>
      <div class="r" style="background-image:url(${shots.lazer})"></div></div>`);
    for (const f of FINAIS) {
      const tip = CONFIG.tipologias[f];
      P.push(`<div class="page pg-tip" style="background:${C.corClara};color:#2a1a20"><div class="l">
        ${COMODOS[f].map(([nome, a], k) => `<div class="pg-pill" style="background:${C.corPrincipal}"><i>${String(k + 1).padStart(2, '0')}</i>${nome}<small>${a.toLocaleString('pt-BR')}m²</small></div>`).join('')}</div>
        <div class="r" style="background:${C.corPrincipal}"><h2>Tipologias de ${tip.area}m²</h2><div class="plan">${planSVG(f, { scale: 40, accent: C.corPrincipal })}</div>
        <div class="obs"><b>FINAL ${f}</b> · ${tip.suites} suítes${tip.homeOffice ? ' · home office' : ''}${tip.lavabo ? ' · lavabo' : ''} · ${tip.vagas} vagas · vista ${tip.vista.toLowerCase()}. Imagem ilustrativa; mobiliário não incluso.</div></div></div>`);
    }
    P.push(`<div class="page pg-cover" style="background-image:url(${shots.noite})"><div class="in"><div class="pg-kick" style="color:var(--yellow)">À NOITE</div><h1 style="font-size:8cqh">A orla acende.<br>Você assiste de cima.</h1></div></div>`);
    const total = app.units.length, disp = app.units.filter((u) => u.status === 'disponivel');
    P.push(`<div class="page pg-full" style="background:${C.corClara};color:#2a1a20"><div class="pg-kick" style="color:${C.corPrincipal}">FICHA TÉCNICA</div><div class="pg-h">${n}</div>
      <div class="pg-grid4">${[['Endereço', CONFIG.endereco], ['Torres', CONFIG.torres.map((t) => `Torre ${t.id}: ${t.andares} pavimentos`).join('<br>')], ['Unidades', `${total} apartamentos · 4 por andar`], ['Tipologias', FINAIS.map((f) => CONFIG.tipologias[f].area + ' m²').join(' · ')], ['Entrega', CONFIG.entrega], ['Realização', CONFIG.construtora]].map(([a, b]) => `<div><b style="color:${C.corPrincipal}">${a}</b><span>${b}</span></div>`).join('')}</div></div>`);
    P.push(`<div class="page pg-full" style="background:${C.corPrincipal};color:#fff;align-items:flex-start"><div class="pg-kick">CONDIÇÕES</div><div class="pg-h">${disp.length} unidades disponíveis<br>a partir de ${brl(Math.min(...disp.map((u) => u.preco)))}</div>
      <p class="pg-p">${CONFIG.condicoes.join(' · ')}</p><p class="pg-p" style="opacity:.8">Fale com o seu corretor e simule sua proposta direto no tour 3D.</p></div>`);
    return P;
  }

  function show(k) {
    i = Math.max(0, Math.min(pages.length - 1, k));
    $('#catStage').innerHTML = pages[i].replace('class="page', `data-n="${i + 1}" class="page`);
    $('#catStage .page').insertAdjacentHTML('beforeend', `<span class="pg-num">${String(i + 1).padStart(2, '0')}</span>`);
    $('#catCount').textContent = `Book ${CONFIG.nome} · página ${i + 1} de ${pages.length}`;
  }
  const onKey = (e) => {
    if ($('#catalogView').hidden) return;
    if (!pages) return;
    if (e.key === 'ArrowRight') show(i + 1);
    if (e.key === 'ArrowLeft') show(i - 1);
  };
  document.addEventListener('keydown', onKey);
  $('#catPrev').addEventListener('click', () => pages && show(i - 1));
  $('#catNext').addEventListener('click', () => { if (!pages) return; if (i === pages.length - 1 && ui.presActive && ui.presActive()) ui.presNext(); else show(i + 1); });
  // swipe
  let sx = null;
  $('#catStage').addEventListener('touchstart', (e) => (sx = e.touches[0].clientX), { passive: true });
  $('#catStage').addEventListener('touchend', (e) => { if (sx === null) return; const d = e.changedTouches[0].clientX - sx; if (Math.abs(d) > 40) show(i + (d < 0 ? 1 : -1)); sx = null; });

  return {
    open() {
      $('#catalogView').hidden = false;
      document.body.classList.add('catalog');
      if (!pages) {
        if (building) return;
        building = true;
        const msg = (k, n) => { $('#catStage').innerHTML = `<div class="page" style="display:grid;place-items:center;background:#111;color:#aaa">Gerando as páginas a partir do modelo 3D… ${k}/${n}</div>`; };
        makeShots(msg).then((s) => { shots = s; pages = build(); building = false; if (!$('#catalogView').hidden) show(0); });
      } else show(i);
    },
    close() {
      $('#catalogView').hidden = true;
      document.body.classList.remove('catalog');
    },
  };
}

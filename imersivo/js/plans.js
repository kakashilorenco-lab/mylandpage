import { COMODOS } from './config.js';

// Gera a planta humanizada (SVG) de cada tipologia, com mobiliário,
// piso de madeira, porcelanato nas áreas molhadas e numeração dos cômodos.
const tipoDe = (nome) => {
  const n = nome.toLowerCase();
  if (n.includes('banh') || n.includes('lavabo')) return 'bath';
  if (n.includes('sacada') || n.includes('varanda')) return 'balcony';
  if (n.includes('cozinha')) return 'kitchen';
  if (n.includes('living') || n.includes('estar')) return 'living';
  if (n.includes('office')) return 'office';
  if (n.includes('closet')) return 'closet';
  return 'bed';
};

function layout(final) {
  const rooms = COMODOS[final].map(([nome, area], i) => ({ nome, area, n: i + 1, t: tipoDe(nome) }));
  const W = 12, D = 10, Lw = 5.4, bal = 1.6;
  const R = [];
  const take = (t, filter = () => true) => { const i = rooms.findIndex((r) => r.t === t && filter(r) && !r.used); if (i < 0) return null; rooms[i].used = true; return rooms[i]; };

  const living = take('living');
  const balcony = take('balcony');
  let kitchen = take('kitchen');
  const lavabo = take('bath', (r) => /lavabo/i.test(r.nome));
  const office = take('office');
  const closet = take('closet');

  // zona social (direita)
  R.push({ ...balcony, x: Lw, y: D - bal, w: W - Lw, h: bal, gourmet: /gourmet/i.test(balcony.nome) });
  const kTop = 3.1;
  let kx = Lw;
  if (lavabo) { R.push({ ...lavabo, x: Lw, y: 0, w: 1.6, h: 2.0 }); kx = Lw + 1.6; }
  R.push({ ...(kitchen || { nome: 'Cozinha', n: null }), t: 'kitchen', x: kx, y: 0, w: W - kx, h: kTop });
  if (lavabo) R.push({ t: 'hall', x: Lw, y: 2.0, w: 1.6, h: kTop - 2.0 });
  R.push({ ...living, x: Lw, y: kTop, w: W - Lw, h: D - bal - kTop });

  // zona íntima (esquerda) em fatias
  const beds = rooms.filter((r) => r.t === 'bed' && !r.used);
  beds.forEach((b) => (b.used = true));
  const slices = [];
  beds.forEach((b, i) => slices.push({ room: b, wgt: i === 0 ? 1.35 : 1 }));
  if (office) slices.splice(1, 0, { room: office, wgt: 0.7 });
  const tot = slices.reduce((s, x) => s + x.wgt, 0);
  let y = D;
  const baths = rooms.filter((r) => r.t === 'bath' && !r.used);
  slices.forEach((s, i) => {
    const h = (s.wgt / tot) * D;
    y -= h;
    const r = { ...s.room, x: 0, y, w: Lw, h, master: i === 0 };
    R.push(r);
    const isSuite = /su[ií]te/i.test(r.nome);
    if (r.t === 'bed') {
      let bath = null;
      if (isSuite) bath = baths.find((b) => !b.used && /su[ií]te/i.test(b.nome)) || baths.find((b) => !b.used && !/social/i.test(b.nome));
      if (bath) bath.used = true;
      const bh = Math.min(1.8, h * 0.45);
      if (isSuite) R.push({ ...(bath || { nome: 'Banho', n: null }), t: 'bath', x: Lw - 1.9, y, w: 1.9, h: bh });
      if (i === 0 && closet) R.push({ ...closet, x: 0, y, w: 1.4, h: bh });
    }
  });
  const social = baths.find((b) => !b.used);
  if (social) {
    social.used = true;
    const last = R.filter((r) => r.t === 'bed' && r.x === 0).pop();
    if (last) R.push({ ...social, t: 'bath', x: Lw - 1.9, y: last.y + last.h - 1.7, w: 1.9, h: 1.7 });
  }
  return { W, D, R };
}

const FLOOR = { living: 'wood', bed: 'wood', office: 'wood', closet: 'wood', hall: 'wood', kitchen: 'tile', bath: 'tileB', balcony: 'deck' };

function furniture(r, S) {
  const X = (v) => (r.x + v) * S, Y = (v) => (r.y + v) * S, L = (v) => v * S;
  const o = [];
  const rect = (x, y, w, h, fill, extra = '') => o.push(`<rect x="${X(x)}" y="${Y(y)}" width="${L(w)}" height="${L(h)}" fill="${fill}" ${extra}/>`);
  const circ = (x, y, rr, fill, extra = '') => o.push(`<circle cx="${X(x)}" cy="${Y(y)}" r="${L(rr)}" fill="${fill}" ${extra}/>`);
  const plant = (x, y, k = 0.35) => { circ(x, y, k, '#5f8f4a'); circ(x - k * 0.3, y - k * 0.25, k * 0.55, '#7fb062'); };
  const st = 'stroke="#00000022" stroke-width="1"';
  if (r.t === 'bed') {
    const bw = r.master ? 1.7 : 1.45, bl = 2.0;
    const bx = 0.25, by = Math.max(0.2, r.h / 2 - bw / 2 + (r.master ? 0.3 : 0.2));
    rect(bx, by, bl, bw, '#f7f4ef', st + ' rx="3"');
    rect(bx + bl * 0.35, by, bl * 0.65, bw, '#c9b8a0', 'rx="3"');
    rect(bx + 0.08, by + 0.12, 0.4, bw / 2 - 0.18, '#ffffff', st + ' rx="4"');
    rect(bx + 0.08, by + bw / 2 + 0.06, 0.4, bw / 2 - 0.18, '#ffffff', st + ' rx="4"');
    rect(bx, by - 0.5, 0.45, 0.42, '#b48a62', 'rx="2"');
    rect(bx, by + bw + 0.08, 0.45, 0.42, '#b48a62', 'rx="2"');
    if (r.w > 3.5) rect(r.w - 0.62 - (r.h > 3 ? 1.95 : 0), 0.1, 0.55, Math.min(2.2, r.h - 0.2), '#d9c3a5', st);
    plant(r.w - 2.4, r.h - 0.4, 0.28);
  } else if (r.t === 'living') {
    rect(0.6, r.h - 2.6, 2.6, 2.0, '#e6dccd', 'rx="4"');
    rect(0.3, r.h - 2.7, 0.75, 2.3, '#a9957d', st + ' rx="5"');
    rect(1.05, r.h - 0.95, 1.7, 0.7, '#a9957d', st + ' rx="5"');
    rect(1.55, r.h - 2.1, 0.9, 0.9, '#7b5a3c', 'rx="3"');
    rect(r.w - 0.45, r.h - 2.8, 0.35, 2.2, '#5b4a3a');
    const tx = r.w / 2 + 0.2, ty = 0.5;
    rect(tx, ty, 1.0, 1.8, '#b7895f', st + ' rx="3"');
    for (const yy of [0.25, 0.85, 1.45]) { circ(tx - 0.25, ty + yy, 0.2, '#ece5da', st); circ(tx + 1.25, ty + yy, 0.2, '#ece5da', st); }
    plant(r.w - 0.5, r.h - 0.4, 0.32);
  } else if (r.t === 'kitchen') {
    rect(0, 0, r.w, 0.62, '#d8cbb9', st);
    rect(r.w - 0.62, 0, 0.62, r.h - 0.4, '#d8cbb9', st);
    rect(r.w * 0.35, 0.12, 0.6, 0.38, '#b9c4c9', st + ' rx="3"');
    for (const [a, b] of [[0.2, 0.18], [0.2, 0.42], [0.42, 0.18], [0.42, 0.42]]) circ(r.w * 0.62 + a, b + 0.02, 0.07, '#333');
    rect(0.1, 0.05, 0.7, 0.7, '#e9eef0', st);
    if (r.h > 2.6) rect(r.w * 0.25, 1.4, r.w * 0.45, 0.85, '#efe9df', st + ' rx="2"');
  } else if (r.t === 'bath') {
    rect(0.05, 0.05, Math.min(1.0, r.w * 0.5), Math.min(0.95, r.h * 0.55), '#c8d6dc', st);
    o.push(`<ellipse cx="${X(r.w - 0.35)}" cy="${Y(r.h - 0.45)}" rx="${L(0.2)}" ry="${L(0.28)}" fill="#fff" ${st}/>`);
    rect(r.w - 0.55, 0.05, 0.5, 0.75, '#efefef', st + ' rx="3"');
  } else if (r.t === 'balcony') {
    if (r.gourmet) rect(r.w - 2.4, 0.08, 2.2, 0.55, '#8d8d8d', st);
    circ(1.2, r.h / 2, 0.38, '#b7895f', st);
    for (const a of [0, 1.6, 3.2, 4.7]) circ(1.2 + Math.cos(a) * 0.62, r.h / 2 + Math.sin(a) * 0.5, 0.17, '#efe7da', st);
    plant(r.w - 0.4, r.h - 0.5, 0.3);
  } else if (r.t === 'office') {
    rect(0.15, 0.15, 0.6, Math.min(1.6, r.h - 0.3), '#b7895f', st);
    circ(1.05, 0.15 + Math.min(1.6, r.h - 0.3) / 2, 0.24, '#444');
    plant(r.w - 0.4, 0.4, 0.25);
  } else if (r.t === 'closet') {
    rect(0.05, 0.05, 0.55, r.h - 0.1, '#d9c3a5', st);
  }
  return o.join('');
}

let uid = 0;
export function planSVG(final, opts = {}) {
  const { W, D, R } = layout(final);
  const id = 'p' + (++uid) + '_';
  const S = opts.scale || 46;
  const pad = 14;
  const w = W * S + pad * 2, h = D * S + pad * 2;
  const defs = `<defs>
    <pattern id="${id}wood" width="32" height="120" patternUnits="userSpaceOnUse"><rect width="32" height="120" fill="#d9bd95"/><rect x="16" width="16" height="120" fill="#d3b58b"/><rect width="0.8" height="120" fill="#b89a72"/><rect x="16" width="0.8" height="120" fill="#b89a72"/><rect y="70" width="16" height="0.8" fill="#b89a72"/><rect x="16" y="22" width="16" height="0.8" fill="#b89a72"/></pattern>
    <pattern id="${id}tile" width="22" height="22" patternUnits="userSpaceOnUse"><rect width="22" height="22" fill="#ece8e1"/><path d="M0 0H22V22" fill="none" stroke="#d8d2c8" stroke-width="1"/></pattern>
    <pattern id="${id}tileB" width="14" height="14" patternUnits="userSpaceOnUse"><rect width="14" height="14" fill="#e3e9ec"/><path d="M0 0H14V14" fill="none" stroke="#cdd6da" stroke-width="1"/></pattern>
    <pattern id="${id}deck" width="60" height="9" patternUnits="userSpaceOnUse"><rect width="60" height="9" fill="#bf9a70"/><rect y="8" width="60" height="1" fill="#a7835c"/></pattern>
  </defs>`;
  let body = '';
  for (const r of R) body += `<rect x="${r.x * S}" y="${r.y * S}" width="${r.w * S}" height="${r.h * S}" fill="${FLOOR[r.t] ? `url(#${id}${FLOOR[r.t]})` : '#ddd'}"/>`;
  for (const r of R) body += furniture(r, S);
  for (const r of R) body += `<rect x="${r.x * S}" y="${r.y * S}" width="${r.w * S}" height="${r.h * S}" fill="none" stroke="#2b2724" stroke-width="${r.t === 'balcony' ? 2 : 5}" ${r.t === 'balcony' ? 'stroke-dasharray="6 4"' : ''}/>`;
  body += `<rect x="0" y="0" width="${W * S}" height="${(D - 1.6) * S}" fill="none" stroke="#2b2724" stroke-width="8"/>`;
  // portas (aberturas claras)
  for (const r of R) {
    if (r.t === 'bed' || r.t === 'bath' || r.t === 'office') {
      const dx = (r.x + r.w) * S - 3, dy = (r.y + Math.min(r.h - 0.3, 0.25 + (r.t === 'bath' ? 0.9 : 0))) * S;
      if (r.x + r.w < W - 0.1) body += `<rect x="${dx - 3}" y="${dy}" width="10" height="${0.8 * S}" fill="#d9bd95"/>`;
    }
  }
  if (opts.numbers !== false) {
    for (const r of R) {
      if (!r.n) continue;
      const cx = (r.x + r.w / 2) * S, cy = (r.y + (r.t === 'living' ? r.h * 0.42 : r.h / 2)) * S;
      body += `<g><circle cx="${cx}" cy="${cy}" r="13" fill="${opts.accent || '#6b1734'}" stroke="#fff" stroke-width="2"/><text x="${cx}" y="${cy + 4}" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-weight="700" font-size="11" letter-spacing="0.5" fill="#fff">${String(r.n).padStart(2, '0')}</text></g>`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-pad} ${-pad} ${w} ${h}" class="plan-svg">${defs}${body}</svg>`;
}

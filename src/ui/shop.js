// 店：用具・内装・服。品をタップすると、置いたとき／着たときの見本を見てから買える
import { SHOP, shopById, DEFAULT_WEAR, OPPONENTS, oppById } from '../catalog.js';
import { buy, wear, cannotBuy, wearingOf, roomItemsOf, beltsOf, machoOf } from '../rules.js';
import { drawGym } from '../art/scene.js';
import { frontLook, sideLook, swatch, GLOVES } from '../art/wear.js';
import { drawPreview } from './bout.js';
import { openSheet, closeSheet, esc } from './sheet.js';

const $ = id => document.getElementById(id);
const KINDS = [['gear', '用具', '部屋に置かれ、能力の伸びが増える（買った次の日のジムから。1つの能力につき +15% まで）'], ['room', '内装', '見た目だけ'], ['wear', '服', 'ジムでもリングでも着ている']];
const SLOT = { trunks: 'トランクス', gloves: 'グローブ', wraps: 'バンテージ' };
const DEFAULT_NAME = { trunks: '青いトランクス', gloves: '青いグローブ', wraps: '白いバンテージ' };

export function renderShop(app) {
  const s = app.state, w = wearingOf(s);
  $('s-money').textContent = '$' + s.money;
  drawGym($('s-scene'), { m: machoOf(s.total).m, items: roomItemsOf(s), belts: beltsOf(s), look: frontLook(w), gloves: GLOVES[w.gloves] });

  $('s-list').innerHTML = KINDS.map(([k, title, hint]) => {
    let rows = SHOP.filter(x => x.kind === k).map(it => row(s, it, w));
    if (k === 'wear') rows = Object.keys(SLOT).map(slot => `<li class="slot">${SLOT[slot]}</li>` + defRow(slot, w) + SHOP.filter(x => x.slot === slot).map(it => row(s, it, w)).join('')).join('');
    else rows = rows.join('');
    return `<h2 class="sub">${title}<small>${hint}</small></h2><ul class="shoplist">${rows}</ul>`;
  }).join('');

  $('s-list').querySelectorAll('[data-item]').forEach(b => b.onclick = () => openItem(app, b.dataset.item));
  $('s-list').querySelectorAll('[data-def]').forEach(b => b.onclick = () => app.commit(wear(app.state, b.dataset.def, DEFAULT_WEAR[b.dataset.def])));
}

function row(s, it, w) {
  const owned = !!s.owned[it.id], on = it.kind === 'wear' && owned && w[it.slot] === it.color;
  const sw = swatch(it);
  const state = on ? '<span class="tag on">着ている</span>' : owned ? `<span class="tag">${it.kind === 'wear' ? '持っている' : '置いた'}</span>` : `<span class="price${s.money < it.price ? ' short' : ''}">$${it.price}</span>`;
  return `<li><button data-item="${it.id}">${sw ? `<i class="sw" style="background:${sw}"></i>` : ''}<span class="nm">${esc(it.name)}<small>${esc(it.desc)}</small></span>${state}</button></li>`;
}

function defRow(slot, w) {
  const on = w[slot] === DEFAULT_WEAR[slot];
  return `<li><button data-def="${slot}"${on ? ' disabled' : ''}><span class="nm">${DEFAULT_NAME[slot]}<small>最初から持っている</small></span>${on ? '<span class="tag on">着ている</span>' : '<span class="tag">着る</span>'}</button></li>`;
}

/** 品のシート：見本・説明・買う／着る */
function openItem(app, id) {
  const s = app.state, it = shopById(id), owned = !!s.owned[id];
  const why = owned ? null : cannotBuy(s, id);
  openSheet(`
    <h2 class="sheet-h">${esc(it.name)}</h2>
    <canvas class="scene" id="i-prev" width="160" height="104"></canvas>
    <p class="hint">${esc(it.desc)}${owned ? '' : `。$${it.price}（買うと残り $${s.money - it.price}）`}</p>
    <p class="err" id="i-err"${why ? '' : ' hidden'}>${why || ''}</p>
    <div class="row">
      <button class="btn ghost" id="i-no">やめる</button>
      ${owned ? (it.kind === 'wear' ? '<button class="btn primary" id="i-wear">着る</button>' : '') : `<button class="btn primary" id="i-buy"${why ? ' disabled' : ''}>買う</button>`}
    </div>`, p => {
    // 見本：置いたとき・着たときの姿
    const w = { ...wearingOf(s) };
    if (it.kind === 'wear') w[it.slot] = it.color;
    const cv = p.querySelector('#i-prev');
    if (it.slot === 'gloves') {
      const o = oppById(Math.min(s.opponent, OPPONENTS.length));
      drawPreview(cv, { myM: machoOf(s.total).m, foeId: o.id, chapter: o.chapter, meLook: sideLook(w) });
    } else {
      const items = [...new Set([...roomItemsOf(s), ...(it.kind === 'wear' ? [] : [id])])];
      drawGym(cv, { m: machoOf(s.total).m, items, belts: beltsOf(s), look: frontLook(w), gloves: GLOVES[w.gloves] });
    }
    p.querySelector('#i-no').onclick = () => closeSheet();
    const b = p.querySelector('#i-buy');
    if (b) b.onclick = () => {
      try { const next = buy(app.state, id, app.today()); closeSheet(); app.commit(next); app.toast?.(it.kind === 'wear' ? `${it.name}を買って着た` : it.kind === 'gear' ? `${it.name}を部屋に置いた。次のジムから効く` : `${it.name}を部屋に置いた`); }
      catch (e) { const er = p.querySelector('#i-err'); er.textContent = e.message; er.hidden = false; }
    };
    const wb = p.querySelector('#i-wear');
    if (wb) wb.onclick = () => { closeSheet(); app.commit(wear(app.state, it.slot, it.color)); };
  });
}

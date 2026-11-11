// 記録のあと：「トレーニング完了」。点が数え上がり、能力のバーが順に伸び、レベルと体つきが上がる
// 分身の鏡の前のポーズは M2 で足す
import { ABILITIES, MOVES, splitName } from '../catalog.js';
import { level, machoOf, wearingOf } from '../rules.js';
import { frontLook } from '../art/wear.js';
import { drawMirror } from '../art/scene.js';
import { rng } from '../art/pixel.js';

const $ = id => document.getElementById(id);
const reduce = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
let timers = [], run = 0, look = null;
const later = (ms, f) => timers.push(setTimeout(f, ms));
const frac = x => x - level(x);

export function renderAfter(app) {
  timers.forEach(clearTimeout); timers = []; const token = ++run;
  const before = app.arg?.before, now = app.state;
  if (!before) { app.go('home'); return; }
  const day = now.sessions.find(x => x.id === app.arg.day) || { pts: 0, sets: [] };
  const fast = reduce() || !!app.arg.fast;

  $('a-sub').textContent = `${splitName(day.top || day.split)}の日・${day.sets.length}種目`;

  // 能力：前の値から始める
  $('a-gain').innerHTML = '<div class="lbl"><span>能力</span><span>Lv</span></div><div class="gain">' + ABILITIES.map(a => `
    <span>${a.name}</span>
    <span class="lv" id="a-lv-${a.id}">${level(before.ability[a.id])}</span>
    <div class="bar"><i class="${a.id}" id="a-bar-${a.id}" style="width:${Math.round(frac(before.ability[a.id]) * 100)}%"></i></div>
    <span class="plus" id="a-plus-${a.id}"></span>`).join('') + '</div>';

  const mb = machoOf(before.total), mn = machoOf(now.total);
  const sc = $('a-scene');
  look = frontLook(wearingOf(now));
  drawMirror(sc, { m: mb.m, look });
  $('a-body').innerHTML = `<div class="lbl"><span>体つき</span><span class="dot" id="a-stage">${mb.stage} ${mb.name}</span></div>
    <div class="bar"><i id="a-mbar" style="width:${Math.round(mb.frac * 100)}%"></i></div>
    <div class="hint" id="a-mhint"></div>`;
  $('a-events').innerHTML = '';
  $('a-back').hidden = !fast; $('a-skip').hidden = fast;

  // 1) 点を数え上げる
  const ptsEl = $('a-pts');
  const t0 = performance.now(), dur = fast ? 0 : 900;
  const tick = t => {
    const k = dur ? Math.min(1, (t - t0) / dur) : 1;
    ptsEl.textContent = (day.pts * (1 - Math.pow(1 - k, 3))).toFixed(1);
    if (k < 1) requestAnimationFrame(tick); else ptsEl.parentElement.classList.add('pop');
  };
  requestAnimationFrame(tick);

  // 2) 能力のバーを順に伸ばす（レベルが上がるときは満タン→0から伸び直す）
  let t = fast ? 0 : 1000;
  const step = fast ? 0 : 520;
  for (const a of ABILITIES) {
    const b = before.ability[a.id], n = now.ability[a.id], d = n - b;
    later(t, () => {
      const bar = $('a-bar-' + a.id), lv = $('a-lv-' + a.id), plus = $('a-plus-' + a.id);
      plus.textContent = d >= 0.005 ? '+' + d.toFixed(2) : '—';
      plus.classList.add('show');
      if (d < 0.005) return;
      grow(bar, level(n) > level(b), frac(n), fast, () => { lv.textContent = level(n); lv.classList.add('pop'); });
    });
    t += step;
  }

  // 3) 体つき
  later(t, () => {
    morph(sc, mb.m, mn.m, fast ? 0 : 800, token);
    grow($('a-mbar'), mn.stage > mb.stage, mn.stage >= 7 ? 1 : mn.frac, fast, () => {
      $('a-stage').textContent = mn.stage + ' ' + mn.name; $('a-stage').classList.add('pop');
    });
    $('a-mhint').textContent = mn.stage >= 7 ? 'いちばん上の段階です' : `次の段階まで あと ${Math.ceil(mn.next)} 点`;
  });
  t += fast ? 0 : 900;

  // 4) できごと
  later(t, () => {
    celebrate(sc, mn.m, mn.stage > mb.stage, fast, token);
    const ev = [];
    if (mn.stage > mb.stage) ev.push(['体つきが上がった', `「${mn.name}」になった（${mn.stage} / 7）`]);
    for (const a of ABILITIES) if (level(now.ability[a.id]) > level(before.ability[a.id])) ev.push([`${a.name} Lv${level(now.ability[a.id])}`, 'レベルが上がった']);
    for (const m of MOVES) if (now.moves[m.id] && !before.moves[m.id]) ev.push([`${m.name}を覚えた`, m.desc]);
    if (now.rounds > before.rounds) ev.push(['3分割ひと回り', `体力 +1・$30（${now.rounds}回目）`]);
    if (!ev.length) ev.push(['おつかれさま', '今日の分、ちゃんと強くなった']);
    $('a-events').innerHTML = ev.map(([h, p], i) => `<div class="event" style="animation-delay:${fast ? 0 : i * 180}ms"><b>${h}</b>${p}</div>`).join('');
    $('a-back').hidden = false; $('a-skip').hidden = true;
  });

  $('a-skip').onclick = () => { app.go('after', { ...app.arg, fast: true }); };
  $('a-back').onclick = () => { timers.forEach(clearTimeout); timers = []; app.go('home'); };
}

/** バーを伸ばす。wrap なら一度満タンにしてから 0 → to。終わったら done() */
function grow(bar, wrap, to, fast, done) {
  const set = (w, anim) => { bar.style.transition = anim ? '' : 'none'; bar.style.width = Math.round(w * 100) + '%'; void bar.offsetWidth; };
  if (fast) { set(to, false); done(); return; }
  if (wrap) {
    set(1, true);
    later(620, () => { bar.classList.add('flash'); done(); set(0, false); set(to, true); later(400, () => bar.classList.remove('flash')); });
  } else { set(to, true); later(600, done); }
}

/** 体つきをなめらかに変える（段階の間も描き分ける） */
function morph(sc, from, to, dur, token) {
  const t0 = performance.now();
  const f = t => {
    if (token !== run) return;
    const k = dur ? Math.min(1, (t - t0) / dur) : 1;
    drawMirror(sc, { m: from + (to - from) * (1 - Math.pow(1 - k, 2)), look });
    if (k < 1) requestAnimationFrame(f);
  };
  requestAnimationFrame(f);
}

/** 最後にポーズ。段階が上がったら光ってきらきら */
function celebrate(sc, m, up, fast, token) {
  if (fast || !up) { drawMirror(sc, { m, look, pose: 'flex', glow: up ? 0.5 : 0, sparkle: up ? sparks(7, 0) : null }); return; }
  const t0 = performance.now();
  const f = t => {
    if (token !== run) return;
    const k = Math.min(1, (t - t0) / 1600);
    drawMirror(sc, { m, look, pose: 'flex', glow: 1 - k * 0.5, sparkle: sparks(16, Math.floor((t - t0) / 90)) });
    if (k < 1) requestAnimationFrame(f);
  };
  requestAnimationFrame(f);
}

/** 分身のまわりのきらきら（frame ごとに位置が変わる） */
function sparks(n, frame) {
  const r = rng(frame * 31 + 7), out = [];
  for (let i = 0; i < n; i++) out.push([Math.round(52 + r() * 56), Math.round(30 + r() * 62), r()]);
  return out;
}

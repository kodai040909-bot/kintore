// 試合を絵で再生する。fight.js の「出来事の列」を、横向きの選手のポーズに置きかえて順に見せる
// 長い試合でも 20〜40 秒に収まるよう、1ラウンドから見どころだけ選ぶ（体力のバーは全部の出来事を反映）
import { sideFighter, LOOKS, BUILD, POSES } from '../art/side.js';
import { drawArena } from '../art/ring.js';
import { mk, px, rect, shadow } from '../art/pixel.js';
import { moveById } from '../catalog.js';

const cache = new Map();
function sprite(m, pose, lookKey, flip, look) {
  const key = `${Math.round(m * 4) / 4}|${pose}|${lookKey}|${flip}|${look ? look.trunks + look.gloves : ''}`;
  if (!cache.has(key)) { if (cache.size > 300) cache.clear(); cache.set(key, sideFighter(m, pose, look || LOOKS[lookKey], flip)); }
  return cache.get(key);
}

const X = [62, 98], FEET = 88;
const PUNCH = { jab: 'jab', straight: 'straight', hook: 'hook', upper: 'upper', body: 'body', ace: 'upper', counter: 'straight', punch: 'jab' };

/**
 * 試合の舞台。canvas に会場・選手・体力のバーを描く
 * opt: { myM, foeId, chapter, meLook }
 */
export function createBout(canvas, opt) {
  const g = canvas.getContext('2d');
  const bg = mk(160, 104); drawArena(bg.getContext('2d'), opt.chapter);
  const st = {
    pose: ['guard', 'guard'], dx: [0, 0], hp: [1, 1], shownHp: [1, 1], max: [1, 1],
    spark: null, shake: 0,
  };
  function draw() {
    const sx = st.shake ? Math.round((Math.random() - 0.5) * 3) : 0;
    g.clearRect(0, 0, 160, 104);
    g.drawImage(bg, sx, 0);
    for (let i = 0; i < 2; i++) shadow(g, X[i] + st.dx[i] + sx, FEET, 9);
    // 打っている側を手前に
    const order = st.pose[1] !== 'guard' && st.pose[0] === 'guard' ? [0, 1] : [1, 0];
    for (const i of order) {
      const s = i === 0 ? sprite(opt.myM, st.pose[0], 'me', false, opt.meLook) : sprite(BUILD[opt.foeId], st.pose[1], opt.foeId, true);
      g.drawImage(s, X[i] + st.dx[i] - (i === 0 ? 30 : 34) + sx, FEET - 60);
    }
    // 当たったところの火花
    if (st.spark) {
      const { x, y, big, col } = st.spark;
      px(g, x, y, '#fff6dc');
      for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { px(g, x + a, y + b, col); if (big) px(g, x + a * 2, y + b * 2, col); }
      if (big) for (const [a, b] of [[1, 1], [-1, -1], [1, -1], [-1, 1]]) px(g, x + a * 2, y + b * 2, '#fff6dc');
    }
    // 体力のバー（なめらかに減る）
    for (let i = 0; i < 2; i++) st.shownHp[i] += (st.hp[i] - st.shownHp[i]) * 0.2;
    bar(g, 4, 4, st.shownHp[0], false); bar(g, 96, 4, st.shownHp[1], true);
  }
  return { st, draw, opt };
}

function bar(g, x, y, v, right) {
  rect(g, x, y, 60, 5, '#191317'); rect(g, x + 1, y + 1, 58, 3, '#3a3140');
  const w = Math.max(0, Math.round(58 * Math.max(0, Math.min(1, v))));
  const col = v > 0.5 ? '#d9a35b' : v > 0.25 ? '#d97e4b' : '#c9504f';
  rect(g, right ? x + 1 + 58 - w : x + 1, y + 1, w, 3, col);
}

/** 構えの絵だけ描く（試合の前） */
export function drawPreview(canvas, opt) { createBout(canvas, opt).draw(); }

/** 出来事の列から、再生する場面を選ぶ */
function steps(res, rounds) {
  const out = [];
  const per = rounds > 4 ? 4 : 6;
  const byRound = new Map();
  for (const e of res.log) { if (!byRound.has(e.round)) byRound.set(e.round, []); byRound.get(e.round).push(e); }
  for (const [, evs] of byRound) {
    const must = new Set(evs.filter(e => ['bell', 'down', 'up', 'ko', 'tko', 'decision', 'clinch', 'counter'].includes(e.type)));
    const hits = evs.filter(e => e.type === 'hit' || e.type === 'block').sort((a, b) => b.dmg - a.dmg).slice(0, per);
    const flavor = evs.filter(e => e.type === 'evade' || e.type === 'miss').slice(0, 2);
    for (const e of evs) if (must.has(e) || hits.includes(e) || flavor.includes(e)) out.push(e);
  }
  return out;
}

/**
 * 再生する
 * @param bout createBout の返り値
 * @param res  simulate の結果
 * @param ctl  { rounds, foeName, speed: () => 倍率, banner: text => void, line: text => void, done: () => void }
 * @returns 止める関数
 */
export function play(bout, res, ctl) {
  const st = bout.st;
  st.max = res.max;
  const list = steps(res, ctl.rounds);
  const name = i => i === 0 ? 'あなた' : ctl.foeName;
  const mv = id => (moveById(id) || { name: 'パンチ' }).name;
  let i = 0, t0 = performance.now(), alive = true, flip = 0, prevMove = null;
  const setHp = e => { if (e.hp) st.hp = [Math.max(0, e.hp[0]) / res.max[0], Math.max(0, e.hp[1]) / res.max[1]]; };

  const durOf = e => ({ bell: 1100, down: 1100, up: 600, ko: 1800, tko: 1800, decision: 2000, clinch: 700, counter: 520 }[e.type] || 430);

  function enter(e) {
    st.pose = ['guard', 'guard']; st.dx = [0, 0]; st.spark = null; st.shake = 0;
    flip++;
    if (e.type === 'bell') { setHp(e); ctl.banner(`ROUND ${e.round}`); return; }
    ctl.banner(null);
    if (['hit', 'block', 'evade', 'miss', 'counter'].includes(e.type)) {
      let p = PUNCH[e.move] || 'jab';
      if (e.move === 'onetwo') p = prevMove === 'onetwo-1' ? 'straight' : 'jab';
      prevMove = e.move === 'onetwo' && prevMove !== 'onetwo-1' ? 'onetwo-1' : e.move;
      if (flip % 2 && POSES[p + '_v']) p += '_v';
      const a = e.who, d = 1 - a;
      st.pose[a] = p; st.dx[a] = a === 0 ? 3 : -3;
      if (e.type === 'hit' || e.type === 'counter') { st.pose[d] = flip % 2 ? 'hit_v' : 'hit'; st.dx[d] = d === 0 ? -2 : 2; st.spark = { x: 80, y: 46 + (p.startsWith('body') ? 12 : 0), big: e.dmg >= 10, col: '#f2c46a' }; }
      else if (e.type === 'block') { st.pose[d] = 'block'; st.spark = { x: 80, y: 48, big: false, col: '#a99c8c' }; }
      else if (e.type === 'evade') st.pose[d] = flip % 2 ? 'weave_v' : 'weave';
      setHp(e);
      if (e.type === 'counter') ctl.line(`${name(a)}のカウンター！`);
      else if (e.type === 'hit' && e.dmg >= 10) ctl.line(`${name(a)}の${mv(e.move)}！`);
      else if (e.type === 'evade') ctl.line(`${name(d)}がかわした`);
      return;
    }
    if (e.type === 'clinch') { st.dx = [6, -6]; ctl.line(`${name(e.who)}がクリンチ`); return; }
    if (e.type === 'down') { st.pose[e.who] = 'down'; st.shake = 1; setHp(e); ctl.banner('DOWN!'); ctl.line(`${name(e.who)}がダウン！`); return; }
    if (e.type === 'up') { setHp(e); ctl.line(`${name(e.who)}が立ち上がる`); return; }
    if (e.type === 'ko' || e.type === 'tko') { st.pose[e.who] = 'down'; st.pose[1 - e.who] = 'win'; st.shake = 1; ctl.banner(e.type === 'ko' ? 'K.O.!' : 'T.K.O.!'); return; }
    if (e.type === 'decision') { st.pose[1 - e.who] = 'win'; ctl.banner('判定'); ctl.line(`判定：${e.score[0]} 対 ${e.score[1]}`); }
  }

  function frame(now) {
    if (!alive) return;
    // 時間がたっていれば、いくつでも先へ進む（「結果だけ見る」はすぐ最後まで）
    while (list[i] && now - t0 >= durOf(list[i]) / ctl.speed()) { t0 += durOf(list[i]) / ctl.speed(); i++; if (list[i]) enter(list[i]); }
    if (ctl.speed() > 100) t0 = now;
    const e = list[i];
    if (!e) { bout.draw(); alive = false; ctl.done(); return; }
    const k = (now - t0) / (durOf(e) / ctl.speed());
    {
      // 打つ動きは前半だけ。後半は構えに戻る（決着の場面はそのまま）
      if (['hit', 'block', 'evade', 'miss', 'counter'].includes(e.type) && k > 0.6) { st.pose = ['guard', 'guard']; st.dx = [0, 0]; st.spark = null; }
      if (st.spark && k > 0.4) st.spark = null;
      if (st.shake && k > 0.35) st.shake = 0;
    }
    bout.draw();
    requestAnimationFrame(frame);
  }
  if (list[0]) enter(list[0]);
  requestAnimationFrame(frame);
  return () => { alive = false; };
}

// 試合の画面：リングで試合を再生し、終わったら結果と文字の実況を出す
import { OPPONENTS, CHAPTERS, MOVES, moveById, oppById } from '../catalog.js';
import { loadoutOf, fightOn, recordFight, meForFight, staminaDip } from '../rules.js';
import { simulate, seedOf } from '../fight.js';
import { esc } from './sheet.js';
import { machoOf, wearingOf, conditionOf } from '../rules.js';
import { readSleep } from '../sleep-link.js';
import { fmtHours } from '../time.js';
import { sideLook } from '../art/wear.js';
import { createBout, drawPreview, play } from './bout.js';

const $ = id => document.getElementById(id);
let selOpp = null;       // 再戦するときに選んだ相手
let lastResult = null;   // さっきの試合（開き直すと消える。記録には勝敗だけ残る）
let busy = false;        // 再生中
let speed = 1;           // 再生の速さ
let stop = null;
let beforeFight = null; // 再生中は試合前の状態で表示する（結果を先に見せない）

const AB = [['punch', 'パンチ'], ['guard', 'ガード'], ['speed', 'スピード'], ['stamina', '体力']];

export function renderFight(app) {
  const s = busy && beforeFight ? beforeFight : app.state, today = app.today();
  const done = busy ? null : fightOn(s, today);
  const maxOpen = Math.min(s.opponent, OPPONENTS.length);
  if (!selOpp || selOpp > maxOpen) selOpp = maxOpen;
  const o = oppById(selOpp), ch = CHAPTERS.find(c => c.id === o.chapter);
  $('f-money').textContent = '$' + s.money;

  // 階段
  $('f-ladder').innerHTML = OPPONENTS.map(x => {
    const won = s.fights.some(f => f.opp === x.id && f.win), open = x.id <= s.opponent;
    return `<li class="${won ? 'won' : ''} ${x.id === s.opponent ? 'now' : ''} ${x.id === selOpp ? 'sel' : ''} ${open ? '' : 'locked'}" data-opp="${x.id}" title="${esc(x.name)}">${won ? '✓' : x.id}</li>`;
  }).join('');
  $('f-ladder').querySelectorAll('li').forEach(li => li.onclick = () => { const id = +li.dataset.opp; if (!busy && id <= s.opponent) { selOpp = id; lastResult = null; $('f-line').textContent = ''; renderFight(app); } });

  // リング：再生中と、試合の直後（最後の場面を残す）は描き直さない
  if (!busy && !lastResult) { drawPreview($('f-stage'), { myM: machoOf(s.total).m, foeId: o.id, chapter: o.chapter, meLook: sideLook(wearingOf(s)) }); $('f-banner').textContent = ''; }
  if (!busy) $('f-foename').textContent = (lastResult ? oppById(lastResult.opp) : o).name;
  $('f-ctl').hidden = !busy;

  // 相手
  const won = s.fights.some(f => f.opp === o.id && f.win);
  const tries = s.fights.filter(f => f.opp === o.id).length;
  const top = Math.max(...AB.map(([k]) => Math.max(o.ab[k], s.ability[k])), 1);
  $('f-opp').innerHTML = `
    <div class="lbl"><span>${ch.name}・${ch.venue}・${ch.rounds}R</span><span>${o.boss ? '章の終わり' : ''}</span></div>
    <div class="opp-name">${esc(o.name)}</div>
    <div class="hint">${esc(o.style)}。技：${o.moves.map(id => moveById(id).name).join('・')}</div>
    <div class="opp-stats">${AB.map(([k, n]) => `<span>${n}</span><div class="bar"><i class="${k}" style="width:${Math.round(s.ability[k] / top * 100)}%"></i></div><div class="bar foe"><i style="width:${Math.round(o.ab[k] / top * 100)}%"></i></div>`).join('')}</div>
    <div class="hint">左のバーがあなた、右が相手。賞金 $${won ? Math.round(o.purse * 0.2) + '（再戦）' : o.purse}${o.sig && !s.moves[o.sig] ? '。この相手から学べる技がある' : ''}</div>`;

  // 持ち込む技
  const lo = loadoutOf(s);
  const learned = MOVES.filter(m => s.moves[m.id]);
  $('f-count').textContent = lo.length + ' / 3';
  $('f-moves').innerHTML = learned.map(m => `<button aria-pressed="${lo.includes(m.id)}" data-move="${m.id}">${m.name}</button>`).join('');
  $('f-movehint').textContent = lo.map(id => `${moveById(id).name}：${moveById(id).desc}`).join(' ／ ');
  $('f-moves').querySelectorAll('button').forEach(b => b.onclick = () => {
    const id = b.dataset.move;
    let next = lo.includes(id) ? lo.filter(x => x !== id) : [...lo, id];
    if (next.length > 3) next = next.slice(1);
    // 空のまま保存すると自動で埋まるので、外したときは選んだものだけ持つ
    if (busy) return;
    app.commit({ ...app.state, loadout: next.length ? next : [id] });
  });

  // コンディション：ねむりの庭の今朝の睡眠（自動で読めたときだけ）と、サボり
  const dip = staminaDip(s.sessions, today);
  const sleep = s.settings.sleepLink === 'off' ? null : readSleep(today);
  const cond = conditionOf(sleep);
  const hp = cond.hp - dip;
  $('f-cond').textContent = cond.name + (hp < 100 ? `・体力 ${hp}%` : '');
  $('f-condhint').textContent = [
    sleep ? `今朝のねむりの庭：${fmtHours(sleep.hours)}（目標 ${fmtHours(sleep.goal)}）→ ${cond.name}${cond.key === 'great' ? '（全部の能力 +5%）' : cond.key === 'short' ? '（体力 90% から）' : ''}` : '',
    dip ? 'しばらくジムを休んだので、試合の体力が少し下がっています。' : '',
  ].filter(Boolean).join(' ') || '';

  // 試合
  $('f-go').disabled = !!done || busy;
  $('f-go').textContent = done ? '今日はもう試合をしました（1日1試合）' : `${o.name}と試合をする`;
  $('f-go').onclick = () => {
    const before = app.state;
    const me = meForFight(before, today, s.settings.sleepLink === 'off' ? null : readSleep(today));
    const seed = seedOf(today + ':' + o.id + ':' + before.fights.length);
    const res = simulate(me, { name: o.name, ab: o.ab, moves: o.moves }, ch.rounds, seed);
    const next = recordFight(before, today, o.id, seed, res);
    const nextOpp = oppById(next.opponent);
    lastResult = { res, opp: o.id, newMoves: MOVES.filter(m => next.moves[m.id] && !before.moves[m.id]).map(m => m.name), money: next.money - before.money, moved: next.opponent > before.opponent,
      promoted: next.opponent > before.opponent && (!nextOpp || nextOpp.chapter > o.chapter), champion: !nextOpp && next.opponent > before.opponent, revealed: false };
    // 記録は先に保存する（再生の途中で閉じても結果は残る）。再生が終わってから結果を見せる
    busy = true; speed = 1; beforeFight = before;
    app.commit(next);
    $('f-foename').textContent = o.name;
    const bout = createBout($('f-stage'), { myM: machoOf(before.total).m, foeId: o.id, chapter: o.chapter, meLook: sideLook(wearingOf(before)) });
    const banner = $('f-banner');
    const r0 = lastResult;
    stop = play(bout, res, {
      rounds: ch.rounds, foeName: o.name, speed: () => speed,
      banner: t => { banner.textContent = t || ''; banner.classList.remove('on'); if (t) { void banner.offsetWidth; banner.classList.add('on'); } },
      line: t => { $('f-line').textContent = t; },
      done: () => {
        busy = false; beforeFight = null; r0.revealed = true;
        if (r0.moved) selOpp = Math.min(app.state.opponent, OPPONENTS.length);
        if (r0.champion) { banner.textContent = 'CHAMPION'; banner.classList.add('on'); }
        else if (r0.promoted) { banner.textContent = '昇格！'; banner.classList.add('on'); }
        $('f-line').textContent = res.win ? '勝ち！' : '負け…';
        renderFight(app);
      },
    });
  };
  $('f-fast').onclick = () => { speed = speed === 1 ? 3 : 1; $('f-fast').textContent = speed === 1 ? '早送り' : 'ふつうの速さ'; };
  $('f-skip').onclick = () => { speed = 1000; };

  // 結果
  const r = lastResult && lastResult.revealed ? lastResult : null;
  if (lastResult && !lastResult.revealed) $('f-result').innerHTML = '';
  else if (r) {
    const fo = oppById(r.opp);
    $('f-result').innerHTML = `<div class="result">
      <div class="big ${r.res.win ? 'win' : 'lose'}">${r.res.win ? '勝ち！' : '負け'}</div>
      <div class="how">${r.res.how}・${r.res.round}ラウンド ／ 与えたダメージ ${r.res.score[0]}・受けたダメージ ${r.res.score[1]}</div>
      <div class="how">ファイトマネー $${r.money}${r.newMoves.length ? `　「${r.newMoves.join('」「')}」を覚えた` : ''}${r.moved && s.opponent <= OPPONENTS.length ? `　次の相手：${esc(oppById(s.opponent).name)}` : ''}${r.moved && s.opponent > OPPONENTS.length ? '　世界チャンピオンになった！' : ''}</div>
      ${r.champion ? `<div class="promo"><b>世界チャンピオン！</b>砂漠の街の大会場で、ベルトを巻いた</div>` : r.promoted ? `<div class="promo"><b>昇格！</b>次は「${CHAPTERS.find(c => c.id === oppById(s.opponent).chapter).name}」。会場は${CHAPTERS.find(c => c.id === oppById(s.opponent).chapter).venue}</div>` : ''}
      <ul class="plays">${plays(r.res, fo.name)}</ul>
    </div>`;
  } else if (done) {
    const fo = oppById(done.opp);
    $('f-result').innerHTML = `<div class="result"><div class="how">今日の試合：${esc(fo.name)}に${done.win ? '勝ち' : '負け'}（${done.how}・${done.round}R）・$${done.money}</div></div>`;
  } else $('f-result').innerHTML = '';

  // まだ覚えていない技は出さない（2026-11-11 本人：覚えたときに初めて知る）
}

/** 出来事の列 → 文字の実況（大事なところだけ） */
function plays(res, foeName) {
  const who = i => i === 0 ? '<span class="me">あなた</span>' : `<span class="foe">${esc(foeName)}</span>`;
  const mv = id => (moveById(id) || { name: 'パンチ' }).name;
  const out = [];
  let dealt = [0, 0];
  const flush = round => { if (round) out.push(`<li class="hint">　このラウンド：与えた ${dealt[0]}・受けた ${dealt[1]}</li>`); dealt = [0, 0]; };
  let round = 0;
  for (const e of res.log) {
    if (e.type === 'bell') { flush(round); round = e.round; out.push(`<li class="rd">第${e.round}ラウンド</li>`); continue; }
    if (e.dmg && e.who >= 0) dealt[e.who] += e.dmg;
    if (e.type === 'hit' && (e.move === 'ace' || isTop(res.log, e))) out.push(`<li>${who(e.who)}の${mv(e.move)}が入った（${e.dmg}）</li>`);
    else if (e.type === 'counter') out.push(`<li>${who(e.who)}のカウンター！（${e.dmg}）</li>`);
    else if (e.type === 'clinch') out.push(`<li>${who(e.who)}がクリンチで逃げた</li>`);
    else if (e.type === 'down') out.push(`<li><b>${who(e.who)}がダウン！</b></li>`);
    else if (e.type === 'up') out.push(`<li>${who(e.who)}は立ち上がった</li>`);
    else if (e.type === 'ko') out.push(`<li><b>${who(e.who)}は立てない。KO</b></li>`);
    else if (e.type === 'tko') out.push(`<li><b>1ラウンドに3度のダウン。TKO</b></li>`);
    else if (e.type === 'decision') out.push(`<li><b>判定：与えたダメージ ${e.score[0]} 対 ${e.score[1]}</b></li>`);
  }
  if (res.how === '判定') flush(round);
  return out.join('');
}

/** そのラウンドで大きく当たった2発か */
function isTop(log, e) {
  const hits = log.filter(x => x.round === e.round && x.type === 'hit').sort((a, b) => b.dmg - a.dmg).slice(0, 2);
  return hits.includes(e);
}


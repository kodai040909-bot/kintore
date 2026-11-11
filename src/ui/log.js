// 記録帳：今週の回数・部位ごとの前回・今月のカレンダー・種目ごとの前回とベスト・日ごとの記録（どの日でも直せる）
import { SPLITS, GROUPS, splitName } from '../catalog.js';
import { editLine, validLine, weekOf, weekStreak, weeklyGoalOf, lastBySplit, exerciseStats, monthDays, totals, nextSplit } from '../rules.js';
import { fmtDate, fmtMD, fmtKg, addDays, WEEKDAYS, weekdayOf } from '../time.js';
import { openSheet, closeSheet, esc } from './sheet.js';

const $ = id => document.getElementById(id);
const lineText = l => `${fmtKg(l.kg)} × ${l.reps}回 × ${l.sets}セット`;
const short = l => `${fmtKg(l.kg)}×${l.reps}×${l.sets}`;
const ago = n => n === null ? 'まだ' : n === 0 ? '今日' : n === 1 ? 'きのう' : n + '日前';
let showAll = false, monthOffset = 0, exTab = null, exTabDay = null;
const bestText = l => `${fmtKg(l.kg)}×${l.reps}回`;

export function renderLog(app) {
  const s = app.state, today = app.today();
  const exName = id => (s.settings.exercises.find(e => e.id === id) || { name: id }).name;
  $('l-go-prefs').onclick = () => app.go('prefs');

  // 今週
  const goal = weeklyGoalOf(s), wk = weekOf(s, today), prev = weekOf(s, addDays(today, -7)), streak = weekStreak(s, today);
  const twd = weekdayOf(today);
  $('l-week').innerHTML = `
    <div class="lbl"><span>今週</span><span class="dot big-num">${wk.count}<small> / ${goal}回</small></span></div>
    <div class="weekrow">${WEEKDAYS.map((w, i) => `<span class="wd ${wk.days[i] || ''} ${i === twd ? 'today' : ''} ${i > twd ? 'future' : ''}"><small>${w}</small>${wk.days[i] ? '●' : ''}</span>`).join('')}</div>
    <div class="hint">${wk.count >= goal ? '今週の目標を達成！' : `目標まで あと${goal - wk.count}回`}　先週 ${prev.count}回・${prev.sets}セット ／ 今週 ${wk.sets}セット</div>
    ${streak >= 2 ? `<div class="streak">週${goal}回を <b>${streak}週</b> つづけている</div>` : ''}`;

  // 部位ごとの前回（いちばん空いている分割に印）
  const last = lastBySplit(s, today);
  const oldest = SPLITS.map(x => x.id).sort((a, b) => (last[b] ?? 999) - (last[a] ?? 999))[0];
  $('l-splits').innerHTML = SPLITS.map(x => `<div class="sp ${x.id} ${x.id === oldest ? 'next' : ''}"><span>${x.name}</span><b>${ago(last[x.id])}</b>${x.id === oldest ? '<small>次はここ？</small>' : ''}</div>`).join('');

  // 今月のカレンダー
  const base = new Date(); base.setDate(1); base.setMonth(base.getMonth() + monthOffset);
  const y = base.getFullYear(), m = base.getMonth() + 1;
  const md = monthDays(s, y, m);
  const first = `${y}-${String(m).padStart(2, '0')}-01`, lead = weekdayOf(first), len = new Date(y, m, 0).getDate();
  const cells = [...Array(lead).fill('<span></span>'), ...Array.from({ length: len }, (_, i) => {
    const id = `${y}-${String(m).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
    return `<span class="cd ${md[id] || ''} ${id === today ? 'today' : ''}">${i + 1}</span>`;
  })];
  $('l-cal').innerHTML = `
    <div class="lbl"><button class="mnav" id="l-prev" aria-label="前の月">‹</button><span>${y}年${m}月　${Object.keys(md).length}回</span><button class="mnav" id="l-next" aria-label="次の月"${monthOffset >= 0 ? ' disabled' : ''}>›</button></div>
    <div class="cal">${WEEKDAYS.map(w => `<span class="h">${w}</span>`).join('')}${cells.join('')}</div>
    <div class="legend">${SPLITS.map(x => `<span class="${x.id}">● ${x.name}</span>`).join('')}</div>`;
  $('l-prev').onclick = () => { monthOffset--; renderLog(app); };
  $('l-next').onclick = () => { if (monthOffset < 0) { monthOffset++; renderLog(app); } };

  // 種目ごと：分割のタブ。最初は今日やりそうな分割（今日の記録があればその分割、なければ前回の次）
  if (exTabDay !== today) { exTabDay = today; const t = s.sessions.find(x => x.id === today); exTab = t ? (t.top || t.split) : nextSplit(s.sessions, today); }
  const tabs = [...SPLITS.map(x => [x.id, x.name]), ['other', 'その他']];
  const stats = exerciseStats(s);
  const inTab = e => (GROUPS[e.group]?.split || 'other') === exTab;
  // 隠した種目も、記録があれば出す
  const rows = s.settings.exercises.filter(e => inTab(e) && (!e.hidden || stats.has(e.id)));
  const hasOther = s.settings.exercises.some(e => !GROUPS[e.group]?.split);
  $('l-extab').innerHTML = tabs.filter(([id]) => id !== 'other' || hasOther).map(([id, n]) => `<button role="radio" aria-checked="${id === exTab}" data-tab="${id}">${n}</button>`).join('');
  $('l-extab').querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { exTab = b.dataset.tab; renderLog(app); });
  $('l-ex').innerHTML = rows.map(e => {
    const h = stats.get(e.id);
    return h ? `<li><span class="nm">${esc(e.name)}<small>${h.days}日・前回 ${fmtMD(h.lastDay)}</small></span>
      <span class="v">前回 ${short(h.last)}<small>ベスト ${bestText(h.best)}（${fmtMD(h.bestId)}）</small></span></li>`
      : `<li><span class="nm">${esc(e.name)}</span><span class="v"><small>まだ</small></span></li>`;
  }).join('') || '<li class="hint">この分割の種目はありません</li>';

  // 累計
  const t = totals(s);
  $('l-total').textContent = t.gyms ? `${fmtMD(t.since)}から ジム${t.gyms}回・${t.sets}セット` : '';

  // 日ごとの記録（新しい順）
  const days = s.sessions.filter(x => x.sets.length).sort((a, b) => a.id < b.id ? 1 : -1);
  const list = showAll ? days : days.slice(0, 14);
  $('l-days').innerHTML = list.map(d => `
    <li class="day">
      <div class="lbl"><span>${fmtDate(d.id)}　<b class="tag ${d.top || d.split}">${esc(splitName(d.top || d.split))}</b></span><span>${d.done ? d.sets.reduce((a, l) => a + l.sets, 0) + 'セット・' + Math.round((d.pts ?? 0) * 10) / 10 + '点' : '記録中'}</span></div>
      <ul class="lines">${d.sets.map((l, i) => `<li><button data-day="${d.id}" data-i="${i}"><span>${esc(exName(l.ex))}</span><span class="v">${lineText(l)}</span></button></li>`).join('')}</ul>
    </li>`).join('') || '<li class="hint">まだ記録がありません</li>';
  $('l-more').hidden = days.length <= 14;
  $('l-more').textContent = showAll ? '最近の14日だけにする' : `全部（${days.length}日）を出す`;
  $('l-more').onclick = () => { showAll = !showAll; renderLog(app); };
  $('l-days').querySelectorAll('[data-day]').forEach(b => b.onclick = () => editSheet(app, b.dataset.day, +b.dataset.i));
}

/** 過去の1行を直す・消す。能力などは全部計算し直す */
function editSheet(app, day, i) {
  const s = app.state, d = s.sessions.find(x => x.id === day), l = d.sets[i];
  const ex = s.settings.exercises.find(e => e.id === l.ex) || { name: l.ex };
  openSheet(`
    <h2 class="sheet-h">${esc(ex.name)}<small class="hint" style="display:block">${fmtDate(day)}の記録</small></h2>
    <div class="step"><span>重さ kg</span><span></span><input id="g-kg" type="number" inputmode="decimal" min="0" max="500" step="0.5" value="${l.kg}"><span></span></div>
    <div class="step"><span>回数</span><span></span><input id="g-reps" type="number" inputmode="numeric" min="1" max="100" value="${l.reps}"><span></span></div>
    <div class="step"><span>セット</span><span></span><input id="g-sets" type="number" inputmode="numeric" min="1" max="20" value="${l.sets}"><span></span></div>
    <p class="hint">直すと、能力・体つき・技は記録から計算し直します（試合の結果はそのまま）</p>
    <p class="err" id="g-err" hidden></p>
    <div class="row"><button class="btn danger" id="g-del">消す</button><button class="btn primary" id="g-ok">直す</button></div>`, p => {
    p.querySelector('#g-ok').onclick = () => {
      const line = { ex: l.ex, kg: Math.round(parseFloat(p.querySelector('#g-kg').value) * 100) / 100, reps: Number(p.querySelector('#g-reps').value), sets: Number(p.querySelector('#g-sets').value) };
      if (!validLine(line)) { const e = p.querySelector('#g-err'); e.textContent = '重さは 0〜500kg、回数は 1〜100、セットは 1〜20 の整数で入れてください'; e.hidden = false; return; }
      closeSheet(); app.commit(editLine(app.state, day, i, line));
    };
    p.querySelector('#g-del').onclick = () => { closeSheet(); app.commit(editLine(app.state, day, i, null)); };
  });
}

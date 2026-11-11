// 記録の画面：種目・重さ（kg）・回数・セット数（実装計画書 §8）
import { SPLITS, GROUPS, splitName } from '../catalog.js';
import { addLine, editLine, setSplit, finishSession, lastLine, nextSplit, validLine } from '../rules.js';
import { fmtDate, fmtKg } from '../time.js';
import { openSheet, closeSheet, esc } from './sheet.js';

const $ = id => document.getElementById(id);
let pendingSplit = null, pendingDay = null, showOthers = false;

const lineText = l => `${fmtKg(l.kg)} × ${l.reps}回 × ${l.sets}セット`;

export function renderRecord(app) {
  const s = app.state, today = app.today();
  const todays = s.sessions.find(x => x.id === today);
  if (pendingDay !== today) { pendingDay = today; pendingSplit = null; }
  const split = todays ? todays.split : (pendingSplit || nextSplit(s.sessions, today));

  $('r-date').textContent = fmtDate(today);
  $('r-state').innerHTML = todays?.done ? '<span class="chip gold">記録済み</span>' : todays ? '<span class="chip">記録中</span>' : '';

  $('r-split').innerHTML = SPLITS.map(x => `<button role="radio" aria-checked="${x.id === split}" data-split="${x.id}">${x.name}</button>`).join('');
  $('r-split').querySelectorAll('button').forEach(b => b.onclick = () => {
    if (todays) app.commit(setSplit(s, today, b.dataset.split));
    else { pendingSplit = b.dataset.split; renderRecord(app); }
  });

  const exs = s.settings.exercises;
  const shown = exs.filter(e => !e.hidden);   // 隠した種目は出さない（記録は残る）
  const mine = shown.filter(e => (GROUPS[e.group] || GROUPS.other).split === split);
  const others = shown.filter(e => !mine.includes(e));
  const row = e => {
    const prev = lastLine(s.sessions, e.id);
    return `<li><button class="ex" data-ex="${esc(e.id)}"><b>${esc(e.name)}</b><small>${GROUPS[e.group]?.name || 'その他'}${prev ? '・前回 ' + lineText(prev) : ''}</small></button>`
      + (prev ? `<button class="again" data-again="${esc(e.id)}" aria-label="${esc(e.name)}を前回と同じで足す">前回</button>` : '') + '</li>';
  };
  $('r-list').innerHTML = mine.map(row).join('');
  $('r-others').innerHTML = others.map(row).join('');
  $('r-others').hidden = !showOthers;
  $('r-more').textContent = showOthers ? 'ほかの分割の種目をしまう' : 'ほかの分割の種目も出す';
  $('r-more').onclick = () => { showOthers = !showOthers; renderRecord(app); };

  const byId = id => exs.find(e => e.id === id);
  document.querySelectorAll('#v-record [data-ex]').forEach(b => b.onclick = () => openEntry(app, byId(b.dataset.ex), split, null));
  document.querySelectorAll('#v-record [data-again]').forEach(b => b.onclick = () => {
    const prev = lastLine(app.state.sessions, b.dataset.again);
    app.commit(addLine(app.state, today, split, { ...prev }));
    app.toast?.(`${byId(b.dataset.again).name}を足しました（${lineText(prev)}）`);
  });

  const lines = todays ? todays.sets : [];
  $('r-lines').innerHTML = lines.map((l, i) => {
    const e = byId(l.ex);
    return `<li><button data-line="${i}"><span>${esc(e ? e.name : l.ex)}</span><span class="v">${lineText(l)}</span></button></li>`;
  }).join('');
  $('r-empty').hidden = lines.length > 0;
  document.querySelectorAll('#r-lines [data-line]').forEach(b => b.onclick = () => {
    const i = +b.dataset.line, l = lines[i];
    openEntry(app, byId(l.ex) || { id: l.ex, name: l.ex, group: 'other' }, split, i);
  });

  $('r-finish').hidden = !!todays?.done;
  $('r-finish').disabled = !lines.length;
  $('r-done-hint').hidden = !todays?.done;
  $('r-finish').onclick = () => {
    const before = app.state;
    const next = finishSession(before, today);
    app.commit(next);
    app.go('after', { before, day: today });
  };
}

/** 入力シート。index が null なら新しく足す、数なら今日のその行を直す */
function openEntry(app, ex, split, index) {
  const today = app.today();
  const todays = app.state.sessions.find(x => x.id === today);
  const cur = index != null ? todays.sets[index] : (lastLine(app.state.sessions, ex.id) || { kg: ex.bw ? 0 : 20, reps: 10, sets: 3 });
  const step = app.state.settings.step || 2.5;
  const v = { kg: cur.kg, reps: cur.reps, sets: cur.sets };

  openSheet(`
    <h2 class="sheet-h">${esc(ex.name)}</h2>
    <div class="step"><span>重さ kg</span><button data-d="kg" data-s="-1" aria-label="重さを減らす">−</button><input id="e-kg" type="number" inputmode="decimal" min="0" max="500" step="0.5" aria-label="重さ kg"><button data-d="kg" data-s="1" aria-label="重さを増やす">＋</button></div>
    <div class="step"><span>回数</span><button data-d="reps" data-s="-1" aria-label="回数を減らす">−</button><input id="e-reps" type="number" inputmode="numeric" min="1" max="100" aria-label="回数"><button data-d="reps" data-s="1" aria-label="回数を増やす">＋</button></div>
    <div class="step"><span>セット</span><button data-d="sets" data-s="-1" aria-label="セットを減らす">−</button><input id="e-sets" type="number" inputmode="numeric" min="1" max="20" aria-label="セット数"><button data-d="sets" data-s="1" aria-label="セットを増やす">＋</button></div>
    <p class="hint">重さ 0 は自重。−／＋で ${step}kg ずつ変わります</p>
    <p class="err" id="e-err" hidden></p>
    <div class="row">
      ${index != null ? '<button class="btn danger" id="e-del">消す</button>' : ''}
      <button class="btn primary" id="e-ok">${index != null ? '直す' : '足す'}</button>
    </div>`, p => {
    const inp = { kg: p.querySelector('#e-kg'), reps: p.querySelector('#e-reps'), sets: p.querySelector('#e-sets') };
    const show = () => { for (const k in inp) inp[k].value = v[k]; };
    const read = () => { v.kg = Math.round(parseFloat(inp.kg.value) * 100) / 100; v.reps = Number(inp.reps.value); v.sets = Number(inp.sets.value); };
    show();
    for (const k in inp) inp[k].addEventListener('change', () => { read(); });
    p.querySelectorAll('[data-d]').forEach(b => b.onclick = () => {
      read();
      const k = b.dataset.d, d = +b.dataset.s;
      if (k === 'kg') v.kg = Math.max(0, Math.round(((Number.isFinite(v.kg) ? v.kg : 0) + d * step) * 100) / 100);
      else v[k] = Math.max(1, (Number.isFinite(v[k]) ? Math.round(v[k]) : 1) + d);
      show();
    });
    p.querySelector('#e-ok').onclick = () => {
      read();
      const line = { ex: ex.id, kg: v.kg, reps: v.reps, sets: v.sets };
      if (!validLine(line)) {
        const e = p.querySelector('#e-err');
        e.textContent = '重さは 0〜500kg、回数は 1〜100、セットは 1〜20 の整数で入れてください';
        e.hidden = false; return;
      }
      closeSheet();
      app.commit(index != null ? editLine(app.state, today, index, line) : addLine(app.state, today, split, line));
    };
    const del = p.querySelector('#e-del');
    if (del) del.onclick = () => { closeSheet(); app.commit(editLine(app.state, today, index, null)); };
  });
}

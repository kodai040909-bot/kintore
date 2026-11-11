// 設定：いつもの種目の編集、ねむりの庭との連携、バックアップ、ホーム画面への追加の説明
import { GROUPS, SPLITS } from '../catalog.js';
import { addExercise, updateExercise, moveExercise, weeklyGoalOf } from '../rules.js';
import { exportJSON, parseImport, keepBackup } from '../state.js';
import { readSleep, NEMURI_KEY } from '../sleep-link.js';
import { dayId, fmtHours, fmtMD } from '../time.js';
import { openSheet, closeSheet, esc } from './sheet.js';

const $ = id => document.getElementById(id);
let mounted = false;

export function renderPrefs(app) {
  const s = app.state;
  if (!mounted) { mounted = true; mount(app); }

  // いつもの種目（分割ごと。隠したものは最後に）
  const exs = s.settings.exercises;
  const groupOpts = Object.entries(GROUPS);
  const section = (title, list) => !list.length ? "" : `<li class="slot">${title}</li>` + list.map(e => {
    const i = exs.indexOf(e);
    return `<li class="${e.hidden ? 'off' : ''}"><button class="ex" data-edit="${esc(e.id)}"><b>${esc(e.name)}</b><small>${GROUPS[e.group]?.name || 'その他'}${e.bw ? '・自重' : ''}${e.hidden ? '・隠している' : ''}</small></button>`
      + `<button class="mv" data-mv="${esc(e.id)}" data-d="-1" aria-label="${esc(e.name)}を上へ"${i === 0 ? ' disabled' : ''}>↑</button><button class="mv" data-mv="${esc(e.id)}" data-d="1" aria-label="${esc(e.name)}を下へ"${i === exs.length - 1 ? ' disabled' : ''}>↓</button></li>`;
  }).join('');
  const shown = exs.filter(e => !e.hidden);
  $('p-ex').innerHTML = SPLITS.map(sp => section(sp.name + 'の日', shown.filter(e => GROUPS[e.group]?.split === sp.id))).join('')
    + section('その他', shown.filter(e => !GROUPS[e.group]?.split))
    + (exs.some(e => e.hidden) ? section('隠している種目', exs.filter(e => e.hidden)) : '');
  $('p-ex').querySelectorAll('[data-edit]').forEach(b => b.onclick = () => exSheet(app, b.dataset.edit));
  $('p-ex').querySelectorAll('[data-mv]').forEach(b => b.onclick = () => app.commit(moveExercise(app.state, b.dataset.mv, +b.dataset.d)));
  $('p-add').onclick = () => exSheet(app, null);

  // 週の目標
  $('p-goal').value = weeklyGoalOf(s); $('p-goal-v').textContent = '週' + weeklyGoalOf(s) + '回';

  // ねむりの庭
  const on = s.settings.sleepLink !== 'off';
  $('p-sleep').checked = on;
  let found = null; try { found = localStorage.getItem(NEMURI_KEY); } catch (e) { /* 読めない */ }
  const today = dayId(Date.now()), sl = readSleep(today);
  $('p-sleep-state').textContent = !on ? 'つないでいません' : sl ? `今朝の睡眠 ${fmtHours(sl.hours)} を読めています` : found ? 'ねむりの庭の記録は見つかりました。今朝の分はまだありません' : 'ねむりの庭の記録が見つかりません。ホーム画面の「庭とジム」（入口）から開くと読めます。別々のアイコンからだと保存場所が分かれます';
}

function mount(app) {
  $('p-back').onclick = () => app.go('log');
  $('p-goal').oninput = e => { $('p-goal-v').textContent = '週' + e.target.value + '回'; };
  $('p-goal').onchange = e => app.commit({ ...app.state, settings: { ...app.state.settings, weeklyGoal: +e.target.value } });
  $('p-sleep').onchange = e => app.commit({ ...app.state, settings: { ...app.state.settings, sleepLink: e.target.checked ? 'auto' : 'off' } });
  $('p-export').onclick = () => exportFile(app.state);
  $('p-import').onclick = () => { $('p-file').value = ''; $('p-file').click(); };
  $('p-file').onchange = async () => {
    const f = $('p-file').files[0]; if (!f) return;
    let next;
    try { next = parseImport(await f.text()); }
    catch (e) { openSheet('<h2 class="sheet-h">読み込めませんでした</h2><p class="hint">このアプリで書き出したファイルか、確かめてください</p><button class="btn ghost" data-close>とじる</button>', p => { p.querySelector('[data-close]').onclick = closeSheet; }); return; }
    confirmImport(app, next, f.name);
  };
}

/** 種目を足す（id が null）・直す */
function exSheet(app, id) {
  const e = id ? app.state.settings.exercises.find(x => x.id === id) : { name: '', group: 'push' };
  openSheet(`
    <h2 class="sheet-h">${id ? '種目を直す' : '種目を足す'}</h2>
    <label class="field">名前<input id="x-name" type="text" maxlength="30" value="${esc(e.name)}" placeholder="例：インクラインベンチ"></label>
    <label class="field">部位<select id="x-group">${Object.entries(GROUPS).map(([k, g]) => `<option value="${k}"${k === e.group ? ' selected' : ''}>${g.name}${g.split ? `（${SPLITS.find(s => s.id === g.split).name}の日）` : ''}</option>`).join('')}</select></label>
    <label class="check"><input id="x-bw" type="checkbox"${e.bw ? ' checked' : ''}> 自重の種目（初めての記録を 0kg から）</label>
    ${id ? `<label class="check"><input id="x-hide" type="checkbox"${e.hidden ? ' checked' : ''}> 記録の画面に出さない（今までの記録は残る）</label>` : ''}
    <p class="hint">部位で、どの能力が伸びるかが決まります。部位を変えると、今までの記録の点も計算し直します</p>
    <p class="err" id="x-err" hidden></p>
    <div class="row"><button class="btn ghost" id="x-no">やめる</button><button class="btn primary" id="x-ok">${id ? '直す' : '足す'}</button></div>`, p => {
    p.querySelector('#x-no').onclick = closeSheet;
    p.querySelector('#x-ok').onclick = () => {
      const patch = { name: p.querySelector('#x-name').value, group: p.querySelector('#x-group').value, bw: p.querySelector('#x-bw').checked };
      if (id) patch.hidden = p.querySelector('#x-hide').checked;
      try {
        const next = id ? updateExercise(app.state, id, patch) : addExercise(app.state, { ...patch, id: 'my-' + Date.now().toString(36) });
        closeSheet(); app.commit(next);
      } catch (err) { const er = p.querySelector('#x-err'); er.textContent = err.message; er.hidden = false; }
    };
  });
}

/** JSON を保存：kintore-YYYYMMDD.json。iPhone は共有シート（「ファイルに保存」）、ほかはダウンロード（ねむりの庭と同じ） */
async function exportFile(state) {
  const name = 'macho-club-' + dayId(Date.now()).replaceAll('-', '') + '.json';
  const text = exportJSON(state);
  try {
    const file = new File([text], name, { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'マッチョクラブの控え' }); return; }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 60000);
}

/** 中身を見せてから上書き。上書き前の状態は別のキーに残す。残せなければ上書きしない */
function confirmImport(app, next, name) {
  const done = next.sessions.filter(x => x.done && x.sets.length), last = done[done.length - 1];
  const row = (k, v) => `<div class="r"><span>${k}</span><span>${v}</span></div>`;
  openSheet(`
    <h2 class="sheet-h">この内容で上書きしますか？</h2>
    <p class="hint">${esc(name)}</p>
    <div class="sum">${row('ジム', done.length + '回' + (last ? `（最後は${fmtMD(last.id)}）` : ''))}${row('試合', next.fights.length + '試合・次は' + next.opponent + '人目')}${row('お金', '$' + next.money)}</div>
    <p class="hint">いまの記録は、この内容に置き換わります（いまの記録は控えに残します）</p>
    <div class="row"><button class="btn ghost" data-close>やめる</button><button class="btn primary" id="m-ok">上書きする</button></div>`, p => {
    p.querySelector('[data-close]').onclick = closeSheet;
    p.querySelector('#m-ok').onclick = () => {
      if (!keepBackup(exportJSON(app.state), 'before-import')) {
        openSheet('<h2 class="sheet-h">上書きをやめました</h2><p class="hint">いまの記録の控えを残せなかったため、上書きしていません。端末の空き容量を確かめてください</p><button class="btn ghost" data-close>とじる</button>', q => { q.querySelector('[data-close]').onclick = closeSheet; });
        return;
      }
      closeSheet(); app.commit(next); app.go('home');
    };
  });
}

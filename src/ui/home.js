// ジム（ホーム）。M1 では能力・マッチョ度・今日の分割を文字とバーで出す（部屋と分身は M2）
import { ABILITIES, SPLITS, splitName } from '../catalog.js';
import { level, machoOf, staminaDip, nextSplit, daysSinceGym, currentOpponent, fightOn, roomItemsOf, beltsOf, wearingOf, weekOf, weeklyGoalOf, lastBySplit } from '../rules.js';
import { WEEKDAYS, weekdayOf } from '../time.js';
import { frontLook, GLOVES } from '../art/wear.js';
import { CHAPTERS } from '../catalog.js';
import { fmtDate, fmtMD } from '../time.js';
import { drawGym } from '../art/scene.js';
import { esc } from './sheet.js';
import { over, mountDev } from './dev.js';

const $ = id => document.getElementById(id);
let mounted = false, flexTimer = null;

/** 部屋と分身を描く。分身をタップすると少しのあいだ力こぶのポーズ */
function scene(app, pose) {
  const s = app.state, today = app.today();
  const idle = over.idleDays ?? daysSinceGym(s.sessions, today) ?? 0;
  drawGym($('h-scene'), { m: over.m ?? machoOf(s.total).m, sad: idle >= 4 && pose !== 'flex', pose, items: over.items ?? roomItemsOf(s), belts: over.items ? [1, 2, 3, 4, 5] : beltsOf(s), look: frontLook(wearingOf(s)), gloves: GLOVES[wearingOf(s).gloves] });
}

export function renderHome(app) {
  if (!mounted) {
    mounted = true;
    mountDev(() => scene(app));
    $('h-scene').onclick = () => { clearTimeout(flexTimer); scene(app, 'flex'); flexTimer = setTimeout(() => scene(app), 1600); };
  }
  scene(app);
  const s = app.state, today = app.today();
  $('h-date').textContent = fmtDate(today);
  $('h-money').textContent = '$' + s.money;

  const m = machoOf(s.total);
  $('h-macho').textContent = m.stage + ' ' + m.name;
  $('h-macho-bar').style.width = (m.stage >= 7 ? 100 : Math.round(m.frac * 100)) + '%';
  $('h-macho-hint').textContent = m.stage >= 7 ? 'いちばん上の段階です' : `次の段階まで あと ${Math.ceil(m.next)} 点（ジム1回でだいたい12点）`;

  const dip = staminaDip(s.sessions, today);
  $('h-abil').innerHTML = '<div class="lbl"><span>能力</span><span>Lv</span></div><div class="abil">' + ABILITIES.map(a => {
    const x = s.ability[a.id];
    return `<span>${a.name}</span><span class="lv">${level(x)}</span><div class="bar"><i class="${a.id}" style="width:${Math.round((x - level(x)) * 100)}%"></i></div>`
      + (a.id === 'stamina' && dip ? `<span class="note">しばらく休んだので、試合の体力が ${dip}% 下がっています</span>` : '');
  }).join('') + '</div>';

  const todays = s.sessions.find(x => x.id === today);
  const split = todays ? todays.split : nextSplit(s.sessions, today);
  $('h-split').textContent = splitName(split) + 'の日';
  if (todays?.done) {
    $('h-today').textContent = `記録済み（${todays.sets.length}種目・${Math.round(todays.pts * 10) / 10}点）`;
    $('h-go').textContent = '記録を見る・足す';
  } else if (todays) {
    $('h-today').textContent = `記録中（${todays.sets.length}種目）。終えると能力が伸びます`;
    $('h-go').textContent = '記録を続ける';
  } else {
    $('h-today').textContent = '前回の次の分割を出しています。記録の画面で変えられます';
    $('h-go').textContent = '記録する';
  }
  $('h-go').onclick = () => app.go('record');
  const wk = weekOf(s, today), goal = weeklyGoalOf(s), twd = weekdayOf(today), lb = lastBySplit(s, today);
  $('h-week').innerHTML = WEEKDAYS.map((w, i) => `<span class="wd ${wk.days[i] || ''} ${i === twd ? 'today' : ''} ${i > twd ? 'future' : ''}"><small>${w}</small>${wk.days[i] ? '●' : ''}</span>`).join('')
    + `<span class="wk-count">今週 ${wk.count}/${goal}</span>`;
  const lastTxt = lb[split] === null ? 'この分割はまだ' : lb[split] === 0 ? 'この分割は今日' : `この分割は前回 ${lb[split]}日前`;
  if (!todays) $('h-today').textContent = lastTxt + '。前回の次の分割を出しています（記録の画面で変えられます）';

  const o = currentOpponent(s), done = fightOn(s, today);
  $('h-opp-ch').textContent = o ? CHAPTERS.find(c => c.id === o.chapter).name : '';
  $('h-opp').textContent = o ? o.name : '世界チャンピオン！';
  $('h-opp-hint').textContent = done ? `今日の試合：${done.win ? '勝ち' : '負け'}（${done.how}）。また明日` : o ? `${o.style}・賞金 $${o.purse}` : '全員に勝った。前の相手と再戦できる';
  $('h-fight').onclick = () => app.go('fight');
  $('h-rounds').textContent = s.rounds + '回';
  $('h-marks').innerHTML = SPLITS.map(x => `<span class="mark${s.roundMark[x.id] ? ' on' : ''}">${s.roundMark[x.id] ? '✓ ' : ''}${x.name}</span>`).join('');

  const recent = s.sessions.filter(x => x.done && x.sets.length).slice(-5).reverse();
  $('h-recent-card').hidden = !recent.length;
  $('h-recent').innerHTML = recent.map(x => `<li><span>${fmtMD(x.id)} ${esc(splitName(x.top || x.split))}</span><span>${x.sets.length}種目・${Math.round(x.pts * 10) / 10}点</span></li>`).join('');
}

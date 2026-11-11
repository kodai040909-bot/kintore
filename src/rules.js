// ルール（純粋関数だけ。画面や保存に触らない）。実装計画書 §5
import { GROUPS, SPLITS, MACHO, MOVES, moveById, OPPONENTS, oppById, SHOP, shopById, STARTER_ITEMS, DEFAULT_WEAR, CHAPTERS } from './catalog.js';
import { daysBetween, addDays, weekStartOf, weekdayOf } from './time.js';

const AB = ['punch', 'guard', 'speed', 'stamina'];
const r3 = x => Math.round(x * 1000) / 1000;

/** 回数の係数：5回以下 1.0、15回で 1.5 */
export const repF = reps => 1 + (Math.min(reps, 15) - 5) * 0.05 * (reps > 5 ? 1 : 0);

/** 重さの係数：その種目のいつもの重さとの比（0.8〜1.3）。いつもが分からない・0kg なら 1 */
export function kgF(kg, usual) {
  if (!(usual > 0)) return 1;
  return Math.max(0.8, Math.min(1.3, kg / usual));
}

/** 1行（種目・kg・回数・セット）の点 */
export const linePts = (line, usual) => line.sets * repF(line.reps) * kgF(line.kg, usual);

/** 1日に1つの能力へ入る点：12 を超えた分は半分 */
export const capDay = x => Math.min(x, 12) + Math.max(0, x - 12) * 0.5;

/** その種目のいつもの重さ：beforeId より前に終えたジムの、直近5行の kg の平均。なければ null */
export function usualKg(sessions, exId, beforeId) {
  const kgs = [];
  for (let i = sessions.length - 1; i >= 0 && kgs.length < 5; i--) {
    const s = sessions[i];
    if (!s.done || s.id >= beforeId) continue;
    for (let j = s.sets.length - 1; j >= 0 && kgs.length < 5; j--) if (s.sets[j].ex === exId) kgs.push(s.sets[j].kg);
  }
  return kgs.length ? kgs.reduce((a, b) => a + b, 0) / kgs.length : null;
}

/**
 * ジム1回の点と能力の伸び
 * @returns {{ gain, pts, top }} top はその日いちばん点が多かった分割（ひと回りの印）
 */
export function scoreSession(session, sessions, exercises, owned = {}) {
  const exMap = Object.fromEntries(exercises.map(e => [e.id, e]));
  const raw = { punch: 0, guard: 0, speed: 0, stamina: 0 }, bySplit = {};
  let pts = 0;
  for (const line of session.sets) {
    const g = GROUPS[(exMap[line.ex] || {}).group] || GROUPS.other;
    const p = linePts(line, usualKg(sessions, line.ex, session.id));
    pts += p;
    for (const [ab, w] of Object.entries(g.to)) raw[ab] += p * w;
    if (g.split) bySplit[g.split] = (bySplit[g.split] || 0) + p;
  }
  const gain = {};
  const bonus = gearBonus(owned, session.id);
  for (const ab of AB) gain[ab] = r3(capDay(raw[ab]) * 0.12 * (1 + bonus[ab]));
  gain.stamina = r3(gain.stamina + pts * 0.03);
  let top = null;
  for (const s of SPLITS) if ((bySplit[s.id] || 0) > (bySplit[top] || 0)) top = s.id;
  return { gain, pts: r3(pts), top };
}

/** 全部のジムから、能力・累計点・ひと回り・お金を計算し直す（データは小さいので毎回全件でよい） */
export function recompute(state) {
  const sessions = [...state.sessions].sort((a, b) => a.id < b.id ? -1 : 1).map(s => ({ ...s }));
  const ability = { punch: 0, guard: 0, speed: 0, stamina: 0 };
  let total = 0, rounds = 0, mark = { chest: false, back: false, shoulder: false };
  for (const s of sessions) {
    if (!s.done || !s.sets.length) { delete s.gain; delete s.pts; delete s.top; continue; }
    const r = scoreSession(s, sessions, state.settings.exercises, state.owned || {});
    Object.assign(s, r);
    for (const ab of AB) ability[ab] += r.gain[ab];
    total += r.pts;
    if (r.top) {
      mark = { ...mark, [r.top]: true };
      if (mark.chest && mark.back && mark.shoulder) { rounds++; ability.stamina += 1; mark = { chest: false, back: false, shoulder: false }; }
    }
  }
  for (const ab of AB) ability[ab] = r3(ability[ab]);
  const earned = rounds * 30 + (state.fights || []).reduce((a, f) => a + (f.money || 0), 0);
  const spent = Object.values(state.owned || {}).reduce((a, o) => a + (o.price || 0), 0);
  return learnMoves({ ...state, sessions, ability, total: r3(total), rounds, roundMark: mark, money: earned - spent });
}

/** 表示のレベル（小数は切り捨て） */
export const level = x => Math.floor(x + 1e-9);

/** マッチョ度：段階（0〜7）・名前・次までの割合・描画用の小数 m */
export function machoOf(total) {
  let i = 0;
  while (i < MACHO.length - 1 && total >= MACHO[i + 1].at) i++;
  const frac = i < MACHO.length - 1 ? (total - MACHO[i].at) / (MACHO[i + 1].at - MACHO[i].at) : 0;
  return { stage: i, name: MACHO[i].name, frac, m: i + frac, next: i < MACHO.length - 1 ? MACHO[i + 1].at - total : 0 };
}

/** 終えたジムの日付（古い順・重なりなし） */
const doneIds = sessions => [...new Set(sessions.filter(s => s.done && s.sets.length).map(s => s.id))].sort();

/**
 * サボりで下がっている体力（%、0〜10）。§5.5
 * 最後のジムから4日目以降は1日 +1。ジムの日に、下がっていた分を半分に、そうでなければ −2
 */
export function staminaDip(sessions, today) {
  let dip = 0, prev = null;
  for (const id of doneIds(sessions)) {
    if (prev) {
      const grow = Math.max(0, daysBetween(prev, id) - 3);
      if (grow > 0) dip = Math.floor(Math.min(10, dip + grow) / 2);
      else dip = Math.max(0, dip - 2);
    }
    prev = id;
  }
  if (prev) dip = Math.min(10, dip + Math.max(0, daysBetween(prev, today) - 3));
  return dip;
}

/** 最後のジムから何日たったか（なければ null） */
export function daysSinceGym(sessions, today) {
  const ids = doneIds(sessions);
  return ids.length ? daysBetween(ids[ids.length - 1], today) : null;
}

/** 今日の分割の提案：最後のジムの分割の次。初めては胸・腕 */
export function nextSplit(sessions, today) {
  const done = sessions.filter(s => s.done && s.sets.length && s.id < today).sort((a, b) => a.id < b.id ? -1 : 1);
  const last = done[done.length - 1];
  const k = last ? SPLITS.findIndex(s => s.id === (last.top || last.split)) : -1;
  return SPLITS[(k + 1) % SPLITS.length].id;
}

/** その種目の前回の行（今日の分も含めて、いちばん新しいもの） */
export function lastLine(sessions, exId) {
  for (let i = sessions.length - 1; i >= 0; i--) {
    const s = sessions[i];
    for (let j = s.sets.length - 1; j >= 0; j--) if (s.sets[j].ex === exId) return s.sets[j];
  }
  return null;
}

/** 入力の確かめ：kg は 0〜500、回数 1〜100、セット 1〜20 */
export function validLine(l) {
  return l && typeof l.ex === 'string' && Number.isFinite(l.kg) && l.kg >= 0 && l.kg <= 500
    && Number.isInteger(l.reps) && l.reps >= 1 && l.reps <= 100 && Number.isInteger(l.sets) && l.sets >= 1 && l.sets <= 20;
}

// ---- 状態を変える（新しい状態を返す） ----

/** 今日のジム（なければ作る）に1行足す。終えた日に足したら計算し直す */
export function addLine(state, today, split, line) {
  if (!validLine(line)) throw new Error('記録の値が正しくありません');
  let sessions = state.sessions.map(s => s.id === today ? { ...s, sets: [...s.sets, { ...line }] } : s);
  if (!sessions.some(s => s.id === today)) sessions = [...sessions, { id: today, split, done: false, sets: [{ ...line }] }];
  const next = { ...state, sessions };
  return sessions.find(s => s.id === today).done ? recompute(next) : next;
}

/** 行を差し替える（null なら消す）。どの日でも。終えた日なら計算し直す */
export function editLine(state, dayIdStr, index, line) {
  if (line && !validLine(line)) throw new Error('記録の値が正しくありません');
  const sessions = state.sessions.map(s => {
    if (s.id !== dayIdStr) return s;
    const sets = [...s.sets];
    if (line) sets[index] = { ...line }; else sets.splice(index, 1);
    return { ...s, sets };
  });
  return recompute({ ...state, sessions });
}

/** 今日の分割を変える */
export const setSplit = (state, today, split) => ({ ...state, sessions: state.sessions.map(s => s.id === today ? { ...s, split } : s) });

/** 記録を終える：今日のジムを確定して計算し直す */
export function finishSession(state, today) {
  const s = state.sessions.find(x => x.id === today);
  if (!s || !s.sets.length) return state;
  return recompute({ ...state, sessions: state.sessions.map(x => x.id === today ? { ...x, done: true } : x) });
}

// ---- 技（実装計画書 §5.6） ----

/** 相手 n に勝った、または3回戦った */
export const beatOrTried = (fights, n) => fights.some(f => f.opp === n && f.win) || fights.filter(f => f.opp === n).length >= 3;

/** 1つの道を満たしているか */
export function routeMet(route, state, has = state.moves || {}) {
  for (const [k, v] of Object.entries(route)) {
    if (k === 'beat') { if (!beatOrTried(state.fights || [], v)) return false; }
    else if (k === 'has') { if (!v.every(id => has[id])) return false; }
    else if (k === 'rounds') { if ((state.rounds || 0) < v) return false; }
    else if (level(state.ability[k] || 0) < v) return false;
  }
  return true;
}

/** 覚えられる技を覚える（覚えた技は消えない）。新しく覚えたものの日付は記録の最後の日 */
export function learnMoves(state) {
  const moves = { ...(state.moves || {}) };
  const last = [...state.sessions.filter(s => s.done).map(s => s.id), ...(state.fights || []).map(f => f.id)].sort().pop() || null;
  let changed = true;
  while (changed) {   // ワンツーのように「技を持っていること」が条件の技のため、増えなくなるまで回す
    changed = false;
    for (const m of MOVES) if (!moves[m.id] && m.routes.some(r => routeMet(r, state, moves))) { moves[m.id] = { at: last }; changed = true; }
  }
  return { ...state, moves };
}

/** まだの技の、いちばん近い道の「あと何」（画面の表示用） */
export function nearestRoute(m, state) {
  let best = null;
  for (const r of m.routes) {
    const need = [];
    for (const [k, v] of Object.entries(r)) {
      if (k === 'beat') { if (!beatOrTried(state.fights || [], v)) need.push({ k, v, text: `${oppById(v).name}に勝つ（3回戦っても覚える）`, gap: 3 }); }
      else if (k === 'has') { const miss = v.filter(id => !state.moves[id]); if (miss.length) need.push({ k, text: miss.map(id => moveById(id).name).join('と') + 'を覚える', gap: miss.length * 2 }); }
      else if (k === 'rounds') { if (state.rounds < v) need.push({ k, text: `3分割ひと回り あと${v - state.rounds}回`, gap: v - state.rounds }); }
      else { const lv = level(state.ability[k] || 0); if (lv < v) need.push({ k, text: `${{ punch: 'パンチ力', guard: 'ガード', speed: 'スピード', stamina: '体力' }[k]} Lv${v}（あと${v - lv}）`, gap: v - lv }); }
    }
    const gap = need.reduce((a, n) => a + n.gap, 0);
    if (!best || gap < best.gap) best = { gap, need };
  }
  return best;
}

/** 持ち込む3つのおすすめ：攻める技を2つ以上入れる */
const PRIORITY = ['ace', 'upper', 'onetwo', 'hook', 'counter', 'straight', 'weave', 'body', 'block', 'clinch', 'jab'];
export function autoLoadout(moves) {
  const have = PRIORITY.filter(id => moves[id]);
  const atk = have.filter(id => moveById(id).kind === 'atk');
  const out = atk.slice(0, 2);
  for (const id of have) if (out.length < 3 && !out.includes(id)) out.push(id);
  return out;
}

/** 持ち込む技：選んだもの（覚えていないものは外す）。空きはおすすめで埋める */
export function loadoutOf(state) {
  const chosen = (state.loadout || []).filter(id => id && state.moves[id]);
  const uniq = [...new Set(chosen)].slice(0, 3);
  for (const id of autoLoadout(state.moves)) if (uniq.length < 3 && !uniq.includes(id)) uniq.push(id);
  return uniq;
}

// ---- 試合（実装計画書 §6.3） ----

/** 今日の試合（1日1試合） */
export const fightOn = (state, today) => (state.fights || []).find(f => f.id === today) || null;

/** いま挑める相手（全員に勝ったら null） */
export const currentOpponent = state => oppById(state.opponent) || null;

/** 賞金：初めて勝つと満額。負け・再戦は2割（再戦の負けは1割） */
export function purseFor(state, opp, win) {
  const o = oppById(opp), beaten = (state.fights || []).some(f => f.opp === opp && f.win);
  if (!beaten && win) return o.purse;
  return Math.round(o.purse * (beaten && !win ? 0.1 : 0.2));
}

/** 試合を記録する。勝てば次の相手へ。お金と技は計算し直す */
export function recordFight(state, today, opp, seed, res) {
  if (fightOn(state, today)) throw new Error('今日はもう試合をしました');
  const money = purseFor(state, opp, res.win);
  const fights = [...(state.fights || []), { id: today, opp, seed, win: res.win, how: res.how, round: res.round, money }];
  const opponent = res.win && opp === state.opponent ? opp + 1 : state.opponent;
  return recompute({ ...state, fights, opponent });
}

/**
 * コンディション（design.md §11.1）。sleep は ねむりの庭から読んだ今朝の睡眠（なければ null＝ふつう）
 * 目標時間以上：絶好調（全能力 +5%）／目標 −1時間まで：ふつう／それより短い：寝不足（体力 90% から）
 */
export function conditionOf(sleep) {
  if (!sleep) return { key: 'unknown', name: 'ふつう', hp: 100, mult: 1 };
  if (sleep.hours >= sleep.goal) return { key: 'great', name: '絶好調', hp: 100, mult: 1.05 };
  if (sleep.hours >= sleep.goal - 1) return { key: 'normal', name: 'ふつう', hp: 100, mult: 1 };
  return { key: 'short', name: '寝不足', hp: 90, mult: 1 };
}

/** 試合に出る自分。体力はサボりと寝不足のぶん下がる。絶好調なら能力 +5% */
export function meForFight(state, today, sleep = null) {
  const c = conditionOf(sleep);
  const ab = Object.fromEntries(Object.entries(state.ability).map(([k, v]) => [k, v * c.mult]));
  return { name: 'あなた', ab, moves: loadoutOf(state), hpPct: c.hp - staminaDip(state.sessions, today) };
}

// ---- お金と店（実装計画書 §7・M5） ----

/** その日のジムに効く用具の上乗せ。買った次の日から。1つの能力につき +15% まで */
export function gearBonus(owned, dayIdStr) {
  const b = { punch: 0, guard: 0, speed: 0, stamina: 0 };
  for (const [id, o] of Object.entries(owned || {})) {
    const it = shopById(id);
    if (!it || it.kind !== 'gear' || !(o.at < dayIdStr)) continue;
    for (const [k, v] of Object.entries(it.bonus)) b[k] = Math.min(0.15, b[k] + v);
  }
  return b;
}

/** 買えるか。理由の文字を返す（買えるなら null） */
export function cannotBuy(state, id) {
  const it = shopById(id);
  if (!it) return 'ない品です';
  if (state.owned[id]) return 'もう持っています';
  if (state.money < it.price) return `あと $${it.price - state.money} 足りません`;
  return null;
}

/** 買う。服ならすぐ着る。お金は記録から計算し直す */
export function buy(state, id, today) {
  const why = cannotBuy(state, id);
  if (why) throw new Error(why);
  const it = shopById(id);
  const owned = { ...state.owned, [id]: { at: today, price: it.price } };
  const wearing = it.kind === 'wear' ? { ...state.wearing, [it.slot]: it.color } : state.wearing;
  return recompute({ ...state, owned, wearing });
}

/** 着替える（持っている色か、最初の色だけ） */
export function wear(state, slot, color) {
  const ok = DEFAULT_WEAR[slot] === color || SHOP.some(x => x.kind === 'wear' && x.slot === slot && x.color === color && state.owned[x.id]);
  if (!ok) throw new Error('持っていない服です');
  return { ...state, wearing: { ...state.wearing, [slot]: color } };
}

/** いま着ているもの（欠けていれば最初の色） */
export const wearingOf = state => ({ ...DEFAULT_WEAR, ...(state.wearing || {}) });

/** 部屋に置いてあるもの */
export const roomItemsOf = state => [...STARTER_ITEMS, ...Object.keys(state.owned || {}).filter(id => ['gear', 'room'].includes((shopById(id) || {}).kind))];

/** 勝ち取ったベルト：章の終わりの相手に勝った章 */
export function beltsOf(state) {
  const out = [];
  for (const c of CHAPTERS) {
    const last = OPPONENTS.filter(o => o.chapter === c.id).pop();
    if (last && (state.fights || []).some(f => f.opp === last.id && f.win)) out.push(c.id);
  }
  return out;
}

// ---- いつもの種目の編集（M6） ----

/** 種目を足す。id は呼ぶ側が決める（同じ id があれば例外） */
export function addExercise(state, ex) {
  const name = String(ex.name || '').trim();
  if (!name) throw new Error('名前を入れてください');
  if (state.settings.exercises.some(e => e.id === ex.id)) throw new Error('同じ種目があります');
  const e = { id: ex.id, name, group: GROUPS[ex.group] ? ex.group : 'other', ...(ex.bw ? { bw: true } : {}) };
  return recompute({ ...state, settings: { ...state.settings, exercises: [...state.settings.exercises, e] } });
}

/** 種目を直す（名前・部位・自重・隠す）。部位が変わると点の入り方が変わるので計算し直す */
export function updateExercise(state, id, patch) {
  const exercises = state.settings.exercises.map(e => {
    if (e.id !== id) return e;
    const n = { ...e, ...patch };
    n.name = String(n.name || '').trim() || e.name;
    if (!GROUPS[n.group]) n.group = e.group;
    if (!n.bw) delete n.bw;
    if (!n.hidden) delete n.hidden;
    return n;
  });
  return recompute({ ...state, settings: { ...state.settings, exercises } });
}

/** 並べ替え（dir: -1 上へ、+1 下へ） */
export function moveExercise(state, id, dir) {
  const list = [...state.settings.exercises], i = list.findIndex(e => e.id === id), j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return state;
  [list[i], list[j]] = [list[j], list[i]];
  return { ...state, settings: { ...state.settings, exercises: list } };
}

/** 種目ごとの重さの移り変わり：最初・いま・いちばん重い（終えたジムだけ） */
export function weightHistory(state) {
  const out = new Map();
  for (const s of [...state.sessions].sort((a, b) => a.id < b.id ? -1 : 1)) {
    if (!s.done) continue;
    for (const l of s.sets) {
      const h = out.get(l.ex) || { first: l.kg, firstId: s.id, last: l.kg, lastId: s.id, best: l.kg, days: 0, lastDay: null };
      h.last = l.kg; h.lastId = s.id; h.best = Math.max(h.best, l.kg);
      if (h.lastDay !== s.id) { h.days++; h.lastDay = s.id; }
      out.set(l.ex, h);
    }
  }
  return out;
}

// ---- 記録の集計（記録帳・ホーム） ----

/** 終えたジム（日付順） */
export const doneSessions = state => state.sessions.filter(s => s.done && s.sets.length).sort((a, b) => a.id < b.id ? -1 : 1);
const splitOfDay = s => s.top || s.split;
const setsOf = s => s.sets.reduce((a, l) => a + l.sets, 0);

/** 週の目標回数（設定。初期値は週3回） */
export const weeklyGoalOf = state => Math.max(1, Math.min(7, Number(state.settings.weeklyGoal) || 3));

/** ある週（月曜はじまり）のジム：回数・セット数・曜日ごとの分割 */
export function weekOf(state, anyDayId) {
  const start = weekStartOf(anyDayId), end = addDays(start, 6);
  const days = Array(7).fill(null);
  let count = 0, sets = 0;
  for (const s of doneSessions(state)) {
    if (s.id < start || s.id > end) continue;
    count++; sets += setsOf(s); days[weekdayOf(s.id)] = splitOfDay(s);
  }
  return { start, count, sets, days };
}

/** 週の目標を続けて達成している週の数。今週は達成していれば数える（まだ途中なら数えずに先週から） */
export function weekStreak(state, today) {
  const goal = weeklyGoalOf(state);
  let n = weekOf(state, today).count >= goal ? 1 : 0;
  for (let w = addDays(weekStartOf(today), -7); ; w = addDays(w, -7)) {
    if (weekOf(state, w).count >= goal) n++; else break;
    if (n > 520) break;
  }
  return n;
}

/** 分割ごとの前回：何日前か（やっていなければ null） */
export function lastBySplit(state, today) {
  const out = { chest: null, back: null, shoulder: null };
  for (const s of doneSessions(state)) { const k = splitOfDay(s); if (k in out) out[k] = daysBetween(s.id, today); }
  return out;
}

/** 種目ごとのまとめ：前回の行・前回の日・自己ベスト（いちばん重い重さと、そのときの回数）・やった日数 */
export function exerciseStats(state) {
  const out = new Map();
  for (const s of doneSessions(state)) {
    for (const l of s.sets) {
      const h = out.get(l.ex) || { days: 0, lastDay: null, last: null, best: null, bestId: null };
      if (h.lastDay !== s.id) { h.days++; h.lastDay = s.id; }
      h.last = l;
      if (!h.best || l.kg > h.best.kg || (l.kg === h.best.kg && l.reps > h.best.reps)) { h.best = l; h.bestId = s.id; }
      out.set(l.ex, h);
    }
  }
  return out;
}

/** ある月のジムの日：{ "YYYY-MM-DD": 分割 } */
export function monthDays(state, year, month) {
  const prefix = year + '-' + String(month).padStart(2, '0') + '-', out = {};
  for (const s of doneSessions(state)) if (s.id.startsWith(prefix)) out[s.id] = splitOfDay(s);
  return out;
}

/** 累計：ジムの回数・セット数・はじめた日 */
export function totals(state) {
  const d = doneSessions(state);
  return { gyms: d.length, sets: d.reduce((a, s) => a + setsOf(s), 0), since: d[0]?.id || null };
}

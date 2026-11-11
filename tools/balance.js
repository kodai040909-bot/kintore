// 相手の強さの釣り合いを確かめるシミュレーター（実装計画書 §6.2）
// 3人の鍛え方（ふつう・パンチ偏り・脚なし）で週3回ジムに行き、相手ごとに「勝率5割を超える累計ジム回数」を数える
// ブラウザ（tools/balance.html）でも node でも動く（DOM を使わない）
import { initialState } from '../src/state.js';
import { addLine, finishSession, recompute, loadoutOf } from '../src/rules.js';
import { OPPONENTS, CHAPTERS } from '../src/catalog.js';
import { simulate, seedOf } from '../src/fight.js';

const L = (ex, kg, reps, sets) => ({ ex, kg, reps, sets });
/** 分割ごとのふつうの1回（4種目×3セット） */
const DAY = {
  chest: [L('bench', 60, 8, 3), L('db-press', 20, 10, 3), L('dips', 0, 10, 3), L('french', 15, 10, 3)],
  back: [L('chin', 0, 8, 3), L('lat-pull', 45, 10, 3), L('row', 40, 10, 3), L('curl', 25, 10, 3)],
  shoulder: [L('sh-press', 30, 10, 3), L('side-raise', 8, 12, 3), L('rear-raise', 6, 12, 3), L('squat', 60, 10, 3)],
  shoulderNoLeg: [L('sh-press', 30, 10, 3), L('side-raise', 8, 12, 3), L('rear-raise', 6, 12, 3)],
};
export const PROFILES = {
  normal: { name: '週3回・ふつう', order: ['chest', 'back', 'shoulder'] },
  punch: { name: 'パンチ偏り（胸の日が多い）', order: ['chest', 'back', 'chest', 'shoulder'] },
  noleg: { name: '脚なし', order: ['chest', 'back', 'shoulderNoLeg'] },
};

/** 月・水・金にジムへ行った n 回目までの状態。beaten までの相手には勝っている（勝って覚える技のため） */
export function userAfter(profile, n, beaten = 0) {
  let s = initialState();
  const start = new Date(2026, 0, 5);
  for (let i = 0; i < n; i++) {
    const d = new Date(start); d.setDate(start.getDate() + Math.floor(i / 3) * 7 + [0, 2, 4][i % 3]);
    const id = d.toISOString().slice(0, 10);
    const key = PROFILES[profile].order[i % PROFILES[profile].order.length];
    for (const l of DAY[key]) s = addLine(s, id, key.startsWith('shoulder') ? 'shoulder' : key, l);
    s = finishSession(s, id);
  }
  const fights = [];
  for (let k = 1; k <= beaten; k++) fights.push({ id: '2026-01-0' + (k % 9 + 1), opp: k, win: true, money: 0 });
  return recompute({ ...s, fights });
}

/** 勝率（N 試合） */
export function winRate(state, opp, ab, N = 200) {
  const me = { name: 'me', ab: state.ability, moves: loadoutOf(state), hpPct: 100 };
  const foe = { name: opp.name, ab, moves: opp.moves };
  const rounds = CHAPTERS.find(c => c.id === opp.chapter).rounds;
  let w = 0;
  for (let i = 0; i < N; i++) if (simulate(me, foe, rounds, seedOf(opp.id + ':' + i)).win) w++;
  return w / N;
}

const scaled = (base, mult, c) => Object.fromEntries(Object.entries(base).map(([k, v]) => [k, Math.round((v * mult[k] * c) * 10) / 10]));

/** 相手の能力を決める：target 回のふつうの人の能力 × 型の倍率 × c。c は勝率5割になるよう二分探索 */
export function tune(N = 300) {
  return OPPONENTS.map(o => {
    const u = userAfter('normal', o.target, o.id - 1);
    const base = { ...u.ability };
    let lo = 0.3, hi = 3;
    for (let it = 0; it < 18; it++) {
      const mid = (lo + hi) / 2;
      if (winRate(u, o, scaled(base, o.mult, mid), N) > 0.5) lo = mid; else hi = mid;
    }
    return { id: o.id, ab: scaled(base, o.mult, lo) };
  });
}

/** 鍛え方ごとに、相手それぞれに勝率5割を超えるまでの累計ジム回数 */
export function report(N = 200, maxN = 45) {
  const out = {};
  for (const p of Object.keys(PROFILES)) {
    out[p] = OPPONENTS.map(o => {
      for (let n = 1; n <= maxN; n++) if (winRate(userAfter(p, n, o.id - 1), o, o.ab, N) >= 0.5) return n;
      return null;
    });
  }
  return out;
}

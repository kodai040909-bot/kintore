// 試合のシミュレーション（純粋関数。同じ入力と種なら、いつも同じ試合）。実装計画書 §6.1
// 出力は「出来事の列」と結果。画面はこの列を再生するだけ（M4 で横向きの絵にする）
import { moveById } from './catalog.js';

const TICKS = 14;   // 1ラウンドの手番の数

/** 決まった順に出る乱数 */
function rng(s) {
  return () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
/** 文字列 → 種 */
export function seedOf(str) { let h = 2166136261; for (const c of String(str)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

/** 選手の準備。side: { name, ab:{punch,guard,speed,stamina}, moves:[id×3], hpPct } */
function prep(side) {
  const ms = (side.moves || []).filter(Boolean).map(moveById).filter(Boolean);
  const atk = ms.filter(m => m.kind === 'atk');
  const ab = { punch: 0, guard: 0, speed: 0, stamina: 0, ...side.ab };
  const max = Math.round(50 + ab.stamina * 4 + ab.guard * 1.5);
  return {
    name: side.name, ab, max, hp: Math.round(max * (side.hpPct ?? 100) / 100),
    atk: atk.length ? atk : [{ id: 'punch', name: 'パンチ', base: 3, acc: 0.8 }],
    evade: ms.some(m => m.id === 'weave') ? moveById('weave').evade : 0,
    block: ms.some(m => m.id === 'block') ? moveById('block').block : 0,
    counter: ms.some(m => m.id === 'counter') ? moveById('counter').counter : 0,
    clinch: ms.some(m => m.id === 'clinch'),
    slow: 0, downs: 0, roundDowns: 0, clinched: false, aceUsed: false, dealt: 0,
  };
}

const effSpeed = f => Math.max(1, 6 + f.ab.speed - f.slow);

/** 打つ技を選ぶ：強い技ほど選ばれやすい。奥の手は相手の体力が半分を切ってから */
function pick(a, d, r) {
  const opts = a.atk.filter(m => !(m.once && (a.aceUsed || d.hp > d.max * 0.5)));
  const w = opts.map(m => m.id === 'ace' ? 40 : (m.base * (m.hits || 1)) * (m.id === 'upper' ? 0.7 : 1) + 4);
  let x = r() * w.reduce((s, v) => s + v, 0);
  for (let i = 0; i < opts.length; i++) { x -= w[i]; if (x <= 0) return opts[i]; }
  return opts[opts.length - 1];
}

/** 1発の当たり判定とダメージ。返り値 { kind, dmg } */
function strike(a, d, m, r) {
  const sd = (a.ab.speed - d.ab.speed) * 0.012;
  const ev = clamp(0.06 + d.evade - sd, 0.02, 0.5);
  if (r() < ev) return { kind: 'evade', dmg: 0 };
  const hit = clamp(m.acc + sd - d.ab.guard * 0.008, 0.3, 0.95);
  if (r() >= hit) return { kind: 'miss', dmg: 0 };
  const guard = d.ab.guard * (m.guardPierce ? 1 - m.guardPierce : 1);
  let dmg = m.base * (1 + a.ab.punch * 0.09) / (1 + guard * 0.07) * (0.85 + r() * 0.3);
  let kind = 'hit';
  if (d.block && r() < clamp(0.25 + d.block * 0.4 + d.ab.guard * 0.015, 0, 0.7)) { dmg *= 0.55; kind = 'block'; }
  return { kind, dmg: Math.max(1, Math.round(dmg)) };
}

/**
 * 試合をする
 * @param me  { name, ab, moves, hpPct }
 * @param foe { name, ab, moves }
 * @param rounds ラウンド数
 * @param seed 種
 * @returns { win, how:'KO'|'TKO'|'判定', round, log:[...], score:[自分,相手] }
 */
export function simulate(me, foe, rounds, seed) {
  const r = rng(seed);
  const F = [prep(me), prep(foe)];
  const log = [];
  const ev = (round, t, who, type, extra = {}) => log.push({ round, t, who, type, ...extra });

  for (let round = 1; round <= rounds; round++) {
    F.forEach(f => { f.roundDowns = 0; f.clinched = false; });
    ev(round, 0, -1, 'bell', { hp: F.map(f => f.hp) });
    for (let t = 1; t <= TICKS; t++) {
      const pa = effSpeed(F[0]) / (effSpeed(F[0]) + effSpeed(F[1]));
      const ai = r() < pa ? 0 : 1, a = F[ai], d = F[1 - ai];
      // ピンチならクリンチで休む（1ラウンド1回）
      if (a.clinch && !a.clinched && a.hp < a.max * 0.35) { a.clinched = true; a.hp = Math.min(a.max, a.hp + 6); ev(round, t, ai, 'clinch', { hp: F.map(f => f.hp) }); continue; }
      const m = pick(a, d, r);
      if (m.once) a.aceUsed = true;
      for (let h = 0; h < (m.hits || 1); h++) {
        const res = strike(a, d, m, r);
        if (res.dmg) { d.hp -= res.dmg; a.dealt += res.dmg; if (m.drain) d.slow = Math.min(3, d.slow + m.drain); }
        ev(round, t, ai, res.kind, { move: m.id, dmg: res.dmg, hp: F.map(f => f.hp) });
        // かわしたらカウンター
        if (res.kind === 'evade' && d.counter) {
          const c = strike(d, a, { base: d.counter, acc: 0.85 }, r);
          if (c.dmg) { a.hp -= c.dmg; d.dealt += c.dmg; }
          ev(round, t, 1 - ai, c.dmg ? 'counter' : 'miss', { move: 'counter', dmg: c.dmg, hp: F.map(f => f.hp) });
        }
        // ダウンの判定（打たれた側・カウンターで打った側の両方）
        for (const [k, f] of F.entries()) {
          if (f.hp > 0) continue;
          f.downs++; f.roundDowns++;
          ev(round, t, k, 'down', { hp: F.map(x => x.hp) });
          if (f.roundDowns >= 3) { ev(round, t, k, 'tko'); return end(F, k, 'TKO', round, log); }
          const up = clamp(0.75 + f.ab.guard * 0.02 + f.ab.stamina * 0.01 - 0.18 * (f.downs - 1), 0.1, 0.95);
          if (r() >= up) { ev(round, t, k, 'ko'); return end(F, k, 'KO', round, log); }
          f.hp = Math.round(f.max * 0.35);
          ev(round, t, k, 'up', { hp: F.map(x => x.hp) });
        }
        if (d.hp <= 0 || a.hp <= 0) break;
      }
    }
    // ラウンドの間に少し回復
    F.forEach(f => { f.hp = Math.min(f.max, Math.round(f.hp + f.max * (0.08 + f.ab.stamina * 0.004))); });
  }
  // 判定：与えたダメージが多いほう。同じなら相手の勝ち
  const lost = F[0].dealt > F[1].dealt ? 1 : 0;
  ev(rounds, TICKS, lost, 'decision', { score: [F[0].dealt, F[1].dealt] });
  return end(F, lost, '判定', rounds, log);
}

function end(F, lost, how, round, log) {
  return { win: lost === 1, how, round, log, score: [F[0].dealt, F[1].dealt], max: F.map(f => f.max) };
}

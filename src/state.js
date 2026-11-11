// 保存・読み込み・スキーマ移行・書き出し（ねむりの庭の state.js と同じ守り方）
import { DEFAULT_EXERCISES, GROUPS, DEFAULT_WEAR } from './catalog.js';
import { recompute, validLine } from './rules.js';

export const KEY = 'kintore';
export const SCHEMA = 1;
const KEEP_BACKUPS = 3;   // -broken- / -before-import- の控えは新しい順に3つまで

/**
 * 読み込みで起きたこと。null なら問題なし
 * 'newer'：新しい版のデータ（このまま保存すると消えるので、保存を止める）
 * 'broken'：壊れていたので退避して初期状態から始めた
 * 'broken-unsaved'：壊れていて、退避もできなかった（本体を上書きしないよう保存を止める）
 */
export let loadIssue = null;
let blocked = false;

export function initialState() {
  return {
    schema: SCHEMA,
    settings: { exercises: DEFAULT_EXERCISES.map(e => ({ ...e })), step: 2.5, sleepLink: 'auto', weeklyGoal: 3 },
    sessions: [],
    ability: { punch: 0, guard: 0, speed: 0, stamina: 0 },
    total: 0,
    rounds: 0,
    roundMark: { chest: false, back: false, shoulder: false },
    moves: { jab: { at: null } },
    loadout: [],
    learn: {},
    opponent: 1,
    fights: [],
    money: 0,
    owned: {},
    wearing: { ...DEFAULT_WEAR },
    seenEvents: [],
  };
}

/** 古い形式・欠けた項目を今の形に直す。形が違いすぎるときは例外 */
export function migrate(o) {
  if (!o || typeof o !== 'object' || typeof o.schema !== 'number' || !Array.isArray(o.sessions)) throw new Error('形式が違います');
  if (o.schema > SCHEMA) throw new Error('新しい版のデータです');
  // schema 1 が最初の版。上がったらここに変換を足す
  const base = initialState();
  const ex = Array.isArray(o.settings?.exercises)
    ? o.settings.exercises.filter(e => e && typeof e.id === 'string' && typeof e.name === 'string').map(e => ({ ...e, group: GROUPS[e.group] ? e.group : 'other' }))
    : base.settings.exercises;
  const out = {
    ...base, ...o,
    settings: { ...base.settings, ...(o.settings || {}), exercises: ex.length ? ex : base.settings.exercises },
    sessions: o.sessions
      .filter(s => s && typeof s.id === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s.id) && Array.isArray(s.sets))
      .map(s => ({ id: s.id, split: s.split || 'chest', done: !!s.done, sets: s.sets.filter(validLine) })),
    moves: o.moves && typeof o.moves === 'object' ? o.moves : {},
    owned: o.owned && typeof o.owned === 'object' ? o.owned : {},
    wearing: { ...DEFAULT_WEAR, ...(o.wearing && typeof o.wearing === 'object' ? o.wearing : {}) },
    fights: Array.isArray(o.fights) ? o.fights : [],
    seenEvents: Array.isArray(o.seenEvents) ? o.seenEvents : [],
    schema: SCHEMA,
  };
  // 同じ日が2件あれば1件にまとめる
  const byId = new Map();
  for (const s of out.sessions) {
    const prev = byId.get(s.id);
    byId.set(s.id, prev ? { ...prev, done: prev.done || s.done, sets: [...prev.sets, ...s.sets] } : s);
  }
  out.sessions = [...byId.values()];
  // 能力・累計・お金は記録から計算し直す（保存された数字は信用しない）
  return recompute(out);
}

function pruneBackups(storage, prefix) {
  try {
    const keys = [];
    for (let i = 0; i < storage.length; i++) { const k = storage.key(i); if (k && k.startsWith(prefix)) keys.push(k); }
    keys.sort().reverse().slice(KEEP_BACKUPS).forEach(k => storage.removeItem(k));
  } catch (e) { /* 一覧を取れない環境 */ }
}

/** 控えを残す。成功したら true */
export function keepBackup(raw, kind, storage = globalThis.localStorage) {
  const prefix = KEY + '-' + kind + '-';
  try { storage.setItem(prefix + stamp(), raw); pruneBackups(storage, prefix); return true; } catch (e) { return false; }
}

const stamp = () => new Date().toISOString().replace(/[-:]/g, '').slice(0, 15);

export function load(storage = globalThis.localStorage) {
  loadIssue = null; blocked = false;
  let raw = null;
  try { raw = storage.getItem(KEY); } catch (e) { blocked = true; loadIssue = 'broken-unsaved'; return initialState(); }
  if (raw == null) return initialState();
  let o;
  try { o = JSON.parse(raw); } catch (e) { o = undefined; }
  if (o && typeof o === 'object' && typeof o.schema === 'number' && o.schema > SCHEMA) { blocked = true; loadIssue = 'newer'; return initialState(); }
  try {
    return migrate(o);
  } catch (e) {
    if (keepBackup(raw, 'broken', storage)) { loadIssue = 'broken'; const s = initialState(); save(s, storage); return s; }
    blocked = true; loadIssue = 'broken-unsaved';
    return initialState();
  }
}

export function save(state, storage = globalThis.localStorage) {
  if (blocked) return false;
  try { storage.setItem(KEY, JSON.stringify(state)); return true; } catch (e) { return false; }
}
export const saveBlocked = () => blocked;

export const exportJSON = state => JSON.stringify(state, null, 1);
export const parseImport = text => migrate(JSON.parse(text));

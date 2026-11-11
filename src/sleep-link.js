// ねむりの庭との連携（実装計画書 §9）。同じ保存領域に 'nemuri-garden' があれば、読むだけ（書かない）
// iPhone のホーム画面アプリどうしは保存領域が別の可能性が高い（M8 の実機で確かめる）。読めなければ何もしない
import { daysBetween } from './time.js';

export const NEMURI_KEY = 'nemuri-garden';

/**
 * 今朝の睡眠。今日起きた夜が記録されていれば { hours, goal, id }、なければ null
 * ねむりの庭の夜の id は「起きた日の日付」。おやすみ中（sleeping）のときは使わない
 */
export function readSleep(today, storage = globalThis.localStorage) {
  let o;
  try { o = JSON.parse(storage.getItem(NEMURI_KEY)); } catch (e) { return null; }
  if (!o || typeof o !== 'object' || o.schema !== 1 || !Array.isArray(o.nights) || o.sleeping) return null;
  const n = [...o.nights].reverse().find(x => x && x.id === today && Number.isFinite(x.bed) && Number.isFinite(x.wake));
  if (!n || daysBetween(n.id, today) !== 0) return null;
  const hours = (n.wake - n.bed) / 3600000;
  if (!(hours > 0 && hours < 20)) return null;
  const goal = Number(o.settings?.goalHours) || 7;
  return { hours, goal, id: n.id };
}

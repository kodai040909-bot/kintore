// 日付の扱い（ローカル時刻）。ジム1回の ID は記録した日の "YYYY-MM-DD"

const pad2 = n => String(n).padStart(2, '0');

/** ミリ秒 → "YYYY-MM-DD" */
export function dayId(ms = Date.now()) {
  const d = new Date(ms);
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
}

/** "YYYY-MM-DD" → その日の0時のミリ秒 */
export function idToMs(id) {
  const [y, m, d] = id.split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
}

/** 2つの日付の差（日数）。b − a。夏時間でずれないよう丸める */
export function daysBetween(a, b) {
  return Math.round((idToMs(b) - idToMs(a)) / 86400000);
}

/** "11月12日（水）" */
export function fmtDate(v) {
  const d = new Date(typeof v === 'string' ? idToMs(v) : v);
  return (d.getMonth() + 1) + '月' + d.getDate() + '日（' + '日月火水木金土'[d.getDay()] + '）';
}

/** "11/12" */
export function fmtMD(v) {
  const d = new Date(typeof v === 'string' ? idToMs(v) : v);
  return (d.getMonth() + 1) + '/' + d.getDate();
}

/** 長さ（時間） → "7時間12分" */
export function fmtHours(h) { const m = Math.round(h * 60); return Math.floor(m / 60) + '時間' + (m % 60 ? (m % 60) + '分' : ''); }

/** kg の表示（62.5 → "62.5"、60 → "60"、0 → "自重"） */
export const fmtKg = kg => kg > 0 ? (Number.isInteger(kg) ? String(kg) : kg.toFixed(1)) + 'kg' : '自重';

/** id に n 日足す */
export function addDays(id, n) { const d = new Date(idToMs(id)); d.setDate(d.getDate() + n); return dayId(d.getTime()); }
/** 曜日（月＝0 … 日＝6） */
export const weekdayOf = id => (new Date(idToMs(id)).getDay() + 6) % 7;
/** その週の月曜日 */
export const weekStartOf = id => addDays(id, -weekdayOf(id));
/** "月" "火" … */
export const WEEKDAYS = ['月', '火', '水', '木', '金', '土', '日'];

// 起動・画面切り替え・保存
import { load, save, loadIssue } from './state.js';
import { dayId } from './time.js';
import { initSheet, closeSheet } from './ui/sheet.js';
import { renderHome } from './ui/home.js';
import { renderRecord } from './ui/record.js';
import { renderAfter } from './ui/after.js';
import { renderFight } from './ui/fight.js';
import { renderShop } from './ui/shop.js';
import { renderLog } from './ui/log.js';
import { renderPrefs } from './ui/prefs.js';

const VIEWS = { home: renderHome, record: renderRecord, after: renderAfter, fight: renderFight, shop: renderShop, log: renderLog, prefs: renderPrefs };
let state = load();
let view = 'home';
let saveWarned = false;

export const app = {
  get state() { return state; },
  today: () => dayId(Date.now()),
  /** 状態を変えて保存し、いまの画面を描き直す */
  commit(next) {
    state = next;
    if (!save(state) && !saveWarned) { saveWarned = true; toast('保存できませんでした。ブラウザの保存領域がいっぱいか、使えない状態です'); }
    render();
  },
  go(v, arg) {
    view = v; app.arg = arg;
    document.querySelector('.views').scrollTop = 0; window.scrollTo(0, 0);
    render();
  },
  arg: null,
  toast: msg => toast(msg),
};

function render() {
  for (const k of Object.keys(VIEWS)) document.getElementById('v-' + k).hidden = k !== view;
  document.querySelectorAll('.tabbar [data-go]').forEach(b => {
    if (b.dataset.go === ({ after: 'home', prefs: 'log' }[view] || view)) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
  VIEWS[view](app);
}

export function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg; t.setAttribute('role', 'status');
  document.querySelector('.screen').appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

function showIssue() {
  const n = document.getElementById('notice');
  const msg = {
    newer: 'この端末には新しい版のデータがあります。消さないよう、保存を止めています。',
    broken: '保存データが読めなかったので、控えを残して最初から始めました。',
    'broken-unsaved': '保存データが読めず、控えも残せませんでした。データを守るため保存を止めています。',
  }[loadIssue];
  if (msg) { n.textContent = msg; n.hidden = false; }
}

document.querySelectorAll('.tabbar [data-go]').forEach(b => b.addEventListener('click', () => { closeSheet(); app.go(b.dataset.go); }));
initSheet();
showIssue();
// 日付が変わったら描き直す（開きっぱなしで翌日になったとき）
let shownDay = app.today();
document.addEventListener('visibilitychange', () => { if (!document.hidden && app.today() !== shownDay) { shownDay = app.today(); render(); } });
// 別のタブで変わったら読み直す
window.addEventListener('storage', e => { if (e.key === 'kintore' && view !== 'after') { state = load(); render(); } });
try { navigator.storage?.persist?.(); } catch (e) { /* なくてもよい */ }
render();

// オフライン用（HTTPS か localhost のときだけ）
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(e => console.warn('Service Worker を登録できませんでした', e)));
}

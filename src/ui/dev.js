// 開発用パネル（?dev=1 のときだけ）。見た目だけを切り替え、保存データには触らない
import { ROOM_ITEMS } from '../art/room.js';

export const DEV = new URLSearchParams(location.search).has('dev');
/** 上書き。null は「記録どおり」 */
export const over = { m: null, idleDays: null, items: null };

export function mountDev(onChange) {
  const el = document.getElementById('dev');
  if (!DEV || !el) return;
  el.hidden = false;
  el.innerHTML = `<h3>開発用（?dev=1）見た目だけ変わります。記録は変わりません</h3>
    <label for="dv-m">マッチョ度</label><input type="range" id="dv-m" min="0" max="7" step="0.1"><span id="dv-mv">記録</span>
    <label for="dv-d">休んだ日数</label><input type="range" id="dv-d" min="0" max="20" step="1"><span id="dv-dv">記録</span>
    <span>部屋</span><div class="wide"><button id="dv-all">用具を全部</button><button id="dv-none">何もない部屋</button><button id="dv-reset">記録どおりに戻す</button></div>`;
  const m = el.querySelector('#dv-m'), d = el.querySelector('#dv-d');
  m.value = 0; d.value = 0;
  const show = () => { el.querySelector('#dv-mv').textContent = over.m == null ? '記録' : over.m.toFixed(1); el.querySelector('#dv-dv').textContent = over.idleDays == null ? '記録' : over.idleDays + '日'; };
  m.oninput = () => { over.m = +m.value; show(); onChange(); };
  d.oninput = () => { over.idleDays = +d.value; show(); onChange(); };
  el.querySelector('#dv-all').onclick = () => { over.items = ROOM_ITEMS; onChange(); };
  el.querySelector('#dv-none').onclick = () => { over.items = []; onChange(); };
  el.querySelector('#dv-reset').onclick = () => { over.m = over.idleDays = over.items = null; m.value = 0; d.value = 0; show(); onChange(); };
  show();
}

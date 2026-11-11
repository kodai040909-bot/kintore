// 画面下から出るシート（ねむりの庭と同じ）
const sheet = () => document.getElementById('sheet');
const panel = () => document.getElementById('sheet-panel');
let onClose = null;

export function openSheet(html, mount) {
  const p = panel();
  p.innerHTML = '<div class="grab"></div>' + html;
  sheet().hidden = false;
  onClose = null;
  if (mount) onClose = mount(p) || null;
}

export function closeSheet() {
  if (sheet().hidden) return;
  sheet().hidden = true;
  panel().innerHTML = '';
  const f = onClose; onClose = null;
  if (typeof f === 'function') f();
}

export function initSheet() {
  sheet().addEventListener('click', e => { if (e.target === sheet()) closeSheet(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });
}

/** 文字を HTML に入れるときのエスケープ */
export const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

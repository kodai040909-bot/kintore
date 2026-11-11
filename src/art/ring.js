// リングと会場（160×104）。章ごとに会場が大きくなる。会場の名前・看板はすべて架空
import { rect, px, B, rng } from './pixel.js';

const W = 160, H = 104;

/** 会場の背景（観客・照明）。chapter: 1〜5 */
function venue(g, chapter) {
  const r = rng(chapter * 17);
  if (chapter === 1) {
    // 港町のクラブ：レンガの壁、裸電球、まばらな客
    for (let y = 0; y < 70; y++) for (let x = 0; x < W; x++) px(g, x, y, (y % 6 === 5 || ((x + (Math.floor(y / 6) % 2) * 6) % 12 === 0)) ? '#3a2f3e' : '#45384a');
    for (const lx of [40, 120]) { rect(g, lx, 0, 1, 8, '#2a222e'); rect(g, lx - 2, 8, 5, 2, '#f2d38a'); for (let y = 10; y < 60; y++) for (let x = lx - 30; x < lx + 30; x++) if (B[y % 4][x % 4] < Math.max(0, 6 - Math.hypot(x - lx, (y - 10) * 1.3) / 6)) px(g, x, y, '#5a4a52'); }
    rect(g, 66, 12, 28, 10, '#2a222e'); rect(g, 67, 13, 26, 8, '#7d3d37'); for (let i = 0; i < 8; i++) rect(g, 70 + i * 3, 16, 2, 2, '#e6dccb');
    crowd(g, r, 46, 0.35, ['#2c2430', '#33293a', '#3a2f3e']);
  } else if (chapter === 2) {
    // 州の体育館：観客席の段、旗
    for (let y = 0; y < 70; y++) for (let x = 0; x < W; x++) px(g, x, y, y < 18 ? '#3b3a4a' : ((y - 18) % 8 < 1 ? '#2a2834' : '#34323f'));
    for (let i = 0; i < 6; i++) { rect(g, 10 + i * 26, 2, 14, 9, ['#7d3d37', '#3f5874', '#c9a440'][i % 3]); rect(g, 10 + i * 26, 11, 14, 1, '#1d1a22'); }
    crowd(g, r, 26, 0.6, ['#26232e', '#2e2a36', '#3a3444', '#4a3d4f']);
  } else {
    // アリーナ・大会場：暗い客席にスポットライト。最後の2章はネオン
    for (let y = 0; y < 70; y++) for (let x = 0; x < W; x++) px(g, x, y, B[y % 4][x % 4] < y / 10 ? '#1c1822' : '#15121a');
    if (chapter >= 4) {
      rect(g, 54, 3, 52, 15, '#0e0c12'); rect(g, 55, 4, 50, 13, '#2a3c5a');
      for (let i = 0; i < 12; i++) px(g, 58 + i * 4, 10, '#86d0f0');
      // ネオンの星
      for (const [x, col] of [[14, '#e0508a'], [146, '#50c8e0']]) { rect(g, x - 1, 4, 2, 12, col); rect(g, x - 6, 9, 12, 2, col); for (let k = -3; k <= 3; k++) { px(g, x + k, 10 + k, col); px(g, x + k, 10 - k, col); } }
    }
    crowd(g, r, 22, 0.85, ['#1d1a24', '#24202c', '#2c2734', '#3a3444']);
    for (const lx of [30, 80, 130]) for (let y = 0; y < 66; y++) { const w = y * 0.35 + 1; for (let x = Math.round(lx - w); x <= lx + w; x++) if (B[y % 4][(x + 400) % 4] < 3) px(g, x, y, '#4a4458'); }
  }
}

/** 観客のシルエット（頭と肩） */
function crowd(g, r, top, density, cols) {
  for (let row = 0; row < 5; row++) {
    const y = top + row * 5;
    for (let x = 2; x < W; x += 5) {
      if (r() > density) continue;
      const col = cols[Math.floor(r() * cols.length)], dx = Math.floor(r() * 3);
      rect(g, x + dx, y, 3, 2, col); rect(g, x + dx - 1, y + 2, 5, 4, col);
      if (r() < 0.06) px(g, x + dx + 1, y - 1, '#f2e6c8');   // カメラのフラッシュ
    }
  }
}

/** リングの床・ロープ・コーナー */
function ring(g, chapter) {
  const mat = chapter >= 3 ? ['#3a4a6a', '#33425f'] : ['#7a6a5a', '#6e5f50'];
  for (let y = 70; y < H; y++) for (let x = 0; x < W; x++) px(g, x, y, ((x + y) % 7 === 0) ? mat[1] : mat[0]);
  rect(g, 0, 70, W, 1, '#c8bfae');
  rect(g, 0, 96, W, 8, chapter >= 3 ? '#1f2638' : '#3d2f2a');   // エプロン
  if (chapter >= 3) for (let i = 0; i < 4; i++) rect(g, 20 + i * 34, 99, 20, 2, '#c9a440');
  for (const [x, col] of [[4, '#b0302a'], [153, '#3f5874']]) { rect(g, x, 34, 3, 63, '#c8bfae'); rect(g, x, 34, 3, 3, col); }
  for (const y of [42, 52, 62]) { rect(g, 6, y, 148, 1, chapter >= 3 ? '#d8d0c0' : '#9a3a34'); rect(g, 6, y + 1, 148, 1, '#2a2228'); }
}

/** 会場とリングを描く（選手は呼ぶ側が上に重ねる。足元 y=88 あたり） */
export function drawArena(g, chapter) {
  venue(g, chapter);
  ring(g, chapter);
}

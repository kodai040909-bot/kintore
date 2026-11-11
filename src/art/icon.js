// アプリのアイコン（32×32 のドット絵）：赤いボクシンググローブ（横から見た形。親指を分けて描く）と白いカフ
import { mk, px, outline } from './pixel.js';

export const ICON = 32;
export const ICON_BG = '#2a2330';

/** 32×32 の canvas の context に描く（背景は呼ぶ側） */
export function drawIcon(g) {
  const c = mk(ICON, ICON), x = c.getContext('2d');
  const R = '#b8382e', Rd = '#7e221c', Rh = '#e0675a', Rhh = '#f2a090', W = '#e6dccb', Wd = '#b5ad9c', L = '#191317';
  const inE = (i, j, cx, cy, rx, ry) => ((i - cx) ** 2) / (rx * rx) + ((j - cy) ** 2) / (ry * ry) <= 1;
  // こぶし（本体）：縦長のだ円。右下に影、左上に光
  for (let j = 2; j <= 22; j++) for (let i = 8; i <= 28; i++) {
    if (!inE(i, j, 18.5, 11.5, 8.5, 9.5)) continue;
    let col = R;
    if (!inE(i, j, 17, 10, 8.5, 9.5)) col = Rd;
    if (inE(i, j, 15, 7, 3.5, 2.5)) col = Rh;
    px(x, i, j, col);
  }
  px(x, 13, 6, Rhh); px(x, 14, 6, Rhh); px(x, 13, 7, Rhh);
  // 指の折り目
  for (const [i, j] of [[21, 8], [22, 9], [22, 10]]) px(x, i, j, Rd);
  // 親指：本体の左に重ね、まわりを暗い線で分ける
  for (let j = 9; j <= 21; j++) for (let i = 4; i <= 14; i++) {
    if (!inE(i, j, 9, 15, 4, 5.5)) continue;
    px(x, i, j, inE(i, j, 9, 15, 3, 4.5) ? (inE(i, j, 8, 13, 1.5, 1.5) ? Rh : R) : L);
  }
  for (const [i, j] of [[12, 19], [12, 20], [11, 21]]) px(x, i, j, Rd);
  // カフ（手首）と、ひも
  for (let j = 21; j <= 27; j++) for (let i = 12; i <= 24; i++) px(x, i, j, j === 27 || i === 24 ? Wd : W);
  for (let i = 12; i <= 24; i++) px(x, i, 21, L);
  for (const [i, j] of [[15, 23], [16, 24], [17, 23], [18, 24], [19, 23], [20, 24], [21, 23]]) px(x, i, j, R);
  g.drawImage(outline(c, L), 0, 0);
}

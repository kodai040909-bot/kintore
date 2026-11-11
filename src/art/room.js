// ジムの部屋（160×104）。試作の room() を移植し、置いてある用具・内装ごとに描き分ける
// 最初は床のダンベルだけ（STARTER_ITEMS）。ほかは店で買うと増える（M5）。ベルトの棚には勝ち取ったベルトが並ぶ
import { rng, B, rect, px } from './pixel.js';

/** 部屋に置けるもの（M5 で店の品と結びつける） */
export const ROOM_ITEMS = ['dumbbell', 'bench', 'rack', 'pullup', 'bag', 'speedbag', 'poster', 'radio', 'plant', 'rug', 'neon', 'shelf'];

/** items: 置いてあるものの id の集合（Set か配列）。belts: 勝ち取ったベルトの章（1〜5） */
export function room(g, items = ROOM_ITEMS, belts = []) {
  const set = new Set(items), has = id => set.has(id);
  const r = rng(3);
  // 壁（レンガ）
  for (let y = 0; y < 74; y++) for (let x = 0; x < 160; x++){
    const dark = y < 20 && B[y%4][x%4] < (20 - y) * 0.8;
    let col = dark ? '#3d3242' : '#4a3d4f';
    if (y % 6 === 5 || ((x + (Math.floor(y/6) % 2) * 6) % 12 === 0)) col = '#40354a';
    px(g, x, y, col);
  }
  // ランプの光
  for (let y = 0; y < 74; y++) for (let x = 40; x < 120; x++){
    const d = Math.hypot((x - 80) / 1.4, y - 12);
    if (d < 34 && B[y%4][x%4] < (34 - d) / 2.2) px(g, x, y, (y % 6 === 5 || ((x + (Math.floor(y/6) % 2) * 6) % 12 === 0)) ? '#4b3e4b' : '#584853');
  }
  rect(g, 0, 72, 160, 2, '#2c2430');
  // 床
  for (let y = 74; y < 104; y++) for (let x = 0; x < 160; x++){
    let col = (y - 74) % 7 === 0 ? '#4c3a2f' : '#664c3d';
    if ((x + Math.floor((y - 74) / 7) * 23) % 37 === 0 && (y - 74) % 7 !== 0) col = '#56412f';
    if (y > 96 && B[y%4][x%4] < (y - 96) * 1.6) col = '#4c3a2f';
    px(g, x, y, col);
  }
  // 窓（夕方の港町）
  rect(g, 8, 10, 34, 32, '#2a222e');
  for (let y = 12; y < 40; y++) for (let x = 10; x < 40; x++){
    const t = (y - 12) / 28;
    const col = t < 0.35 ? '#d49a6a' : t < 0.6 ? (B[y%4][x%4] < (t - 0.35) * 64 ? '#9a6f7a' : '#d49a6a') : '#9a6f7a';
    px(g, x, y, col);
  }
  const bld = [[10,26,5],[15,22,4],[19,30,6],[25,20,5],[30,27,4],[34,24,6]];
  for (const [x, y, w] of bld){ rect(g, x, y, w, 40 - y, '#3e3248'); for (let j = y + 2; j < 39; j += 3) for (let i = x + 1; i < x + w - 1; i += 2) if (r() < 0.35) px(g, i, j, '#e8c27a'); }
  rect(g, 24, 12, 1, 28, '#2a222e'); rect(g, 10, 25, 30, 1, '#2a222e');
  rect(g, 6, 42, 38, 2, '#5d4d55'); rect(g, 6, 44, 38, 1, '#2c2430');
  // 窓辺のラジカセ（radio）
  if (has('radio')) {
    rect(g, 27, 35, 15, 7, '#191317'); rect(g, 28, 36, 13, 6, '#a8a2ae'); rect(g, 28, 36, 13, 1, '#d0cad4');
    for (const cx of [31, 38]) { rect(g, cx - 2, 37, 4, 4, '#3a3440'); px(g, cx - 1, 38, '#5e5866'); px(g, cx, 39, '#24202a'); }
    rect(g, 33, 37, 3, 1, '#c96a4f'); rect(g, 33, 39, 3, 1, '#2a2430'); rect(g, 30, 33, 9, 1, '#3a3440'); px(g, 30, 34, '#3a3440'); px(g, 38, 34, '#3a3440');
  }
  // ポスター（オリジナル：こぶしのマーク）（poster）
  if (has('poster')) {
    rect(g, 50, 12, 16, 22, '#b9a588'); rect(g, 51, 13, 14, 20, '#7d3d37');
    rect(g, 55, 17, 6, 5, '#e6dccb'); rect(g, 54, 18, 1, 3, '#e6dccb'); rect(g, 56, 22, 4, 3, '#e6dccb');
    px(g, 56, 18, '#7d3d37'); px(g, 58, 18, '#7d3d37');
    rect(g, 53, 27, 10, 1, '#e6dccb'); rect(g, 54, 29, 8, 1, '#c9a46a');
  }
  // ランプ
  rect(g, 80, 0, 1, 6, '#2a222e'); rect(g, 77, 6, 7, 2, '#2f2a33'); rect(g, 79, 8, 3, 1, '#f2d38a');
  // 懸垂バー（pullup）
  if (has('pullup')) {
    rect(g, 98, 16, 2, 6, '#2c2730'); rect(g, 120, 16, 2, 6, '#2c2730'); rect(g, 97, 18, 26, 1, '#9a98a2'); rect(g, 97, 19, 26, 1, '#5e5c66');
  }
  // ダンベルラック（rack）
  if (has('rack')) {
    rect(g, 96, 58, 26, 2, '#3a3238'); rect(g, 96, 66, 26, 2, '#3a3238'); rect(g, 97, 60, 1, 14, '#2a242a'); rect(g, 120, 60, 1, 14, '#2a242a');
    for (const [x, y, w] of [[99,55,6],[107,55,5],[114,55,5],[99,63,7],[108,63,6]]){
      rect(g, x, y + 1, 1, 2, '#24222a'); rect(g, x + w - 1, y + 1, 1, 2, '#24222a'); rect(g, x, y, 1, 1, '#4a4752'); rect(g, x + w - 1, y, 1, 1, '#4a4752');
      rect(g, x + 1, y + 1, w - 2, 1, '#8e8b96');
    }
  }
  // サンドバッグ（bag）
  if (has('bag')) {
    rect(g, 141, 0, 1, 20, '#5e5c66');
    for (let y = 20; y < 60; y++){
      const w = y < 23 || y > 56 ? 9 : 11, x0 = 141 - Math.floor(w / 2);
      for (let x = x0; x < x0 + w; x++){
        let col = '#7a4336';
        if (x === x0 || x === x0 + 1) col = '#93564a';
        if (x >= x0 + w - 2) col = '#5b2f27';
        if (y === 27 || y === 28 || y === 51 || y === 52) col = x >= x0 + w - 2 ? '#9a8a68' : '#c9b48a';
        px(g, x, y, col);
      }
    }
    rect(g, 136, 60, 11, 1, '#191317');
    for (let x = 133; x < 150; x++) if (B[0][x%4] < 8) px(g, x, 99, '#4a3830');
  }
  // ベンチ台（bench）
  if (has('bench')) {
    rect(g, 70, 86, 28, 4, '#3f4b5e'); rect(g, 70, 86, 28, 1, '#56647a'); rect(g, 70, 90, 28, 1, '#2b3442');
    rect(g, 73, 91, 2, 8, '#2a2430'); rect(g, 93, 91, 2, 8, '#2a2430'); rect(g, 71, 98, 6, 1, '#2a2430'); rect(g, 91, 98, 6, 1, '#2a2430');
  }
  // 床のダンベル（dumbbell）
  if (has('dumbbell')) {
    rect(g, 104, 94, 8, 1, '#8e8b96'); rect(g, 103, 92, 2, 4, '#24222a'); rect(g, 111, 92, 2, 4, '#24222a');
  }
  // マット（赤いラグを買うと替わる）
  if (has('rug')) {
    for (let y = 91; y < 103; y++) for (let x = 12; x < 64; x++) {
      const edge = y === 91 || y === 102 || x === 12 || x === 63, inner = y === 93 || y === 100 || x === 14 || x === 61;
      px(g, x, y, edge ? '#5e2626' : inner ? '#c9a46a' : ((x + y) % 4 === 0 ? '#7e3232' : '#8a3a3a'));
    }
  } else {
    for (let y = 92; y < 102; y++) for (let x = 14; x < 62; x++) px(g, x, y, (x + y) % 2 ? '#5a4553' : '#55404e');
    rect(g, 14, 92, 48, 1, '#6a5262');
  }
  // タオル（ベンチの上）（bench）
  if (has('bench')) {
    rect(g, 86, 84, 7, 2, '#c8bfae'); rect(g, 86, 85, 7, 1, '#a8a092');
  }
  // ネオンの看板（neon）：いなずまと星。壁がほんのり光る
  if (has('neon')) {
    for (let y = 18; y < 40; y++) for (let x = 64; x < 96; x++) { const d = Math.hypot(x - 80, (y - 29) * 1.4); if (d < 18 && B[y % 4][x % 4] < (18 - d) / 3) px(g, x, y, '#6a4a6e'); }
    rect(g, 68, 22, 24, 14, '#2a222e');
    const pink = '#f06aa8', cyan = '#6ad8f0';
    for (const [x, y] of [[82, 23], [81, 24], [80, 25], [79, 26], [78, 27], [79, 28], [80, 28], [81, 28], [82, 28], [81, 29], [80, 30], [79, 31], [78, 32], [77, 33]]) px(g, x, y, pink);
    for (const [x, y] of [[72, 26], [71, 27], [73, 27], [72, 28], [88, 30], [87, 31], [89, 31], [88, 32]]) px(g, x, y, cyan);
  }
  // ベルトの棚（shelf）：勝ち取ったベルトが並ぶ
  if (has('shelf')) {
    rect(g, 98, 42, 24, 2, '#5a4234'); rect(g, 98, 44, 24, 1, '#3a2a22'); rect(g, 100, 44, 1, 3, '#3a2a22'); rect(g, 119, 44, 1, 3, '#3a2a22');
    belts.forEach((c, i) => {
      const x = 99 + i * 5, gold = c === 5;
      rect(g, x, 37, 4, 5, gold ? '#8e7228' : '#2a2228'); rect(g, x, 38, 4, 3, gold ? '#ecd27e' : '#c9a440'); px(g, x + 1, 39, gold ? '#fff3c8' : '#e6dccb');
    });
  }
  // パンチングボール（speedbag）
  if (has('speedbag')) {
    rect(g, 119, 21, 17, 3, '#6a5040'); rect(g, 119, 21, 17, 1, '#8a6a52'); rect(g, 119, 24, 17, 1, '#2a222e'); rect(g, 121, 25, 1, 5, '#2a222e'); rect(g, 133, 25, 1, 5, '#2a222e');
    rect(g, 127, 25, 2, 2, '#9a98a2');
    for (let j = 0; j < 8; j++) { const w = j < 1 ? 3 : j < 6 ? 6 : 4; rect(g, 128 - Math.floor(w / 2), 27 + j, w, 1, '#a84c3c'); }
    px(g, 126, 29, '#d4785e'); px(g, 126, 30, '#d4785e'); px(g, 127, 28, '#d4785e'); rect(g, 130, 29, 1, 4, '#6a2f25'); rect(g, 127, 35, 2, 1, '#191317');
  }
  // 観葉植物（plant）
  if (has('plant')) {
    rect(g, 124, 90, 8, 8, '#9a5a3a'); rect(g, 123, 89, 10, 2, '#b06a46'); rect(g, 130, 91, 2, 7, '#7a4430');
    for (const [x, y, r] of [[128, 84, 4], [124, 80, 3], [132, 79, 3], [128, 76, 3], [126, 72, 2]]) for (let j = -r; j <= r; j++) for (let k = -r; k <= r; k++) if (k * k + j * j <= r * r) px(g, x + k, y + j, (k + j) % 3 === 0 ? '#3f6a35' : '#5f8a4a');
    for (const [x, y] of [[127, 86], [128, 87], [128, 88]]) px(g, x, y, '#3f6a35');
  }
}

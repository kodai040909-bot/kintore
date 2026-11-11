// 場面を組み立てる：ジム（部屋＋分身）と、鏡の前（完了画面）
import { mk, rect, px, B, shadow } from './pixel.js';
import { fighter, body, ME } from './fighter.js';
import { room } from './room.js';

const W = 160, H = 104;
let roomCache = null, roomKey = '';

/** 壁に掛けたグローブ（いま持っているグローブの色。ジムではバンテージなので、ここで見せる） */
function hangingGloves(g, gl) {
  if (!gl) return;
  px(g, 62, 37, '#9a98a2'); px(g, 62, 38, '#5e5c66');
  for (const [x0, y0, l] of [[58, 43, 1], [64, 44, 0]]) {
    for (let k = 0; k < 5; k++) px(g, l ? 61 - Math.round(k * 0.6) : 62 + Math.round(k * 0.4), 39 + k, '#d8d0c0');
    for (let j = 0; j < 7; j++) { const w = j === 0 || j === 6 ? 3 : 5; rect(g, x0 - Math.floor(w / 2) + 1, y0 + j, w, 1, j === 6 ? '#d8d0c0' : gl.c); }
    rect(g, x0 + 3, y0 + 1, 1, 4, gl.d); px(g, x0, y0 + 1, gl.h); px(g, x0 - 1, y0 + 3, gl.d);
  }
}

/** ジムの場面。opt: { m: マッチョ度(0〜7の小数), sad, pose, items, belts, look, gloves } */
export function drawGym(canvas, opt) {
  const g = canvas.getContext('2d');
  const key = JSON.stringify([opt.items || null, opt.belts || []]);
  if (!roomCache || roomKey !== key) { roomCache = mk(W, H); room(roomCache.getContext('2d'), opt.items || undefined, opt.belts || []); roomKey = key; }
  g.clearRect(0, 0, W, H);
  g.drawImage(roomCache, 0, 0);
  hangingGloves(g, opt.gloves);
  const p = body(opt.m);
  shadow(g, 38, 98, 9 + Math.round(p.s));
  g.drawImage(fighter(p, { ...(opt.look || ME), sad: !!opt.sad, pose: opt.pose }), 38 - 32, 98 - 61);
}

/** 鏡の前の場面（完了画面）。分身は中央でポーズ。glow 0〜1 で光らせる */
export function drawMirror(canvas, opt) {
  const g = canvas.getContext('2d');
  // 壁
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let col = y < 78 ? ((y % 6 === 5 || ((x + (Math.floor(y / 6) % 2) * 6) % 12 === 0)) ? '#40354a' : '#4a3d4f') : ((y - 78) % 7 === 0 ? '#4c3a2f' : '#664c3d');
    px(g, x, y, col);
  }
  rect(g, 0, 76, W, 2, '#2c2430');
  // 鏡（枠と、ぼんやり映る部屋）
  rect(g, 50, 6, 60, 74, '#2a222e'); rect(g, 51, 7, 58, 72, '#8a7a6a');
  for (let y = 9; y < 77; y++) for (let x = 53; x < 107; x++) {
    const t = (y - 9) / 68;
    px(g, x, y, B[y % 4][x % 4] < 6 + t * 6 ? '#5d6878' : '#6e7a8a');
  }
  for (let k = 0; k < 14; k++) { px(g, 58 + k, 14 + k, '#9aa6b4'); px(g, 60 + k, 14 + k, '#9aa6b4'); }   // 鏡の光
  // 光の輪
  const glow = opt.glow || 0;
  if (glow > 0) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const d = Math.hypot((x - 80) / 1.3, y - 54);
    if (d < 46 && B[y % 4][x % 4] < (46 - d) / 46 * 16 * glow) px(g, x, y, '#e8c98a');
  }
  const p = body(opt.m);
  shadow(g, 80, 98, 10 + Math.round(p.s));
  g.drawImage(fighter(p, { ...(opt.look || ME), pose: opt.pose }), 80 - 32, 98 - 61);
  // きらきら
  if (opt.sparkle) {
    for (const [x, y, s] of opt.sparkle) {
      px(g, x, y, '#fff3d6');
      if (s > 0.5) { px(g, x - 1, y, '#e8c98a'); px(g, x + 1, y, '#e8c98a'); px(g, x, y - 1, '#e8c98a'); px(g, x, y + 1, '#e8c98a'); }
    }
  }
}

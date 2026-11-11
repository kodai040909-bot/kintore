// 正面の分身（試作の fighter() をそのまま移植。描き方は design.md §9）
import { mk, px, rng, lerp, outline } from './pixel.js';

// ---- 分身を描く（正面・64×64、足元 y=61、中心は x=32 の左側の境目）----
// p: s=肩幅 c=胸板 b=背中 a=腕 l=脚（0〜5）
export function fighter(p, look = {}){
  // v2：肩は首→肩先をなめらかにつなぐ。脚は全体の育ちでも少し太くなる。影は大きな塊で量感を出す
  const c = mk(64, 64), g = c.getContext('2d');
  const S = look.skin || '#c99c7a', Sd = look.skinD || '#9a6c53', Sh = look.skinH || '#e2bd98', Sdd = look.skinDD || '#74493a';
  const G = (p.s + p.c + p.b + p.a + p.l) / 5;                 // 全体の育ち（太さ）
  const D = p.def ?? G;                                        // 締まり具合（筋の見え方）。太さとは別に持つ
  const L = Math.min(5, p.l * 0.7 + G * 0.5);                  // 脚：脚トレ＋全体の育ち
  const cx = 32, top = 14 + (look.sad ? 1 : 0);
  const span = (y, a, b, col) => { a = Math.round(a); b = Math.round(b); if (b < a) return; g.fillStyle = col; g.fillRect(a, y, b - a + 1, 1); };
  const dot = (x, y, col) => px(g, x, y, col);

  // ---- 脚 ----
  const legTop = top + 31, legBot = top + 45;
  // 足の開き：ふだんは少し、ポーズのときは大きく。腰から足首へ向かって外へ開く
  const st = look.stance ?? (look.pose === 'flex' ? 3 : 1);
  const so = y => Math.round(st * (0.35 + 0.65 * Math.max(0, Math.min(1, (y - legTop) / (legBot - legTop)))));
  const legW = y => {
    const t = (y - legTop) / (legBot - legTop);
    const thigh = 3 + L * 0.75, knee = 2.4 + L * 0.3, calf = 2.7 + L * 0.45, ankle = 2;
    return t < 0.45 ? lerp(thigh, knee, Math.pow(t / 0.45, 1.6)) : t < 0.72 ? lerp(knee, calf, Math.sin((t - 0.45) / 0.27 * Math.PI / 2)) : lerp(calf, ankle, (t - 0.72) / 0.28);
  };
  const pants = look.pants;
  for (let y = legTop; y <= legBot; y++){
    const w = Math.round(legW(y)) + (pants ? 1 : 0), col = pants || S, sh = pants ? look.pantsD : Sd;
    const o = so(y), l0 = cx - 1 - w - o, l1 = cx - 2 - o, r0 = cx + 1 + o, r1 = cx + w + o;
    span(y, l0, l1, col); span(y, r0, r1, col);
    span(y, l1, l1, sh); span(y, r1 - (w >= 5 ? 1 : 0), r1, sh);
    if (!pants){
      if (y < legTop + 6) { dot(l0 + 1, y, Sh); dot(r0 + 1, y, Sh); }
      if (D >= 2.5 && y >= legTop + 2 && y <= legTop + 5) { dot(l0 + Math.round(w * 0.55), y, Sd); dot(r0 + Math.round(w * 0.45), y, Sd); }   // 太ももの筋
      if (y === top + 39) { span(y, l0 + 1, l1 - 1, Sd); span(y, r0 + 1, r1 - 1, Sd); }                                                            // ひざ
    }
  }
  for (let y = legBot + 1; y <= legBot + 2; y++){
    const w = Math.round(legW(legBot)) + 1, o = so(legBot);
    if (look.barefoot){ span(y, cx - 1 - w - o, cx - 2 - o, S); span(y, cx + 1 + o, cx + w + o, S); }
    else { span(y, cx - 2 - w - o, cx - 2 - o, '#2b2329'); span(y, cx + 1 + o, cx + w + 1 + o, '#2b2329'); span(y, cx - 2 - w - o, cx - 2 - w - o + 1, '#3d343b'); }
  }

  // ---- 胴（首の付け根→肩先→わき→腰）----
  const shW = 6 + p.s * 0.85 + p.b * 0.15;                    // 肩先までの半幅
  const chW = 5.3 + p.c * 0.35 + p.b * 0.25;                  // 胸
  const latW = chW + p.b * 0.4;                                // わきの下（背中の広がり）
  const waW = 4.4 + G * 0.2 + (look.heavy || 0);               // 腰
  const trap = 3 + p.s * 0.35 + G * 0.15;
  const hw = [];
  hw[0] = trap + 0.6;
  hw[1] = lerp(trap, shW, 0.62);
  hw[2] = shW - 0.5;
  hw[3] = shW;
  hw[4] = shW - 0.2;
  hw[5] = Math.max(latW, shW - 1.2);
  for (let r = 6; r <= 16; r++) hw[r] = lerp(latW, waW, Math.pow((r - 6) / 10, 1.15));
  const R = hw.map(v => Math.max(2, Math.round(v)));
  const ty = r => top + 11 + r;
  // 首
  const nk = Math.round(2 + p.s * 0.15 + G * 0.15);
  for (let y = top + 9; y <= top + 10; y++){ span(y, cx - nk, cx + nk - 1, S); dot(cx + nk - 1, y, Sd); }
  for (let r = 0; r <= 16; r++){
    const y = ty(r), a = cx - R[r], b = cx + R[r] - 1;
    span(y, a, b, S);
    span(y, b - (R[r] >= 8 ? 1 : 0), b, Sd);                   // 右側の影
    if (r >= 1 && r <= 4) dot(a, y, Sh);                        // 左肩の光
  }
  // 三角筋：肩先の丸みを影と光で見せる（形は胴の輪郭のまま）
  if (Math.max(p.s, D) >= 1){
    const ds = Math.round(shW - 1.6 - p.s * 0.35);
    for (let r = 2; r <= 5; r++){ dot(cx - ds, ty(r), Sd); dot(cx + ds - 1, ty(r), Sd); }
    span(ty(1), cx - R[1] + 1, cx - ds - 1, Sh);
    if (D >= 3) span(ty(2), cx - R[2] + 1, cx - ds - 2, Sh);
    span(ty(1), cx + ds, cx + R[1] - 2, Sh);
  }
  // 僧帽の線
  if (D >= 3){ dot(cx - nk - 1, ty(0), Sd); dot(cx + nk, ty(0), Sd); }
  // 胸板：下のふちに影の塊、上に光の帯
  const yP = ty(5 + Math.round(p.c * 0.45));
  const pw = Math.round(chW - 1.2);
  if (D >= 1){
    span(yP, cx - pw, cx + pw - 1, Sd);
    if (D >= 3) for (let x = cx - pw + 1; x < cx + pw - 1; x += 2) dot(x, yP + 1, Sd);
    if (D >= 2){ for (let y = ty(3); y < yP; y++) dot(cx - 1, y, Sd); span(ty(3), cx - pw + 1, cx - 3, Sh); }
    if (D >= 4) span(ty(4), cx - pw + 1, cx - 4, Sh);
    span(yP, cx + pw - 2, cx + pw - 1, Sdd);
  } else {
    dot(cx - 3, ty(5), Sd); dot(cx + 2, ty(5), Sd);
  }
  // 腹筋：全体の育ちで割れていく
  if (D >= 1.5){
    for (let y = yP + 2; y <= ty(15); y++) dot(cx - 1, y, Sd);
    const rows = D >= 3 ? [yP + 4, yP + 7, yP + 10] : [yP + 5, yP + 9];
    for (const y of rows) if (y < ty(16)) { span(y, cx - 3, cx - 2, Sd); span(y, cx, cx + 1, Sd); }
    if (D >= 3) for (const y of rows) if (y + 1 < ty(16)) dot(cx - 3, y + 1, Sh);
  }
  // 背中の広がり：わきの下から腰への影
  if (D >= 2) for (let r = 6; r <= 11; r++){ dot(cx - R[r] + 1, ty(r), Sd); dot(cx + R[r] - 3, ty(r), Sd); }

  // ---- 腕 ----
  let side = 0; for (let r = 5; r <= 10; r++) side = Math.max(side, R[r]);
  const ua = 2.2 + p.a * 0.6, fa = 2 + p.a * 0.42;
  for (const sg of (look.pose === 'flex' ? [] : [-1, 1])){
    const ax = cx + sg * (side + ua / 2 - 0.2) - (sg > 0 ? 1 : 0);
    const gl = look.gloves;
    for (let y = ty(5); y <= (gl ? top + 34 : top + 32); y++){
      let w, col = S;
      if (gl && y >= top + 28){                                                // グローブ
        w = (y === top + 28 ? 3.4 : 4.6) + p.a * 0.25 - (y === top + 34 ? 1 : 0);
        col = y === top + 28 ? gl.cuff : gl.c;
        const a0 = Math.round(ax - w / 2 + 0.5), a1 = a0 + Math.round(w) - 1;
        span(y, a0, a1, col);
        if (y > top + 28){ dot(a1, y, gl.d); if (y >= top + 32) span(y, a0 + 1, a1, gl.d); if (y <= top + 30) dot(a0 + 1, y, gl.h); }
        continue;
      }
      if (y <= top + 23) w = ua + (y >= top + 18 && y <= top + 21 && D >= 2 ? 0.5 + p.a * 0.15 : 0);   // 二の腕（力こぶ）
      else if (y <= top + 30) w = fa + (y <= top + 26 ? 0.4 : 0);
      else { w = 2.6 + p.a * 0.15; if (look.wraps) col = look.wraps; }
      const a0 = Math.round(ax - w / 2 + 0.5), a1 = a0 + Math.max(2, Math.round(w)) - 1;
      span(y, a0, a1, col);
      if (y <= top + 30){
        dot(a1, y, Sd); if (a1 - a0 >= 4) dot(a1 - 1, y, Sd);
        dot(sg < 0 ? a1 + 1 : a0 - 1, y, y <= top + 23 ? Sdd : Sd);            // 胴とのすき間の影
        if (D >= 2 && y >= top + 17 && y <= top + 21) dot(a0 + 1, y, Sh);    // 力こぶの光
        if (y === top + 24) span(y, a0, a1, Sd);                               // ひじ
      }
    }
  }

  // ---- ポーズ：ダブルバイセップス（両腕の力こぶ）----
  // 二の腕を横に張り、前腕は頭の方へ斜めに曲げて、こぶしを耳の横に。二の腕の上に力こぶの山を盛る
  if (look.pose === 'flex'){
    const fill = (x0, y0, r, col) => { for (let j = -Math.ceil(r); j <= Math.ceil(r); j++) for (let i = -Math.ceil(r); i <= Math.ceil(r); i++) if (i * i + j * j <= r * r + 0.25) dot(x0 + i, y0 + j, col); };
    const thick = (x0, y0, x1, y1, w, col) => { const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2) + 1; for (let k = 0; k <= n; k++) fill(x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n, w / 2, col); };
    const uw = 2.6 + p.a * 0.55, fw = 2.3 + p.a * 0.4;
    const len = 6 + Math.round(p.a * 0.6 + p.s * 0.3);
    for (const sg of [-1, 1]){
      const sx = cx + sg * (R[2] - 1) - (sg > 0 ? 1 : 0), sy = ty(2) + 1;    // 肩先
      const ex = sx + sg * len, ey = sy;                                       // ひじ
      const hx = sx + sg * Math.max(3, Math.round(len * 0.42)), hy = top + 2;  // こぶし
      thick(ex, ey - 1, hx, hy + 1, fw, S);                                    // 前腕
      thick(sx, sy, ex, ey, uw, S);                                            // 二の腕
      // 力こぶの山（二の腕の上に半円）
      const bx = sx + sg * len * 0.52, rw = len * 0.34 + 0.6, bh = 1.2 + p.a * 0.9 + (D >= 2 ? 0.6 : 0);
      const base = Math.round(sy - uw / 2);
      for (let i = -Math.ceil(rw); i <= Math.ceil(rw); i++){
        const h = Math.round(bh * Math.sqrt(Math.max(0, 1 - (i / rw) ** 2)));
        for (let j = 0; j <= h; j++) dot(Math.round(bx + i), base - j, S);
        if (h > 0 && i * sg <= 0) dot(Math.round(bx + i), base - h, Sh);          // 山の光（内側）
      }
      // 影：二の腕の下、ひじ、前腕の外側
      const under = Math.round(sy + uw / 2);
      for (let k = 1; k <= len; k++) dot(sx + sg * k, under, Sd);
      fill(ex, ey, 1, Sd); dot(ex, ey - 1, S);
      for (let y = hy + 2; y < ey - 1; y++){ const t = (y - hy) / (ey - hy); dot(Math.round(hx + (ex - hx) * t + sg * fw / 2 - sg * 0.5), y, Sd); }
      // こぶし（内向き）と手首のバンテージ
      fill(hx, hy, 1.7 + p.a * 0.15, S);
      dot(hx - sg, hy - 1, Sh); dot(hx + sg, hy + 1, Sd);
      if (look.wraps){ const wy = hy + 2; for (let i = -1; i <= 1; i++) dot(Math.round(hx + (ex - hx) * 0.12) + i, wy, look.wraps); }
    }
  }

  // ---- 下：トランクス／帯 ----
  if (pants){
    for (let y = top + 26; y <= top + 32; y++){ const w = Math.max(waW + 1.2, legW(legTop) + 2); span(y, cx - Math.round(w), cx + Math.round(w) - 1, pants); dot(cx + Math.round(w) - 1, y, look.pantsD); }
    for (const y of [top + 26, top + 27]) span(y, cx - Math.round(waW + 1.2), cx + Math.round(waW + 1.2) - 1, look.belt);
    span(top + 28, cx - 3, cx - 2, look.belt); dot(cx - 3, top + 29, look.belt); dot(cx - 4, top + 30, look.belt);
  } else {
    const sw = Math.round(Math.max(waW + 1, legW(legTop) + 1));   // 腰幅に合わせる（太ももより大きく広げない）
    for (let y = top + 26; y <= top + 33; y++){
      if (y >= top + 31){ const w = Math.round(legW(legTop)), o = so(y); span(y, cx - 1 - w - o, cx - 1 - (y > top + 31 ? o : 0), look.shorts); span(y, cx + (y > top + 31 ? o : 0), cx + w + o, look.shorts); dot(cx + w + o, y, look.shortsD); dot(cx - 1 - (y > top + 31 ? o : 0), y, look.shortsD); }
      else { span(y, cx - sw, cx + sw - 1, look.shorts); span(y, cx + sw - 2, cx + sw - 1, look.shortsD); }
    }
    span(top + 26, cx - sw, cx + sw - 1, look.band); span(top + 27, cx - sw, cx + sw - 1, look.band);
    span(top + 28, cx + sw - 2, cx + sw - 1, look.shortsD);
  }

  // ---- 頭 ----
  for (let y = top; y <= top + 8; y++){ const r = y === top || y === top + 8 ? 3 : 4; span(y, cx - r, cx + r - 1, S); dot(cx + r - 1, y, Sd); }
  dot(cx - 5, top + 4, S); dot(cx + 4, top + 4, Sd); dot(cx - 5, top + 5, Sd); dot(cx + 4, top + 5, Sd);
  if (look.hair){ for (let y = top; y <= top + 2; y++){ const r = y === top ? 3 : 4; span(y, cx - r, cx + r - 1, look.hair); } dot(cx - 4, top + 3, look.hair); dot(cx + 3, top + 3, look.hair); dot(cx - 2, top, '#4a3a40'); }
  if (look.stubble){ const rr = rng(7); for (let y = top; y <= top + 2; y++) for (let x = cx - 4; x < cx + 4; x++) if (rr() < 0.45) dot(x, y, look.stubble); }
  const eye = look.eye || '#1e1820';
  if (look.sad){
    dot(cx - 2, top + 5, eye); dot(cx + 1, top + 5, eye);
    dot(cx - 3, top + 4, Sd); dot(cx + 2, top + 4, Sd);
    dot(cx - 2, top + 7, Sd); span(top + 6, cx - 1, cx, Sd); dot(cx + 1, top + 7, Sd);
  } else {
    dot(cx - 2, top + 5, eye); dot(cx + 1, top + 5, eye);
    span(top + 4, cx - 3, cx - 2, look.brow || look.hair || eye); span(top + 4, cx + 1, cx + 2, look.brow || look.hair || eye);
    span(top + 7, cx - 1, cx, Sd);
  }
  if (look.beard){ span(top + 7, cx - 3, cx - 2, look.beard); span(top + 7, cx + 1, cx + 2, look.beard); span(top + 8, cx - 3, cx + 2, look.beard); span(top + 6, cx - 1, cx, look.beard); }
  if (look.scar){ dot(cx + 2, ty(2), Sdd); dot(cx + 3, ty(3), Sdd); dot(cx + 4, ty(4), Sdd); }

  return outline(c, '#191317');
}

export const ME = { skin:'#c99c7a', skinD:'#9a6c53', skinH:'#e2bd98', hair:'#2b2024', shorts:'#3f5874', shortsD:'#2f4258', band:'#c8bfae', wraps:'#d8d0c0' };
export const FOE = { skin:'#a8714f', skinD:'#7a4c36', skinH:'#c48d68', skinDD:'#5c3727', stubble:'#6b4a3a', brow:'#2a1d1a', beard:'#3a2a24', heavy:0.8,
  shorts:'#6e2b2b', shortsD:'#4a1b1d', band:'#c9b48a', scar:true,
  gloves:{ c:'#8e3a32', d:'#5f2420', h:'#c0675a', cuff:'#d8cdb8' } };
export const ME_RING = { ...ME, gloves:{ c:'#4f6d8f', d:'#33485f', h:'#86a2bf', cuff:'#d8d0c0' } };

/** マッチョ度（0〜7 の小数）→ 部位の数値。完成形は細身で締まったボクサー体型（太さは控えめ、締まり def を強く） */
export const body = m => { const t = Math.max(0, Math.min(7, m)) / 7; return { s: 2.8 * t, c: 2.0 * t, b: 2.4 * t, a: 2.2 * t, l: 2.2 * t, def: 5 * t }; };

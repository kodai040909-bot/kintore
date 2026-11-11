// 横向きの選手（試合用）。右向きに描き、相手は左右反転して使う
// 体つきはマッチョ度 m（0〜7）。正面の分身と同じく、太さは控えめで締まりを強く
import { mk, px, lerp, outline } from './pixel.js';

const D2R = Math.PI / 180;

/**
 * ポーズ。角度は度（0＝前、90＝下、-90＝上）。front は手前の腕（左手＝リード）、rear は奥の腕
 * lean：上体の前傾（度）、dy：腰を落とす量、legs：'stance' | 'kneel'
 */
export const POSES = {
  // 構え：前の手は顔の前に少し突き出し、奥の手はあごの横（2026-11-11 本人：胸につきすぎ）
  guard:    { lean: 10, dy: 0, front: [40, -72],  rear: [45, -85] },
  jab:      { lean: 14, dy: 0, front: [-4, -2],   rear: [45, -85] },
  straight: { lean: 22, dy: 1, front: [50, -85],  rear: [-8, -5], rearFwd: 3 },
  hook:     { lean: 16, dy: 1, front: [-35, 42],  rear: [45, -85] },
  upper:    { lean: 6,  dy: 2, front: [40, -85],  rear: [45, -88] },
  body:     { lean: 26, dy: 3, front: [30, 20],   rear: [45, -85] },
  weave:    { lean: 34, dy: 4, front: [50, -80],  rear: [55, -90] },
  block:    { lean: 8,  dy: 1, front: [30, -90],  rear: [38, -88], tight: true },
  hit:      { lean: -14, dy: 0, front: [80, 30],  rear: [85, 45], headBack: 2 },
  down:     { lean: 24, dy: 10, front: [95, 85],  rear: [100, 88], legs: 'kneel' },
  win:      { lean: 0,  dy: 0, front: [40, -72],  rear: [-92, -88] },
  // 形の違い（v は variant）。再生では手番ごとに交互に使う
  jab_v:      { lean: 18, dy: 1, front: [-12, -8],  rear: [45, -88] },
  straight_v: { lean: 28, dy: 2, front: [50, -82],  rear: [-2, 2], rearFwd: 4 },
  hook_v:     { lean: 20, dy: 2, front: [-50, 58],  rear: [45, -85] },
  upper_v:    { lean: 2,  dy: 3, front: [55, -95],  rear: [45, -88] },
  body_v:     { lean: 32, dy: 4, front: [40, 10],   rear: [45, -85] },
  weave_v:    { lean: 28, dy: 5, front: [45, -80],  rear: [50, -90] },
  hit_v:      { lean: -20, dy: 1, front: [70, 40],  rear: [95, 60], headBack: 3 },
};

/**
 * 構え方（フォーム）。相手ごとに違う。guard は構えとブロックのときだけ差し替える
 *   crouch：前かがみ／upright：背すじを伸ばす／peekaboo：両手で顔を固める／shell：リードの手を下げる／southpaw：左右逆
 */
export const FORMS = {
  crouch:   { lean: 8, dy: 2 },
  upright:  { lean: -6, guard: { front: [20, -60], rear: [35, -80] } },        // リードの手を長く伸ばす
  peekaboo: { lean: 4, dy: 1, guard: { front: [55, -95], rear: [58, -95] } },  // 両手で顔を固める
  shell:    { guard: { front: [80, 172], rear: [45, -88] } },                   // リードの手を下げる
  southpaw: { swap: true },
};

/** 見た目。選手ごとに変える */
export const LOOKS = {
  me:    { skin: '#c99c7a', skinD: '#9a6c53', skinH: '#e2bd98', hair: '#2b2024', hairStyle: 'short', trunks: '#3f5874', trunksD: '#2f4258', band: '#c8bfae', gloves: '#4f6d8f', glovesD: '#33485f', glovesH: '#86a2bf' },
  1: { form: 'upright', skin: '#e0b48e', skinD: '#b0835f', skinH: '#f0cba8', hair: '#6b4630', hairStyle: 'messy', trunks: '#b8b2a6', trunksD: '#8c867c', band: '#6b6660', gloves: '#9c3b34', glovesD: '#6a2420', glovesH: '#c76a5e' },
  2: { form: 'crouch', skin: '#a8714f', skinD: '#7a4c36', skinH: '#c48d68', hair: null, hairStyle: 'bald', stubble: '#6b4a3a', beard: '#3a2a24', trunks: '#6e2b2b', trunksD: '#4a1b1d', band: '#c9b48a', gloves: '#8e3a32', glovesD: '#5f2420', glovesH: '#c0675a', heavy: 1.2 },
  3: { form: 'upright', skin: '#7a4e36', skinD: '#563424', skinH: '#9a6a4c', hair: '#1a1416', hairStyle: 'rows', trunks: '#c9a440', trunksD: '#93752a', band: '#2a2228', gloves: '#c9a440', glovesD: '#93752a', glovesH: '#e6c873', tall: 2 },
  4: { form: 'peekaboo', skin: '#e6b896', skinD: '#b78766', skinH: '#f3d0b2', hair: '#d8c27a', hairStyle: 'buzz', trunks: '#3d6a46', trunksD: '#2a4b31', band: '#d8d0c0', gloves: '#2f4a7a', glovesD: '#1e3052', glovesH: '#5a78a8', heavy: 1.6 },
  5: { form: 'southpaw', skin: '#c08a62', skinD: '#8e5f42', skinH: '#d8a780', hair: '#1e1a1c', hairStyle: 'slick', trunks: '#5a3d6e', trunksD: '#3e2a4d', band: '#c8bfae', gloves: '#2a2628', glovesD: '#151315', glovesH: '#55505a' },
  6: { form: 'shell', skin: '#9a6648', skinD: '#6e4430', skinH: '#b8825e', hair: '#151213', hairStyle: 'fade', trunks: '#1f1c22', trunksD: '#111013', band: '#c9a440', gloves: '#b88a3a', glovesD: '#7e5c22', glovesH: '#e0b860' },
  7: { form: 'crouch', skin: '#d4a07a', skinD: '#a3714f', skinH: '#ebbf9a', hair: '#2a1e1a', hairStyle: 'short', beard: '#2a1e1a', trunks: '#e6dfd0', trunksD: '#b5ad9c', band: '#c9a440', gloves: '#b0302a', glovesD: '#78201c', glovesH: '#d8605a', tall: 1 },
};

/** 相手の体つき（マッチョ度の換算） */
export const BUILD = { me: null, 1: 1.5, 2: 5, 3: 3.5, 4: 6, 5: 5, 6: 6, 7: 7 };

/**
 * 横向きの選手を描く（64×64、右向き、足元 y=60）
 * @param m マッチョ度（0〜7）
 * @param pose POSES のキー
 * @param look LOOKS の値
 * @param flip true なら左右反転（相手）
 */
export function sideFighter(m, pose = 'guard', look = LOOKS.me, flip = false) {
  const c = mk(64, 64), g = c.getContext('2d');
  const t = Math.max(0, Math.min(7, m)) / 7;
  const P = { ...(POSES[pose] || POSES.guard) };
  const F = FORMS[look.form];
  if (F) {
    if (F.guard && (pose === 'guard' || pose === 'block')) Object.assign(P, F.guard);
    if (P.legs !== 'kneel') { P.lean += F.lean || 0; P.dy = (P.dy || 0) + (F.dy || 0); }
    if (F.swap) [P.front, P.rear] = [P.rear, P.front];
  }
  const S = look.skin, Sd = look.skinD, Sh = look.skinH, heavy = look.heavy || 0, tall = look.tall || 0;
  const dot = (x, y, col) => px(g, x, y, col);
  const fill = (x0, y0, r, col) => { for (let j = -Math.ceil(r); j <= Math.ceil(r); j++) for (let i = -Math.ceil(r); i <= Math.ceil(r); i++) if (i * i + j * j <= r * r + 0.3) dot(x0 + i, y0 + j, col); };
  const thick = (x0, y0, x1, y1, w0, w1, col) => { const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2) + 1; for (let k = 0; k <= n; k++) fill(x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n, lerp(w0, w1, k / n) / 2, col); };
  const dir = a => [Math.cos(a * D2R), Math.sin(a * D2R)];

  // 骨組み
  const hx = 30, hy = 40 - tall + (P.dy || 0);
  const lean = P.lean * D2R, spine = 15 + tall * 0.5;
  const sx = hx + Math.sin(lean) * spine, sy = hy - Math.cos(lean) * spine;
  const thigh = 4.4 + t * 1.3 + heavy * 0.6, shin = 3.2 + t * 0.8 + heavy * 0.3;
  const ua = 3.3 + t * 1.5 + heavy * 0.4, fa = 2.9 + t * 0.9 + heavy * 0.2, glove = 2.7 + t * 0.35;
  const waist = 7.5 + t * 1.2 + heavy * 1.5, chest = 8.5 + t * 3.2 + heavy * 1.2;
  const uLen = 7.5 + tall * 0.4, fLen = 7 + tall * 0.4;

  // 脚
  const legs = (front, col, shade) => {
    let knee, foot;
    if (P.legs === 'kneel') {
      foot = front ? [hx + 7, 60] : [hx - 9, 60];
      knee = front ? [hx + 7, 50] : [hx - 2, 59];
    } else {
      foot = front ? [hx + 8, 60] : [hx - 8, 60];
      const mx = (hx + foot[0]) / 2, my = (hy + foot[1]) / 2;
      knee = [mx + 1.5 + (P.dy || 0) * 0.5, my];
    }
    thick(hx + (front ? 1 : -1), hy, knee[0], knee[1], thigh, shin + 0.6, col);
    thick(knee[0], knee[1], foot[0], foot[1] - 1, shin + 0.4, shin - 0.6, col);
    for (let k = 0; k < 4; k++) { dot(foot[0] - 1 + k, 60, '#2b2329'); dot(foot[0] - 1 + k, 59, '#2b2329'); }   // 靴
    dot(foot[0] + 3, 60, '#2b2329');
    if (shade) thick(knee[0] + 1, knee[1], foot[0] + 1, foot[1] - 2, 1, 1, Sd);
  };

  // 腕（肩→ひじ→グローブ）
  const arm = (rear, col) => {
    const ang = rear ? P.rear : P.front;
    const ox = rear ? -1.5 + (P.rearFwd || 0) : 1.5;
    const shx = sx + ox, shy = sy + 1.5;
    const [ux, uy] = dir(ang[0]), [fx, fy] = dir(ang[1]);
    const ex = shx + ux * uLen, ey = shy + uy * uLen;
    const gx = ex + fx * fLen, gy = ey + fy * fLen;
    thick(shx, shy, ex, ey, ua + 0.6, ua * 0.85, col);
    thick(ex, ey, gx, gy, fa, fa + 0.4, col);
    if (!rear) {
      // 力こぶ（二の腕の上側のふくらみ）と、下側の影
      const mx = (shx + ex) / 2, my = (shy + ey) / 2, nx = -uy, ny = ux;   // 二の腕に直角
      if (t > 0.25) fill(mx - nx * ua * 0.35, my - ny * ua * 0.35, ua * 0.42, S);
      dot(Math.round(mx + nx * ua * 0.45), Math.round(my + ny * ua * 0.45), Sd);
      dot(Math.round(mx - nx * ua * 0.55), Math.round(my - ny * ua * 0.55), Sh);
    }
    // グローブ
    const gc = rear ? look.glovesD : look.gloves;
    fill(gx + fx * 1.2, gy + fy * 1.2, glove, gc);
    if (!rear) { dot(Math.round(gx + fx * 1.2 - 1), Math.round(gy + fy * 1.2 - 1), look.glovesH); fill(gx - fx * 0.6, gy - fy * 0.6, 1.2, '#d8d0c0'); }
  };

  // 奥の脚・奥の腕（暗め）
  legs(false, Sd, false);
  arm(true, Sd);

  // 胴：腰から肩へ。胸は前に張り出し、背中は後ろへ
  for (let y = Math.floor(sy) - 1; y <= hy + 2; y++) {
    const k = Math.max(0, Math.min(1, (hy - y) / (hy - sy)));
    const cxk = lerp(hx, sx, k);
    const w = lerp(waist, chest, Math.pow(k, 0.8));
    const back = w * 0.46 + (k > 0.45 && k < 0.85 ? t * 1.2 : 0);     // 背中の広がり
    const front = w * 0.54 + (k > 0.62 && k < 0.92 ? t * 1.4 : 0);    // 胸板
    const a = Math.round(cxk - back), b = Math.round(cxk + front);
    for (let x = a; x <= b; x++) dot(x, y, S);
    dot(a, y, Sd);
    if (k > 0.55 && k < 0.95) dot(a + 1, y, Sh);
    // 胸の下のふちと腹筋
    if (t > 0.15 && Math.abs(k - 0.6) < 0.04) { dot(b, y, Sd); dot(b - 1, y, Sd); }
    if (t > 0.35 && k < 0.55 && k > 0.12 && y % 3 === 0) dot(b - 1, y, Sd);
  }

  // 首と頭（横顔）
  const hcx = sx + 1.5 - (P.headBack || 0), hcy = sy - 6;
  thick(sx, sy, hcx, hcy + 3, 3.6 + t * 1.6 + heavy * 0.5, 3.4 + t * 0.8, S);
  for (let j = -4; j <= 4; j++) for (let i = -3; i <= 3; i++) if ((i * i) / 12.5 + (j * j) / 18 <= 1) dot(hcx + i, hcy + j, S);
  dot(hcx + 4, hcy, S); dot(hcx + 4, hcy + 1, Sd);                  // 鼻
  dot(hcx + 3, hcy + 3, S); dot(hcx + 2, hcy + 4, S);                // あご
  dot(hcx + 2, hcy - 1, '#1e1820');                                   // 目
  dot(hcx + 2, hcy - 2, look.hair || Sd);                             // まゆ
  dot(hcx - 1, hcy, Sd); dot(hcx - 1, hcy + 1, Sd);                   // 耳
  dot(hcx + 2, hcy + 2, Sd);                                          // 口
  const hair = look.hair;
  if (look.hairStyle !== 'bald' && hair) {
    for (let i = -3; i <= 3; i++) { dot(hcx + i, hcy - 4, hair); dot(hcx + i, hcy - 3, hair); }
    for (let j = -3; j <= 1; j++) { dot(hcx - 3, hcy + j, hair); if (j < 0) dot(hcx - 2, hcy + j, hair); }
    if (look.hairStyle === 'messy') { dot(hcx - 2, hcy - 5, hair); dot(hcx + 1, hcy - 5, hair); dot(hcx + 3, hcy - 3, hair); dot(hcx - 4, hcy - 2, hair); }
    if (look.hairStyle === 'slick') { for (let i = -3; i <= 2; i++) dot(hcx + i, hcy - 5, hair); dot(hcx - 4, hcy - 1, hair); dot(hcx - 4, hcy, hair); }
    if (look.hairStyle === 'rows') { for (let i = -3; i <= 3; i += 2) dot(hcx + i, hcy - 4, look.skinD); }
    if (look.hairStyle === 'fade') { for (let j = -1; j <= 1; j++) dot(hcx - 3, hcy + j, Sd); }
    if (look.hairStyle === 'buzz') { for (let i = -3; i <= 3; i += 2) dot(hcx + i, hcy - 4, look.skinH); }
  }
  if (look.stubble) for (let i = -3; i <= 2; i++) if ((i + 7) % 2) dot(hcx + i, hcy - 4, look.stubble);
  if (look.beard) { dot(hcx + 1, hcy + 3, look.beard); dot(hcx + 2, hcy + 3, look.beard); dot(hcx, hcy + 3, look.beard); dot(hcx + 3, hcy + 2, look.beard); dot(hcx + 1, hcy + 4, look.beard); }

  // 手前の脚、トランクス、手前の腕
  legs(true, S, true);
  for (let y = hy - 3; y <= hy + 4; y++) {
    const w = waist / 2 + 1 + (y > hy ? (y - hy) * 0.5 : 0);
    for (let x = Math.round(hx - w); x <= Math.round(hx + w + 1); x++) dot(x, y, y <= hy - 2 ? look.band : look.trunks);
    dot(Math.round(hx - w), y, y <= hy - 2 ? look.band : look.trunksD);
  }
  arm(false, S);

  let out = outline(c, '#191317');
  if (flip) { const f = mk(64, 64), fg = f.getContext('2d'); fg.translate(64, 0); fg.scale(-1, 1); fg.drawImage(out, 0, 0); out = f; }
  return out;
}

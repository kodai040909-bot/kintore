// 服の色。着ているもの → 正面の分身（ジム）と横向きの選手（リング）の見た目
import { ME } from './fighter.js';
import { LOOKS } from './side.js';

export const TRUNKS = {
  blue:  { c: '#3f5874', d: '#2f4258', band: '#c8bfae' },
  red:   { c: '#8e2f2a', d: '#621f1c', band: '#e6dccb' },
  black: { c: '#24212a', d: '#141217', band: '#c9a440' },
  white: { c: '#e6dfd0', d: '#b5ad9c', band: '#c9a440' },
};
export const GLOVES = {
  blue:  { c: '#4f6d8f', d: '#33485f', h: '#86a2bf' },
  red:   { c: '#a8342c', d: '#6e201c', h: '#d8605a' },
  black: { c: '#2a2628', d: '#151315', h: '#5a5560' },
  gold:  { c: '#c9a440', d: '#8e7228', h: '#ecd27e' },
};
export const WRAPS = { white: '#d8d0c0', black: '#3a3438', red: '#a8342c' };

/** 正面の分身（ジム）の見た目 */
export function frontLook(w) {
  const t = TRUNKS[w.trunks] || TRUNKS.blue;
  return { ...ME, shorts: t.c, shortsD: t.d, band: t.band, wraps: WRAPS[w.wraps] || WRAPS.white };
}

/** 横向きの選手（リング）の見た目 */
export function sideLook(w) {
  const t = TRUNKS[w.trunks] || TRUNKS.blue, g = GLOVES[w.gloves] || GLOVES.blue;
  return { ...LOOKS.me, trunks: t.c, trunksD: t.d, band: t.band, gloves: g.c, glovesD: g.d, glovesH: g.h };
}

/** 店の見本の色 */
export function swatch(it) {
  if (it.slot === 'trunks') return TRUNKS[it.color].c;
  if (it.slot === 'gloves') return GLOVES[it.color].c;
  if (it.slot === 'wraps') return WRAPS[it.color];
  return null;
}

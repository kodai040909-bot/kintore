// ドット絵の共通道具（試作 prototype/index.html から移植）
export const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
export function rng(s){ return () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export const B = [[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]];
export const lerp = (a, b, t) => a + (b - a) * t;
export function rect(g, x, y, w, h, col){ g.fillStyle = col; g.fillRect(x, y, w, h); }
export function px(g, x, y, col){ g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), 1, 1); }
export function outline(src, col){
  const w = src.width, h = src.height, d = src.getContext('2d').getImageData(0, 0, w, h).data;
  const o = mk(w, h), g = o.getContext('2d'); g.fillStyle = col;
  const on = (i, j) => i >= 0 && j >= 0 && i < w && j < h && d[(j * w + i) * 4 + 3] > 128;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++)
    if (!on(i, j) && (on(i-1, j) || on(i+1, j) || on(i, j-1) || on(i, j+1))) g.fillRect(i, j, 1, 1);
  g.drawImage(src, 0, 0); return o;
}

/** 楕円の影 */
export function shadow(g, x, y, w){ for (let i = -w; i <= w; i++) for (let j = -1; j <= 1; j++) if ((i*i)/(w*w) + j*j <= 1) px(g, x + i, y + j, 'rgba(20,14,18,.45)'); }

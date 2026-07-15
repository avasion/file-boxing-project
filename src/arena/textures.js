// textures.js — every texture in the gym is painted on a low-res canvas and
// sampled with NearestFilter so it reads as chunky pixels, matching the renders.

import * as THREE from 'three';

function pixelTexture(canvas) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;              // chunky pixels up close
  tex.minFilter = THREE.LinearMipmapLinearFilter;   // no shimmer at a distance
  tex.generateMipmaps = true;
  tex.anisotropy = 8;                               // stays sharp at oblique angles
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

function grunge(ctx, w, h, color, density = 0.05, alpha = 0.25) {
  ctx.fillStyle = color;
  for (let i = 0; i < w * h * density; i++) {
    ctx.globalAlpha = Math.random() * alpha;
    ctx.fillRect((Math.random() * w) | 0, (Math.random() * h) | 0, 1, 1);
  }
  ctx.globalAlpha = 1;
}

/* ---------------------------------------------------------------- *
 *  RING CANVAS — plain teal mat, scuffed and distressed             *
 * ---------------------------------------------------------------- */
export function ringCanvasTexture() {
  const S = 220;
  const c = makeCanvas(S, S);
  const ctx = c.getContext('2d');

  // teal base with mottling
  ctx.fillStyle = '#177582';
  ctx.fillRect(0, 0, S, S);
  grunge(ctx, S, S, '#0e5561', 0.12, 0.35);
  grunge(ctx, S, S, '#2a97a4', 0.10, 0.30);
  // scuffs
  grunge(ctx, S, S, '#e8e2cf', 0.008, 0.18);

  // plain distressed mat — center wear ring where the fighters work
  for (let i = 0; i < 900; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 20 + Math.random() * 55;
    ctx.globalAlpha = Math.random() * 0.22;
    ctx.fillStyle = Math.random() < 0.5 ? '#0e5561' : '#c9c2ae';
    ctx.fillRect((S / 2 + Math.cos(a) * r) | 0, (S / 2 + Math.sin(a) * r) | 0, 2, 1);
  }
  ctx.globalAlpha = 1;

  return pixelTexture(c);
}

/* ---------------------------------------------------------------- *
 *  MURAL — sepia pixel painting of two boxers, hangs over tunnel    *
 * ---------------------------------------------------------------- */
export function muralTexture() {
  const W = 176, H = 72;
  const c = makeCanvas(W, H);
  const ctx = c.getContext('2d');

  // smoky sepia backdrop
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#4a3a26');
  grad.addColorStop(0.55, '#6b5334');
  grad.addColorStop(1, '#2e2416');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  grunge(ctx, W, H, '#8a6b40', 0.15, 0.4);
  grunge(ctx, W, H, '#1d1710', 0.15, 0.4);
  // hot flash top-right like the render
  ctx.fillStyle = 'rgba(255,214,140,0.55)';
  ctx.fillRect(W - 26, 0, 26, 14);
  ctx.fillStyle = 'rgba(255,240,200,0.5)';
  ctx.fillRect(W - 14, 0, 14, 8);

  const px = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); };

  // LEFT BOXER — dark skin, red trunks, throwing a cross to the right
  const skinL = '#5b3320', skinLd = '#432415';
  px(38, 14, 16, 14, skinL);                 // head, tucked
  px(40, 18, 12, 4, skinLd);                 // brow shadow
  px(34, 26, 26, 20, '#7a2318');             // torso in red
  px(30, 30, 8, 8, skinL);                   // rear shoulder
  px(54, 22, 26, 7, skinL);                  // extended arm
  px(78, 20, 12, 10, '#e8e2cf');             // white glove connecting
  px(30, 44, 22, 12, '#8a2a1c');             // trunks
  px(36, 46, 12, 3, '#d9cfae');              // waistband
  px(28, 54, 8, 16, skinL);                  // rear leg
  px(46, 54, 8, 14, skinLd);                 // lead leg
  px(26, 68, 12, 4, '#20180f');              // boots
  px(44, 66, 12, 4, '#20180f');

  // RIGHT BOXER — lighter skin, white trunks, rocked back by the punch
  const skinR = '#a4713f', skinRd = '#7c5027';
  px(104, 10, 15, 14, skinR);                // head snapping back
  px(106, 12, 10, 4, '#c98f54');             // highlight
  px(100, 24, 24, 20, '#8a4a20');            // torso, warm tone
  px(120, 24, 10, 18, skinRd);               // far arm dropping
  px(92, 30, 10, 12, skinR);                 // near arm buckled
  px(88, 34, 10, 9, '#b5473f');              // his red glove low
  px(100, 44, 22, 14, '#ddd4bc');            // white trunks
  px(104, 46, 12, 3, '#8a4a20');
  px(98, 58, 8, 12, skinR);
  px(114, 56, 8, 14, skinRd);
  px(96, 68, 12, 4, '#1d150d');
  px(112, 68, 12, 4, '#1d150d');

  // motion streak of the punch
  ctx.fillStyle = 'rgba(255,235,190,0.35)';
  ctx.fillRect(58, 22, 34, 3);

  // final film grain
  grunge(ctx, W, H, '#000', 0.1, 0.35);
  grunge(ctx, W, H, '#caa36a', 0.08, 0.3);

  return pixelTexture(c);
}

/* ---------------------------------------------------------------- *
 *  FIGHT POSTERS — little yellow/red cards on the brick             *
 * ---------------------------------------------------------------- */
export function posterTexture(seed = 0) {
  const W = 24, H = 32;
  const c = makeCanvas(W, H);
  const ctx = c.getContext('2d');
  const bgs = ['#d9b23a', '#e8e2cf', '#b5473f'];
  ctx.fillStyle = bgs[seed % bgs.length];
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#8a2a1c';
  ctx.fillRect(2, 2, W - 4, 6); // headline bar
  // two tiny fighters
  ctx.fillStyle = '#2a2118';
  ctx.fillRect(4, 12, 6, 12);
  ctx.fillRect(14, 12, 6, 12);
  ctx.fillStyle = '#b5473f';
  ctx.fillRect(3, 26, W - 6, 3);
  grunge(ctx, W, H, '#000', 0.06, 0.3);
  return pixelTexture(c);
}

/* Speckled concrete for the gym floor. */
export function concreteTexture() {
  const S = 128;
  const c = makeCanvas(S, S);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#7d7869';
  ctx.fillRect(0, 0, S, S);
  grunge(ctx, S, S, '#95907f', 0.35, 0.5);
  grunge(ctx, S, S, '#5e594d', 0.30, 0.5);
  grunge(ctx, S, S, '#3f3b32', 0.06, 0.5);
  const tex = pixelTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(10, 7);
  return tex;
}

/* ---------------------------------------------------------------- *
 *  FIGHTER POSTERS — one per contender, painted from their palette  *
 *  Guard-stance pixel portrait on a distressed fight-card layout.   *
 *  Drawn on an integer grid at 96x128 so nothing smears.            *
 * ---------------------------------------------------------------- */
export function fighterPosterTexture(c) {
  const W = 96, H = 128;
  const cv = makeCanvas(W, H);
  const ctx = cv.getContext('2d');
  const px = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(x | 0, y | 0, w | 0, h | 0); };
  const dark = (hex, k) => {
    const n = parseInt(hex.slice(1), 16);
    const f = (v) => Math.max(0, Math.min(255, (v * k) | 0));
    return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
  };

  // flat coarse backdrop — no per-pixel grunge, nothing smaller than the
  // 4px unit grid, so there is no sub-texel detail left to alias
  px(0, 0, W, H, dark(c.trunks, 0.55));
  px(0, H / 2, W, H / 2, dark(c.trunks, 0.45));
  // axis-aligned glow band behind the figure (replaces the diagonal cone)
  ctx.fillStyle = 'rgba(255,230,180,0.10)';
  ctx.fillRect(W / 2 - 22, 14, 44, H - 40);
  ctx.fillRect(W / 2 - 14, 14, 28, H - 40);

  // headline + footer bars
  px(4, 4, W - 8, 10, '#e8e2cf');
  px(8, 7, W - 16, 4, dark(c.gloves, 0.85));
  px(0, H - 22, W, 22, '#14120e');
  px(0, H - 22, W, 2, c.gloves);

  /* — the fighter, front guard stance (unit = 4px) — */
  const u = 4, cx = W / 2;
  const skin = c.skin, top = c.top ?? c.skin;
  // legs + boots
  px(cx - 3 * u, 82, 2 * u, 4 * u, c.trunksLong ? (c.socks ?? skin) : skin);
  px(cx + u, 82, 2 * u, 4 * u, c.trunksLong ? (c.socks ?? skin) : skin);
  px(cx - 3.5 * u, 96, 3 * u, 1.5 * u, c.boots);
  px(cx + 0.5 * u, 96, 3 * u, 1.5 * u, c.boots);
  // trunks
  px(cx - 3.5 * u, 70, 7 * u, 3 * u, c.trunks);
  px(cx - 2.5 * u, 70, 5 * u, u / 2, '#e8e2cf');
  // torso
  px(cx - 3.5 * u, 46, 7 * u, 6 * u, top);
  if (c.top && c.tankStraps !== false) px(cx - 2.5 * u, 46, 5 * u, u, skin);
  // arms tucked, gloves up at the cheeks
  px(cx - 5 * u, 50, 1.5 * u, 4 * u, c.sleeves ?? skin);
  px(cx + 3.5 * u, 50, 1.5 * u, 4 * u, c.sleeves ?? skin);
  px(cx - 6.5 * u, 34, 3 * u, 3 * u, c.gloves);
  px(cx + 3.5 * u, 34, 3 * u, 3 * u, c.gloves);
  px(cx - 6.5 * u, 33, 3 * u, u / 2, dark(c.gloves, 1.3)); // glove highlight
  px(cx + 3.5 * u, 33, 3 * u, u / 2, dark(c.gloves, 1.3));
  // head
  const headCol = c.mask ?? skin;
  px(cx - 2 * u, 24, 4 * u, 4.5 * u, headCol);
  if (c.hair) px(cx - 2.5 * u, 20, 5 * u, 1.5 * u, c.hair);
  if (c.beard) px(cx - 1.5 * u, 38, 3 * u, 1.5 * u, c.beard);
  // eyes: dark on light faces/masks, light on dark
  const n = parseInt((c.mask ?? skin).slice(1), 16);
  const lum = 0.3 * (n >> 16) + 0.6 * ((n >> 8) & 255) + 0.1 * (n & 255);
  const eye = lum > 128 ? '#14120e' : '#f4efe2';
  px(cx - 1.5 * u, 31, u, u, eye);
  px(cx + 0.5 * u, 31, u, u, eye);

  // name plate — drawn big enough to survive Nearest magnification
  ctx.fillStyle = '#e8e2cf';
  ctx.font = 'bold 15px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(c.name.toUpperCase(), W / 2, H - 11);

  // wear: torn corner + a few coarse scuff blocks on the unit grid
  px(W - 8, 0, 8, 5, dark(c.trunks, 0.3));
  px(0, H - 30, 4, 8, dark(c.trunks, 0.35));
  px(W - 4, 48, 4, 12, dark(c.trunks, 0.7));
  px(8, 16, 4, 4, dark(c.trunks, 0.7));

  return pixelTexture(cv);
}

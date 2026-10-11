'use strict';
/* 필터 매니저 데모
 * 엔진 구조: 색 보정 파라미터 전부 → 33x33x33 3D LUT로 1회 굽기 → 픽셀마다 사면체(tetrahedral) 보간 조회.
 * 그레인/비네팅만 위치 의존이라 LUT 밖에서 처리. WebGL/GPU 사용 안 함 (순수 CPU 루프). */

const $ = (s) => document.querySelector(s);
const N = 33, N2 = N * N;
const BANDS = [
  ['red', '빨강', 0, '#e5484d'], ['orange', '주황', 30, '#f08c2e'], ['yellow', '노랑', 60, '#e8cf3a'],
  ['green', '초록', 120, '#46a758'], ['aqua', '아쿠아', 180, '#2ec4c4'], ['blue', '파랑', 240, '#3e7bfa'],
  ['purple', '자주', 270, '#8e4ec6'], ['magenta', '마젠타', 300, '#d6409f'],
];
const BAND_C = [0, 30, 60, 120, 180, 240, 270, 300, 360];
const BASIC = [
  ['톤 Tone'],
  ['exposure', '노출', 'Exposure', -5, 5, 0.05],
  ['contrast', '대비', 'Contrast', -100, 100, 1],
  ['highlights', '하이라이트', 'Highlights', -100, 100, 1],
  ['shadows', '섀도', 'Shadows', -100, 100, 1],
  ['whites', '흰색 계열', 'Whites', -100, 100, 1],
  ['blacks', '검정 계열', 'Blacks', -100, 100, 1],
  ['화이트 밸런스 WB'],
  ['temperature', '색온도', 'Temp', -100, 100, 1, 'linear-gradient(90deg,#3d7bd9,#9a9a9a,#e3b23c)'],
  ['tint', '색조', 'Tint', -100, 100, 1, 'linear-gradient(90deg,#3fae55,#9a9a9a,#c94fb5)'],
  ['외관 Presence'],
  ['vibrance', '생동감', 'Vibrance', -100, 100, 1, 'linear-gradient(90deg,#777,#d9534f,#e3b23c,#4caf50,#3d7bd9)'],
  ['saturation', '채도', 'Saturation', -100, 100, 1, 'linear-gradient(90deg,#777,#d9534f,#e3b23c,#4caf50,#3d7bd9)'],
];
const FX = [
  ['grainAmount', '그레인 양', 'Grain', 0, 100, 1],
  ['grainSize', '그레인 크기', 'Size', 0, 100, 1],
  ['vignette', '비네팅', 'Vignette', -100, 100, 1, 'linear-gradient(90deg,#000,#777,#fff)'],
];
const CH_COLOR = { rgb: '#e8e8ec', r: '#ff6464', g: '#5fd47a', b: '#6aa2ff' };
const LS_KEY = 'pf.presets.v1';

/* ---------- 파라미터 / 프리셋 ---------- */
const zero8 = () => Object.fromEntries(BANDS.map(b => [b[0], 0]));
const ID_CURVE = () => [[0, 0], [255, 255]];
function defaultParams() {
  return {
    basic: { exposure: 0, contrast: 0, highlights: 0, shadows: 0, whites: 0, blacks: 0, temperature: 0, tint: 0, vibrance: 0, saturation: 0 },
    curve: { rgb: ID_CURVE(), r: ID_CURVE(), g: ID_CURVE(), b: ID_CURVE() },
    hsl: { hue: zero8(), saturation: zero8(), luminance: zero8() },
    effects: { grainAmount: 0, grainSize: 25, vignette: 0 },
  };
}
function makePreset(id, name, p) {
  const params = defaultParams();
  Object.assign(params.basic, p.basic);
  Object.assign(params.curve, p.curve);
  for (const k of ['hue', 'saturation', 'luminance']) Object.assign(params.hsl[k], p.hsl && p.hsl[k]);
  Object.assign(params.effects, p.effects);
  const now = new Date().toISOString();
  return { id, name, version: 1, params, lut: { file: null, intensity: 100 }, createdAt: now, updatedAt: now };
}
function defaultPresets() {
  return [
    makePreset('P-0001', '맑은 피부', {
      basic: { exposure: 0.25, contrast: -6, highlights: -22, shadows: 28, whites: 8, blacks: -4, temperature: 6, tint: 5, vibrance: 18, saturation: -4 },
      curve: { rgb: [[0, 6], [64, 68], [192, 200], [255, 255]] },
      hsl: { hue: { orange: -4 }, saturation: { orange: -10, red: -6 }, luminance: { orange: 14, red: 6 } },
    }),
    makePreset('P-0002', '필름 웜', {
      basic: { exposure: 0.1, contrast: 14, highlights: -32, shadows: 16, temperature: 22, tint: 6, vibrance: 8, saturation: -8 },
      curve: { rgb: [[0, 22], [70, 66], [190, 200], [255, 246]], r: [[0, 0], [128, 136], [255, 255]], b: [[0, 20], [128, 120], [255, 236]] },
      hsl: { hue: { green: -30, blue: -10 }, saturation: { green: -22, orange: 6 }, luminance: { green: -8 } },
      effects: { grainAmount: 26, grainSize: 30, vignette: -18 },
    }),
    makePreset('P-0003', '쿨 모노톤', {
      basic: { contrast: 24, highlights: -10, shadows: 10, whites: 12, blacks: -14, saturation: -100 },
      curve: { r: [[0, 0], [128, 118], [255, 248]], b: [[0, 14], [128, 142], [255, 255]] },
      effects: { grainAmount: 18, grainSize: 20, vignette: -14 },
    }),
    makePreset('P-0004', '빈티지 페이드', {
      basic: { contrast: -14, highlights: -26, shadows: 22, temperature: 12, tint: -6, vibrance: -16, saturation: -10 },
      curve: { rgb: [[0, 42], [62, 72], [190, 194], [255, 230]], g: [[0, 10], [128, 130], [255, 246]], b: [[0, 36], [128, 122], [255, 214]] },
      hsl: { hue: { aqua: 15, red: 8 }, saturation: { blue: -25, aqua: -10 } },
      effects: { grainAmount: 34, grainSize: 45, vignette: -26 },
    }),
  ];
}

const S = {
  img: null, out: null, thumbSrc: null,
  params: defaultParams(), lut: { file: null, intensity: 100 },
  presets: [], activeId: null, luts: {},
  mode: 'split', split: 0.5, curveCh: 'rgb', hslTab: 'hue',
  lut3d: null, bakeMs: 0, applyMs: 0, hist: null,
};
const clone = (o) => JSON.parse(JSON.stringify(o));

/* ---------- 색 수학 ---------- */
const cl = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const s2l = (v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
const l2s = (v) => (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);

// 단조 3차 보간(Fritsch–Carlson): 점 사이에서 오버슈트가 없어 라이트룸 커브처럼 동작
function curveTable(pts, n = 1024) {
  const p = pts.slice().sort((a, b) => a[0] - b[0]);
  const xs = p.map(q => q[0] / 255), ys = p.map(q => q[1] / 255), k = xs.length;
  const t = new Float32Array(n);
  const d = [], m = new Array(k);
  for (let i = 0; i < k - 1; i++) d[i] = (ys[i + 1] - ys[i]) / Math.max(xs[i + 1] - xs[i], 1e-6);
  m[0] = d[0]; m[k - 1] = d[k - 2];
  for (let i = 1; i < k - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < k - 1; i++) {
    if (d[i] === 0) { m[i] = m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
    if (s > 9) { const tau = 3 / Math.sqrt(s); m[i] = tau * a * d[i]; m[i + 1] = tau * b * d[i]; }
  }
  let seg = 0;
  for (let j = 0; j < n; j++) {
    const x = j / (n - 1);
    let y;
    if (x <= xs[0]) y = ys[0];
    else if (x >= xs[k - 1]) y = ys[k - 1];
    else {
      while (seg < k - 2 && x > xs[seg + 1]) seg++;
      const h = xs[seg + 1] - xs[seg], u = (x - xs[seg]) / h, u2 = u * u, u3 = u2 * u;
      y = (2 * u3 - 3 * u2 + 1) * ys[seg] + (u3 - 2 * u2 + u) * h * m[seg] + (-2 * u3 + 3 * u2) * ys[seg + 1] + (u3 - u2) * h * m[seg + 1];
    }
    t[j] = cl(y);
  }
  return t;
}

function tone(x, c, hl, sh, wh, bl) {
  x = cl(x);
  x += hl * 0.32 * x * x * (1 - x) * 6.75;          // 하이라이트: 밝은 영역(2/3 부근 최대)
  x += sh * 0.32 * x * (1 - x) * (1 - x) * 6.75;    // 섀도: 어두운 영역(1/3 부근 최대)
  x += wh * 0.18 * x * x * x;                       // 흰색 계열: 화이트 포인트
  x += bl * 0.18 * (1 - x) * (1 - x) * (1 - x);     // 검정 계열: 블랙 포인트
  x = cl(x);
  const s = x < 0.5 ? 2 * x * x : 1 - 2 * (1 - x) * (1 - x); // 대비: S-커브 쪽으로 블렌드
  return cl(x + c * (s - x));
}

let _r = 0, _g = 0, _b = 0;
function hueOf(r, g, b, mx, ch) {
  let h = mx === r ? ((g - b) / ch) % 6 : mx === g ? (b - r) / ch + 2 : (r - g) / ch + 4;
  h *= 60; return h < 0 ? h + 360 : h;
}
function hsv2rgb(h, s, v) {
  h = ((h % 360) + 360) % 360 / 60;
  const i = Math.floor(h), f = h - i, p = v * (1 - s), q = v * (1 - s * f), t = v * (1 - s * (1 - f));
  switch (i) {
    case 0: _r = v; _g = t; _b = p; break; case 1: _r = q; _g = v; _b = p; break;
    case 2: _r = p; _g = v; _b = t; break; case 3: _r = p; _g = q; _b = v; break;
    case 4: _r = t; _g = p; _b = v; break; default: _r = v; _g = p; _b = q;
  }
}
// 8개 색 밴드: 인접 중심 사이를 smoothstep으로 나눠 가중치 합 = 1 (색조 경계에 띠가 생기지 않음)
function hslAdjust(r, g, b, H, Sa, L) {
  _r = r; _g = g; _b = b;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), ch = mx - mn;
  if (ch < 1e-4) return;
  const h = hueOf(r, g, b, mx, ch);
  let i = 0; while (h >= BAND_C[i + 1]) i++;
  let t = (h - BAND_C[i]) / (BAND_C[i + 1] - BAND_C[i]); t = t * t * (3 - 2 * t);
  const i1 = (i + 1) % 8, w0 = 1 - t, k = Math.min(1, ch * 3); // 무채색에 가까울수록 영향 감소
  const dh = (w0 * H[i] + t * H[i1]) * 0.3 * k;            // ±100 → ±30°
  const ds = (w0 * Sa[i] + t * Sa[i1]) / 100 * k;
  const dl = (w0 * L[i] + t * L[i1]) / 100 * k;
  hsv2rgb(h + dh, cl((ch / mx) * (1 + ds)), mx);
  if (dl) { const f = 1 + dl * 0.5; _r = cl(_r * f); _g = cl(_g * f); _b = cl(_b * f); }
}

function sampleCube(L, r, g, b) {
  const n = L.size, d = L.data, m = n - 1;
  const x = r * m, y = g * m, z = b * m;
  const x0 = Math.min(x | 0, m - 1), y0 = Math.min(y | 0, m - 1), z0 = Math.min(z | 0, m - 1);
  const fx = x - x0, fy = y - y0, fz = z - z0;
  const o = (x0 + y0 * n + z0 * n * n) * 3, sx = 3, sy = n * 3, sz = n * n * 3;
  const res = [0, 0, 0];
  for (let c = 0; c < 3; c++) {
    const a00 = d[o + c] + (d[o + sx + c] - d[o + c]) * fx;
    const a10 = d[o + sy + c] + (d[o + sy + sx + c] - d[o + sy + c]) * fx;
    const a01 = d[o + sz + c] + (d[o + sz + sx + c] - d[o + sz + c]) * fx;
    const a11 = d[o + sz + sy + c] + (d[o + sz + sy + sx + c] - d[o + sz + sy + c]) * fx;
    const a0 = a00 + (a10 - a00) * fy, a1 = a01 + (a11 - a01) * fy;
    res[c] = a0 + (a1 - a0) * fz;
  }
  return res;
}

// 핵심: 모든 색 보정을 33³ 격자점에 대해 한 번만 계산 → 3D LUT
function bake(P, ext, extMix) {
  const B = P.basic, out = new Float32Array(N * N2 * 3);
  const t = B.temperature / 100, ti = B.tint / 100;
  let gr = Math.pow(2, 0.35 * t), gg = Math.pow(2, -0.25 * ti), gb = Math.pow(2, -0.35 * t);
  const nrm = 0.2126 * gr + 0.7152 * gg + 0.0722 * gb; gr /= nrm; gg /= nrm; gb /= nrm; // 밝기 유지
  const ex = Math.pow(2, B.exposure);
  const c = B.contrast / 100 * 0.75, hl = B.highlights / 100, sh = B.shadows / 100, wh = B.whites / 100, bl = B.blacks / 100;
  const vib = B.vibrance / 100, sat = B.saturation / 100;
  const H = BANDS.map(b => P.hsl.hue[b[0]]), Sa = BANDS.map(b => P.hsl.saturation[b[0]]), L = BANDS.map(b => P.hsl.luminance[b[0]]);
  const hslOn = H.concat(Sa, L).some(v => v);
  const cv = { a: curveTable(P.curve.rgb), r: curveTable(P.curve.r), g: curveTable(P.curve.g), b: curveTable(P.curve.b) };
  const CT = 1023, useExt = ext && extMix > 0;
  let o = 0;
  for (let bi = 0; bi < N; bi++) for (let gi = 0; gi < N; gi++) for (let ri = 0; ri < N; ri++) {
    // 1) 선형광 공간: 화이트밸런스(채널 게인) + 노출(2^EV)
    let r = s2l(ri / (N - 1)) * gr * ex, g = s2l(gi / (N - 1)) * gg * ex, b = s2l(bi / (N - 1)) * gb * ex;
    // 2) 감마 공간: 톤(하이라이트/섀도/흰색/검정/대비)
    r = tone(l2s(Math.min(r, 1)), c, hl, sh, wh, bl);
    g = tone(l2s(Math.min(g, 1)), c, hl, sh, wh, bl);
    b = tone(l2s(Math.min(b, 1)), c, hl, sh, wh, bl);
    // 3) 생동감(저채도·비피부톤 위주) / 채도
    if (vib || sat) {
      const Y = 0.2126 * r + 0.7152 * g + 0.0722 * b, mx = Math.max(r, g, b), ch = mx - Math.min(r, g, b);
      let f = 1 + sat;
      if (vib && ch > 1e-4) {
        const h = hueOf(r, g, b, mx, ch), skin = Math.max(0, 1 - Math.abs(h - 30) / 30);
        f *= 1 + vib * (1 - ch) * (vib > 0 ? 1 - 0.6 * skin : 1);
      }
      r = cl(Y + (r - Y) * f); g = cl(Y + (g - Y) * f); b = cl(Y + (b - Y) * f);
    }
    // 4) HSL 8밴드
    if (hslOn) { hslAdjust(r, g, b, H, Sa, L); r = _r; g = _g; b = _b; }
    // 5) 톤 커브: RGB 마스터 → 채널별
    r = cv.r[(cv.a[(r * CT + 0.5) | 0] * CT + 0.5) | 0];
    g = cv.g[(cv.a[(g * CT + 0.5) | 0] * CT + 0.5) | 0];
    b = cv.b[(cv.a[(b * CT + 0.5) | 0] * CT + 0.5) | 0];
    // 6) 외부 .cube LUT (강도 블렌드)
    if (useExt) {
      const e = sampleCube(ext, r, g, b);
      r += (e[0] - r) * extMix; g += (e[1] - g) * extMix; b += (e[2] - b) * extMix;
    }
    out[o++] = r * 255; out[o++] = g * 255; out[o++] = b * 255;
  }
  return out;
}

const IDX = new Int32Array(256), FRA = new Float32Array(256), MID = new Float32Array(256);
const OFF_G = new Int32Array(256), OFF_B = new Int32Array(256);
for (let v = 0; v < 256; v++) {
  const p = v * (N - 1) / 255, i = Math.min(Math.floor(p), N - 2);
  IDX[v] = i * 3; OFF_G[v] = i * N * 3; OFF_B[v] = i * N2 * 3; FRA[v] = p - i;
  const l = v / 255; MID[v] = 0.35 + 0.65 * 4 * l * (1 - l); // 그레인은 중간톤에서 가장 강하게
}
// 픽셀 루프: LUT 사면체 보간 조회 + 비네팅 + 그레인. 이게 픽셀당 비용의 전부.
function applyLUT(src, dst, w, h, L, fx, grain) {
  const vig = fx.vignette / 100, vpos = vig > 0, va = Math.abs(vig) * (vpos ? 0.7 : 0.85);
  const ga = grain ? fx.grainAmount / 100 * 0.3 : 0;
  const colw = new Float32Array(w);
  for (let x = 0; x < w; x++) { const u = (x + 0.5) / w * 2 - 1; colw[x] = u * u * 0.5; }
  const sy = N * 3, sz = N2 * 3, syz = sy + sz;
  const d32 = new Uint32Array(dst.buffer, dst.byteOffset, w * h); // little-endian: ABGR
  let p = 0;
  for (let y = 0; y < h; y++) {
    const v = (y + 0.5) / h * 2 - 1, rowv = v * v * 0.5;
    for (let x = 0; x < w; x++, p += 4) {
      const R = src[p], G = src[p + 1], Bv = src[p + 2];
      const fr = FRA[R], fg = FRA[G], fb = FRA[Bv];
      const o0 = IDX[R] + OFF_G[G] + OFF_B[Bv], o7 = o0 + syz + 3;
      // 사면체(tetrahedral) 보간: 격자 큐브를 6개 사면체로 나눠 4개 꼭짓점만 조회 (삼선형 8개 대비 절반)
      let oA, oB, w1, w2, w3;
      if (fr > fg) {
        if (fg > fb) { oA = o0 + 3; oB = o0 + 3 + sy; w1 = fr; w2 = fg; w3 = fb; }
        else if (fr > fb) { oA = o0 + 3; oB = o0 + 3 + sz; w1 = fr; w2 = fb; w3 = fg; }
        else { oA = o0 + sz; oB = o0 + 3 + sz; w1 = fb; w2 = fr; w3 = fg; }
      } else {
        if (fb > fg) { oA = o0 + sz; oB = o0 + syz; w1 = fb; w2 = fg; w3 = fr; }
        else if (fb > fr) { oA = o0 + sy; oB = o0 + syz; w1 = fg; w2 = fb; w3 = fr; }
        else { oA = o0 + sy; oB = o0 + sy + 3; w1 = fg; w2 = fr; w3 = fb; }
      }
      const k0 = 1 - w1, k1 = w1 - w2, k2 = w2 - w3;
      let r = k0 * L[o0] + k1 * L[oA] + k2 * L[oB] + w3 * L[o7];
      let g = k0 * L[o0 + 1] + k1 * L[oA + 1] + k2 * L[oB + 1] + w3 * L[o7 + 1];
      let bb = k0 * L[o0 + 2] + k1 * L[oA + 2] + k2 * L[oB + 2] + w3 * L[o7 + 2];
      if (va !== 0) {
        let m = (colw[x] + rowv - 0.12) / 0.88;
        if (m > 0) {
          m = m * m * (3 - 2 * m);
          if (vpos) { const k = va * m; r += (255 - r) * k; g += (255 - g) * k; bb += (255 - bb) * k; }
          else { const f = 1 - va * m; r *= f; g *= f; bb *= f; }
        }
      }
      if (ga !== 0) {
        let l = (r * 0.3 + g * 0.59 + bb * 0.11) | 0; l = l < 0 ? 0 : l > 255 ? 255 : l;
        const n = grain[p >> 2] * ga * MID[l];
        r += n; g += n; bb += n;
      }
      // 정수 패킹 후 한 번에 쓰기 (Uint8Clamped 개별 저장보다 빠름)
      r = r < 0 ? 0 : r > 255 ? 255 : r + 0.5; g = g < 0 ? 0 : g > 255 ? 255 : g + 0.5; bb = bb < 0 ? 0 : bb > 255 ? 255 : bb + 0.5;
      d32[p >> 2] = 0xff000000 | (bb << 16) | (g << 8) | r;
    }
  }
}

const grainCache = new Map();
function getGrain(w, h, size) {
  const key = w + 'x' + h + ':' + size;
  if (grainCache.has(key)) return grainCache.get(key);
  if (grainCache.size > 6) grainCache.clear();
  const s = 1 + size / 100 * 3, lw = Math.ceil(w / s) + 2, lh = Math.ceil(h / s) + 2;
  const low = new Float32Array(lw * lh);
  let seed = 1234567;
  const rnd = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
  for (let i = 0; i < low.length; i++) low[i] = (rnd() + rnd() + rnd() + rnd() - 2) * 1.73;
  const g = new Int8Array(w * h), inv = 1 / s, amp = 46 * (1 + (s - 1) * 0.35);
  let p = 0;
  for (let y = 0; y < h; y++) {
    const fy = y * inv, y0 = fy | 0, ty = fy - y0, r0 = y0 * lw, r1 = r0 + lw;
    for (let x = 0; x < w; x++) {
      const fxx = x * inv, x0 = fxx | 0, tx = fxx - x0;
      const a = low[r0 + x0] + (low[r0 + x0 + 1] - low[r0 + x0]) * tx;
      const b = low[r1 + x0] + (low[r1 + x0 + 1] - low[r1 + x0]) * tx;
      const v = (a + (b - a) * ty) * amp;
      g[p++] = v > 127 ? 127 : v < -127 ? -127 : v;
    }
  }
  grainCache.set(key, g);
  return g;
}

/* ---------- .cube 입출력 ---------- */
function parseCube(text) {
  let size = 0; const dmin = [0, 0, 0], dmax = [1, 1, 1], vals = [];
  for (const raw of text.split(/\r?\n/)) {
    const l = raw.trim();
    if (!l || l[0] === '#') continue;
    const up = l.toUpperCase(), parts = l.split(/\s+/);
    if (up.startsWith('LUT_3D_SIZE')) size = parseInt(parts[1], 10);
    else if (up.startsWith('LUT_1D_SIZE')) throw new Error('1D LUT는 지원하지 않습니다');
    else if (up.startsWith('DOMAIN_MIN')) parts.slice(1, 4).forEach((v, i) => (dmin[i] = +v));
    else if (up.startsWith('DOMAIN_MAX')) parts.slice(1, 4).forEach((v, i) => (dmax[i] = +v));
    else if (/^[-+.\d]/.test(l)) { for (let i = 0; i < 3; i++) vals.push(parseFloat(parts[i])); }
  }
  if (!(size >= 2 && size <= 129)) throw new Error('LUT_3D_SIZE가 없거나 잘못되었습니다');
  if (vals.length !== size ** 3 * 3) throw new Error(`데이터 개수 불일치 (${vals.length / 3} / ${size ** 3})`);
  const data = new Float32Array(vals.length);
  for (let i = 0; i < vals.length; i++) {
    const c = i % 3, v = (vals[i] - dmin[c]) / (dmax[c] - dmin[c] || 1);
    if (!isFinite(v)) throw new Error('숫자가 아닌 값이 있습니다');
    data[i] = cl(v);
  }
  return { size, data };
}
function cubeText(lut, title) {
  const lines = [`TITLE "${title.replace(/"/g, '')}"`, '# 필터 매니저에서 구운 3D LUT (그레인/비네팅 제외)', `LUT_3D_SIZE ${N}`, 'DOMAIN_MIN 0.0 0.0 0.0', 'DOMAIN_MAX 1.0 1.0 1.0'];
  for (let i = 0; i < lut.length; i += 3)
    lines.push(`${(lut[i] / 255).toFixed(6)} ${(lut[i + 1] / 255).toFixed(6)} ${(lut[i + 2] / 255).toFixed(6)}`);
  return lines.join('\n') + '\n';
}

/* ---------- 샘플 이미지 (절차적 생성, 1200×1800 = 4×6 인화 300dpi) ---------- */
function makeSample() {
  const W = 1200, H = 1800, cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const x = cv.getContext('2d');
  const lg = (y0, y1, stops) => { const g = x.createLinearGradient(0, y0, 0, y1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; };
  const rg = (cx, cy, r0, r1, stops) => { const g = x.createRadialGradient(cx, cy, r0, cx, cy, r1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; };
  const ell = (cx, cy, rx, ry, fill, rot = 0) => { x.beginPath(); x.ellipse(cx, cy, rx, ry, rot, 0, Math.PI * 2); x.fillStyle = fill; x.fill(); };

  // 하늘
  x.fillStyle = lg(0, 860, [[0, '#2f63ad'], [0.45, '#79a9da'], [0.78, '#e9c3a0'], [1, '#f6d7b0']]);
  x.fillRect(0, 0, W, 1260);
  x.fillStyle = rg(900, 640, 10, 420, [[0, 'rgba(255,240,200,0.95)'], [0.25, 'rgba(255,214,150,0.5)'], [1, 'rgba(255,200,140,0)']]);
  x.fillRect(0, 0, W, 1260);
  // 구름
  [[220, 210, 1], [330, 190, 0.8], [760, 300, 1.1], [880, 280, 0.8], [150, 420, 0.7]].forEach(([cx, cy, s]) => {
    for (let i = 0; i < 6; i++) ell(cx + (i - 2.5) * 46 * s, cy + Math.sin(i * 1.7) * 12 * s, 80 * s, 40 * s, rg(cx + (i - 2.5) * 46 * s, cy, 5, 85 * s, [[0, 'rgba(255,255,255,0.55)'], [1, 'rgba(255,255,255,0)']]));
  });
  // 먼 산 (자주)
  x.beginPath(); x.moveTo(0, 860);
  for (let i = 0; i <= 60; i++) { const px = i * W / 60; x.lineTo(px, 760 - Math.sin(i * 0.35) * 60 - Math.sin(i * 0.9 + 1) * 25); }
  x.lineTo(W, 900); x.lineTo(0, 900); x.closePath();
  x.fillStyle = lg(680, 900, [[0, '#8a73b8'], [1, '#b49ac9']]); x.fill();
  // 호수 (아쿠아)
  x.fillStyle = lg(860, 990, [[0, '#7fd2d6'], [1, '#2a93a6']]); x.fillRect(0, 860, W, 140);
  x.globalAlpha = 0.35; x.fillStyle = '#fff';
  for (let i = 0; i < 14; i++) x.fillRect(560 + Math.sin(i) * 300, 880 + i * 8, 120 + (i % 3) * 60, 2);
  x.globalAlpha = 1;
  // 언덕·수풀 (초록)
  x.beginPath(); x.moveTo(0, 990);
  for (let i = 0; i <= 40; i++) x.lineTo(i * W / 40, 960 - Math.sin(i * 0.4) * 30);
  x.lineTo(W, 1260); x.lineTo(0, 1260); x.closePath();
  x.fillStyle = lg(930, 1260, [[0, '#6aa84f'], [1, '#2f5e27']]); x.fill();
  const greens = ['#3f7d33', '#4e9a3c', '#2e6b2a', '#5fae49', '#7bbf5a'];
  for (let i = 0; i < 70; i++) {
    const px = (i * 173) % W, py = 1000 + ((i * 97) % 240), r = 26 + (i % 5) * 9;
    ell(px, py, r, r * 0.8, rg(px - r * 0.3, py - r * 0.3, 2, r, [[0, greens[(i + 3) % 5]], [1, greens[i % 5]]]));
  }
  // 인물 (단순화된 포트레이트)
  const cx = 600;
  x.beginPath(); x.moveTo(cx - 330, 1260); x.bezierCurveTo(cx - 320, 1010, cx - 200, 960, cx, 950); x.bezierCurveTo(cx + 200, 960, cx + 320, 1010, cx + 330, 1260); x.closePath();
  x.fillStyle = lg(950, 1260, [[0, '#4a6fa5'], [1, '#2c4569']]); x.fill(); // 데님 재킷 (파랑)
  x.beginPath(); x.moveTo(cx - 120, 960); x.quadraticCurveTo(cx, 1060, cx + 120, 960); x.lineTo(cx + 90, 1000); x.quadraticCurveTo(cx, 1110, cx - 90, 1000); x.closePath();
  x.fillStyle = '#c9423f'; x.fill(); // 스카프 (빨강)
  x.fillStyle = lg(830, 980, [[0, '#d9a07c'], [1, '#c98d68']]); x.fillRect(cx - 55, 820, 110, 150); // 목
  ell(cx, 640, 205, 250, rg(cx - 40, 560, 20, 300, [[0, '#4a3226'], [1, '#2a1c15']])); // 머리카락
  ell(cx, 690, 150, 190, rg(cx - 45, 630, 15, 220, [[0, '#f6d2b5'], [0.6, '#eab894'], [1, '#d4936e']])); // 얼굴 (피부)
  x.beginPath(); x.ellipse(cx, 560, 165, 105, 0, Math.PI, Math.PI * 2); x.fillStyle = '#35241b'; x.fill(); // 앞머리
  ell(cx - 80, 740, 38, 22, 'rgba(235,120,120,0.28)'); ell(cx + 80, 740, 38, 22, 'rgba(235,120,120,0.28)'); // 볼
  x.strokeStyle = '#3a2a22'; x.lineWidth = 6; x.lineCap = 'round';
  [[cx - 62, 680], [cx + 62, 680]].forEach(([ex, ey]) => { x.beginPath(); x.arc(ex, ey, 22, Math.PI * 1.15, Math.PI * 1.85); x.stroke(); });
  x.strokeStyle = '#b8505a'; x.lineWidth = 7;
  x.beginPath(); x.arc(cx, 760, 40, Math.PI * 0.2, Math.PI * 0.8); x.stroke();
  // 꽃 (빨강·노랑·마젠타·주황)
  const fl = ['#e23b3b', '#f2c618', '#d43e9c', '#f07a1e', '#ffffff'];
  for (let i = 0; i < 46; i++) {
    const px = (i * 131 + 40) % W, py = 1150 + ((i * 53) % 100);
    if (Math.abs(px - cx) < 300 && py < 1240) continue;
    ell(px, py, 13, 13, fl[i % 5]); ell(px, py, 5, 5, '#5a3a10');
  }
  // 컬러 체커 24패치
  x.fillStyle = '#1b1b1d'; x.fillRect(0, 1260, W, 540);
  const CC = ['#735244', '#c29682', '#627a9d', '#576c43', '#8580b1', '#67bdaa', '#d67e2c', '#505ba6', '#c15a63', '#5e3c6c', '#9dbc40', '#e0a32e',
    '#383d96', '#469449', '#af363c', '#e7c71f', '#bb5695', '#0885a1', '#f3f3f2', '#c8c8c8', '#a0a0a0', '#7a7a79', '#555555', '#343434'];
  const pw = 172, ph = 82, gx = (W - 6 * pw - 5 * 12) / 2;
  CC.forEach((c, i) => {
    const px = gx + (i % 6) * (pw + 12), py = 1300 + Math.floor(i / 6) * (ph + 12);
    x.fillStyle = c; x.beginPath(); x.roundRect ? x.roundRect(px, py, pw, ph, 8) : x.rect(px, py, pw, ph); x.fill();
  });
  // 그레이 램프 (연속 + 16단계)
  const ry = 1690, rw = W - gx * 2;
  const g2 = x.createLinearGradient(gx, 0, gx + rw, 0); g2.addColorStop(0, '#000'); g2.addColorStop(1, '#fff');
  x.fillStyle = g2; x.fillRect(gx, ry, rw, 34);
  for (let i = 0; i < 16; i++) { const v = Math.round(i * 255 / 15); x.fillStyle = `rgb(${v},${v},${v})`; x.fillRect(gx + i * rw / 16, ry + 38, rw / 16 + 1, 34); }
  x.fillStyle = '#6c6c72'; x.font = '20px sans-serif'; x.fillText('ColorChecker 24 · Gray ramp', gx, 1286);
  // 미세 노이즈 (밴딩 방지 + 실사 느낌)
  const id = x.getImageData(0, 0, W, 1260), d = id.data;
  let sd = 99;
  for (let i = 0; i < d.length; i += 4) {
    sd = (Math.imul(sd, 1103515245) + 12345) >>> 0;
    const n = ((sd >>> 16) & 7) - 3.5;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  x.putImageData(id, 0, 0);
  return cv;
}

/* ---------- UI: 슬라이더 ---------- */
const syncFns = [];
const fmt = (v, step) => (step < 1 ? (v > 0 ? '+' : '') + v.toFixed(2) : (v > 0 ? '+' : '') + Math.round(v));
function slider(parent, label, en, min, max, step, get, set, track, def = 0) {
  const row = document.createElement('div');
  row.className = 'sl';
  const id = 'sl' + Math.random().toString(36).slice(2, 8);
  row.innerHTML = `<label for="${id}">${label}<span class="en">${en || ''}</span></label><output></output><input id="${id}" type="range" min="${min}" max="${max}" step="${step}">`;
  const inp = row.querySelector('input'), out = row.querySelector('output');
  if (track) inp.style.setProperty('--track', track);
  const show = () => { const v = get(); inp.value = v; out.textContent = fmt(v, step); out.classList.toggle('nz', v !== def); };
  inp.addEventListener('input', () => { set(+inp.value); out.textContent = fmt(+inp.value, step); out.classList.toggle('nz', +inp.value !== def); });
  row.querySelector('label').addEventListener('dblclick', () => { set(def); show(); });
  row.title = '라벨 더블클릭: 초기화';
  parent.appendChild(row);
  syncFns.push(show); show();
  return { row, show };
}

function buildPanels() {
  const bb = $('#basicBody');
  for (const it of BASIC) {
    if (it.length === 1) { const h = document.createElement('div'); h.className = 'subh'; h.textContent = it[0]; bb.appendChild(h); continue; }
    const [k, lab, en, mn, mx, st, tr] = it;
    slider(bb, lab, en, mn, mx, st, () => S.params.basic[k], (v) => { S.params.basic[k] = v; changed(); }, tr);
  }
  const fb = $('#fxBody');
  for (const [k, lab, en, mn, mx, st, tr] of FX)
    slider(fb, lab, en, mn, mx, st, () => S.params.effects[k], (v) => { S.params.effects[k] = v; schedule(); markDirty(); }, tr, k === 'grainSize' ? 25 : 0);
  const fh = document.createElement('div'); fh.className = 'hint'; fh.textContent = '효과는 위치 의존이라 LUT에 굽지 않음 → 바꿔도 LUT 재계산 없음'; fb.appendChild(fh);
  buildHSL();
  slider($('#lutBody'), 'LUT 강도', 'Amount', 0, 100, 1, () => S.lut.intensity, (v) => { S.lut.intensity = v; changed(); }, null, 100);
}

let hslRows = [];
function buildHSL() {
  const body = $('#hslBody'); body.innerHTML = ''; hslRows.forEach(r => syncFns.splice(syncFns.indexOf(r.show), 1)); hslRows = [];
  const t = S.hslTab;
  for (const [k, lab, hue, col] of BANDS) {
    const track = t === 'hue' ? `linear-gradient(90deg,hsl(${hue - 30},75%,55%),hsl(${hue},75%,55%),hsl(${hue + 30},75%,55%))`
      : t === 'saturation' ? `linear-gradient(90deg,#808080,${col})` : `linear-gradient(90deg,#111,${col},#fff)`;
    hslRows.push(slider(body, lab, '', -100, 100, 1, () => S.params.hsl[t][k], (v) => { S.params.hsl[t][k] = v; changed(); updateTabMarks(); }, track));
  }
  updateTabMarks();
}
function updateTabMarks() {
  document.querySelectorAll('#hslTabs button').forEach(b => b.classList.toggle('mod', Object.values(S.params.hsl[b.dataset.t]).some(v => v)));
  document.querySelectorAll('#curveTabs button').forEach(b => {
    const c = S.params.curve[b.dataset.ch]; b.classList.toggle('mod', !(c.length === 2 && c[0][0] === 0 && c[0][1] === 0 && c[1][0] === 255 && c[1][1] === 255));
  });
}

/* ---------- 톤 커브 에디터 ---------- */
const curveCv = $('#curve');
let curveDrag = -1;
function curveSize() {
  const r = curveCv.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
  if (r.width && (curveCv.width !== Math.round(r.width * dpr))) { curveCv.width = Math.round(r.width * dpr); curveCv.height = Math.round(r.width * dpr); }
}
function drawCurve() {
  curveSize();
  const c = curveCv.getContext('2d'), W = curveCv.width, H = curveCv.height, dpr = window.devicePixelRatio || 1;
  c.clearRect(0, 0, W, H);
  if (S.hist) { // 배경: 결과 이미지의 휘도 히스토그램
    const hh = S.hist[3], mx = Math.max(...hh) || 1;
    c.fillStyle = '#ffffff12'; c.beginPath(); c.moveTo(0, H);
    for (let i = 0; i < 256; i++) c.lineTo(i / 255 * W, H - Math.min(1, hh[i] / mx) * H * 0.85);
    c.lineTo(W, H); c.fill();
  }
  c.strokeStyle = '#ffffff14'; c.lineWidth = 1;
  for (let i = 1; i < 4; i++) { c.beginPath(); c.moveTo(i * W / 4, 0); c.lineTo(i * W / 4, H); c.moveTo(0, i * H / 4); c.lineTo(W, i * H / 4); c.stroke(); }
  c.strokeStyle = '#ffffff22'; c.beginPath(); c.moveTo(0, H); c.lineTo(W, 0); c.stroke();
  const ch = S.curveCh, pts = S.params.curve[ch], t = curveTable(pts, 256), col = CH_COLOR[ch];
  c.strokeStyle = col; c.lineWidth = 2 * dpr; c.beginPath();
  for (let i = 0; i < 256; i++) { const px = i / 255 * W, py = H - t[i] * H; i ? c.lineTo(px, py) : c.moveTo(px, py); }
  c.stroke();
  for (let i = 0; i < pts.length; i++) {
    const [px, py] = [pts[i][0] / 255 * W, H - pts[i][1] / 255 * H];
    c.beginPath(); c.arc(px, py, 5 * dpr, 0, Math.PI * 2);
    c.fillStyle = i === curveDrag ? col : '#18181b'; c.fill(); c.strokeStyle = col; c.lineWidth = 1.5 * dpr; c.stroke();
  }
}
function curvePos(e) {
  const r = curveCv.getBoundingClientRect();
  return { x: (e.clientX - r.left) / r.width * 255, y: (1 - (e.clientY - r.top) / r.height) * 255, out: e.clientX < r.left - 24 || e.clientX > r.right + 24 || e.clientY < r.top - 24 || e.clientY > r.bottom + 24 };
}
function hitPoint(p) {
  const pts = S.params.curve[S.curveCh], r = curveCv.getBoundingClientRect(), k = r.width / 255;
  let best = -1, bd = 10;
  pts.forEach((q, i) => { const d = Math.hypot((q[0] - p.x) * k, (q[1] - p.y) * k); if (d < bd) { bd = d; best = i; } });
  return best;
}
curveCv.addEventListener('pointerdown', (e) => {
  const p = curvePos(e), pts = S.params.curve[S.curveCh];
  let i = hitPoint(p);
  if (i < 0) {
    const nx = Math.round(Math.max(1, Math.min(254, p.x)));
    if (pts.some(q => Math.abs(q[0] - nx) < 4)) return;
    pts.push([nx, Math.round(cl(p.y / 255) * 255)]); pts.sort((a, b) => a[0] - b[0]);
    i = pts.findIndex(q => q[0] === nx);
    changed();
  }
  curveDrag = i; curveCv.setPointerCapture(e.pointerId); drawCurve();
});
curveCv.addEventListener('pointermove', (e) => {
  if (curveDrag < 0) return;
  const p = curvePos(e), pts = S.params.curve[S.curveCh], i = curveDrag, last = pts.length - 1;
  if (p.out && i > 0 && i < last) { pts.splice(i, 1); curveDrag = -1; changed(); drawCurve(); return; }
  const y = Math.round(cl(p.y / 255) * 255);
  if (i === 0 || i === last) pts[i][1] = y;
  else pts[i] = [Math.round(Math.max(pts[i - 1][0] + 2, Math.min(pts[i + 1][0] - 2, p.x))), y];
  changed(); drawCurve();
});
const endDrag = () => { if (curveDrag >= 0) { curveDrag = -1; drawCurve(); } };
curveCv.addEventListener('pointerup', endDrag);
curveCv.addEventListener('pointercancel', endDrag);
curveCv.addEventListener('dblclick', (e) => {
  const pts = S.params.curve[S.curveCh], i = hitPoint(curvePos(e));
  if (i > 0 && i < pts.length - 1) { pts.splice(i, 1); changed(); drawCurve(); }
});
$('#curveTabs').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  S.curveCh = b.dataset.ch;
  document.querySelectorAll('#curveTabs button').forEach(x => x.classList.toggle('on', x === b));
  drawCurve();
});
$('#btnCurveReset').addEventListener('click', () => { S.params.curve[S.curveCh] = ID_CURVE(); changed(); drawCurve(); });
$('#hslTabs').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  S.hslTab = b.dataset.t;
  document.querySelectorAll('#hslTabs button').forEach(x => x.classList.toggle('on', x === b));
  buildHSL();
});

/* ---------- 렌더 루프 ---------- */
const cvBefore = $('#cvBefore'), cvAfter = $('#cvAfter'), ctxAfter = cvAfter.getContext('2d');
let dirtyLUT = true, pending = false;
function extLUT(lutRef) { return lutRef.file ? S.luts[lutRef.file] || null : null; }
function changed() { dirtyLUT = true; schedule(); markDirty(); updateTabMarks(); }
function schedule() { if (!pending) { pending = true; requestAnimationFrame(render); } }
const nf = (v) => v.toLocaleString('ko-KR');
function render() {
  pending = false;
  if (!S.img) return;
  const { w, h } = S.img;
  if (dirtyLUT) {
    const t0 = performance.now();
    S.lut3d = bake(S.params, extLUT(S.lut), S.lut.intensity / 100);
    S.bakeMs = performance.now() - t0; dirtyLUT = false;
  }
  const fx = S.params.effects, grain = fx.grainAmount > 0 ? getGrain(w, h, fx.grainSize) : null;
  const t1 = performance.now();
  applyLUT(S.img.src.data, S.out.data, w, h, S.lut3d, fx, grain);
  S.applyMs = performance.now() - t1;
  ctxAfter.putImageData(S.out, 0, 0);
  $('#badgeTxt').textContent = `CPU 렌더 · ${w}×${h} · ${Math.round(S.applyMs)}ms`;
  $('#badge').title = `LUT 굽기 ${S.bakeMs.toFixed(1)}ms + 픽셀 적용 ${S.applyMs.toFixed(1)}ms (메인 스레드, WebGL 미사용)`;
  $('#stBake').textContent = `35,937점 · ${S.bakeMs.toFixed(1)}ms`;
  $("#stApply").textContent = `사면체 보간 · ${nf(w * h)}px · ${Math.round(S.applyMs)}ms`;
  const direct = S.bakeMs / (N * N2) * w * h;
  $('#stEst').textContent = `같은 계산을 LUT 없이 픽셀마다 하면 약 ${nf(Math.round(direct))}ms 예상 (굽기 실측 시간 × 픽셀 수 비례) → LUT 방식이 약 ${Math.max(1, Math.round(direct / Math.max(S.applyMs, 1)))}배 빠름`;
  computeHist(); drawHist(); drawCurve();
}
function computeHist() {
  const d = S.out.data, hs = [new Uint32Array(256), new Uint32Array(256), new Uint32Array(256), new Uint32Array(256)];
  for (let i = 0; i < d.length; i += 4 * 7) {
    hs[0][d[i]]++; hs[1][d[i + 1]]++; hs[2][d[i + 2]]++;
    hs[3][(d[i] * 0.2126 + d[i + 1] * 0.7152 + d[i + 2] * 0.0722) | 0]++;
  }
  for (const a of hs) { const c = a.slice(); for (let i = 1; i < 255; i++) a[i] = (c[i - 1] + 2 * c[i] + c[i + 1]) >> 2; } // 표시용 3탭 평활
  S.hist = hs;
}
function drawHist() {
  const cv = $('#hist'), r = cv.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
  if (!r.width) return;
  cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
  const c = cv.getContext('2d'), W = cv.width, H = cv.height;
  const mx = Math.max(...[0, 1, 2].map(k => { const a = Array.from(S.hist[k]).sort((x, y) => y - x); return a[2]; })) || 1;
  c.globalCompositeOperation = 'lighter';
  ['rgba(255,70,70,.55)', 'rgba(70,220,100,.5)', 'rgba(70,130,255,.6)'].forEach((col, k) => {
    c.fillStyle = col; c.beginPath(); c.moveTo(0, H);
    for (let i = 0; i < 256; i++) c.lineTo(i / 255 * W, H - Math.min(1, S.hist[k][i] / mx) * (H - 4));
    c.lineTo(W, H); c.fill();
  });
  c.globalCompositeOperation = 'source-over';
}

/* ---------- 비교 뷰 (분할 / 나란히) ---------- */
const stage = $('#stage'), viewer = $('#viewer');
function layout() {
  if (!S.img) return;
  const { w, h } = S.img, vw = viewer.clientWidth - 32, vh = viewer.clientHeight - 32;
  const sbs = S.mode === 'sbs', k = sbs ? Math.min((vw - 12) / 2 / w, vh / h) : Math.min(vw / w, vh / h);
  const cw = Math.max(1, Math.floor(w * k)), chh = Math.max(1, Math.floor(h * k));
  for (const c of [cvBefore, cvAfter]) { c.style.width = cw + 'px'; c.style.height = chh + 'px'; }
  stage.classList.toggle('sbs', sbs);
  updateSplit();
}
function updateSplit() {
  cvAfter.style.clipPath = `inset(0 0 0 ${S.split * 100}%)`;
  $('#handle').style.left = S.split * 100 + '%';
}
let splitDrag = false;
stage.addEventListener('pointerdown', (e) => {
  if (S.mode !== 'split') return;
  splitDrag = true; stage.setPointerCapture(e.pointerId); moveSplit(e);
});
stage.addEventListener('pointermove', (e) => { if (splitDrag) moveSplit(e); });
stage.addEventListener('pointerup', () => (splitDrag = false));
function moveSplit(e) { const r = stage.getBoundingClientRect(); S.split = cl((e.clientX - r.left) / r.width); updateSplit(); }
document.querySelectorAll('.seg button').forEach(b => b.addEventListener('click', () => {
  S.mode = b.dataset.mode;
  document.querySelectorAll('.seg button').forEach(x => x.classList.toggle('on', x === b));
  layout();
}));
new ResizeObserver(() => { layout(); if (S.hist) { drawHist(); drawCurve(); } }).observe(viewer);

/* ---------- 이미지 불러오기 ---------- */
function setImage(src) {
  const MAX = 2400; // ponytail: 미리보기 상한. 실제 엔진은 원본 해상도로 처리
  let w = src.width, h = src.height;
  const k = Math.min(1, MAX / Math.max(w, h)); w = Math.round(w * k); h = Math.round(h * k);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d'); x.drawImage(src, 0, 0, w, h);
  S.img = { w, h, src: x.getImageData(0, 0, w, h) };
  S.out = new ImageData(w, h);
  cvBefore.width = cvAfter.width = w; cvBefore.height = cvAfter.height = h;
  cvBefore.getContext('2d').putImageData(S.img.src, 0, 0);
  const tw = 100, th = Math.round(100 * h / w), tc = document.createElement('canvas'); tc.width = tw; tc.height = th;
  tc.getContext('2d').drawImage(c, 0, 0, tw, th);
  S.thumbSrc = { w: tw, h: th, canvas: c, data: tc.getContext('2d').getImageData(0, 0, tw, th) };
  layout(); dirtyLUT = true; schedule(); renderPresetList();
}
async function loadFile(f) {
  if (!f || !/^image\/(jpeg|png)$/.test(f.type)) return toast('JPG 또는 PNG 파일만 불러올 수 있습니다', true);
  try {
    const url = URL.createObjectURL(f), im = new Image();
    im.src = url; await im.decode(); setImage(im); URL.revokeObjectURL(url);
    toast(`${f.name} 불러옴 (${S.img.w}×${S.img.h})`);
  } catch (e) { toast('이미지를 읽지 못했습니다', true); }
}
$('#fileImg').addEventListener('change', (e) => { loadFile(e.target.files[0]); e.target.value = ''; });
$('#btnSample').addEventListener('click', () => setImage(makeSample()));
let dragDepth = 0;
window.addEventListener('dragenter', (e) => { e.preventDefault(); dragDepth++; viewer.classList.add('drag'); });
window.addEventListener('dragleave', () => { if (--dragDepth <= 0) { dragDepth = 0; viewer.classList.remove('drag'); } });
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', (e) => {
  e.preventDefault(); dragDepth = 0; viewer.classList.remove('drag');
  const f = e.dataTransfer.files[0];
  if (f && /\.cube$/i.test(f.name)) loadCube(f); else loadFile(f);
});

/* ---------- LUT 파일 ---------- */
async function loadCube(f) {
  try {
    const L = parseCube(await f.text());
    S.luts[f.name] = L; S.lut.file = f.name;
    toast(`LUT 불러옴: ${f.name} (${L.size}³)`); updateLutInfo(); changed(); renderPresetList();
  } catch (e) { toast('.cube 오류: ' + e.message, true); }
}
$('#fileCube').addEventListener('change', (e) => { loadCube(e.target.files[0]); e.target.value = ''; });
function updateLutInfo() {
  const el = $('#lutInfo'), f = S.lut.file;
  el.classList.remove('warn');
  if (!f) { el.innerHTML = '불러온 LUT 없음'; return; }
  const L = S.luts[f];
  if (!L) { el.classList.add('warn'); el.textContent = `이 프리셋은 ‘${f}’를 사용합니다 — 파일을 불러오세요`; return; }
  el.innerHTML = `<b></b> · ${L.size}³ <button class="link" id="btnLutOff">해제</button>`;
  el.querySelector('b').textContent = f;
  $('#btnLutOff').onclick = () => { S.lut.file = null; updateLutInfo(); changed(); };
}

/* ---------- 프리셋 저장 / 목록 ---------- */
function loadPresets() {
  try { const j = JSON.parse(localStorage.getItem(LS_KEY)); if (Array.isArray(j)) return j; } catch (e) { /* 저장소 없음 */ }
  return defaultPresets();
}
function savePresets() { try { localStorage.setItem(LS_KEY, JSON.stringify(S.presets)); } catch (e) { toast('브라우저 저장소에 저장하지 못했습니다', true); } }
const active = () => S.presets.find(p => p.id === S.activeId);
function nextId() { const n = S.presets.reduce((m, p) => Math.max(m, parseInt(p.id.slice(2), 10) || 0), 0) + 1; return 'P-' + String(n).padStart(4, '0'); }
function currentPreset() {
  const a = active(), now = new Date().toISOString();
  return { id: a ? a.id : nextId(), name: $('#pname').value.trim() || (a ? a.name : '새 프리셋'), version: a ? a.version : 1,
    params: clone(S.params), lut: clone(S.lut), createdAt: a ? a.createdAt : now, updatedAt: now };
}
function markDirty() {
  const a = active();
  $('#dirty').textContent = a && JSON.stringify(a.params) + JSON.stringify(a.lut) !== JSON.stringify(S.params) + JSON.stringify(S.lut) ? `● ${a.name} 수정됨 — 업데이트로 저장` : '';
}
function applyPreset(p) {
  S.activeId = p.id; S.params = clone(p.params); S.lut = clone(p.lut || { file: null, intensity: 100 });
  $('#pname').value = p.name;
  syncFns.forEach(f => f()); updateTabMarks(); updateLutInfo(); changed(); renderPresetList();
}
function renderThumb(cv, p) {
  const T = S.thumbSrc; if (!T) return;
  cv.width = T.w; cv.height = T.h;
  const out = new ImageData(T.w, T.h), fx = p.params.effects;
  applyLUT(T.data.data, out.data, T.w, T.h, bake(p.params, extLUT(p.lut || {}), (p.lut?.intensity ?? 100) / 100), fx, fx.grainAmount > 0 ? getGrain(T.w, T.h, fx.grainSize) : null);
  cv.getContext('2d').putImageData(out, 0, 0);
}
function renderPresetList() {
  const ul = $('#plist'); ul.innerHTML = '';
  $('#pcount').textContent = `· ${S.presets.length}개`;
  if (!S.presets.length) { ul.innerHTML = '<li class="empty">저장된 프리셋이 없습니다.<br>보정 후 ‘새로 저장’을 누르세요.</li>'; return; }
  for (const p of S.presets) {
    const li = document.createElement('li');
    li.className = 'pitem' + (p.id === S.activeId ? ' on' : '');
    li.innerHTML = `<canvas></canvas><div class="pmeta"><b></b><small>${p.id}${p.lut?.file ? ' · LUT' : ''}</small><div class="pact"><button data-a="edit">편집</button><button data-a="del">삭제</button></div></div>`;
    li.querySelector('b').textContent = p.name;
    renderThumb(li.querySelector('canvas'), p);
    li.addEventListener('click', (e) => {
      const a = e.target.dataset && e.target.dataset.a;
      if (a === 'del') {
        if (!e.target.classList.contains('confirm')) { e.target.classList.add('confirm'); e.target.textContent = '확인'; setTimeout(() => { e.target.classList.remove('confirm'); e.target.textContent = '삭제'; }, 2500); return; }
        S.presets = S.presets.filter(q => q.id !== p.id);
        if (S.activeId === p.id) S.activeId = null;
        savePresets(); renderPresetList(); markDirty(); toast(`‘${p.name}’ 삭제됨`); return;
      }
      applyPreset(p);
      if (a === 'edit') { const n = $('#pname'); n.focus(); n.select(); }
    });
    ul.appendChild(li);
  }
}
$('#btnNew').addEventListener('click', () => {
  const p = currentPreset(); p.id = nextId(); p.createdAt = p.updatedAt;
  if (S.presets.some(q => q.name === p.name)) p.name += ' 2';
  S.presets.push(p); S.activeId = p.id; $('#pname').value = p.name;
  savePresets(); renderPresetList(); markDirty(); toast(`‘${p.name}’ 저장됨 (${p.id})`);
});
$('#btnUpdate').addEventListener('click', () => {
  const a = active(); if (!a) return toast('업데이트할 프리셋을 먼저 선택하세요', true);
  const p = currentPreset(); p.version = a.version + 1;
  S.presets[S.presets.indexOf(a)] = p;
  savePresets(); renderPresetList(); markDirty(); toast(`‘${p.name}’ 업데이트됨 (v${p.version})`);
});
$('#btnReset').addEventListener('click', () => { S.params = defaultParams(); S.lut = { file: null, intensity: 100 }; syncFns.forEach(f => f()); updateLutInfo(); changed(); });

/* ---------- 내보내기 ---------- */
function download(name, data, type) {
  const b = data instanceof Blob ? data : new Blob([data], { type });
  const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
const safe = (s) => s.replace(/[\\/:*?"<>|\s]+/g, '_');
$('#btnJsonView').addEventListener('click', () => { $('#jsonPre').textContent = JSON.stringify(currentPreset(), null, 2); $('#dlgJson').showModal(); });
$('#btnClose').addEventListener('click', () => $('#dlgJson').close());
$('#btnCopy').addEventListener('click', async () => { try { await navigator.clipboard.writeText($('#jsonPre').textContent); toast('복사됨'); } catch (e) { toast('복사 권한이 없습니다', true); } });
$('#btnJsonExport').addEventListener('click', () => { const p = currentPreset(); download(`${p.id}_${safe(p.name)}.json`, JSON.stringify(p, null, 2), 'application/json'); });
$('#btnCubeExport').addEventListener('click', () => {
  const p = currentPreset(), lut = bake(S.params, extLUT(S.lut), S.lut.intensity / 100);
  download(`${p.id}_${safe(p.name)}.cube`, cubeText(lut, p.name), 'text/plain'); toast(`.cube 내보냄 (${N}³, 그레인·비네팅 제외)`);
});
$('#btnThumbExport').addEventListener('click', () => {
  if (!S.img) return;
  const p = currentPreset(), w = 400, h = Math.round(400 * S.img.h / S.img.w);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  c.getContext('2d').drawImage(S.thumbSrc.canvas, 0, 0, w, h);
  const src = c.getContext('2d').getImageData(0, 0, w, h), out = new ImageData(w, h), fx = S.params.effects;
  applyLUT(src.data, out.data, w, h, S.lut3d, fx, fx.grainAmount > 0 ? getGrain(w, h, fx.grainSize) : null);
  c.getContext('2d').putImageData(out, 0, 0);
  c.toBlob(b => download(`${p.id}_${safe(p.name)}_thumb.png`, b), 'image/png');
});

let toastT;
function toast(msg, err) {
  const t = $('#toast'); t.textContent = msg; t.classList.toggle('err', !!err); t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2400);
}

/* ---------- 시작 ---------- */
buildPanels();
S.presets = loadPresets();
setImage(makeSample());
if (S.presets[0]) applyPreset(S.presets[0]);
window.__pf = { S, bake, parseCube, cubeText, curveTable }; // 검증용 핸들

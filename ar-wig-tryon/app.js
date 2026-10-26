import * as THREE from 'three';

const MP_VER = '0.10.14';
const MP_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VER}`;
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

const $ = (id) => document.getElementById(id);
const stage = $('stage'), view = $('view'), video = $('video'), glCanvas = $('gl');

/* ---------- 데이터 (가상) ---------- */
const STYLES = [
  { id: 'm1', g: 'm', name: '투블럭 숏', sub: '남성 · 윗머리 볼륨', segs: 7, width: 0.05, volume: 0.06, grav: 0.08, lift: 0.2, frizz: 0.05,
    len: (r) => r.y > 0.5 ? 0.5 + r.rnd * 0.12 : 0.16 + r.rnd * 0.04,
    flow: (r) => r.y > 0.5 ? new THREE.Vector3(Math.sign(r.x) * 0.1, 0.05, -0.85) : new THREE.Vector3(0, -1, -0.3) },
  { id: 'm2', g: 'm', name: '댄디컷', sub: '남성 · 내린 앞머리', segs: 9, width: 0.045, volume: 0.07, grav: 0.24, lift: 0.12, frizz: 0.04, fringe: 0.26,
    len: (r) => r.y > 0.42 ? 0.7 + r.rnd * 0.12 : (r.a > 0.7 ? 0.32 : 0.24),
    flow: (r) => r.y > 0.42 ? new THREE.Vector3(Math.sign(r.x) * 0.15, -0.1, 0.85) : new THREE.Vector3(0, -1, r.a > 0.6 ? -0.3 : 0.1) },
  { id: 'f1', g: 'f', name: '보브 단발', sub: '여성 · 시스루뱅', segs: 12, width: 0.04, volume: 0.1, grav: 0.22, lift: 0.35, frizz: 0.05, part: 0.16, fringe: 0.2,
    bang: (r) => r.a < 0.11 && r.y > 0.55, tip: (r) => -0.8 - r.rnd * 0.05, maxLen: 2.2 },
  { id: 'f2', g: 'f', name: '긴 생머리', sub: '여성 · 가운데 가르마', segs: 18, width: 0.04, volume: 0.07, grav: 0.26, lift: 0.3, frizz: 0.04, part: 0,
    tip: (r) => -1.85 - r.rnd * 0.15, maxLen: 3.4 },
  { id: 'f3', g: 'f', name: '웨이브 롱', sub: '여성 · 굵은 웨이브', segs: 20, width: 0.045, volume: 0.14, grav: 0.24, lift: 0.4, frizz: 0.06, part: 0.2,
    tip: (r) => -1.6 - r.rnd * 0.2, maxLen: 3.6, wave: { amp: 0.075, freq: 3.2 } },
];
const COLORS = [
  { name: '내추럴 블랙', hex: '#16110e' },
  { name: '다크 브라운', hex: '#3b2415' },
  { name: '애쉬 브라운', hex: '#6f5b4b' },
];

/* ---------- 가닥 생성 ---------- */
const R = new THREE.Vector3(0.8, 1.02, 0.92); // 두피 타원체 반경 (머리 단위, 1 = 약 10cm)
// 앞(0)에서 뒤(1)까지 방위각별 헤어라인 높이: 이마 → 관자놀이 → 구레나룻 → 귀 위 → 뒷목
const HL = [[0, 0.47], [0.18, 0.42], [0.3, 0.3], [0.4, -0.05], [0.46, 0.2], [0.58, 0.18], [0.72, -0.3], [1, -0.58]];
function hairline(a) {
  for (let i = 1; i < HL.length; i++) if (a <= HL[i][0]) {
    const [a0, y0] = HL[i - 1], [a1, y1] = HL[i];
    return y0 + (y1 - y0) * (a - a0) / (a1 - a0);
  }
  return HL[HL.length - 1][1];
}
function rngOf(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

function pushOut(p, k) {
  const q = Math.hypot(p.x / R.x, p.y / R.y, p.z / R.z);
  if (q < k) p.multiplyScalar(k / q);
}

function buildHair(style, count) {
  const rng = rngOf(style.id.charCodeAt(0) * 131 + style.id.charCodeAt(1) * 7 + count);
  const pos = [], tan = [], rad = [], dat = [], edg = [], idx = [];
  const down = new THREE.Vector3(0, -1, 0), tmp = new THREE.Vector3(), side = new THREE.Vector3();
  let made = 0, guard = 0;
  while (made < count && guard++ < count * 20) {
    const u = rng() * 2 - 1, th = rng() * Math.PI * 2, rr = Math.sqrt(1 - u * u);
    const p0 = new THREE.Vector3(rr * Math.sin(th) * R.x, u * R.y, rr * Math.cos(th) * R.z);
    const a = Math.abs(Math.atan2(p0.x, p0.z)) / Math.PI;
    const hl = hairline(a);
    if (p0.y < hl) continue;
    made++;
    const root = { x: p0.x, y: p0.y, a, rnd: rng() };
    const edge = sstep(0, 0.12, p0.y - hl);
    const layer = rng();
    const n = new THREE.Vector3(p0.x / (R.x * R.x), p0.y / (R.y * R.y), p0.z / (R.z * R.z)).normalize();
    const isBang = style.bang ? style.bang(root) : (style.fringe && style.g === 'm' && root.y > 0.42);

    let flow;
    if (style.flow) flow = style.flow(root);
    else { // 가르마 기준으로 좌우로 갈라지고 뒤통수는 아래로
      const sgn = Math.sign(p0.x - style.part) || 1;
      flow = new THREE.Vector3(sgn * (a < 0.35 ? 0.55 : 0.15), 0, a > 0.6 ? -0.25 : 0);
      flow.add(new THREE.Vector3(p0.x, 0, p0.z).normalize().multiplyScalar(0.45)).addScaledVector(down, 0.5); // 정수리에서 퍼져 내려오게
      if (isBang) flow.set((p0.x - style.part) * 0.6, 0, 0.6);
    }
    let maxLen, tipY = -99;
    if (style.len) maxLen = style.len(root);
    else { maxLen = isBang ? 0.55 + root.rnd * 0.08 : style.maxLen; tipY = isBang ? -99 : style.tip(root); }
    if (edge < 1) maxLen *= 0.55 + 0.45 * edge; // 헤어라인 잔머리는 짧고 가늘게

    const seg = maxLen / style.segs;
    const dir = n.clone().multiplyScalar(style.lift).add(flow).normalize();
    const pts = [p0.clone()];
    const p = p0.clone();
    for (let i = 0; i < style.segs; i++) {
      dir.addScaledVector(down, style.grav).normalize();
      tmp.set(rng() - 0.5, rng() - 0.5, rng() - 0.5).multiplyScalar(style.frizz);
      const prev = p.clone();
      p.addScaledVector(dir, seg).addScaledVector(tmp, seg);
      pushOut(p, 1.012 + layer * style.volume * Math.min(1, (i + 1) / 2));
      if (p.y < -0.7) { // 목 기둥
        const rxz = Math.hypot(p.x, p.z + 0.12), lim = 0.46 + layer * style.volume;
        if (rxz < lim) { p.x *= lim / rxz; p.z = (p.z + 0.12) * lim / rxz - 0.12; }
      }
      const inFace = p.z > 0.15 && Math.abs(p.x) < 0.6 && p.y < (style.fringe ?? 0.5) && p.y > -1.15;
      if (inFace) {
        if (isBang) { pts.push(p.clone()); break; }
        p.x = (Math.sign(p.x - (style.part || 0)) || 1) * 0.6;
      }
      dir.subVectors(p, prev).normalize();
      pts.push(p.clone());
      if (p.y < tipY) break;
    }
    if (pts.length < 2) continue;

    // 호 길이, 접선, 옆 방향
    const m = pts.length, arc = [0], T = [], S = [];
    for (let j = 1; j < m; j++) arc[j] = arc[j - 1] + pts[j].distanceTo(pts[j - 1]);
    const total = arc[m - 1] || 1;
    for (let j = 0; j < m; j++) {
      const t = (j < m - 1 ? tmp.subVectors(pts[j + 1], pts[j]) : tmp.subVectors(pts[j], pts[j - 1])).clone().normalize();
      T.push(t);
      side.crossVectors(t, pts[j].clone().normalize());
      if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
      S.push(side.clone().normalize());
    }
    if (style.wave) {
      const ph = root.rnd * 6.28;
      for (let j = 0; j < m; j++) {
        const v = arc[j] / total;
        pts[j].addScaledVector(S[j], Math.sin(v * style.wave.freq * 6.283 + ph) * style.wave.amp * sstep(0.08, 0.4, v));
      }
    }
    const w0 = style.width * (0.5 + 0.5 * edge) * (0.8 + 0.4 * rng());
    const base = pos.length / 3, sr = rng();
    for (let j = 0; j < m; j++) {
      const v = arc[j] / total, w = w0 * (1 - 0.72 * v) * 0.5;
      const rv = pts[j].clone().normalize();
      for (let s = 0; s < 2; s++) {
        const sg = s ? 1 : -1;
        pos.push(pts[j].x + S[j].x * w * sg, pts[j].y + S[j].y * w * sg, pts[j].z + S[j].z * w * sg);
        tan.push(T[j].x, T[j].y, T[j].z);
        rad.push(rv.x, rv.y, rv.z);
        dat.push(s, v, sr, layer);
        edg.push(edge);
      }
      if (j < m - 1) { const k = base + j * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aTan', new THREE.Float32BufferAttribute(tan, 3));
  g.setAttribute('aRad', new THREE.Float32BufferAttribute(rad, 3));
  g.setAttribute('aData', new THREE.Float32BufferAttribute(dat, 4));
  g.setAttribute('aEdge', new THREE.Float32BufferAttribute(edg, 1));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

/* ---------- 머리카락 셰이더 (Kajiya-Kay 근사, 2패스 알파) ---------- */
const uniforms = {
  uColor: { value: new THREE.Color(COLORS[0].hex) },
  uLight: { value: new THREE.Vector3(0.35, 0.75, 0.6).normalize() },
  uAniso: { value: 1 }, uLayers: { value: 1 }, uEdge: { value: 1 },
};
const VS = `
attribute vec3 aTan; attribute vec3 aRad; attribute vec4 aData; attribute float aEdge;
varying vec3 vT; varying vec3 vN; varying vec3 vPos; varying vec4 vData; varying float vEdge;
void main(){
  vec4 mv = modelViewMatrix * vec4(position,1.0);
  vPos = mv.xyz; vT = normalize(mat3(modelViewMatrix) * aTan); vN = normalize(normalMatrix * aRad);
  vData = aData; vEdge = aEdge;
  gl_Position = projectionMatrix * mv;
}`;
const FS = (pass) => `
uniform vec3 uColor; uniform vec3 uLight; uniform float uAniso; uniform float uLayers; uniform float uEdge;
varying vec3 vT; varying vec3 vN; varying vec3 vPos; varying vec4 vData; varying float vEdge;
float h1(float n){ return fract(sin(n)*43758.5453); }
void main(){
  float u = vData.x, v = vData.y, rnd = vData.z, layer = vData.w;
  if (uLayers < 0.5 && layer < 0.72) discard;
  float a = 1.0;
  if (uEdge > 0.5) {
    float across = 1.0 - abs(u*2.0 - 1.0);
    float sub = h1(floor(u*7.0) + rnd*97.0);
    a = smoothstep(0.0, 0.6, across) * mix(0.5, 1.0, sub) * (1.0 - smoothstep(0.6, 1.0, v)) * mix(0.2, 1.0, vEdge);
  }
  ${pass === 0 ? 'if (a < 0.62) discard; a = 1.0;' : 'if (a >= 0.62 || a < 0.02) discard;'}
  vec3 T = normalize(vT), N = normalize(vN), V = normalize(-vPos), L = normalize(uLight), H = normalize(L + V);
  float sh = (rnd - 0.5)*0.25 + (h1(floor(v*18.0) + rnd*13.0) - 0.5)*0.12;
  vec3 T1 = normalize(T + N*(0.12 + sh)), T2 = normalize(T + N*(-0.2 + sh));
  float d1 = dot(T1,H), d2 = dot(T2,H);
  float s1 = pow(sqrt(max(0.0, 1.0 - d1*d1)), 90.0);
  float s2 = pow(sqrt(max(0.0, 1.0 - d2*d2)), 22.0);
  float glint = smoothstep(0.25, 0.9, h1(floor(v*40.0) + rnd*31.0));
  float diff = mix(0.3, 1.0, clamp(dot(N,L)*0.5 + 0.5, 0.0, 1.0));
  float ao = (uLayers > 0.5 ? mix(0.4, 1.0, layer) : 1.0) * mix(0.45, 1.0, smoothstep(0.0, 0.35, v));
  vec3 base = uColor * (0.82 + 0.36*rnd);
  vec3 col;
  if (uAniso > 0.5) col = base*diff*ao + vec3(1.0,0.95,0.88)*s1*0.22*ao + base*2.2*s2*0.45*glint*ao;
  else col = base*diff + vec3(pow(max(dot(N,H),0.0), 10.0)*0.22);
  gl_FragColor = vec4(col, a);
  #include <colorspace_fragment>
}`;
const matA = new THREE.ShaderMaterial({ uniforms, vertexShader: VS, fragmentShader: FS(0), side: THREE.DoubleSide });
const matB = new THREE.ShaderMaterial({ uniforms, vertexShader: VS, fragmentShader: FS(1), side: THREE.DoubleSide, transparent: true, depthWrite: false, depthFunc: THREE.LessDepth });

/* ---------- 두상 (마네킹 겸 오클루더) ---------- */
function headGeometry() {
  const g = new THREE.SphereGeometry(1, 72, 56);
  const p = g.attributes.position, v = new THREE.Vector3();
  const bump = (x, y, cx, cy, sx, sy) => Math.exp(-((x - cx) ** 2) / sx - ((y - cy) ** 2) / sy);
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    let { x, y, z } = v;
    const jaw = y < 0 ? 1 - 0.28 * y * y : 1;
    x *= 0.78 * jaw; z *= 0.9 * (y < -0.3 ? 1 - 0.12 * (y + 0.3) ** 2 : 1); y *= 1.0;
    if (z > 0) {
      const f = z / 0.9;
      z += 0.17 * bump(x, y, 0, -0.22, 0.006, 0.05) * f;        // 코
      z += 0.05 * bump(x, y, 0, 0.22, 0.25, 0.01) * f;          // 눈썹뼈
      z -= 0.06 * (bump(x, y, 0.3, 0.05, 0.02, 0.008) + bump(x, y, -0.3, 0.05, 0.02, 0.008)) * f; // 눈두덩
      z += 0.04 * bump(x, y, 0, -0.55, 0.02, 0.004) * f;        // 입술
      z += 0.05 * bump(x, y, 0, -0.85, 0.03, 0.01) * f;         // 턱
    }
    p.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals();
  return g;
}
function earGeometry(sign) {
  const g = new THREE.SphereGeometry(1, 20, 16);
  g.scale(0.07, 0.2, 0.13);
  g.translate(sign * 0.76, -0.08, -0.05);
  return g;
}

/* ---------- 씬 ---------- */
const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setClearColor(0x000000, 0);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 5000);
scene.add(new THREE.HemisphereLight(0xf2ece6, 0x2a2624, 1.1));
const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(2, 3, 4); scene.add(key);

const pivot = new THREE.Group(), rig = new THREE.Group();
pivot.add(rig); scene.add(pivot);
const skinMat = new THREE.MeshStandardMaterial({ color: 0xc8b6a6, roughness: 0.82 });
const occMat = new THREE.MeshBasicMaterial({ colorWrite: false });
const headParts = [headGeometry(), earGeometry(1), earGeometry(-1), new THREE.CylinderGeometry(0.4, 0.5, 1.3, 40).translate(0, -1.25, -0.12)]
  .map((g) => { const m = new THREE.Mesh(g, skinMat); m.renderOrder = -1; rig.add(m); return m; });
// 두피 캡: 가닥 사이로 마네킹·두피가 비치지 않게 깔아 두는 머리색 바탕. 헤어라인에서 알파로 사라짐
const capGeo = headGeometry().scale(1.008, 1.008, 1.008);
{
  const p = capGeo.attributes.position, al = new Float32Array(p.count);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    al[i] = sstep(-0.01, 0.1, y - hairline(Math.abs(Math.atan2(x, z)) / Math.PI));
  }
  capGeo.setAttribute('aAlpha', new THREE.BufferAttribute(al, 1));
}
const cap = new THREE.Mesh(capGeo, new THREE.ShaderMaterial({
  uniforms, transparent: true, depthWrite: false,
  vertexShader: `attribute float aAlpha; varying float vA; varying vec3 vN;
    void main(){ vA = aAlpha; vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `uniform vec3 uColor; uniform vec3 uLight; varying float vA; varying vec3 vN;
    void main(){ if (vA < 0.01) discard; float d = mix(0.35, 0.8, clamp(dot(normalize(vN), uLight)*0.5+0.5, 0.0, 1.0));
      gl_FragColor = vec4(uColor * d, vA * 0.96);
      #include <colorspace_fragment>
    }`,
}));
cap.renderOrder = 0;
rig.add(cap);
const hairA = new THREE.Mesh(new THREE.BufferGeometry(), matA);
const hairB = new THREE.Mesh(hairA.geometry, matB);
hairA.renderOrder = 1; hairB.renderOrder = 2;
hairA.frustumCulled = hairB.frustumCulled = false;
rig.add(hairA, hairB);

/* ---------- 상태 ---------- */
const coarse = matchMedia('(pointer:coarse)').matches;
const state = {
  style: STYLES[3], color: 0, count: coarse ? 3500 : 7000, mode: 'mannequin',
  fx: { aniso: true, layers: true, edge: true, smooth: true },
  dragYaw: null, autoCuts: 0,
};

function setHair() {
  hairA.geometry.dispose();
  const g = buildHair(state.style, state.count);
  hairA.geometry = hairB.geometry = g;
  $('countVal').textContent = state.count.toLocaleString('ko-KR');
  $('count').value = state.count;
}

/* ---------- 포즈 스무딩 (One Euro) ---------- */
class OneEuro {
  constructor(minCut, beta) { this.minCut = minCut; this.beta = beta; this.x = null; }
  static a(dt, c) { const tau = 1 / (2 * Math.PI * c); return 1 / (1 + tau / dt); }
  filter(x, t) {
    if (this.x === null) { this.x = x; this.dx = 0; this.t = t; return x; }
    const dt = Math.max(1e-3, t - this.t); this.t = t;
    this.dx += OneEuro.a(dt, 1) * ((x - this.x) / dt - this.dx);
    this.x += OneEuro.a(dt, this.minCut + this.beta * Math.abs(this.dx)) * (x - this.x);
    return this.x;
  }
}
const rotF = [0, 1, 2].map(() => new OneEuro(0.9, 0.6));
const posF = [0, 1, 2].map(() => new OneEuro(0.9, 0.05));
const euler = new THREE.Euler(0, 0, 0, 'YXZ');
function applyPose(pos, rx, ry, rz, t) {
  const raw = [rx, ry, rz], p = [pos.x, pos.y, pos.z];
  const r = state.fx.smooth ? raw.map((v, i) => rotF[i].filter(v, t)) : raw;
  const q = state.fx.smooth ? p.map((v, i) => posF[i].filter(v, t)) : p;
  if (!state.fx.smooth) { rotF.concat(posF).forEach((f, i) => f.filter(i < 3 ? raw[i] : p[i - 3], t)); }
  euler.set(r[0], r[1], r[2], 'YXZ');
  pivot.quaternion.setFromEuler(euler);
  pivot.position.set(q[0], q[1], q[2]);
  $('poseChip').textContent = `yaw ${Math.round(THREE.MathUtils.radToDeg(r[1]))}°`;
}

/* ---------- 레이아웃 ---------- */
function layout() {
  const W = stage.clientWidth, H = stage.clientHeight;
  let w = W, h = H;
  if (state.mode === 'camera' && video.videoWidth) {
    const s = Math.max(W / video.videoWidth, H / video.videoHeight);
    w = video.videoWidth * s; h = video.videoHeight * s;
  }
  view.style.width = w + 'px'; view.style.height = h + 'px';
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  if (state.mode === 'mannequin') { camera.position.set(0, -0.25, camera.aspect < 0.85 ? 11 : 8.6); camera.lookAt(0, -0.25, 0); }
  camera.updateProjectionMatrix();
}
new ResizeObserver(layout).observe(stage);

function setMannequin() {
  state.mode = 'mannequin';
  view.classList.remove('mirror', 'cam');
  camera.fov = 30; camera.near = 0.1; camera.far = 100;
  camera.position.set(0, -0.25, 8.6); camera.lookAt(0, -0.25, 0);
  rig.position.set(0, 0, 0); rig.scale.setScalar(1);
  headParts.forEach((m) => { m.material = skinMat; m.visible = true; });
  hairA.visible = hairB.visible = true;
  $('modeChip').textContent = '마네킹 모드 · 자동 회전';
  $('camBtn').textContent = '내 얼굴로 착용';
  $('dragTip').hidden = false;
  layout();
}

/* ---------- 카메라 + MediaPipe ---------- */
let landmarker = null, lastVideoTime = -1;
async function startCamera() {
  const btn = $('camBtn');
  if (state.mode === 'camera') { stopCamera(); setMannequin(); return; }
  btn.disabled = true; btn.textContent = '카메라 준비 중';
  try {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('nocam');
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 960 }, height: { ideal: 720 } }, audio: false });
    video.srcObject = stream; await video.play();
    if (!landmarker) {
      showHint('얼굴 추적 모델을 불러오는 중입니다');
      const vision = await import(`${MP_URL}/vision_bundle.mjs`);
      const files = await vision.FilesetResolver.forVisionTasks(`${MP_URL}/wasm`);
      landmarker = await vision.FaceLandmarker.createFromOptions(files, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
        runningMode: 'VIDEO', numFaces: 1, outputFacialTransformationMatrixes: true,
      });
    }
    state.mode = 'camera';
    view.classList.add('mirror', 'cam');
    camera.fov = 63; camera.near = 1; camera.far = 5000;
    camera.position.set(0, 0, 0); camera.quaternion.identity();
    headParts.forEach((m) => { m.material = occMat; });
    applyCalib();
    $('modeChip').textContent = '실시간 추적';
    btn.textContent = '마네킹으로 보기';
    $('dragTip').hidden = true;
    $('calib').open = true;
    hideHint();
    layout();
  } catch (e) {
    stopCamera(); setMannequin();
    showHint('카메라를 사용할 수 없어 3D 마네킹으로 보여드립니다. 같은 가발·같은 셰이더입니다.', 3600);
  } finally { btn.disabled = false; }
}
function stopCamera() {
  video.srcObject?.getTracks().forEach((t) => t.stop());
  video.srcObject = null;
}
function applyCalib() {
  if (state.mode !== 'camera') return;
  rig.scale.setScalar(10 * +$('cScale').value);
  rig.position.set(0, +$('cY').value, +$('cZ').value);
}
['cScale', 'cY', 'cZ'].forEach((id) => $(id).addEventListener('input', applyCalib));

const mtx = new THREE.Matrix4(), mPos = new THREE.Vector3(), mQ = new THREE.Quaternion(), mS = new THREE.Vector3();
function trackFrame(t) {
  if (!landmarker || video.readyState < 2 || video.currentTime === lastVideoTime) return;
  lastVideoTime = video.currentTime;
  const res = landmarker.detectForVideo(video, performance.now());
  const m = res.facialTransformationMatrixes?.[0];
  const found = !!m;
  hairA.visible = hairB.visible = found;
  headParts.forEach((p) => { p.visible = found && state.fx.edge; });
  if (!found) { showHint('얼굴을 화면 가운데에 맞춰 주세요'); return; }
  hideHint();
  mtx.fromArray(m.data).decompose(mPos, mQ, mS);
  euler.setFromQuaternion(mQ, 'YXZ');
  applyPose(mPos, euler.x, euler.y, euler.z, t);
}

let hintTimer;
function showHint(msg, ms) {
  const h = $('hint'); h.textContent = msg; h.hidden = false;
  clearTimeout(hintTimer); if (ms) hintTimer = setTimeout(hideHint, ms);
}
function hideHint() { $('hint').hidden = true; }

/* ---------- 마네킹 회전 + 드래그 ---------- */
let dragStart = null;
stage.addEventListener('pointerdown', (e) => {
  if (state.mode !== 'mannequin' || e.target.closest('button,.result')) return;
  dragStart = { x: e.clientX, yaw: state.dragYaw ?? currentYaw };
  stage.setPointerCapture(e.pointerId);
});
stage.addEventListener('pointermove', (e) => {
  if (!dragStart) return;
  const lim = THREE.MathUtils.degToRad(60);
  state.dragYaw = Math.max(-lim, Math.min(lim, dragStart.yaw + (e.clientX - dragStart.x) * 0.008));
});
stage.addEventListener('pointerup', () => { dragStart = null; setTimeout(() => { if (!dragStart) state.dragYaw = null; }, 2500); });

let currentYaw = 0, autoT = 0;
const jitter = () => (Math.random() - 0.5);
function mannequinFrame(t, dt) {
  if (state.dragYaw === null) autoT += dt;
  currentYaw = state.dragYaw ?? Math.sin(autoT * 0.7) * THREE.MathUtils.degToRad(60);
  const pitch = Math.sin(autoT * 0.45) * 0.08;
  // 실제 추적기처럼 프레임마다 흔들리는 값을 넣고 필터 유무를 비교
  const n = 0.07;
  applyPose(new THREE.Vector3(jitter() * 0.03, jitter() * 0.03, 0), pitch + jitter() * n, currentYaw + jitter() * n, jitter() * n * 0.6, t);
}

/* ---------- 루프 + 자동 품질 ---------- */
let last = performance.now(), frames = 0, acc = 0, lowSecs = 0;
function render() { renderer.render(scene, camera); }
function loop(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  const t = now / 1000;
  if (state.mode === 'camera') trackFrame(t); else mannequinFrame(t, dt);
  render();
  frames++; acc += dt;
  if (acc >= 1) {
    const fps = frames / acc; frames = 0; acc = 0;
    $('fpsChip').textContent = `${Math.round(fps)} fps`;
    lowSecs = fps < 27 && !document.hidden ? lowSecs + 1 : 0;
    if (lowSecs >= 2 && state.count > 1500 && state.autoCuts < 4) {
      lowSecs = 0; state.autoCuts++;
      state.count = Math.max(1500, Math.round(state.count * 0.72 / 500) * 500);
      setHair();
      $('autoNote').textContent = `프레임 유지를 위해 가닥 수를 ${state.count.toLocaleString('ko-KR')}개로 자동 조절했습니다`;
    }
  }
  requestAnimationFrame(loop);
}

/* ---------- 촬영 ---------- */
function capture() {
  const W = stage.clientWidth, H = stage.clientHeight, w = view.clientWidth, h = view.clientHeight;
  const dpr = Math.min(devicePixelRatio, 2);
  const c = document.createElement('canvas');
  c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
  const ctx = c.getContext('2d');
  ctx.scale(dpr, dpr);
  const left = (W - w) / 2, top = (H - h) / 2;
  if (state.mode === 'camera') {
    ctx.translate(W, 0); ctx.scale(-1, 1);
    ctx.drawImage(video, left, top, w, h);
  } else {
    const gr = ctx.createRadialGradient(W / 2, H * 0.3, 0, W / 2, H * 0.3, H);
    gr.addColorStop(0, '#3a3836'); gr.addColorStop(0.55, '#232224'); gr.addColorStop(1, '#151517');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
  }
  render();
  ctx.drawImage(glCanvas, left, top, w, h);
  $('shotImg').src = c.toDataURL('image/jpeg', 0.9);
  stage.classList.remove('flash'); void stage.offsetWidth; stage.classList.add('flash');
  $('result').hidden = false;
}
$('shotBtn').addEventListener('click', capture);
$('retakeBtn').addEventListener('click', () => { $('result').hidden = true; });
$('okBtn').addEventListener('click', () => { $('result').hidden = true; });
$('camBtn').addEventListener('click', startCamera);

/* ---------- 목록 · 색상 · 토글 ---------- */
const wigBox = $('wigs');
STYLES.forEach((s) => {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'wig'; b.dataset.id = s.id; b.dataset.g = s.g;
  b.innerHTML = `<canvas width="160" height="160"></canvas><b>${s.name}</b><small>${s.sub}</small>`;
  b.addEventListener('click', () => { state.style = s; markWig(); setHair(); });
  wigBox.appendChild(b);
});
function markWig() { wigBox.querySelectorAll('.wig').forEach((b) => b.classList.toggle('on', b.dataset.id === state.style.id)); }

document.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('.tabs button').forEach((x) => x.classList.toggle('on', x === b));
  wigBox.querySelectorAll('.wig').forEach((w) => { w.hidden = b.dataset.g !== 'all' && w.dataset.g !== b.dataset.g; });
}));

const sw = $('swatches');
sw.innerHTML = `<small id="colorName">${COLORS[0].name}</small>`;
COLORS.forEach((c, i) => {
  const b = document.createElement('button');
  b.type = 'button'; b.style.background = c.hex; b.setAttribute('aria-label', c.name);
  b.addEventListener('click', () => {
    state.color = i; uniforms.uColor.value.set(c.hex);
    $('colorName').textContent = c.name;
    sw.querySelectorAll('button').forEach((x, j) => x.classList.toggle('on', j === i));
  });
  sw.appendChild(b);
});
sw.querySelector('button').classList.add('on');

document.querySelectorAll('[data-fx]').forEach((el) => el.addEventListener('change', () => {
  const k = el.dataset.fx; state.fx[k] = el.checked;
  if (k === 'aniso') uniforms.uAniso.value = +el.checked;
  if (k === 'layers') uniforms.uLayers.value = +el.checked;
  if (k === 'edge') {
    uniforms.uEdge.value = +el.checked;
    if (state.mode === 'camera') headParts.forEach((m) => { m.visible = el.checked; });
  }
}));

$('count').addEventListener('input', (e) => { $('countVal').textContent = (+e.target.value).toLocaleString('ko-KR'); });
$('count').addEventListener('change', (e) => { state.count = +e.target.value; state.autoCuts = 4; setHair(); });

/* ---------- 썸네일: 같은 렌더러로 한 번씩 그려 복사 ---------- */
function makeThumbs() {
  const keep = state.style, saveSize = new THREE.Vector2();
  renderer.getSize(saveSize);
  renderer.setSize(320, 320, false);
  camera.aspect = 1; camera.fov = 26; camera.updateProjectionMatrix();
  camera.position.set(0, -0.15, 8.6); camera.lookAt(0, -0.15, 0);
  pivot.position.set(0, 0, 0); pivot.rotation.set(0.05, 0.55, 0);
  STYLES.forEach((s) => {
    state.style = s; setHair();
    const thumbY = s.g === 'm' ? 0.15 : -0.35;
    camera.position.set(0, thumbY, s.g === 'm' ? 7 : 9.4); camera.lookAt(0, thumbY, 0);
    render();
    const cv = wigBox.querySelector(`[data-id="${s.id}"] canvas`).getContext('2d');
    cv.drawImage(glCanvas, 0, 0, 160, 160);
  });
  state.style = keep;
  renderer.setSize(saveSize.x, saveSize.y, false);
}

/* ---------- 시작 ---------- */
const savedCount = state.count;
state.count = 1800;
makeThumbs();
state.count = savedCount;
setMannequin();
setHair();
markWig();
requestAnimationFrame(loop);

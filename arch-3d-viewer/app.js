import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';

const MATS = [
  { name: '흰색', color: 0xf2f1ee, rough: 0.9 },
  { name: '웜그레이', color: 0xc9c3ba, rough: 0.9 },
  { name: '콘크리트', color: 0x9ea2a3, rough: 1 },
  { name: '적벽돌', color: 0xa4553d, rough: 1 },
  { name: '오크', color: 0xc89b67, rough: 0.7 },
  { name: '월넛', color: 0x6e4b33, rough: 0.7 },
  { name: '대리석', color: 0xe6e4df, rough: 0.35 },
  { name: '회색타일', color: 0x7d858c, rough: 0.5 },
];
const FLOOR_NAMES = { living: '거실', bed1: '침실 1', bed2: '침실 2', bath: '욕실' };
const DEFAULT_MAT = { wall: 0, floor: 4, floor_bath: 7 };
const EYE_H = 1.6;

const $ = (s) => document.querySelector(s);
const viewer = $('#viewer'), overlay = $('#overlay'), panel = $('#panel'), panelBody = $('#panelBody');

const hash = location.hash.match(/^#(edit|view)=(.+)$/);
const viewOnly = hash?.[1] === 'view';
if (viewOnly) {
  document.body.classList.add('view');
  $('#modeChip').textContent = '보기 전용';
  $('#hint').textContent = '드래그로 돌리고, 두 손가락으로 확대합니다';
}

// ---------- renderer: no shadows, pixel ratio capped at 2, draw only on change ----------
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true });
} catch (e) {
  overlay.textContent = '이 브라우저에서는 3D 화면을 열 수 없습니다. 크롬이나 사파리로 다시 열어 주세요.';
  throw e;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setClearColor(0xe4e7eb);
viewer.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.add(new THREE.HemisphereLight(0xffffff, 0xb8bcc2, 1.6));
const sun = new THREE.DirectionalLight(0xffffff, 1.6);
sun.position.set(6, 12, 4);
scene.add(sun);

const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 500);
const controls = new OrbitControls(camera, renderer.domElement);
controls.maxPolarAngle = Math.PI / 2 - 0.02;

let frames = 0, queued = false;
function render() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    renderer.render(scene, camera);
    frames++;
    $('#meta').textContent = `화면은 변화가 있을 때만 다시 그립니다 · 지금까지 ${frames}번`;
  });
}
controls.addEventListener('change', render);
new ResizeObserver(() => {
  const w = viewer.clientWidth, h = viewer.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  render();
}).observe(viewer);

// ---------- model ----------
const root = new THREE.Group();
scene.add(root);
const edgeMat = new THREE.LineBasicMaterial({ color: 0x3a4148, transparent: true, opacity: 0.35 });
let items = [];          // editable meshes
let isSample = true;
let selected = null, lastDeleted = null;
let box = new THREE.Box3(), center = new THREE.Vector3(), size = 10;

function kindOf(name) {
  if (/wall|벽/i.test(name)) return 'wall';
  if (/floor|바닥|slab/i.test(name)) return 'floor';
  return null;
}

// Re-centre a wall so its origin sits at the bottom centre of its long axis.
// Then height = scale.y and thickness = scale.z, whichever way the wall faces.
function prepWall(mesh) {
  const g = mesh.geometry, p = g.attributes.position;
  // Unique XZ corners only: triangulated faces repeat some vertices and would skew the axis.
  const pts = new Map();
  for (let i = 0; i < p.count; i++) pts.set(`${p.getX(i).toFixed(3)},${p.getZ(i).toFixed(3)}`, [p.getX(i), p.getZ(i)]);
  let mx = 0, mz = 0;
  for (const [x, z] of pts.values()) { mx += x; mz += z; }
  mx /= pts.size; mz /= pts.size;
  let cxx = 0, czz = 0, cxz = 0;
  for (const [x, z] of pts.values()) {
    const dx = x - mx, dz = z - mz;
    cxx += dx * dx; czz += dz * dz; cxz += dx * dz;
  }
  const a = 0.5 * Math.atan2(2 * cxz, cxx - czz);
  g.translate(-mx, 0, -mz);
  g.rotateY(a);
  g.computeBoundingBox();
  const b = g.boundingBox, c = b.getCenter(new THREE.Vector3());
  g.translate(-c.x, -b.min.y, -c.z);
  const off = new THREE.Vector3(c.x, 0, c.z).applyAxisAngle(new THREE.Vector3(0, 1, 0), -a);
  mesh.position.set(mx + off.x, b.min.y, mz + off.z);
  mesh.rotation.y = -a;
  mesh.userData.base = { L: b.max.x - b.min.x, H: b.max.y - b.min.y, T: b.max.z - b.min.z };
}

function setMat(mesh, idx) {
  const m = MATS[idx];
  mesh.material.color.setHex(m.color);
  mesh.material.roughness = m.rough;
  mesh.userData.mat = idx;
}

function useModel(obj, sample) {
  root.clear();
  items = []; selected = null; lastDeleted = null; isSample = sample;
  obj.updateMatrixWorld(true);
  const meshes = [];
  obj.traverse((o) => { if (o.isMesh) meshes.push(o); });
  // Bake every transform into geometry (handles DAE Z-up and nested nodes).
  const tmp = new THREE.Box3();
  meshes.forEach((m) => { m.geometry = m.geometry.clone().applyMatrix4(m.matrixWorld); tmp.expandByObject(m); });
  const span = tmp.getSize(new THREE.Vector3());
  const unit = Math.max(span.x, span.y, span.z) > 300 ? 0.001 : 1; // ponytail: mm guess only; ask client for unit
  let n = 0;
  meshes.forEach((m) => {
    const name = m.name || m.parent?.name || `part_${++n}`;
    const kind = kindOf(name);
    const geo = m.geometry;
    if (unit !== 1) geo.scale(unit, unit, unit);
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, metalness: 0 }));
    mesh.name = name;
    mesh.userData.kind = kind;
    if (kind === 'wall') prepWall(mesh);
    setMat(mesh, kind === 'wall' ? DEFAULT_MAT.wall : DEFAULT_MAT[name] ?? DEFAULT_MAT.floor);
    mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 30), edgeMat));
    root.add(mesh);
    if (kind) items.push(mesh);
  });
  box.setFromObject(root);
  box.getCenter(center);
  size = box.getSize(new THREE.Vector3()).length();
  overlay.hidden = true;
  drawPanel();
  view('fit');
}

function walls() { return items.filter((m) => m.userData.kind === 'wall'); }
function label(m) {
  if (m.userData.kind === 'wall') return '벽 ' + m.name.replace(/^\D*/, '');
  const key = m.name.replace(/^floor_?/, '');
  return '바닥 · ' + (FLOOR_NAMES[key] || m.name);
}
const mm = (v) => Math.round(v * 1000);

// ---------- views ----------
let mode = 'fit', yaw = 0, pitch = 0;
function view(next) {
  mode = next;
  document.querySelectorAll('[data-act]').forEach((b) => b.classList.toggle('on', b.dataset.act === mode));
  camera.fov = mode === 'eye' ? 70 : 50;
  camera.updateProjectionMatrix();
  controls.enabled = mode !== 'eye';
  const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const ext = box.getSize(new THREE.Vector3());
  if (mode === 'fit') {
    const k = Math.max(1, 0.9 / camera.aspect); // portrait phones need more distance
    camera.position.set(center.x + size * 0.45 * k, center.y + size * 0.7 * k, center.z + size * 0.75 * k);
    controls.target.copy(center);
  } else if (mode === 'top') {
    const d = Math.max(ext.z / 2 / t, ext.x / 2 / (t * camera.aspect)) * 1.12 + ext.y / 2;
    camera.position.set(center.x, center.y + d, center.z + 0.001);
    controls.target.copy(center);
  } else {
    const start = items.find((m) => m.name === 'floor_living') || null;
    const fb = new THREE.Box3().setFromObject(start || root);
    const p = fb.getCenter(new THREE.Vector3());
    // Stand near the west side of the living room, looking east toward the room doors.
    camera.position.set(fb.min.x + (fb.max.x - fb.min.x) * 0.15, box.min.y + EYE_H, p.z);
    yaw = -Math.PI / 2; pitch = -0.08;
    camera.rotation.set(pitch, yaw, 0, 'YXZ');
    $('#hint').textContent = '드래그로 둘러보고, 바닥을 누르면 그 자리로 이동합니다';
  }
  if (mode !== 'eye') controls.update();
  render();
}

// ---------- pointer: click to select, drag to look in eye mode ----------
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
let down = null;
renderer.domElement.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY }; });
renderer.domElement.addEventListener('pointermove', (e) => {
  if (!down || mode !== 'eye') return;
  yaw -= (e.clientX - down.lx) * 0.005;
  pitch = Math.max(-1.2, Math.min(1.2, pitch - (e.clientY - down.ly) * 0.005));
  down.lx = e.clientX; down.ly = e.clientY;
  camera.rotation.set(pitch, yaw, 0, 'YXZ');
  render();
});
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!down) return;
  const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
  down = null;
  if (moved > 6) return;
  const r = renderer.domElement.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObjects(items.filter((m) => m.visible), false)[0];
  if (mode === 'eye' && hit?.object.userData.kind === 'floor') {
    camera.position.set(hit.point.x, box.min.y + EYE_H, hit.point.z);
    render();
    return;
  }
  if (viewOnly) return;
  select(hit ? hit.object : null);
});

function select(m) {
  if (selected) selected.material.emissive.setHex(0);
  selected = m;
  if (m) m.material.emissive.setHex(0x1d4f80).multiplyScalar(0.55);
  $('#hint').hidden = !!m;
  drawPanel();
  render();
}

// ---------- edit panel ----------
function drawPanel() {
  const m = selected;
  panel.classList.toggle('idle', !m && !lastDeleted);
  const undo = lastDeleted ? `<button class="btn" data-do="undo">삭제 되돌리기 (${label(lastDeleted)})</button>` : '';
  if (!m) {
    const n = walls().length;
    panelBody.innerHTML = `<h2>편집</h2>
      <p class="empty">벽이나 바닥을 눌러 선택하세요.<br>벽은 높이·두께·재질을 바꾸거나 삭제할 수 있고, 바닥은 재질을 바꿀 수 있습니다.</p>
      <p class="sub">${isSample ? '샘플 평면' : '열어 본 파일'} · 벽으로 인식된 개체 ${n}개</p>
      ${undo ? `<div class="btns">${undo}</div>` : ''}`;
    return;
  }
  const isWall = m.userData.kind === 'wall';
  const b = m.userData.base;
  const dims = isWall ? `<div class="dims">
      <label class="field"><span>높이 (mm)</span><input type="number" inputmode="numeric" id="inH" min="300" max="6000" step="50" value="${mm(b.H * m.scale.y)}"></label>
      <label class="field"><span>두께 (mm)</span><input type="number" inputmode="numeric" id="inT" min="50" max="600" step="10" value="${mm(b.T * m.scale.z)}"></label>
    </div>` : '';
  panelBody.innerHTML = `<h2>${label(m)}</h2>
    <p class="sub">${isWall ? `길이 ${mm(b.L)} mm · 개체 이름 ${m.name}` : `개체 이름 ${m.name}`}</p>
    ${dims}
    <div class="label">재질</div>
    <div class="swatches">${MATS.map((x, i) => `<button class="sw${m.userData.mat === i ? ' on' : ''}" data-mat="${i}"><i style="background:#${x.color.toString(16).padStart(6, '0')}"></i>${x.name}</button>`).join('')}</div>
    <div class="btns">
      ${isWall ? '<button class="btn danger" data-do="del">이 벽 삭제</button>' : ''}
      <button class="btn" data-do="close">선택 해제</button>
      ${undo}
    </div>`;
  if (isWall) {
    $('#inH').addEventListener('input', (e) => resize(m, 'y', b.H, e.target, 300, 6000));
    $('#inT').addEventListener('input', (e) => resize(m, 'z', b.T, e.target, 50, 600));
  }
}

function resize(m, axis, base, input, lo, hi) {
  const v = Number(input.value);
  if (!v || v < lo || v > hi) return; // keep last valid value while typing
  m.scale[axis] = v / 1000 / base;
  render();
}

panelBody.addEventListener('click', (e) => {
  const t = e.target.closest('button');
  if (!t) return;
  if (t.dataset.mat) { setMat(selected, +t.dataset.mat); drawPanel(); render(); return; }
  const act = t.dataset.do;
  if (act === 'del') { const m = selected; select(null); m.visible = false; lastDeleted = m; drawPanel(); }
  if (act === 'undo') { lastDeleted.visible = true; const m = lastDeleted; lastDeleted = null; select(m); }
  if (act === 'close') select(null);
  render();
});

// ---------- state <-> link ----------
function snapshot() {
  const s = { d: [], w: {}, m: {} };
  items.forEach((m) => {
    if (!m.visible) s.d.push(m.name);
    if (m.userData.kind === 'wall' && (m.scale.y !== 1 || m.scale.z !== 1)) {
      const b = m.userData.base;
      s.w[m.name] = [mm(b.H * m.scale.y), mm(b.T * m.scale.z)];
    }
    const def = m.userData.kind === 'wall' ? DEFAULT_MAT.wall : DEFAULT_MAT[m.name] ?? DEFAULT_MAT.floor;
    if (m.userData.mat !== def) s.m[m.name] = m.userData.mat;
  });
  return s;
}
function restore(s) {
  items.forEach((m) => {
    if (s.d?.includes(m.name)) m.visible = false;
    const w = s.w?.[m.name];
    if (w && m.userData.base) { m.scale.y = w[0] / 1000 / m.userData.base.H; m.scale.z = w[1] / 1000 / m.userData.base.T; }
    if (s.m?.[m.name] != null && MATS[s.m[m.name]]) setMat(m, s.m[m.name]);
  });
  render();
}

const b64u = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
async function pipe(bytes, stream) { return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer()); }
async function encode(obj) {
  const raw = new TextEncoder().encode(JSON.stringify(obj));
  if (window.CompressionStream) return 'z' + b64u(await pipe(raw, new CompressionStream('deflate-raw')));
  return 'j' + b64u(raw);
}
async function decode(str) {
  let bytes = unb64u(str.slice(1));
  if (str[0] === 'z') bytes = await pipe(bytes, new DecompressionStream('deflate-raw'));
  return JSON.parse(new TextDecoder().decode(bytes));
}

async function share() {
  const body = $('#dlgBody');
  if (!isSample) {
    body.innerHTML = '<p class="empty">직접 연 파일은 서버에 올려야 링크로 공유할 수 있습니다. 데모의 링크는 샘플 평면 기준으로만 만들어집니다. 실제 납품에서는 업로드한 파일을 서버에 저장하고 링크를 발급합니다.</p>';
    $('#dlg').showModal();
    return;
  }
  const code = await encode(snapshot());
  const base = location.href.split('#')[0];
  const links = [
    ['편집용 링크', '이 링크를 가진 사람만 수정할 수 있습니다. 실무자끼리만 공유하세요.', `${base}#edit=${code}`],
    ['보기 전용 링크', '고객에게 보내는 링크입니다. 로그인 없이 보기만 됩니다.', `${base}#view=${code}`],
  ];
  body.innerHTML = links.map(([t, d, url], i) => `<div class="link"><b>${t}</b><small>${d}</small>
    <div class="copy"><input readonly value="${url}" id="l${i}"><button class="btn primary" data-copy="l${i}">복사</button></div>
    <a href="${url}" target="_blank" rel="noopener">새 창에서 열기</a></div>`).join('');
  $('#dlg').showModal();
}
$('#dlgBody').addEventListener('click', async (e) => {
  const id = e.target.dataset?.copy;
  if (!id) return;
  const inp = document.getElementById(id);
  try { await navigator.clipboard.writeText(inp.value); } catch { inp.select(); document.execCommand('copy'); }
  e.target.textContent = '복사됨';
});
addEventListener('hashchange', () => location.reload());

// ---------- toolbar & upload ----------
$('#toolbar').addEventListener('click', (e) => {
  const act = e.target.closest('button')?.dataset.act;
  if (!act) return;
  if (act === 'open') return $('#file').click();
  if (act === 'share') return share();
  if (act !== 'eye') $('#hint').textContent = viewOnly ? '드래그로 돌리고, 두 손가락으로 확대합니다' : '벽이나 바닥을 눌러 선택하세요';
  view(act);
});

$('#file').addEventListener('change', async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  overlay.hidden = false;
  overlay.textContent = `${f.name} 여는 중…`;
  try {
    const text = await f.text();
    let obj;
    if (/\.dae$/i.test(f.name)) {
      const { ColladaLoader } = await import('three/addons/loaders/ColladaLoader.js');
      obj = new ColladaLoader().parse(text, '').scene;
    } else {
      obj = new OBJLoader().parse(text);
    }
    useModel(obj, false);
  } catch (err) {
    overlay.textContent = '파일을 열지 못했습니다. OBJ 또는 DAE 파일인지 확인해 주세요.';
    console.warn(err);
  }
  e.target.value = '';
});

// ---------- start ----------
new OBJLoader().load('sample.obj', async (obj) => {
  useModel(obj, true);
  if (hash) {
    try { restore(await decode(hash[2])); } catch { overlay.hidden = false; overlay.textContent = '링크가 잘못되었거나 일부가 잘렸습니다.'; }
  }
}, undefined, () => { overlay.textContent = '샘플 모델을 불러오지 못했습니다. 새로고침해 주세요.'; });

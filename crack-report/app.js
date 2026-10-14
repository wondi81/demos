// 외벽 점검 판독 데모 — 사진·탐지 결과 모두 시드 기반 가상 데이터 (실제 AI 판독 아님)
const BUILDINGS = ['101동', '102동', '103동'];
const FACES = ['전면', '후면', '좌측면', '우측면'];
const BANDS = ['1~5층', '6~10층', '11~15층', '16~20층', '21~25층'];
const DATES = ['2026-09-08', '2026-09-09', '2026-09-10'];
const INSPECTORS = ['점검자 A', '점검자 B', '점검자 C'];
const RES_W = 5472, RES_H = 3648;            // 표기용 원본 해상도
const OW = 2400, OH = 1600;                  // 데모 뷰어 렌더 크기
const PAGE = 24;
const SEV_RANK = { 상: 3, 중: 2, 하: 1 };
const SEV_CLS = { 상: 'h', 중: 'm', 하: 'l' };
const SEV_COLOR = { 상: '#e03131', 중: '#f08c00', 하: '#2f8fd8' };

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 그룹(동·면·층) — 사진 수만 정해 두고 메타데이터는 필요할 때 생성
const groups = [];
let offset = 0;
BUILDINGS.forEach((b, bi) => FACES.forEach((f, fi) => BANDS.forEach((k, ki) => {
  const gi = groups.length;
  const count = 220 + Math.floor(rng(gi * 7919 + 13)() * 60);
  groups.push({ gi, b, f, k, bi, count, offset });
  offset += count;
})));
const TOTAL = offset;

const photoCache = new Map();
function photo(g, i) {
  const key = g.gi * 1000 + i;
  if (photoCache.has(key)) return photoCache.get(key);
  const r = rng(key * 2654435761 + 7);
  const defects = [];
  if (r() > 0.62) {
    const n = 1 + Math.floor(r() * 3);
    for (let d = 0; d < n; d++) defects.push(r() < 0.72 ? makeCrack(r) : makeSpall(r));
  }
  defects.forEach((d, j) => (d.no = j + 1));
  const p = {
    key, g, i,
    file: `DJI_${String(g.offset + i + 1).padStart(5, '0')}.JPG`,
    date: DATES[g.bi], inspector: INSPECTORS[g.bi],
    sec: (0.6 + r() * 1.3).toFixed(1),
    hue: 30 + r() * 20, light: 70 + r() * 10,
    windows: r() < 0.55, joints: 2 + Math.floor(r() * 3),
    defects,
    sev: defects.reduce((m, d) => (SEV_RANK[d.sev] > SEV_RANK[m] ? d.sev : m), defects.length ? '하' : null),
  };
  photoCache.set(key, p);
  return p;
}

function makeCrack(r) {
  let x = 0.15 + r() * 0.7, y = 0.15 + r() * 0.7;
  let ang = r() * Math.PI * 2;
  const pts = [[x, y]];
  const steps = 10 + Math.floor(r() * 22);
  for (let s = 0; s < steps; s++) {
    ang += (r() - 0.5) * 0.9;
    x = Math.min(0.97, Math.max(0.03, x + Math.cos(ang) * 0.016));
    y = Math.min(0.97, Math.max(0.03, y + Math.sin(ang) * 0.016 * 1.5));
    pts.push([x, y]);
  }
  const width = +(1 + r() * 5).toFixed(1); // 원본 px 기준 추정 폭
  let len = 0;
  for (let k = 1; k < pts.length; k++) len += Math.hypot((pts[k][0] - pts[k - 1][0]) * RES_W, (pts[k][1] - pts[k - 1][1]) * RES_H);
  const sev = width >= 4.6 || len > 2600 ? '상' : width >= 2.6 ? '중' : '하';
  return { type: '균열', pts, width, len: Math.round(len), sev, box: bbox(pts, 0.02) };
}

function makeSpall(r) {
  const cx = 0.15 + r() * 0.7, cy = 0.15 + r() * 0.7, rad = 0.025 + r() * 0.055;
  const pts = [];
  for (let k = 0; k < 11; k++) {
    const a = (k / 11) * Math.PI * 2, rr = rad * (0.65 + r() * 0.5);
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 1.5]);
  }
  const sev = rad > 0.068 ? '상' : rad > 0.045 ? '중' : '하';
  const b = bbox(pts, 0.012);
  return { type: '박리·파손', pts, sev, area: Math.round((b.w * RES_W) * (b.h * RES_H) * 0.6), box: b };
}

function bbox(pts, pad) {
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const x0 = Math.max(0, Math.min(...xs) - pad), y0 = Math.max(0, Math.min(...ys) - pad * 1.5);
  const x1 = Math.min(1, Math.max(...xs) + pad), y1 = Math.min(1, Math.max(...ys) + pad * 1.5);
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

// 가상 외벽 그리기 (thumb/원본 공용, 정규화 좌표)
function drawWall(ctx, p, W, H) {
  const r = rng(p.key + 99);
  ctx.fillStyle = `hsl(${p.hue},7%,${p.light}%)`;
  ctx.fillRect(0, 0, W, H);
  const img = ctx.getImageData(0, 0, W, H), d = img.data;
  for (let k = 0; k < d.length; k += 4) {
    const n = (r() - 0.5) * 26;
    d[k] += n; d[k + 1] += n; d[k + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
  // 얼룩
  for (let s = 0; s < 6; s++) {
    const gx = r() * W, gy = r() * H, g = ctx.createRadialGradient(gx, gy, 0, gx, gy, W * (0.1 + r() * 0.25));
    g.addColorStop(0, 'rgba(90,80,60,.10)'); g.addColorStop(1, 'rgba(90,80,60,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  // 줄눈·슬래브 라인
  ctx.strokeStyle = 'rgba(60,55,50,.35)'; ctx.lineWidth = Math.max(1, W / 600);
  for (let j = 1; j <= p.joints; j++) {
    const y = (j / (p.joints + 1)) * H + (r() - 0.5) * H * 0.05;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
  if (p.windows) {
    const cols = 3, top = 0.18 + r() * 0.1;
    for (let c = 0; c < cols; c++) {
      const x = ((c + 0.5) / cols) * W - W * 0.09, y = top * H;
      ctx.fillStyle = 'rgba(40,52,62,.85)'; ctx.fillRect(x, y, W * 0.18, H * 0.3);
      ctx.strokeStyle = 'rgba(230,230,225,.8)'; ctx.lineWidth = Math.max(1, W / 300);
      ctx.strokeRect(x, y, W * 0.18, H * 0.3);
      ctx.fillStyle = 'rgba(70,60,45,.12)'; ctx.fillRect(x + W * 0.02, y + H * 0.3, W * 0.03, H * 0.18);
    }
  }
  // 파손
  p.defects.forEach(df => {
    if (df.type === '균열') {
      ctx.strokeStyle = 'rgba(28,25,22,.9)';
      ctx.lineWidth = Math.max(0.7, (df.width * W) / 2600);
      ctx.lineJoin = 'round';
      ctx.beginPath();
      df.pts.forEach(([x, y], k) => (k ? ctx.lineTo(x * W, y * H) : ctx.moveTo(x * W, y * H)));
      ctx.stroke();
    } else {
      ctx.fillStyle = 'rgba(105,98,88,.95)';
      ctx.beginPath();
      df.pts.forEach(([x, y], k) => (k ? ctx.lineTo(x * W, y * H) : ctx.moveTo(x * W, y * H)));
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(235,232,225,.7)'; ctx.lineWidth = Math.max(1, W / 500); ctx.stroke();
      ctx.strokeStyle = 'rgba(120,60,30,.7)'; ctx.lineWidth = Math.max(1, W / 400);
      const b = df.box;
      ctx.beginPath(); ctx.moveTo((b.x + b.w * 0.3) * W, (b.y + b.h * 0.5) * H); ctx.lineTo((b.x + b.w * 0.7) * W, (b.y + b.h * 0.52) * H); ctx.stroke();
    }
  });
}

function drawBoxes(ctx, p, map, scale, active) {
  ctx.font = `700 ${Math.round(13 * scale)}px sans-serif`;
  p.defects.forEach(df => {
    const [x, y] = map(df.box.x, df.box.y), [x2, y2] = map(df.box.x + df.box.w, df.box.y + df.box.h);
    ctx.strokeStyle = SEV_COLOR[df.sev];
    ctx.lineWidth = (active === df.no ? 3.5 : 2) * scale;
    ctx.strokeRect(x, y, x2 - x, y2 - y);
    const tw = 20 * scale;
    ctx.fillStyle = SEV_COLOR[df.sev];
    ctx.fillRect(x, y - tw, tw, tw);
    ctx.fillStyle = '#fff';
    ctx.fillText(df.no, x + 6 * scale, y - 5 * scale);
  });
}

// ---------- 상태 ----------
const state = { scope: { b: null, f: null, k: null }, filter: 'hit', page: 0, current: null, active: null };
const $ = id => document.getElementById(id);
const scopeGroups = () => groups.filter(g => (!state.scope.b || g.b === state.scope.b) && (!state.scope.f || g.f === state.scope.f) && (!state.scope.k || g.k === state.scope.k));
const scopeName = s => [s.b, s.f, s.k].filter(Boolean).join(' · ') || '전체';

function scopePhotos() {
  const out = [];
  scopeGroups().forEach(g => { for (let i = 0; i < g.count; i++) out.push(photo(g, i)); });
  return out;
}
function filtered(list) {
  const f = state.filter;
  if (f === 'all') return list;
  if (f === 'hit') return list.filter(p => p.defects.length);
  return list.filter(p => p.sev === f);
}

// ---------- 트리 ----------
function buildTree() {
  const tree = $('tree'), sel = $('groupSelect');
  const sum = filterFn => groups.filter(filterFn).reduce((s, g) => s + g.count, 0);
  const node = (label, scope, cls, n) => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.className = 'node ' + cls; btn.setAttribute('role', 'treeitem');
    btn.dataset.scope = JSON.stringify(scope);
    btn.innerHTML = `<span>${label}</span><span class="n">${n.toLocaleString()}</span>`;
    li.appendChild(btn);
    const opt = document.createElement('option');
    opt.value = btn.dataset.scope;
    opt.textContent = `${'　'.repeat(cls === 'b' ? 0 : cls === 'f' ? 1 : cls === 'k' ? 2 : 0)}${scopeName(scope)} (${n.toLocaleString()})`;
    sel.appendChild(opt);
    return li;
  };
  tree.appendChild(node('단지 전체', { b: null, f: null, k: null }, 'b', TOTAL));
  BUILDINGS.forEach(b => {
    const li = node(b, { b, f: null, k: null }, 'b', sum(g => g.b === b));
    const ul = document.createElement('ul');
    FACES.forEach(f => {
      const lf = node(f, { b, f, k: null }, 'f', sum(g => g.b === b && g.f === f));
      const ul2 = document.createElement('ul');
      BANDS.forEach(k => ul2.appendChild(node(k, { b, f, k }, 'k', sum(g => g.b === b && g.f === f && g.k === k))));
      lf.appendChild(ul2); ul.appendChild(lf);
    });
    li.appendChild(ul); tree.appendChild(li);
  });
  tree.addEventListener('click', e => { const b = e.target.closest('.node'); if (b) setScope(JSON.parse(b.dataset.scope)); });
  sel.addEventListener('change', () => setScope(JSON.parse(sel.value)));
}
function setScope(s) {
  state.scope = s; state.page = 0;
  const key = JSON.stringify(s);
  document.querySelectorAll('.node').forEach(n => n.classList.toggle('on', n.dataset.scope === key));
  $('groupSelect').value = key;
  renderList();
}

// ---------- 목록 ----------
function renderList() {
  const all = scopePhotos(), list = filtered(all);
  const pages = Math.max(1, Math.ceil(list.length / PAGE));
  state.page = Math.min(state.page, pages - 1);
  const hits = all.filter(p => p.defects.length);
  const cnt = { 상: 0, 중: 0, 하: 0 };
  hits.forEach(p => p.defects.forEach(d => cnt[d.sev]++));
  $('scopeTitle').textContent = scopeName(state.scope);
  $('scopeMeta').textContent = `사진 ${all.length.toLocaleString()}장 · 탐지 사진 ${hits.length.toLocaleString()}장 · 표시 ${list.length.toLocaleString()}장`;
  $('sevSummary').innerHTML = `<span class="pill h">상 ${cnt.상}</span><span class="pill m">중 ${cnt.중}</span><span class="pill l">하 ${cnt.하}</span>`;
  $('pageInfo').textContent = `${state.page + 1} / ${pages.toLocaleString()} 페이지`;
  $('prevBtn').disabled = state.page === 0;
  $('nextBtn').disabled = state.page >= pages - 1;
  const grid = $('grid');
  grid.innerHTML = '';
  const slice = list.slice(state.page * PAGE, state.page * PAGE + PAGE);
  if (!slice.length) { grid.innerHTML = '<p class="empty">조건에 맞는 사진이 없습니다</p>'; return; }
  slice.forEach(p => {
    const b = document.createElement('button');
    b.className = 'thumb' + (state.current === p ? ' on' : '');
    b.setAttribute('aria-label', `${p.file} ${p.sev ? '심각도 ' + p.sev : '탐지 없음'} 열기`);
    const c = document.createElement('canvas');
    c.width = 240; c.height = 160;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    drawWall(ctx, p, 240, 160);
    drawBoxes(ctx, p, (x, y) => [x * 240, y * 160], 0.6, null);
    b.appendChild(c);
    const tag = p.sev ? `<span class="sev ${SEV_CLS[p.sev]}">${p.sev} · ${p.defects.length}건</span>` : '<span class="sev none">없음</span>';
    b.insertAdjacentHTML('beforeend', `<span class="cap"><span class="fn">${p.file}</span>${tag}</span>`);
    b.addEventListener('click', () => openPhoto(p, b));
    grid.appendChild(b);
  });
}

// ---------- 상세 뷰어 ----------
const off = document.createElement('canvas');
off.width = OW; off.height = OH;
const offCtx = off.getContext('2d', { willReadFrequently: true });
const view = $('view'), vctx = view.getContext('2d');
let vr = { x: 0, y: 0, w: OW, h: OH }, anim = null;

function openPhoto(p, btn) {
  state.current = p; state.active = null;
  document.querySelectorAll('.thumb.on').forEach(t => t.classList.remove('on'));
  if (btn) btn.classList.add('on');
  drawWall(offCtx, p, OW, OH);
  $('detail').hidden = false;
  document.querySelector('.layout').classList.remove('no-detail');
  $('dTitle').textContent = p.file;
  $('dMeta').textContent = `${p.g.b} ${p.g.f} ${p.g.k} · ${p.date} · ${p.inspector} · ${RES_W}×${RES_H} · 판독 ${p.sec}초`;
  $('dCount').textContent = p.defects.length;
  const ol = $('defects');
  ol.innerHTML = p.defects.length ? '' : '<li class="none-msg">탐지된 파손이 없습니다</li>';
  p.defects.forEach(df => {
    const li = document.createElement('li');
    const size = df.type === '균열' ? `길이 약 ${df.len.toLocaleString()}px · 폭 약 ${df.width}px` : `면적 약 ${df.area.toLocaleString()}px²`;
    li.innerHTML = `<button data-no="${df.no}"><span class="no">${df.no}</span><span class="t">${df.type}</span><span class="sev ${SEV_CLS[df.sev]}">${df.sev}</span><span class="d">${size} (원본 기준) · mm 환산은 촬영거리·화각 정보 필요</span></button>`;
    li.firstChild.addEventListener('click', () => focusDefect(df));
    ol.appendChild(li);
  });
  vr = { x: 0, y: 0, w: OW, h: OH };
  paint();
  if (window.matchMedia('(max-width:1180px)').matches) $('detail').scrollTop = 0;
  else if ($('detail').getBoundingClientRect().top < 0) $('detail').scrollIntoView({ block: 'start' });
}

function paint() {
  const p = state.current; if (!p) return;
  vctx.drawImage(off, vr.x, vr.y, vr.w, vr.h, 0, 0, view.width, view.height);
  const sx = view.width / vr.w, sy = view.height / vr.h;
  if ($('boxToggle').checked) drawBoxes(vctx, p, (x, y) => [(x * OW - vr.x) * sx, (y * OH - vr.y) * sy], 1.6, state.active);
  const z = OW / vr.w;
  $('zoomTag').textContent = z < 1.01 ? '전체 · 원본 5472×3648' :
    `배율 ×${z.toFixed(1)} · 원본 좌표 (${Math.round((vr.x / OW) * RES_W)}, ${Math.round((vr.y / OH) * RES_H)})`;
  document.querySelectorAll('.defects button').forEach(b => b.classList.toggle('on', +b.dataset.no === state.active));
}

function animateTo(t) {
  cancelAnimationFrame(anim);
  const s = { ...vr }, t0 = performance.now();
  const step = now => {
    const k = Math.min(1, (now - t0) / 320), e = 1 - Math.pow(1 - k, 3);
    for (const key of ['x', 'y', 'w', 'h']) vr[key] = s[key] + (t[key] - s[key]) * e;
    paint();
    if (k < 1) anim = requestAnimationFrame(step);
  };
  anim = requestAnimationFrame(step);
}

function focusDefect(df) {
  state.active = df.no;
  const b = df.box, cx = (b.x + b.w / 2) * OW, cy = (b.y + b.h / 2) * OH;
  let w = Math.max(b.w * OW * 1.8, OW / 6), h = w / 1.5;
  if (h < b.h * OH * 1.6) { h = b.h * OH * 1.6; w = h * 1.5; }
  w = Math.min(w, OW); h = Math.min(h, OH);
  animateTo({ x: clamp(cx - w / 2, 0, OW - w), y: clamp(cy - h / 2, 0, OH - h), w, h });
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

view.addEventListener('click', e => {
  const rect = view.getBoundingClientRect();
  const px = vr.x + ((e.clientX - rect.left) / rect.width) * vr.w, py = vr.y + ((e.clientY - rect.top) / rect.height) * vr.h;
  const w = vr.w > OW / 1.5 ? vr.w / 2.5 : OW, h = w / 1.5;
  animateTo({ x: clamp(px - w / 2, 0, OW - w), y: clamp(py - h / 2, 0, OH - h), w, h });
});
$('fitBtn').addEventListener('click', () => { state.active = null; animateTo({ x: 0, y: 0, w: OW, h: OH }); });
$('boxToggle').addEventListener('change', paint);
$('closeBtn').addEventListener('click', () => {
  $('detail').hidden = true; state.current = null;
  document.querySelector('.layout').classList.add('no-detail');
  document.querySelectorAll('.thumb.on').forEach(t => t.classList.remove('on'));
});

// ---------- 필터·페이지 ----------
document.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => {
  document.querySelectorAll('.chip').forEach(x => { x.classList.toggle('on', x === c); x.setAttribute('aria-pressed', x === c); });
  state.filter = c.dataset.f; state.page = 0; renderList();
}));
$('prevBtn').addEventListener('click', () => { state.page--; renderList(); });
$('nextBtn').addEventListener('click', () => { state.page++; renderList(); });

// ---------- 보고서 (CSV, 엑셀에서 열림) ----------
$('csvBtn').addEventListener('click', () => {
  const head = ['건물', '구역(면)', '구역(층)', '사진', '파손번호', '파손유형', '심각도', '추정 길이(px)', '추정 폭(px)', '실측(mm)', '촬영일', '점검자', '사진 해상도', '판독 소요(초)'];
  const rows = [head];
  filtered(scopePhotos()).forEach(p => p.defects.forEach(d => rows.push([
    p.g.b, p.g.f, p.g.k, p.file, d.no, d.type, d.sev, d.len ?? '', d.width ?? '', '촬영거리 정보 필요',
    p.date, p.inspector, `${RES_W}x${RES_H}`, p.sec,
  ])));
  const csv = '﻿' + rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = `외벽점검_${scopeName(state.scope).replace(/ · /g, '_')}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast(`${(rows.length - 1).toLocaleString()}행 보고서를 만들었습니다 (데모는 CSV, 실제 납품은 지정 엑셀 양식)`);
});
function toast(msg) {
  const t = document.createElement('div');
  t.setAttribute('role', 'status');
  t.style.cssText = 'position:fixed;left:50%;bottom:20px;transform:translateX(-50%);background:#1b1d21;color:#fff;padding:10px 16px;border-radius:10px;font-size:13px;z-index:30;max-width:calc(100% - 32px)';
  t.textContent = msg; document.body.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

// ---------- 일괄 등록 시뮬레이션 ----------
let simTimer = null;
$('importBtn').addEventListener('click', () => { $('importModal').hidden = false; $('impRun').focus(); });
$('impClose').addEventListener('click', () => { clearInterval(simTimer); $('importModal').hidden = true; $('importBtn').focus(); });
$('importModal').addEventListener('keydown', e => { if (e.key === 'Escape') $('impClose').click(); });
$('impRun').addEventListener('click', () => {
  clearInterval(simTimer);
  let reg = 0, det = 0, fail = 0, retried = 0, tick = 0;
  const failTotal = Math.round(TOTAL * 0.004);
  $('impRun').disabled = true;
  simTimer = setInterval(() => {
    tick++;
    reg = Math.min(TOTAL, reg + 900);
    det = Math.min(reg - fail, det + 520);
    if (tick % 3 === 0 && fail + retried < failTotal) fail += 7;
    if (det >= TOTAL - fail - 2 && fail > 0) { const k = Math.min(fail, 9); fail -= k; retried += k; det += k; }
    $('barReg').style.width = (reg / TOTAL) * 100 + '%';
    $('barDet').style.width = (det / TOTAL) * 100 + '%';
    $('barFail').style.width = Math.min(100, (fail / Math.max(1, failTotal)) * 100) + '%';
    $('numReg').textContent = reg.toLocaleString();
    $('numDet').textContent = Math.min(det, TOTAL).toLocaleString();
    $('numFail').textContent = `${fail}/${retried}`;
    $('impLog').textContent = `큐 처리 중 · 실패 ${fail}장 대기 · 재시도 완료 ${retried}장`;
    if (reg >= TOTAL && det >= TOTAL - fail && fail === 0) {
      clearInterval(simTimer);
      $('impRun').disabled = false;
      $('impLog').textContent = `완료 · ${TOTAL.toLocaleString()}장 등록, 실패 ${retried}장은 재시도로 처리 (시뮬레이션)`;
    }
  }, 60);
});

// ---------- 시작 ----------
$('totalCount').textContent = TOTAL.toLocaleString();
document.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', c.classList.contains('on')));
document.querySelector('.layout').classList.add('no-detail');
buildTree();
setScope({ b: '101동', f: '전면', k: null });

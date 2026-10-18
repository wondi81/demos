/* 장애인 선수 IMU 센서 데이터 관리 제안용 데모 — 가상 데이터, 브라우저(localStorage)에만 저장됩니다. */
const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const app = $('#app'), dlg = $('#dlg');
const KEY = 'athlete-sensor-v1';
const REQ = ['timestamp', 'side', 'acc_x', 'acc_y', 'acc_z', 'gyro_x', 'gyro_y', 'gyro_z'];
const NUMS = REQ.filter(c => c !== 'side');
const SPORTS = ['보치아', '탁구', '육상', '수영', '양궁'];
const FREQ = { 보치아: .5, 탁구: 1.6, 육상: 2.4, 수영: .9, 양궁: .3 };
const SIDE = { L: '좌측', R: '우측', B: '양측' };
const HZ = 20, SEC = 30;
const C = { L: '#1F5FA8', R: '#B5521B', A: '#234E5C', B: '#A23B5E', x: '#1F5FA8', y: '#23794F', z: '#A3590B' };

const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const BASE = new Date(2026, 9, 16);
function rng(a) { return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const hash = s => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };

/* ---------- 시드 데이터 ---------- */
function seed() {
  const r = rng(20261014), pick = a => a[Math.floor(r() * a.length)], int = (a, b) => a + Math.floor(r() * (b - a + 1));
  const limbs = [['L', '절단', '상완'], ['R', '절단', '전완'], ['L', '기능 제한', ''], ['R', '기능 제한', ''], ['B', '기능 제한', ''],
    ['R', '절단', '수부'], ['L', '절단', '전완'], ['R', '기능 제한', ''], ['L', '기능 제한', ''], ['B', '기능 제한', '']];
  const athletes = limbs.map(([side, kind, level], i) => ({
    id: `ATH-${pad(i + 1).padStart(3, '0')}`, sport: SPORTS[i % 5], height: int(150, 182), weight: int(45, 78),
    chest: int(78, 100), under: int(64, 82), side, kind, level, grade: kind === '절단' ? '' : String(int(1, 4)), memo: '',
  }));
  const products = [['P-01', '스포츠브라', '어댑트 원핸드', 'M', 'v1.0'], ['P-02', '스포츠브라', '어댑트 원핸드', 'L', 'v1.0'], ['P-03', '스포츠브라', '어댑트 원핸드', 'M', 'v2.0'],
    ['P-04', '스포츠브라', '프론트 지퍼형', 'S', 'v1.1'], ['P-05', '드로즈', '센서 포켓 드로즈', 'M', 'v1.0'], ['P-06', '드로즈', '센서 포켓 드로즈', 'L', 'v1.2']]
    .map(([id, type, model, size, ver]) => ({ id, type, model, size, ver, ratings: [] }));
  const memos = ['한 손 착용 가능', '센서 위치 밀림 약간', '어깨끈 조정 필요', '땀 배출 양호', '후크 대신 지퍼가 편함', ''];
  for (let i = 0; i < 26; i++) {
    const p = products[i % 6];
    p.ratings.push({ ath: pick(athletes).id, date: ymd(new Date(BASE - int(0, 120) * 864e5)), fit: int(2, 5), hold: int(2, 5), don: int(1, 5), sensor: int(2, 5), memo: pick(memos) });
  }
  products.forEach(p => p.ratings.sort((a, b) => b.date.localeCompare(a.date)));
  const bras = products.filter(p => p.type === '스포츠브라'), drs = products.filter(p => p.type === '드로즈');
  const raw = [];
  for (let i = 0; i < 60; i++) {
    const a = athletes[i % 10], back = int(0, 150);
    raw.push({ ath: a.id, date: ymd(new Date(BASE - back * 864e5)), back, start: pick(['09:00', '10:30', '14:00', '15:30', '19:00']), dur: pick([30, 45, 60, 90]),
      sport: a.sport, bra: pick(bras).id, dr: pick(drs).id, int: +((.75 + r() * .4) * (1 + .3 * (150 - back) / 150)).toFixed(3) });
  }
  raw.sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));
  const sessions = raw.map((s, i) => ({ id: `S-${pad(i + 1).padStart(4, '0')}`, ...s, src: i >= 54 ? 'none' : 'sim', file: '' }));
  return { athletes, products, sessions };
}

let db;
try { db = JSON.parse(localStorage.getItem(KEY)); } catch (e) { db = null; }
if (!db || !db.sessions) db = seed();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* 저장 불가 환경: 메모리로 계속 */ } };
const UP = {}, CACHE = {};

const st = { role: 'admin', me: 'ATH-001', view: 'athletes', sf: { ath: '', sport: '' },
  vf: { ath: '', sport: '', from: '', to: '', sel: [], sensor: 'gyro', side: 'L' }, up: { sid: '', res: null } };

const ath = id => db.athletes.find(a => a.id === id);
const prod = id => db.products.find(p => p.id === id);
const pname = id => { const p = prod(id); return p ? `${p.model} ${p.size} ${p.ver}` : '-'; };
const limb = a => `${SIDE[a.side]} ${a.kind}${a.level ? ` (${a.level})` : ''}${a.grade ? ` · ${a.grade}등급` : ''}`;
/* 권한의 단일 관문: 선수 모드에서는 본인 세션만 반환 */
const visible = () => st.role === 'athlete' ? db.sessions.filter(s => s.ath === st.me) : db.sessions;

/* ---------- 센서 데이터 ---------- */
function gen(s) {
  const a = ath(s.ath) || { side: 'L', kind: '기능 제한', grade: '2' }, rr = rng(hash(s.id));
  const k = a.kind === '절단' ? .3 : 1 - .15 * Number(a.grade || 2);
  const amp = { L: a.side === 'R' ? 1 : k, R: a.side === 'L' ? 1 : k };
  const w = 2 * Math.PI * (FREQ[s.sport] || 1) * (.9 + rr() * .2), n = v => (rr() - .5) * v, rows = [];
  for (let i = 0; i < HZ * SEC; i++) {
    const t = i / HZ;
    for (const side of ['L', 'R']) {
      const A = amp[side] * s.int, ph = side === 'R' ? Math.PI : 0, G = 150 * A, q = w * t + ph;
      rows.push({ t: i * 1000 / HZ, side, ax: +(.8 * A * Math.sin(q) + n(.1)).toFixed(3), ay: +(.4 * A * Math.cos(q) + n(.1)).toFixed(3),
        az: +(1 + .15 * A * Math.sin(2 * q) + n(.08)).toFixed(3), gx: +(G * Math.cos(q) + n(10)).toFixed(2),
        gy: +(.5 * G * Math.sin(q) + n(10)).toFixed(2), gz: +(.25 * G * Math.sin(q + 1) + n(8)).toFixed(2) });
    }
  }
  return rows;
}
function rowsOf(s) {
  if (s.src === 'sim') return CACHE[s.id] || (CACHE[s.id] = gen(s));
  if (s.src === 'upload') {
    if (!UP[s.id]) { try { UP[s.id] = JSON.parse(localStorage.getItem(`${KEY}:up:${s.id}`)); } catch (e) { /* 없음 */ } }
    return UP[s.id] || null;
  }
  return null;
}
const mag = (r, k) => k === 'gyro' ? Math.hypot(r.gx, r.gy, r.gz) : Math.hypot(r.ax, r.ay, r.az);
function stats(s) {
  const rows = rowsOf(s); if (!rows) return null;
  const o = {}; for (const sd of ['L', 'R']) { const rs = rows.filter(r => r.side === sd); o['rot' + sd] = rs.length ? rs.reduce((a, r) => a + mag(r, 'gyro'), 0) / rs.length : 0; o['acc' + sd] = rs.length ? rs.reduce((a, r) => a + mag(r, 'acc'), 0) / rs.length : 0; }
  o.n = rows.length; o.asym = (o.rotL + o.rotR) ? (o.rotL - o.rotR) / ((o.rotL + o.rotR) / 2) * 100 : 0;
  return o;
}
const toCSV = rows => [REQ.join(','), ...rows.map(r => [r.t, r.side, r.ax, r.ay, r.az, r.gx, r.gy, r.gz].join(','))].join('\n');

/* CSV 검사: 필수 열 누락 → missing, 값 오류 → errors */
function parseCSV(text) {
  const lines = String(text).replace(/^﻿/, '').split(/\r?\n/).filter(l => l.trim());
  if (!lines.length) return { ok: false, missing: [], extra: [], errors: ['빈 파일입니다.'], errCount: 1, rows: [] };
  const hdr = lines[0].split(',').map(h => h.trim().toLowerCase());
  const missing = REQ.filter(c => !hdr.includes(c)), extra = hdr.filter(h => h && !REQ.includes(h));
  if (missing.length) return { ok: false, missing, extra, hdr, errors: [], errCount: 0, rows: [] };
  const ix = Object.fromEntries(REQ.map(c => [c, hdr.indexOf(c)])), rows = [], errors = [];
  let errCount = 0;
  const err = m => { errCount++; if (errors.length < 5) errors.push(m); };
  for (let i = 1; i < lines.length; i++) {
    const v = lines[i].split(',').map(x => x.trim()), side = (v[ix.side] || '').toUpperCase();
    const bad = NUMS.filter(c => v[ix[c]] === undefined || v[ix[c]] === '' || isNaN(Number(v[ix[c]])));
    if (bad.length) { err(`${i + 1}행: ${bad.join(', ')} 값이 숫자가 아닙니다.`); continue; }
    if (side !== 'L' && side !== 'R') { err(`${i + 1}행: side 값은 L 또는 R 이어야 합니다 (입력: "${v[ix.side] || ''}").`); continue; }
    const g = c => Number(v[ix[c]]);
    rows.push({ t: g('timestamp'), side, ax: g('acc_x'), ay: g('acc_y'), az: g('acc_z'), gx: g('gyro_x'), gy: g('gyro_y'), gz: g('gyro_z') });
  }
  if (!rows.length && !errCount) err('데이터 행이 없습니다.');
  return { ok: !errCount, missing: [], extra, hdr, errors, errCount, rows };
}

function download(name, text, type) {
  const url = URL.createObjectURL(new Blob(['﻿' + text], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ---------- 화면 ---------- */
const MENU = {
  admin: [['관리', [['athletes', '선수 관리'], ['products', '제품 관리'], ['sessions', '운동 기록']]], ['데이터', [['upload', '센서 CSV 업로드'], ['viz', '조회 · 시각화 · 추출']]]],
  athlete: [['내 데이터', [['sessions', '내 운동 기록'], ['viz', '내 데이터 조회 · 추출']]]],
};
let charts = [];

function render() {
  charts.forEach(c => c.destroy()); charts = [];
  const menus = MENU[st.role], allowed = menus.flatMap(g => g[1].map(m => m[0]));
  if (!allowed.includes(st.view)) st.view = allowed[0];
  const a = ath(st.me);
  app.innerHTML = `
  <header class="top"><div class="wrap top-in">
    <div class="mark"><i></i><span>선수 IMU 센서 데이터 관리 <small>웹 MVP 데모</small></span></div>
    <div class="role">
      <div class="seg" role="group" aria-label="역할 전환">
        <button data-act="role" data-v="admin" class="${st.role === 'admin' ? 'on' : ''}">관리자로 보기</button>
        <button data-act="role" data-v="athlete" class="${st.role === 'athlete' ? 'on' : ''}">선수로 보기</button>
      </div>
      ${st.role === 'athlete' ? `<select class="in" id="me" aria-label="익명 ID 선택">${db.athletes.map(x => `<option ${x.id === st.me ? 'selected' : ''}>${x.id}</option>`).join('')}</select>` : ''}
      <button class="btn ghost sm" data-act="reset">데이터 초기화</button>
    </div>
  </div></header>
  <div class="wrap layout">
    <nav class="side" aria-label="메뉴">
      ${menus.map(([g, items]) => `<div class="grp">${g}</div>${items.map(([k, l]) => `<button data-act="view" data-v="${k}" class="${st.view === k ? 'on' : ''}">${l}</button>`).join('')}`).join('')}
      ${st.role === 'athlete' ? '<div class="lock">선수 관리 · 제품 관리 · 업로드 메뉴는 관리자 전용입니다.</div>' : ''}
    </nav>
    <main id="main">
      ${st.role === 'athlete' ? `<div class="banner" id="scope"><b>선수 모드 · ${esc(st.me)}</b> — 본인 데이터 ${visible().length}건만 표시됩니다. 다른 선수 데이터는 보이지 않습니다.${a ? ` <span class="muted">(${esc(a.sport)} · ${esc(limb(a))})</span>` : ''}</div>` : ''}
      ${VIEWS[st.view]()}
    </main>
  </div>`;
  if (st.view === 'viz') drawCharts();
}

const sportOpts = (v, all) => (all ? `<option value="">전체 종목</option>` : '') + SPORTS.map(s => `<option ${s === v ? 'selected' : ''}>${s}</option>`).join('');
const athOpts = (v, all) => (all ? `<option value="">전체 선수</option>` : '') + db.athletes.map(a => `<option value="${a.id}" ${a.id === v ? 'selected' : ''}>${a.id} · ${esc(a.sport)}</option>`).join('');
const srcTag = s => s.src === 'sim' ? '<span class="tag ok">센서 데이터</span>' : s.src === 'upload' ? `<span class="tag up" title="${esc(s.file)}">업로드 CSV</span>` : '<span class="tag no">센서 미연결</span>';

const VIEWS = {
  athletes() {
    return `<h2>선수 관리</h2><p class="lead">개인정보 없이 익명 ID로만 관리합니다. 상지 기능 특성은 센서 좌우 비교 해석에 사용됩니다.</p>
    <div class="card"><div class="bar"><div class="sp muted">등록 선수 ${db.athletes.length}명</div><button class="btn sm" data-act="athEdit">선수 등록</button></div>
    <div class="tw"><table><thead><tr><th>익명 ID</th><th>종목</th><th class="num">키(cm)</th><th class="num">체중(kg)</th><th class="num">가슴둘레</th><th class="num">밑가슴둘레</th><th>상지 기능 특성</th><th class="num">세션</th><th></th></tr></thead><tbody>
    ${db.athletes.map(a => `<tr><td><b>${a.id}</b></td><td>${esc(a.sport)}</td><td class="num">${a.height}</td><td class="num">${a.weight}</td><td class="num">${a.chest}</td><td class="num">${a.under}</td><td>${esc(limb(a))}</td><td class="num">${db.sessions.filter(s => s.ath === a.id).length}</td><td><button class="btn ghost sm" data-act="athEdit" data-v="${a.id}">수정</button></td></tr>`).join('')}
    </tbody></table></div></div>`;
  },
  products() {
    const avg = p => { if (!p.ratings.length) return '-'; return (p.ratings.reduce((s, r) => s + (r.fit + r.hold + r.don + r.sensor) / 4, 0) / p.ratings.length).toFixed(2); };
    return `<h2>제품 관리</h2><p class="lead">스포츠브라·드로즈의 모델·사이즈·버전과 착용 평가(착용감·고정력·착탈 용이성·센서 고정, 5점 척도)를 기록합니다.</p>
    <div class="card"><div class="bar"><div class="sp muted">등록 제품 ${db.products.length}종</div><button class="btn sm" data-act="prodEdit">제품 등록</button></div>
    <div class="tw"><table><thead><tr><th>코드</th><th>구분</th><th>모델</th><th>사이즈</th><th>버전</th><th class="num">평가 수</th><th class="num">평균 점수</th><th class="num">사용 세션</th><th></th></tr></thead><tbody>
    ${db.products.map(p => `<tr><td><b>${p.id}</b></td><td>${esc(p.type)}</td><td>${esc(p.model)}</td><td>${esc(p.size)}</td><td>${esc(p.ver)}</td><td class="num">${p.ratings.length}</td><td class="num">${avg(p)}</td><td class="num">${db.sessions.filter(s => s.bra === p.id || s.dr === p.id).length}</td>
    <td><button class="btn ghost sm" data-act="rate" data-v="${p.id}">착용 평가</button> <button class="btn ghost sm" data-act="prodEdit" data-v="${p.id}">수정</button></td></tr>`).join('')}
    </tbody></table></div></div>`;
  },
  sessions() {
    const admin = st.role === 'admin', f = st.sf;
    const list = visible().filter(s => (!admin || !f.ath || s.ath === f.ath) && (!f.sport || s.sport === f.sport)).slice().reverse();
    return `<h2>${admin ? '운동 기록 (세션)' : '내 운동 기록'}</h2><p class="lead">세션마다 착용 제품과 센서 데이터가 연결됩니다.</p>
    <div class="card"><div class="bar">
      ${admin ? `<label>선수<select class="in" data-sf="ath">${athOpts(f.ath, true)}</select></label>` : ''}
      <label>종목<select class="in" data-sf="sport">${sportOpts(f.sport, true)}</select></label>
      <div class="sp muted">${list.length}건</div>
      ${admin ? '<button class="btn sm" data-act="sesAdd">세션 등록</button>' : ''}
    </div>
    <div class="tw scroll" style="max-height:560px"><table><thead><tr><th>세션</th><th>선수</th><th>날짜</th><th>시작</th><th class="num">시간(분)</th><th>종목</th><th>스포츠브라</th><th>드로즈</th><th>센서</th></tr></thead><tbody>
    ${list.map(s => `<tr><td><b>${s.id}</b></td><td>${s.ath}</td><td>${s.date}</td><td>${s.start}</td><td class="num">${s.dur}</td><td>${esc(s.sport)}</td><td>${esc(pname(s.bra))}</td><td>${esc(pname(s.dr))}</td>
      <td>${srcTag(s)}${admin && s.src === 'none' ? ` <button class="btn ghost sm" data-act="goUp" data-v="${s.id}">업로드</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="9" class="empty">세션이 없습니다.</td></tr>'}
    </tbody></table></div></div>`;
  },
  upload() {
    const u = st.up, ses = db.sessions.slice().reverse();
    if (!u.sid) u.sid = (ses.find(s => s.src === 'none') || ses[0]).id;
    const r = u.res;
    let out = '';
    if (r && r.missing.length) out = `<div class="res err" id="upres"><b>형식 오류 — 필수 열이 없습니다: ${r.missing.join(', ')}</b><div class="cols">${REQ.map(c => `<code class="${r.missing.includes(c) ? 'miss' : ''}">${c}</code>`).join('')}</div>파일의 열: ${esc(r.hdr.join(', '))}<br>빨간 열을 추가한 뒤 다시 올려 주세요.</div>`;
    else if (r && !r.ok) out = `<div class="res err" id="upres"><b>값 오류 ${r.errCount}건</b><ul>${r.errors.map(e => `<li>${esc(e)}</li>`).join('')}</ul>${r.errCount > 5 ? `<div>외 ${r.errCount - 5}건</div>` : ''}</div>`;
    else if (r && r.ok) {
      const L = r.rows.filter(x => x.side === 'L').length, dur = (Math.max(...r.rows.map(x => x.t)) - Math.min(...r.rows.map(x => x.t))) / 1000;
      out = `<div class="res ok" id="upres"><b>형식 확인 완료 — ${esc(r.name)}</b><br>${r.rows.length.toLocaleString()}행 · 좌측 ${L} / 우측 ${r.rows.length - L} · 측정 ${dur.toFixed(1)}초${r.extra.length ? ` · 추가 열(무시): ${esc(r.extra.join(', '))}` : ''}
      <div class="acts" style="justify-content:flex-start"><button class="btn sm" data-act="link">${u.sid} 세션에 연결</button></div></div>`;
    }
    return `<h2>센서 CSV 업로드</h2><p class="lead">IMU 센서에서 내려받은 CSV의 열 구성을 먼저 검사하고, 맞으면 운동 세션에 연결합니다.</p>
    <div class="steps">
      <div class="card"><h3>1. 연결할 세션 선택</h3><p class="sub">센서 미연결 세션이 먼저 선택됩니다. 이미 데이터가 있으면 교체됩니다.</p>
        <select class="in" id="upSid" style="width:100%">${ses.map(s => `<option value="${s.id}" ${s.id === u.sid ? 'selected' : ''}>${s.id} · ${s.ath} · ${s.date} · ${esc(s.sport)} · ${s.src === 'none' ? '미연결' : s.src === 'upload' ? '업로드됨' : '데이터 있음'}</option>`).join('')}</select>
        <h3 style="margin-top:18px">2. CSV 파일 선택</h3><p class="sub">UTF-8 CSV, 첫 줄은 열 이름.</p>
        <input type="file" accept=".csv,text/csv" id="upFile" class="file" aria-label="CSV 파일 선택">
        ${out}
      </div>
      <div class="card"><h3>정의된 CSV 형식</h3><p class="sub">아래 8개 열이 모두 있어야 합니다. 순서는 상관없고 추가 열은 무시합니다.</p>
        <div class="tw"><table><thead><tr><th>열</th><th>내용</th></tr></thead><tbody>
          <tr><td><code>timestamp</code></td><td>세션 시작 기준 경과 ms</td></tr><tr><td><code>side</code></td><td>L(좌) 또는 R(우) 센서</td></tr>
          <tr><td><code>acc_x · acc_y · acc_z</code></td><td>가속도 (g)</td></tr><tr><td><code>gyro_x · gyro_y · gyro_z</code></td><td>각속도 (deg/s)</td></tr>
        </tbody></table></div>
        <pre class="sample">timestamp,side,acc_x,acc_y,acc_z,gyro_x,gyro_y,gyro_z\n0,L,0.012,0.402,1.003,148.20,3.10,32.40\n0,R,-0.020,-0.395,0.998,-151.00,-2.40,-30.90</pre>
        <h3 style="margin-top:16px">샘플 CSV 내려받기</h3><p class="sub">내려받은 파일을 2단계 파일 선택에 바로 올려 시험해 보세요.</p>
        <div class="bar"><button class="btn ghost sm" data-act="sample" data-v="ok">정상 샘플</button><button class="btn ghost sm" data-act="sample" data-v="bad">열 빠진 오류 샘플</button></div>
      </div>
    </div>`;
  },
  viz() {
    const f = st.vf, admin = st.role === 'admin', list = vizList();
    f.sel = f.sel.filter(id => list.some(s => s.id === id));
    if (!f.sel.length) f.sel = list.slice(-2).reverse().map(s => s.id);
    const lab = id => f.sel[0] === id ? '<span class="tag a">A</span>' : f.sel[1] === id ? '<span class="tag b">B</span>' : '';
    return `<h2>${admin ? '조회 · 시각화 · 추출' : '내 데이터 조회 · 추출'}</h2><p class="lead">필터로 세션을 찾고, 비교할 세션을 최대 2개(A·B) 선택합니다. 추출은 현재 검색 결과 기준입니다.</p>
    <div class="card"><div class="bar">
      ${admin ? `<label>선수<select class="in" data-vf="ath">${athOpts(f.ath, true)}</select></label>` : ''}
      <label>종목<select class="in" data-vf="sport">${sportOpts(f.sport, true)}</select></label>
      <label>시작일<input type="date" class="in" data-vf="from" value="${f.from}"></label>
      <label>종료일<input type="date" class="in" data-vf="to" value="${f.to}"></label>
      <label>센서<select class="in" data-vf="sensor"><option value="gyro" ${f.sensor === 'gyro' ? 'selected' : ''}>자이로(각속도)</option><option value="acc" ${f.sensor === 'acc' ? 'selected' : ''}>가속도</option></select></label>
      <label>측<select class="in" data-vf="side"><option value="L" ${f.side === 'L' ? 'selected' : ''}>좌측(L)</option><option value="R" ${f.side === 'R' ? 'selected' : ''}>우측(R)</option></select></label>
    </div>
    <div class="bar"><div class="sp muted" id="vcount">검색 결과 ${list.length}건 (센서 데이터 있는 세션)</div>
      <button class="btn ghost sm" data-act="exp" data-v="csv" ${list.length ? '' : 'disabled'}>CSV 내려받기</button>
      <button class="btn ghost sm" data-act="exp" data-v="xls" ${list.length ? '' : 'disabled'}>엑셀(.xls) 내려받기</button>
      <button class="btn ghost sm" data-act="exp" data-v="raw" ${f.sel[0] ? '' : 'disabled'}>세션 A 원시 데이터 CSV</button></div>
    <div class="tw scroll"><table><thead><tr><th>비교</th><th>세션</th><th>선수</th><th>날짜</th><th>종목</th><th>착용 제품</th><th class="num">평균 회전 L</th><th class="num">평균 회전 R</th><th class="num">좌우 차이</th><th>출처</th></tr></thead><tbody>
    ${list.slice().reverse().map(s => { const x = stats(s); return `<tr class="${f.sel.includes(s.id) ? 'sel' : ''}"><td><label style="display:flex;gap:6px;align-items:center"><input type="checkbox" data-sel="${s.id}" ${f.sel.includes(s.id) ? 'checked' : ''} aria-label="${s.id} 비교 선택">${lab(s.id)}</label></td>
      <td><b>${s.id}</b></td><td>${s.ath}</td><td>${s.date}</td><td>${esc(s.sport)}</td><td>${esc(pname(s.bra))}</td><td class="num">${x.rotL.toFixed(1)}</td><td class="num">${x.rotR.toFixed(1)}</td><td class="num">${x.asym.toFixed(1)}%</td><td>${srcTag(s)}</td></tr>`; }).join('') || '<tr><td colspan="10" class="empty">조건에 맞는 세션이 없습니다.</td></tr>'}
    </tbody></table></div></div>
    ${list.length ? `<div class="grid2">
      <div class="card"><h3>센서 값 시간축 — 세션 A</h3><p class="sub">${f.sel[0] || ''} · ${SIDE[f.side]} · ${f.sensor === 'gyro' ? '각속도 deg/s' : '가속도 g'} · x/y/z · 처음 10초</p><div class="chart"><canvas id="c1"></canvas></div></div>
      <div class="card"><h3>두 세션 겹쳐 비교</h3><p class="sub">${f.sel[1] ? `A ${f.sel[0]} vs B ${f.sel[1]}` : '세션을 하나 더 선택하면 겹쳐 보입니다'} · ${SIDE[f.side]} 합성 크기 · 처음 10초</p><div class="chart"><canvas id="c2"></canvas></div></div>
      <div class="card"><h3>좌우 움직임 비교 — 세션 A</h3><p class="sub">side 값 기준 L/R 합성 ${f.sensor === 'gyro' ? '각속도' : '가속도'} · 처음 10초 (수치는 전체 구간)</p><div class="chart"><canvas id="c3"></canvas></div><div class="kpis" id="lr"></div></div>
      <div class="card"><h3>기간별 추이</h3><p class="sub">검색 결과 세션별 평균 회전량(deg/s), 좌·우</p><div class="chart"><canvas id="c4"></canvas></div></div>
    </div>` : ''}`;
  },
};

function vizList() {
  const f = st.vf, admin = st.role === 'admin';
  return visible().filter(s => s.src !== 'none' && rowsOf(s) && (!admin || !f.ath || s.ath === f.ath) && (!f.sport || s.sport === f.sport) && (!f.from || s.date >= f.from) && (!f.to || s.date <= f.to));
}

function drawCharts() {
  if (!window.Chart) { document.querySelectorAll('.chart').forEach(el => { el.innerHTML = '<div class="empty">차트 라이브러리를 불러오지 못했습니다(오프라인).</div>'; }); return; }
  const f = st.vf, A = db.sessions.find(s => s.id === f.sel[0]), B = db.sessions.find(s => s.id === f.sel[1]);
  if (!A) return;
  const k = f.sensor, pre = k === 'gyro' ? 'g' : 'a';
  const line = (id, datasets, x = 'linear', labels) => {
    const el = $('#' + id); if (!el) return;
    charts.push(new Chart(el, { type: 'line', data: { labels, datasets: datasets.map(d => ({ borderWidth: 1.4, pointRadius: x === 'linear' ? 0 : 2.5, tension: .25, ...d, backgroundColor: d.borderColor })) },
      options: { responsive: true, maintainAspectRatio: false, animation: false, parsing: x === 'linear' ? false : undefined, normalized: true,
        interaction: { mode: 'nearest', intersect: false, axis: 'x' },
        plugins: { legend: { labels: { boxWidth: 10, boxHeight: 10, font: { size: 11 } } } },
        scales: { x: { type: x, ...(x === 'linear' ? { title: { display: true, text: '시간(초)', font: { size: 11 } } } : {}), ticks: { font: { size: 10.5 }, maxTicksLimit: 8 }, grid: { color: '#EEF1F2' } },
          y: { ticks: { font: { size: 10.5 } }, grid: { color: '#EEF1F2' } } } } }));
  };
  const side = (s, sd) => (rowsOf(s) || []).filter(r => r.side === sd);
  const ra = side(A, f.side).filter(r => r.t <= 10000); // 가독성: 처음 10초만 표시
  line('c1', ['x', 'y', 'z'].map(ax => ({ label: `${k}_${ax}`, borderColor: C[ax], data: ra.map(r => ({ x: r.t / 1000, y: r[pre + ax] })) })));
  const m = (rs, label, col) => ({ label, borderColor: col, data: rs.map(r => ({ x: r.t / 1000, y: +mag(r, k).toFixed(3) })) });
  line('c2', [m(ra, `A ${A.id} (${A.date})`, C.A), ...(B ? [m(side(B, f.side).filter(r => r.t <= 10000), `B ${B.id} (${B.date})`, C.B)] : [])]);
  const w10 = sd => side(A, sd).filter(r => r.t <= 10000);
  line('c3', [m(w10('L'), '좌측 L', C.L), m(w10('R'), '우측 R', C.R)]);
  const x = stats(A);
  $('#lr').innerHTML = `<div class="kpi">평균 회전 L<b>${x.rotL.toFixed(1)}</b></div><div class="kpi">평균 회전 R<b>${x.rotR.toFixed(1)}</b></div><div class="kpi">좌우 차이<b>${x.asym.toFixed(1)}%</b></div><div class="kpi">선수 특성<b style="font-size:13px">${esc(limb(ath(A.ath)))}</b></div>`;
  const list = vizList();
  line('c4', [{ label: '좌측 L', borderColor: C.L, data: list.map(s => +stats(s).rotL.toFixed(1)) }, { label: '우측 R', borderColor: C.R, data: list.map(s => +stats(s).rotR.toFixed(1)) }], 'category', list.map(s => `${s.date.slice(5)}(${s.ath.slice(4)})`));
}

function exportRows() {
  const head = ['session_id', 'athlete_id', 'date', 'start', 'duration_min', 'sport', 'bra', 'drawers', 'source', 'rows', 'avg_rot_L', 'avg_rot_R', 'lr_diff_pct', 'avg_acc_L', 'avg_acc_R'];
  return [head, ...vizList().map(s => { const x = stats(s); return [s.id, s.ath, s.date, s.start, s.dur, s.sport, pname(s.bra), pname(s.dr), s.src === 'upload' ? `upload:${s.file}` : 'sensor', x.n, x.rotL.toFixed(2), x.rotR.toFixed(2), x.asym.toFixed(2), x.accL.toFixed(3), x.accR.toFixed(3)]; })];
}

/* ---------- 대화상자 ---------- */
function openDlg(html, onSubmit) {
  dlg.innerHTML = `<form class="dlg" method="dialog">${html}<div class="acts"><button type="button" class="btn ghost" data-close>취소</button><button class="btn" value="ok">저장</button></div></form>`;
  const form = $('form', dlg);
  $('[data-close]', dlg).onclick = () => dlg.close();
  form.onsubmit = e => { e.preventDefault(); const d = Object.fromEntries(new FormData(form)); if (onSubmit(d) !== false) { dlg.close(); save(); render(); } };
  dlg.showModal();
}
const sel = (name, opts, v) => `<select class="in" name="${name}">${opts.map(o => { const [val, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(val)}" ${String(val) === String(v) ? 'selected' : ''}>${esc(l)}</option>`; }).join('')}</select>`;
const inp = (name, v, type = 'text', extra = '') => `<input class="in" name="${name}" type="${type}" value="${esc(v)}" ${extra}>`;

function athEdit(id) {
  const a = ath(id) || { id: `ATH-${String(db.athletes.length + 1).padStart(3, '0')}`, sport: SPORTS[0], height: 165, weight: 58, chest: 86, under: 72, side: 'L', kind: '절단', level: '전완', grade: '', memo: '' };
  openDlg(`<h3>${id ? '선수 정보 수정' : '선수 등록'}</h3><div class="form">
    <label>익명 ID${inp('id', a.id, 'text', 'readonly')}</label><label>종목${sel('sport', SPORTS, a.sport)}</label>
    <label>키(cm)${inp('height', a.height, 'number', 'min="100" max="220" required')}</label><label>체중(kg)${inp('weight', a.weight, 'number', 'min="25" max="150" required')}</label>
    <label>가슴둘레(cm)${inp('chest', a.chest, 'number', 'min="50" max="150" required')}</label><label>밑가슴둘레(cm)${inp('under', a.under, 'number', 'min="50" max="130" required')}</label>
    <label>해당 측${sel('side', [['L', '좌측'], ['R', '우측'], ['B', '양측']], a.side)}</label><label>유형${sel('kind', ['절단', '기능 제한'], a.kind)}</label>
    <label>절단 부위${sel('level', [['', '해당 없음'], '상완', '전완', '수부'], a.level)}</label><label>기능 제한 등급${sel('grade', [['', '해당 없음'], ['1', '1등급(경도)'], ['2', '2등급'], ['3', '3등급'], ['4', '4등급(중증)']], a.grade)}</label>
    <label class="full">메모${inp('memo', a.memo)}</label></div>`, d => {
    ['height', 'weight', 'chest', 'under'].forEach(k => d[k] = Number(d[k]));
    if (d.kind === '기능 제한') d.level = ''; else d.grade = '';
    if (d.kind === '기능 제한' && !d.grade) d.grade = '2';
    const i = db.athletes.findIndex(x => x.id === d.id);
    if (i >= 0) db.athletes[i] = { ...db.athletes[i], ...d }; else db.athletes.push(d);
    Object.keys(CACHE).forEach(k => delete CACHE[k]);
  });
}
function prodEdit(id) {
  const p = prod(id) || { id: `P-${pad(db.products.length + 1)}`, type: '스포츠브라', model: '', size: 'M', ver: 'v1.0', ratings: [] };
  openDlg(`<h3>${id ? '제품 수정' : '제품 등록'}</h3><div class="form">
    <label>코드${inp('id', p.id, 'text', 'readonly')}</label><label>구분${sel('type', ['스포츠브라', '드로즈'], p.type)}</label>
    <label class="full">모델명${inp('model', p.model, 'text', 'required maxlength="40"')}</label>
    <label>사이즈${sel('size', ['XS', 'S', 'M', 'L', 'XL'], p.size)}</label><label>버전${inp('ver', p.ver, 'text', 'required maxlength="10"')}</label></div>`, d => {
    const i = db.products.findIndex(x => x.id === d.id);
    if (i >= 0) db.products[i] = { ...db.products[i], ...d }; else db.products.push({ ...d, ratings: [] });
  });
}
function rate(id) {
  const p = prod(id), n5 = [1, 2, 3, 4, 5];
  openDlg(`<h3>착용 평가 — ${esc(p.model)} ${esc(p.size)} ${esc(p.ver)}</h3>
    <div class="tw scroll" style="max-height:200px;margin-bottom:14px"><table><thead><tr><th>날짜</th><th>선수</th><th class="num">착용감</th><th class="num">고정력</th><th class="num">착탈</th><th class="num">센서 고정</th><th>메모</th></tr></thead><tbody>
    ${p.ratings.map(r => `<tr><td>${r.date}</td><td>${r.ath}</td><td class="num">${r.fit}</td><td class="num">${r.hold}</td><td class="num">${r.don}</td><td class="num">${r.sensor}</td><td>${esc(r.memo)}</td></tr>`).join('') || '<tr><td colspan="7" class="empty">평가 없음</td></tr>'}</tbody></table></div>
    <div class="form"><label>선수${sel('ath', db.athletes.map(a => a.id), db.athletes[0].id)}</label><label>평가일${inp('date', ymd(new Date()), 'date', 'required')}</label>
    <label>착용감${sel('fit', n5, 4)}</label><label>고정력${sel('hold', n5, 4)}</label><label>착탈 용이성(한 손)${sel('don', n5, 3)}</label><label>센서 위치 고정${sel('sensor', n5, 4)}</label>
    <label class="full">메모${inp('memo', '', 'text', 'maxlength="60"')}</label></div>`, d => {
    p.ratings.unshift({ ath: d.ath, date: d.date, fit: +d.fit, hold: +d.hold, don: +d.don, sensor: +d.sensor, memo: d.memo });
  });
}
function sesAdd() {
  const bras = db.products.filter(p => p.type === '스포츠브라').map(p => [p.id, pname(p.id)]), drs = db.products.filter(p => p.type === '드로즈').map(p => [p.id, pname(p.id)]);
  openDlg(`<h3>세션 등록</h3><div class="form">
    <label>선수${sel('ath', db.athletes.map(a => [a.id, `${a.id} · ${a.sport}`]), db.athletes[0].id)}</label><label>종목${sel('sport', SPORTS, db.athletes[0].sport)}</label>
    <label>날짜${inp('date', ymd(new Date()), 'date', 'required')}</label><label>시작 시각${inp('start', '10:00', 'time', 'required')}</label>
    <label>운동 시간(분)${inp('dur', 60, 'number', 'min="5" max="300" required')}</label><label>스포츠브라${sel('bra', bras, bras[0] && bras[0][0])}</label>
    <label>드로즈${sel('dr', drs, drs[0] && drs[0][0])}</label></div><p class="muted" style="font-size:13px;margin:10px 0 0">등록 후 센서 CSV 업로드 메뉴에서 데이터를 연결합니다.</p>`, d => {
    const n = Math.max(0, ...db.sessions.map(s => Number(s.id.slice(2)))) + 1;
    db.sessions.push({ id: `S-${String(n).padStart(4, '0')}`, ath: d.ath, date: d.date, start: d.start, dur: +d.dur, sport: d.sport, bra: d.bra, dr: d.dr, int: 1, src: 'none', file: '' });
    db.sessions.sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));
  });
  const f = $('form', dlg); f.ath.onchange = () => { f.sport.value = ath(f.ath.value).sport; };
}

/* ---------- 이벤트 ---------- */
app.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const v = b.dataset.v;
  switch (b.dataset.act) {
    case 'role': st.role = v; st.vf.sel = []; st.vf.ath = ''; break;
    case 'view': st.view = v; break;
    case 'reset':
      if (!confirm('모든 변경 내용을 지우고 처음 가상 데이터로 되돌릴까요?')) return;
      try { Object.keys(localStorage).filter(k => k.startsWith(KEY)).forEach(k => localStorage.removeItem(k)); } catch (err) { /* 무시 */ }
      db = seed(); [UP, CACHE].forEach(o => Object.keys(o).forEach(k => delete o[k])); st.up = { sid: '', res: null }; st.vf.sel = []; break;
    case 'athEdit': return athEdit(v);
    case 'prodEdit': return prodEdit(v);
    case 'rate': return rate(v);
    case 'sesAdd': return sesAdd();
    case 'goUp': st.view = 'upload'; st.up = { sid: v, res: null }; break;
    case 'sample': {
      const t = db.sessions.find(x => x.id === st.up.sid), s = { id: 'SAMPLE', ath: t ? t.ath : 'ATH-001', sport: t ? t.sport : '탁구', int: 1 };
      const rows = gen(s).slice(0, HZ * 20 * 2);
      const ok = toCSV(rows);
      if (v === 'ok') download('sample_sensor_ok.csv', ok, 'text/csv;charset=utf-8');
      else download('sample_sensor_missing_cols.csv', ok.split('\n').map(l => l.split(',').filter((_, i) => i !== 1 && i !== 7).join(',')).join('\n'), 'text/csv;charset=utf-8');
      return;
    }
    case 'link': {
      const s = db.sessions.find(x => x.id === st.up.sid), r = st.up.res; if (!s || !r || !r.ok) return;
      UP[s.id] = r.rows; delete CACHE[s.id]; s.src = 'upload'; s.file = r.name;
      try { localStorage.setItem(`${KEY}:up:${s.id}`, JSON.stringify(r.rows)); } catch (err) { /* 용량 초과 시 이번 화면에서만 유지 */ }
      save(); st.up.res = null; st.view = 'viz'; st.vf = { ...st.vf, ath: s.ath, sport: '', from: '', to: '', sel: [s.id] }; break;
    }
    case 'exp': {
      const rows = exportRows(), stamp = ymd(new Date()).replace(/-/g, '');
      if (v === 'csv') download(`sensor_sessions_${stamp}.csv`, rows.map(r => r.map(c => /[",\n]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : c).join(',')).join('\n'), 'text/csv;charset=utf-8');
      else if (v === 'xls') download(`sensor_sessions_${stamp}.xls`, `<html><head><meta charset="utf-8"></head><body><table border="1">${rows.map((r, i) => `<tr>${r.map(c => i ? `<td>${esc(c)}</td>` : `<th>${esc(c)}</th>`).join('')}</tr>`).join('')}</table></body></html>`, 'application/vnd.ms-excel');
      else { const s = db.sessions.find(x => x.id === st.vf.sel[0]); if (s && visible().includes(s)) download(`${s.id}_${s.ath}_raw.csv`, toCSV(rowsOf(s)), 'text/csv;charset=utf-8'); }
      return;
    }
    default: return;
  }
  render();
});
app.addEventListener('change', async e => {
  const t = e.target;
  if (t.id === 'me') { st.me = t.value; st.vf.sel = []; }
  else if (t.dataset.sf) st.sf[t.dataset.sf] = t.value;
  else if (t.dataset.vf) { st.vf[t.dataset.vf] = t.value; if (['ath', 'sport', 'from', 'to'].includes(t.dataset.vf)) st.vf.sel = []; }
  else if (t.dataset.sel) {
    const f = st.vf, id = t.dataset.sel;
    f.sel = t.checked ? [...f.sel.filter(x => x !== id), id].slice(-2) : f.sel.filter(x => x !== id);
    if (!f.sel.length) { t.checked = true; f.sel = [id]; }
  }
  else if (t.id === 'upSid') { st.up.sid = t.value; return; }
  else if (t.id === 'upFile') {
    const file = t.files[0]; if (!file) return;
    st.up.res = { ...parseCSV(await file.text()), name: file.name };
  }
  else return;
  render();
});

render();

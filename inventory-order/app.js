/* 재고·거래처·발주 관리 제안용 데모 — 데이터는 브라우저(localStorage)에만 저장됩니다. */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => Number(n).toLocaleString('ko-KR');
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const app = $('#app');
const KEY = 'inventory-order-v1';
const WH = ['본사 창고', '물류센터'];
const ST = { req: ['요청', 'p-req'], ord: ['발주', 'p-ord'], done: ['입고 완료', 'p-done'] };

/* 메뉴와 역할별 권한 */
const MENUS = [
  ['stock', '재고 현황', ['admin', 'staff']],
  ['moves', '입출고 등록', ['admin', 'staff']],
  ['orders', '발주', ['admin', 'staff']],
  ['vendors', '거래처', ['admin']],
  ['products', '상품 관리', ['admin']],
  ['excel', '엑셀 업·다운로드', ['admin']],
];

function seed() {
  const products = [
    ['A-1001', '종이 박스 (소)', '개', 200], ['A-1002', '종이 박스 (중)', '개', 150], ['A-1003', '종이 박스 (대)', '개', 100],
    ['B-2001', '에어캡 롤 50m', '롤', 20], ['B-2002', 'OPP 테이프 48mm', '개', 120], ['C-3001', '물류 라벨지 A4', '권', 30],
    ['C-3002', '감열 송장 용지', '롤', 40], ['D-4001', '스트레치 필름', '롤', 15],
  ].map(([code, name, unit, safe]) => ({ code, name, unit, safe }));
  const q = [[420, 180], [130, 90], [60, 20], [34, 12], [95, 40], [52, 8], [18, 6], [22, 9]];
  const stock = Object.fromEntries(products.map((p, i) => [p.code, { [WH[0]]: q[i][0], [WH[1]]: q[i][1] }]));
  const vendors = [
    { id: 'v1', name: '한빛포장', items: '박스·테이프', manager: '김OO' },
    { id: 'v2', name: '대성물산', items: '에어캡·필름', manager: '이OO' },
    { id: 'v3', name: '세진라벨', items: '라벨·송장 용지', manager: '박OO' },
  ];
  const d = today();
  const orders = [
    { id: 'o1', no: 'PO-0001', vendor: 'v3', code: 'C-3002', qty: 60, wh: WH[0], status: 'ord', date: d, by: '관리자' },
    { id: 'o2', no: 'PO-0002', vendor: 'v1', code: 'A-1003', qty: 120, wh: WH[1], status: 'req', date: d, by: '현장 직원' },
  ];
  const moves = [
    { id: 'm1', date: d, type: 'out', wh: WH[0], code: 'A-1001', qty: 40, memo: '오전 출고분', by: '현장 직원' },
    { id: 'm2', date: d, type: 'in', wh: WH[1], code: 'B-2002', qty: 60, memo: '정기 입고', by: '현장 직원' },
  ];
  return { user: null, products, stock, vendors, orders, moves, seq: 3 };
}
let db;
try { db = JSON.parse(localStorage.getItem(KEY)); } catch (e) { }
if (!db || !db.products) db = seed();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { } };

const st = { tab: 'stock', wh: 'all', q: '', lowOnly: false, preview: null };
const prod = c => db.products.find(p => p.code === c);
const qty = (c, w) => (db.stock[c] || {})[w] || 0;
const total = c => WH.reduce((s, w) => s + qty(c, w), 0);
const can = tab => MENUS.find(m => m[0] === tab)[2].includes(db.user.role);
const who = () => db.user.role === 'admin' ? '관리자' : '현장 직원';

/* 변경 이력: 공고 범위대로 기본 팝업 알림 수준 */
function toast(msg, sub) {
  const el = document.createElement('div'); el.className = 'toast';
  el.innerHTML = esc(msg) + (sub ? `<small>${esc(sub)}</small>` : '');
  $('#toasts').appendChild(el); setTimeout(() => el.remove(), 3200);
}
/* 재고 반영 — 입출고·발주 입고·엑셀 업로드가 모두 여기를 지난다 */
function applyMove(m) {
  const cur = qty(m.code, m.wh), next = m.type === 'in' ? cur + m.qty : cur - m.qty;
  if (next < 0) return `${m.wh} ${prod(m.code).name} 재고(${fmt(cur)})보다 많이 출고할 수 없습니다.`;
  db.stock[m.code] = { ...db.stock[m.code], [m.wh]: next };
  db.moves.unshift({ id: 'm' + Date.now() + Math.random().toString(36).slice(2, 6), date: today(), by: who(), memo: '', ...m });
  return null;
}

/* ---------- 로그인 ---------- */
function renderLogin() {
  app.innerHTML = `<div class="login"><form class="card" id="lf">
    <div class="logo" style="margin-bottom:16px"><i aria-hidden="true"></i><span>재고·발주 관리</span></div>
    <h1>로그인</h1><p>역할에 따라 보이는 메뉴가 달라집니다.</p>
    <fieldset style="border:0;padding:0;margin:0"><legend class="f" style="font-weight:700;font-size:13px;margin-bottom:6px">데모 계정 선택</legend>
    <div class="roles">
      <label><input type="radio" name="role" value="admin" checked><b>관리자</b><small>전체 메뉴 · 발주 상태 변경 · 거래처·상품·엑셀</small></label>
      <label><input type="radio" name="role" value="staff"><b>현장 직원</b><small>재고 조회 · 입출고 등록 · 발주 요청</small></label>
    </div></fieldset>
    <label class="f" for="pw">비밀번호</label><input class="in" id="pw" type="password" value="demo1234" autocomplete="off">
    <button class="btn" style="width:100%;margin-top:16px">로그인</button>
    <p class="hint" style="margin:12px 0 0">데모에서는 비밀번호를 확인하지 않습니다.</p>
  </form></div>`;
  $('#lf').onsubmit = e => { e.preventDefault(); db.user = { role: $('input[name=role]:checked').value }; st.tab = 'stock'; save(); render(); };
}

/* ---------- 셸 ---------- */
function render() {
  if (!db.user) return renderLogin();
  if (!can(st.tab)) st.tab = 'stock';
  const admin = db.user.role === 'admin';
  app.innerHTML = `<div class="shell">
    <nav class="side" aria-label="메뉴">
      <div class="logo"><i aria-hidden="true"></i><span>재고·발주 관리</span></div>
      ${MENUS.map(([k, n, roles]) => roles.includes(db.user.role)
        ? `<button data-tab="${k}" ${st.tab === k ? 'aria-current="page"' : ''}>${n}</button>`
        : '').join('')}
      <div class="who"><span>로그인 </span><span class="role ${db.user.role}">${admin ? '관리자' : '직원'}</span>
        <button class="btn ghost sm" id="logout">로그아웃</button></div>
    </nav>
    <main class="main" id="main">${PAGES[st.tab]()}</main>
  </div>`;
  $$('.side [data-tab]').forEach(b => b.onclick = () => { st.tab = b.dataset.tab; st.preview = null; render(); });
  $('#logout').onclick = () => { db.user = null; save(); render(); };
  BIND[st.tab] && BIND[st.tab]();
}
const head = (t, p, right = '') => `<div class="head"><div><h1>${t}</h1><p>${p}</p></div><span class="sp"></span>${right}</div>`;
const prodOpts = sel => db.products.map(p => `<option value="${p.code}" ${p.code === sel ? 'selected' : ''}>${esc(p.code)} · ${esc(p.name)}</option>`).join('');
const whOpts = sel => WH.map(w => `<option ${w === sel ? 'selected' : ''}>${w}</option>`).join('');
const vName = id => (db.vendors.find(v => v.id === id) || {}).name || '-';

/* ---------- 페이지 ---------- */
const PAGES = {
  stock() {
    const low = db.products.filter(p => total(p.code) < p.safe);
    const open = db.orders.filter(o => o.status !== 'done');
    const todays = db.moves.filter(m => m.date === today());
    return head('재고 현황', '창고별·상품별 현재 재고입니다. 입출고·발주 입고가 등록되는 즉시 반영됩니다.') + `
    <div class="sum">
      <div class="card"><small>상품 수</small><b>${db.products.length}</b></div>
      <div class="card ${low.length ? 'warn' : ''}"><small>안전재고 미달</small><b>${low.length}</b></div>
      <div class="card"><small>진행 중 발주</small><b>${open.length}</b></div>
      <div class="card"><small>오늘 입출고</small><b>${todays.length}</b></div>
    </div>
    <div class="tools">
      <select class="in" id="fwh" aria-label="창고">${['all', ...WH].map(w => `<option value="${w}" ${st.wh === w ? 'selected' : ''}>${w === 'all' ? '전체 창고' : w}</option>`).join('')}</select>
      <input class="in grow" id="fq" type="search" placeholder="상품명·코드 검색" value="${esc(st.q)}" aria-label="검색">
      <label class="btn ghost" style="font-weight:600"><input type="checkbox" id="flow" ${st.lowOnly ? 'checked' : ''} style="accent-color:var(--brand)"> 부족 재고만</label>
    </div>
    <div class="card tbl" id="stockTbl">${stockTable()}</div>`;
  },
  moves() {
    return head('입출고 등록', '저장하면 해당 창고 재고가 바로 바뀝니다. 재고보다 많은 출고는 막습니다.') + `
    <div class="grid2">
      <form class="card pad form" id="mf">
        <div class="seg" role="radiogroup" aria-label="구분">
          <label><input type="radio" name="type" value="in" checked>입고</label><label><input type="radio" name="type" value="out">출고</label>
        </div>
        <div><label class="f" for="mwh">창고</label><select class="in" id="mwh">${whOpts()}</select></div>
        <div><label class="f" for="mcode">상품</label><select class="in" id="mcode">${prodOpts()}</select></div>
        <div class="row">
          <div><label class="f" for="mqty">수량</label><input class="in num" id="mqty" type="number" min="1" step="1" required inputmode="numeric"></div>
          <div><label class="f">현재 재고</label><div class="in num" id="mcur" aria-live="polite"></div></div>
        </div>
        <div><label class="f" for="mmemo">메모</label><input class="in" id="mmemo" maxlength="40" placeholder="예: 오후 출고분"></div>
        <p class="err" id="merr" role="alert"></p>
        <button class="btn">저장하고 재고 반영</button>
      </form>
      <div class="card tbl"><table><thead><tr><th>일자</th><th>구분</th><th>창고</th><th>상품</th><th class="num">수량</th><th>등록</th></tr></thead>
      <tbody>${db.moves.slice(0, 12).map(m => `<tr><td>${m.date}</td><td><span class="pill ${m.type === 'in' ? 'p-in' : 'p-out'}">${m.type === 'in' ? '입고' : '출고'}</span></td><td>${m.wh}</td><td>${esc(prod(m.code)?.name)}<span class="sub">${esc(m.memo)}</span></td><td class="num">${m.type === 'in' ? '+' : '−'}${fmt(m.qty)}</td><td>${esc(m.by)}</td></tr>`).join('') || '<tr><td colspan="6" class="empty">내역 없음</td></tr>'}</tbody></table></div>
    </div>`;
  },
  orders() {
    const admin = db.user.role === 'admin';
    return head('발주', admin ? '요청 → 발주 → 입고 완료 순서로 진행합니다. 입고 완료 시 지정 창고 재고가 자동으로 늘어납니다.' : '현장에서는 발주 요청만 등록합니다. 상태 변경은 관리자 권한입니다.') + `
    <div class="grid2">
      <form class="card pad form" id="of">
        <h2>${admin ? '발주 등록' : '발주 요청'}</h2>
        <div><label class="f" for="ov">거래처</label><select class="in" id="ov">${db.vendors.map(v => `<option value="${v.id}">${esc(v.name)} (${esc(v.items)})</option>`).join('')}</select></div>
        <div><label class="f" for="ocode">상품</label><select class="in" id="ocode">${prodOpts()}</select></div>
        <div class="row">
          <div><label class="f" for="oqty">수량</label><input class="in num" id="oqty" type="number" min="1" required inputmode="numeric"></div>
          <div><label class="f" for="owh">입고 창고</label><select class="in" id="owh">${whOpts()}</select></div>
        </div>
        <button class="btn">${admin ? '발주 등록' : '요청 보내기'}</button>
      </form>
      <div class="card tbl"><table><thead><tr><th>번호</th><th>거래처</th><th>상품</th><th class="num">수량</th><th>상태</th><th></th></tr></thead>
      <tbody>${db.orders.slice().reverse().map(o => `<tr><td>${o.no}<span class="sub">${o.date} · ${esc(o.by)}</span></td><td>${esc(vName(o.vendor))}</td><td>${esc(prod(o.code)?.name)}<span class="sub">입고: ${o.wh}</span></td><td class="num">${fmt(o.qty)}</td>
        <td><span class="pill ${ST[o.status][1]}">${ST[o.status][0]}</span></td>
        <td>${o.status === 'done' ? '' : `<button class="btn ${o.status === 'req' ? 'ghost' : ''} sm" data-next="${o.id}" ${admin ? '' : 'disabled title="관리자만 변경할 수 있습니다"'}>${o.status === 'req' ? '발주 처리' : '입고 처리'}</button>`}</td></tr>`).join('')}</tbody></table></div>
    </div>`;
  },
  vendors() {
    return head('거래처', '발주 등록 시 선택하는 거래처 목록입니다.') + `
    <div class="grid2">
      <form class="card pad form" id="vf"><h2>거래처 등록</h2>
        <div><label class="f" for="vn">거래처명</label><input class="in" id="vn" required maxlength="30"></div>
        <div><label class="f" for="vi">취급 품목</label><input class="in" id="vi" maxlength="40" placeholder="예: 박스·테이프"></div>
        <div><label class="f" for="vm">담당자</label><input class="in" id="vm" maxlength="20"></div>
        <button class="btn">등록</button></form>
      <div class="card tbl"><table><thead><tr><th>거래처명</th><th>취급 품목</th><th>담당자</th><th class="num">발주 건수</th></tr></thead>
      <tbody>${db.vendors.map(v => `<tr><td><b>${esc(v.name)}</b></td><td>${esc(v.items)}</td><td>${esc(v.manager)}</td><td class="num">${db.orders.filter(o => o.vendor === v.id).length}</td></tr>`).join('')}</tbody></table></div>
    </div>`;
  },
  products() {
    return head('상품 관리', '상품 코드는 엑셀 업로드 시 기준 키로 쓰입니다.') + `
    <div class="grid2">
      <form class="card pad form" id="pf"><h2>상품 등록·수정</h2>
        <div><label class="f" for="pc">상품 코드</label><input class="in" id="pc" required maxlength="12" placeholder="예: A-1004"></div>
        <div><label class="f" for="pn">상품명</label><input class="in" id="pn" required maxlength="30"></div>
        <div class="row"><div><label class="f" for="pu">단위</label><input class="in" id="pu" value="개" maxlength="4"></div>
        <div><label class="f" for="ps">안전재고</label><input class="in num" id="ps" type="number" min="0" value="0"></div></div>
        <p class="hint">이미 있는 코드를 입력하면 해당 상품이 수정됩니다.</p>
        <button class="btn">저장</button></form>
      <div class="card tbl"><table><thead><tr><th>코드</th><th>상품명</th><th>단위</th><th class="num">안전재고</th><th></th></tr></thead>
      <tbody>${db.products.map(p => `<tr><td>${esc(p.code)}</td><td>${esc(p.name)}</td><td>${esc(p.unit)}</td><td class="num">${fmt(p.safe)}</td><td><button class="btn ghost sm" data-edit="${esc(p.code)}">수정</button></td></tr>`).join('')}</tbody></table></div>
    </div>`;
  },
  excel() {
    const pv = st.preview;
    return head('엑셀 업·다운로드', '표준 템플릿(CSV, 엑셀에서 열림)으로 입출고를 한 번에 올리고, 현재 재고를 내려받습니다.') + `
    <div class="stack">
      <div class="card pad"><h2>내려받기</h2><div class="tools" style="margin:0">
        <button class="btn ghost" data-dl="tpl">입출고 업로드 템플릿</button>
        <button class="btn ghost" data-dl="stock">현재 재고 (창고별)</button>
        <button class="btn ghost" data-dl="moves">입출고 내역</button>
        <button class="btn ghost" data-dl="orders">발주 내역</button></div></div>
      <div class="card pad"><h2>입출고 일괄 업로드</h2>
        <label class="drop" id="drop" for="file"><b>CSV 파일을 끌어 놓거나 눌러서 선택</b><br><span class="hint">템플릿 열: 구분(입고/출고), 창고, 상품코드, 수량, 메모 · 반영 전에 미리보기로 검사합니다</span></label>
        <input type="file" id="file" accept=".csv,text/csv" hidden>
        <div class="tools" style="margin:12px 0 0"><button class="btn ghost sm" id="sample">예시 데이터로 미리보기</button></div>
      </div>
      ${pv ? `<div class="card pad"><div class="head" style="margin-bottom:10px"><div><h2 style="margin:0">미리보기 · ${esc(pv.name)}</h2><p>${pv.rows.length}행 중 정상 ${pv.rows.filter(r => !r.err).length}행 · 오류 ${pv.rows.filter(r => r.err).length}행 (오류 행은 반영하지 않습니다)</p></div><span class="sp"></span>
        <button class="btn ghost sm" id="cancel">취소</button><button class="btn sm" id="apply" ${pv.rows.some(r => !r.err) ? '' : 'disabled'}>정상 행 재고에 반영</button></div>
        <div class="tbl"><table><thead><tr><th>#</th><th>구분</th><th>창고</th><th>상품코드</th><th class="num">수량</th><th>메모</th><th>검사</th></tr></thead>
        <tbody>${pv.rows.map((r, i) => `<tr><td>${i + 2}</td><td>${esc(r.raw[0])}</td><td>${esc(r.raw[1])}</td><td>${esc(r.raw[2])}</td><td class="num">${esc(r.raw[3])}</td><td>${esc(r.raw[4])}</td><td>${r.err ? `<span class="pill p-err">${esc(r.err)}</span>` : '<span class="pill p-done">정상</span>'}</td></tr>`).join('')}</tbody></table></div></div>` : ''}
    </div>`;
  },
};

function stockTable() {
  const q = st.q.trim().toLowerCase();
  const rows = db.products.filter(p => (!q || (p.code + p.name).toLowerCase().includes(q)) && (!st.lowOnly || total(p.code) < p.safe));
  const whs = st.wh === 'all' ? WH : [st.wh];
  if (!rows.length) return '<div class="empty">조건에 맞는 상품이 없습니다.</div>';
  return `<table><thead><tr><th>코드</th><th>상품명</th>${whs.map(w => `<th class="num">${w}</th>`).join('')}${st.wh === 'all' ? '<th class="num">합계</th>' : ''}<th class="num">안전재고</th><th>상태</th></tr></thead>
  <tbody>${rows.map(p => {
    const t = total(p.code), low = t < p.safe;
    return `<tr class="${low ? 'low' : ''}"><td>${esc(p.code)}</td><td><b>${esc(p.name)}</b></td>${whs.map(w => `<td class="num">${fmt(qty(p.code, w))}</td>`).join('')}${st.wh === 'all' ? `<td class="num"><b>${fmt(t)}</b> ${esc(p.unit)}</td>` : ''}<td class="num">${fmt(p.safe)}</td><td>${low ? '<span class="pill p-low">부족</span>' : '<span class="pill p-done">정상</span>'}</td></tr>`;
  }).join('')}</tbody></table>`;
}

/* ---------- CSV ---------- */
function parseCSV(text) {
  const rows = []; let row = [], cell = '', q = false;
  text = text.replace(/^﻿/, '');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(x => x.trim()));
}
function validate(raw) {
  const [t, w, c, n] = raw.map(x => (x || '').trim());
  if (t !== '입고' && t !== '출고') return '구분은 입고/출고';
  if (!WH.includes(w)) return '없는 창고';
  if (!prod(c)) return '없는 상품코드';
  if (!/^\d+$/.test(n) || +n < 1) return '수량 오류';
  return null;
}
function preview(name, text) {
  const rows = parseCSV(text).slice(1).map(raw => ({ raw, err: validate(raw) }));
  st.preview = { name, rows }; render();
}
function download(name, rows) {
  const csv = '﻿' + rows.map(r => r.map(v => /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v).join(',')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
const TPL_HEAD = ['구분(입고/출고)', '창고', '상품코드', '수량', '메모'];

/* ---------- 이벤트 ---------- */
const BIND = {
  stock() {
    $('#fwh').onchange = e => { st.wh = e.target.value; $('#stockTbl').innerHTML = stockTable(); };
    $('#fq').oninput = e => { st.q = e.target.value; $('#stockTbl').innerHTML = stockTable(); };
    $('#flow').onchange = e => { st.lowOnly = e.target.checked; $('#stockTbl').innerHTML = stockTable(); };
  },
  moves() {
    const cur = () => { const p = prod($('#mcode').value); $('#mcur').textContent = `${fmt(qty(p.code, $('#mwh').value))} ${p.unit}`; };
    $('#mcode').onchange = cur; $('#mwh').onchange = cur; cur();
    $('#mf').onsubmit = e => {
      e.preventDefault();
      const m = { type: $('input[name=type]:checked').value, wh: $('#mwh').value, code: $('#mcode').value, qty: +$('#mqty').value, memo: $('#mmemo').value.trim() };
      if (!(m.qty > 0)) return $('#merr').textContent = '수량을 입력하세요.';
      const err = applyMove(m);
      if (err) return $('#merr').textContent = err;
      save(); render(); $('#mwh').value = m.wh; $('#mcode').value = m.code; BIND.moves();
      toast(`${m.type === 'in' ? '입고' : '출고'} 저장 · 재고 반영`, `${prod(m.code).name} ${m.wh} → ${fmt(qty(m.code, m.wh))}${prod(m.code).unit} (${who()})`);
    };
  },
  orders() {
    $('#of').onsubmit = e => {
      e.preventDefault();
      const n = +$('#oqty').value; if (!(n > 0)) return;
      const admin = db.user.role === 'admin';
      const o = { id: 'o' + Date.now(), no: 'PO-' + String(db.seq++).padStart(4, '0'), vendor: $('#ov').value, code: $('#ocode').value, qty: n, wh: $('#owh').value, status: admin ? 'ord' : 'req', date: today(), by: who() };
      db.orders.push(o); save(); render(); toast(`${o.no} ${admin ? '발주 등록' : '발주 요청'}`, `${vName(o.vendor)} · ${prod(o.code).name} ${fmt(n)}`);
    };
    $$('[data-next]').forEach(b => b.onclick = () => {
      if (db.user.role !== 'admin') return;
      const o = db.orders.find(x => x.id === b.dataset.next);
      if (o.status === 'req') { o.status = 'ord'; toast(`${o.no} 상태 변경: 요청 → 발주`, `변경자 ${who()}`); }
      else if (o.status === 'ord') {
        applyMove({ type: 'in', wh: o.wh, code: o.code, qty: o.qty, memo: `${o.no} 발주 입고` });
        o.status = 'done'; toast(`${o.no} 입고 완료 · 재고 +${fmt(o.qty)}`, `${prod(o.code).name} ${o.wh} → ${fmt(qty(o.code, o.wh))}`);
      }
      save(); render();
    });
  },
  vendors() {
    $('#vf').onsubmit = e => {
      e.preventDefault();
      const v = { id: 'v' + Date.now(), name: $('#vn').value.trim(), items: $('#vi').value.trim(), manager: $('#vm').value.trim() };
      if (!v.name) return;
      db.vendors.push(v); save(); render(); toast('거래처 등록', v.name);
    };
  },
  products() {
    $$('[data-edit]').forEach(b => b.onclick = () => { const p = prod(b.dataset.edit); $('#pc').value = p.code; $('#pn').value = p.name; $('#pu').value = p.unit; $('#ps').value = p.safe; $('#pn').focus(); });
    $('#pf').onsubmit = e => {
      e.preventDefault();
      const p = { code: $('#pc').value.trim().toUpperCase(), name: $('#pn').value.trim(), unit: $('#pu').value.trim() || '개', safe: Math.max(0, +$('#ps').value || 0) };
      const old = prod(p.code);
      if (old) Object.assign(old, p); else { db.products.push(p); db.stock[p.code] = Object.fromEntries(WH.map(w => [w, 0])); }
      save(); render(); toast(old ? '상품 수정' : '상품 등록', `${p.code} ${p.name}`);
    };
  },
  excel() {
    $$('[data-dl]').forEach(b => b.onclick = () => {
      const k = b.dataset.dl, d = today();
      if (k === 'tpl') download('입출고_업로드_템플릿.csv', [TPL_HEAD, ['입고', WH[0], db.products[0].code, '10', '예시 행 - 지우고 사용']]);
      if (k === 'stock') download(`재고현황_${d}.csv`, [['상품코드', '상품명', ...WH, '합계', '안전재고'], ...db.products.map(p => [p.code, p.name, ...WH.map(w => qty(p.code, w)), total(p.code), p.safe])]);
      if (k === 'moves') download(`입출고내역_${d}.csv`, [['일자', '구분', '창고', '상품코드', '수량', '메모', '등록'], ...db.moves.map(m => [m.date, m.type === 'in' ? '입고' : '출고', m.wh, m.code, m.qty, m.memo, m.by])]);
      if (k === 'orders') download(`발주내역_${d}.csv`, [['번호', '일자', '거래처', '상품코드', '수량', '창고', '상태'], ...db.orders.map(o => [o.no, o.date, vName(o.vendor), o.code, o.qty, o.wh, ST[o.status][0]])]);
    });
    const read = f => { if (!f) return; const r = new FileReader(); r.onload = () => preview(f.name, r.result); r.readAsText(f, 'utf-8'); };
    $('#file').onchange = e => read(e.target.files[0]);
    const drop = $('#drop');
    drop.ondragover = e => { e.preventDefault(); drop.classList.add('on'); };
    drop.ondragleave = () => drop.classList.remove('on');
    drop.ondrop = e => { e.preventDefault(); drop.classList.remove('on'); read(e.dataTransfer.files[0]); };
    $('#sample').onclick = () => preview('예시_입출고.csv', [TPL_HEAD.join(','), `입고,${WH[0]},A-1003,80,거래처 입고`, `출고,${WH[1]},A-1001,50,"택배 출고, 오후"`, `출고,${WH[0]},C-3002,5,`, `입고,제3창고,A-1002,10,`, `출고,${WH[0]},Z-9999,3,`, `입고,${WH[1]},B-2001,abc,`].join('\n'));
    if (!st.preview) return;
    $('#cancel').onclick = () => { st.preview = null; render(); };
    $('#apply').onclick = () => {
      let ok = 0; const fails = [];
      st.preview.rows.filter(r => !r.err).forEach(r => {
        const [t, w, c, n, memo] = r.raw.map(x => (x || '').trim());
        const err = applyMove({ type: t === '입고' ? 'in' : 'out', wh: w, code: c, qty: +n, memo: memo || '엑셀 업로드' });
        err ? fails.push(err) : ok++;
      });
      st.preview = null; save(); render();
      toast(`엑셀 업로드 ${ok}행 반영`, fails.length ? `재고 부족으로 ${fails.length}행 제외` : '재고 현황에 반영되었습니다');
    };
  },
};

render();

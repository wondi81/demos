/* 다시봄 책방(가상) 수험 중고도서 쇼핑몰 데모. 결제·ERP 연동 없이 화면 흐름만 보여주며 데이터는 localStorage에만 저장된다. */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const app = $('#app');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const won = n => n.toLocaleString('ko-KR') + '원';
const RATE = { A: .6, B: .45, C: .3 };
const GRADE = { A: ['A급', '필기 없음, 사용감 거의 없음'], B: ['B급', '연필 필기 일부, 모서리 사용감'], C: ['C급', '형광펜·필기 많음, 내용 확인엔 지장 없음'] };
const CATS = ['전체', '자격증', '공무원', '수능'];
const HUES = { 자격증: ['#2B55D8', '#1C3C9E'], 공무원: ['#1D7A4E', '#135638'], 수능: ['#B4452F', '#862F1F'] };
const price = b => Math.round(b.list * RATE[b.grade] / 100) * 100;

/* ---------- 가상 도서 데이터 (ISBN은 예시 번호) ---------- */
const SEED = [
  ['9791100000011', '전기기사 필기 기출 7개년', '자격증', '전기기사', 2026, 32000, 'A', 3],
  ['9791100000028', '정보처리기사 실기 핵심 요약', '자격증', '정보처리기사', 2026, 28000, 'B', 5],
  ['9791100000035', '컴퓨터활용능력 1급 필기', '자격증', '컴활 1급', 2025, 22000, 'C', 2],
  ['9791100000042', '공인중개사 1차 기본서 세트', '자격증', '공인중개사', 2026, 68000, 'A', 1],
  ['9791100000059', '9급 공무원 국어 기본서', '공무원', '9급 공채', 2026, 34000, 'A', 4],
  ['9791100000066', '9급 공무원 한국사 기출 1200제', '공무원', '9급 공채', 2025, 29000, 'B', 6],
  ['9791100000073', '경찰공무원 형사법 판례집', '공무원', '경찰 채용', 2026, 38000, 'B', 0],
  ['9791100000080', '소방공무원 소방학개론', '공무원', '소방 채용', 2025, 31000, 'C', 2],
  ['9791100000097', '수능 수학 기출 문제집 (미적분)', '수능', '수학', 2026, 19000, 'A', 7],
  ['9791100000103', '수능 국어 비문학 독해 연습', '수능', '국어', 2026, 17000, 'B', 3],
  ['9791100000110', '수능 영어 어휘 3000', '수능', '영어', 2025, 15000, 'C', 9],
  ['9791100000127', '수능 사회탐구 생활과윤리 개념서', '수능', '사회탐구', 2026, 18000, 'A', 2],
].map(([isbn, title, cat, exam, year, list, grade, stock], i) => ({ id: i + 1, isbn, title, cat, exam, year, list, grade, stock }));

const KEY = 'usedbook-v1';
let db;
try { db = JSON.parse(localStorage.getItem(KEY)); } catch { db = null; }
if (!db || !db.books) db = { books: SEED.map(b => ({ ...b })), cart: {}, orders: [], inq: [], log: [] };
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch {} updCnt(); };
const book = id => db.books.find(b => b.id === +id);

const cover = (b, big) => { const [c1, c2] = HUES[b.cat] || HUES.자격증;
  return `<div class="cover" style="background:linear-gradient(155deg,${c1},${c2})" aria-hidden="true">${big === 'mini' ? '' : `<span class="ex">${esc(b.exam)}</span><span class="tt">${esc(b.title)}</span><span class="yr num">${b.year}년판</span>`}</div>`; };
const gradeTag = g => `<span class="grade g-${g}">${GRADE[g][0]}</span>`;

/* ---------- 로고 시안 3종 (SVG) ---------- */
const LOGOS = [
  { name: '펼친 책 + 새싹', note: '"다시 봄"을 펼친 책 가운데 돋는 싹으로. 작게 줄여도 형태가 남습니다.',
    svg: (c = '#14213D', a = '#2B55D8') => `<svg viewBox="0 0 64 64" role="img" aria-label="다시봄 책방 로고 시안 1"><rect width="64" height="64" rx="16" fill="${c}"/><path d="M12 22c7-3 14-2 20 3v24c-6-5-13-6-20-3z" fill="#fff"/><path d="M52 22c-7-3-14-2-20 3v24c6-5 13-6 20-3z" fill="#fff" opacity=".82"/><path d="M32 25c0-6 3-10 9-11-1 6-4 9-9 11z" fill="${a}"/><path d="M32 25c-1-4-3-6-7-7 0 4 3 6 7 7z" fill="${a}" opacity=".7"/></svg>` },
  { name: '두 권의 책등', note: '물려받는 책을 두 권의 책등으로. 바코드 라벨·택배 박스 스티커에 쓰기 좋습니다.',
    svg: (c = '#14213D', a = '#2B55D8') => `<svg viewBox="0 0 64 64" role="img" aria-label="다시봄 책방 로고 시안 2"><rect width="64" height="64" rx="16" fill="#fff" stroke="${c}" stroke-width="3"/><rect x="17" y="14" width="12" height="36" rx="2" fill="${c}"/><rect x="33" y="18" width="12" height="32" rx="2" fill="${a}" transform="rotate(8 39 34)"/><rect x="19.5" y="20" width="7" height="2.5" fill="#fff"/><rect x="19.5" y="41" width="7" height="2.5" fill="#fff"/></svg>` },
  { name: '"다" 한 글자 워드마크', note: '"다시봄"의 첫 글자를 책 모양 사각형 안에. 앱 아이콘·파비콘으로 확장하기 쉽습니다.',
    svg: (c = '#14213D', a = '#2B55D8') => `<svg viewBox="0 0 64 64" role="img" aria-label="다시봄 책방 로고 시안 3"><rect width="64" height="64" rx="16" fill="${a}"/><path d="M14 14h30a6 6 0 0 1 6 6v30H20a6 6 0 0 1-6-6z" fill="#fff"/><text x="31" y="43" text-anchor="middle" font-family="Apple SD Gothic Neo,Malgun Gothic,sans-serif" font-weight="800" font-size="24" fill="${c}">다</text></svg>` },
];
$('#logoMark').innerHTML = LOGOS[0].svg();

/* ---------- 라우팅 ---------- */
function route() {
  const [r, id] = (location.hash.slice(1) || 'home').split('/');
  $$('.nav a').forEach(a => a.toggleAttribute('aria-current', false));
  const cur = $(`.nav a[data-r="${r === 'b' ? 'home' : r === 'order' ? 'cart' : r}"]`);
  if (cur) cur.setAttribute('aria-current', 'page');
  ({ b: () => detail(book(id) || db.books[0]), cart, order, sell, admin, logo }[r] || home)(id);
}
addEventListener('hashchange', () => { route(); scrollTo(0, 0); });
const updCnt = () => { $('#cnt').textContent = Object.values(db.cart).reduce((a, b) => a + b, 0); };

/* ---------- 홈: 카테고리·검색·등급 필터 ---------- */
const F = { cat: '전체', q: '', g: '' };
function home() {
  const total = db.books.reduce((a, b) => a + b.stock, 0);
  app.innerHTML = `<section class="hero"><div><h1>합격한 사람의 책을, 반값 가까이에</h1>
      <p class="sub" style="margin:0">자격증·공무원·수능 수험서만 모았습니다. 상태 등급으로 필기 정도를 미리 확인하세요.</p></div>
      <div class="stat"><div><b class="num">${db.books.length}</b>종</div><div><b class="num">${total}</b>권 재고</div></div></section>
    <div class="filters">
      <div class="tabs" role="group" aria-label="시험 분류">${CATS.map(c => `<button aria-pressed="${c === F.cat}" data-c="${c}">${c}</button>`).join('')}</div>
      <label class="search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><input id="q" type="search" placeholder="책 제목, 시험명, ISBN으로 검색" aria-label="도서 검색" value="${esc(F.q)}"></label>
      <select class="sel" id="g" aria-label="상태 등급"><option value="">등급 전체</option>${Object.keys(GRADE).map(g => `<option value="${g}" ${F.g === g ? 'selected' : ''}>${GRADE[g][0]}</option>`).join('')}</select>
    </div>
    <div class="books" id="books"></div>`;
  drawBooks();
  $$('.tabs button').forEach(b => b.onclick = () => { F.cat = b.dataset.c; $$('.tabs button').forEach(x => x.setAttribute('aria-pressed', x === b)); drawBooks(); });
  $('#q').oninput = e => { F.q = e.target.value; drawBooks(); };
  $('#g').onchange = e => { F.g = e.target.value; drawBooks(); };
}
function drawBooks() {
  const q = F.q.trim().toLowerCase();
  const list = db.books.filter(b => (F.cat === '전체' || b.cat === F.cat) && (!F.g || b.grade === F.g)
    && (!q || (b.title + b.exam + b.isbn).toLowerCase().includes(q)));
  $('#books').innerHTML = list.length ? list.map(b => `<a class="book" href="#b/${b.id}">${cover(b)}
      <div class="meta"><div class="row">${gradeTag(b.grade)}${b.stock ? '' : '<span class="soldout">품절</span>'}</div>
      <div class="nm">${esc(b.title)}</div>
      <div class="pr num"><span class="off">${Math.round((1 - price(b) / b.list) * 100)}%</span><b>${won(price(b))}</b><s>${won(b.list)}</s></div></div></a>`).join('')
    : `<p class="empty">찾는 책이 없습니다. 매입문의에 ISBN을 남겨 주시면 입고 시 알려드리는 기능으로 확장할 수 있습니다.</p>`;
}

/* ---------- 상품 상세 ---------- */
function detail(b) {
  const p = price(b);
  app.innerHTML = `<a class="back" href="#home">← 도서 목록</a>
    <div class="detail">${cover(b, true)}
      <div><div class="row">${gradeTag(b.grade)}<span style="color:var(--muted);font-size:13px">${esc(b.cat)} · ${esc(b.exam)}</span></div>
        <h1 style="margin-top:6px">${esc(b.title)}</h1>
        <div class="price num"><b>${won(p)}</b><s>정가 ${won(b.list)}</s><span class="off">${Math.round((1 - p / b.list) * 100)}% 할인</span></div>
        <div class="gradebox" aria-label="상태 등급 기준">${Object.entries(GRADE).map(([g, [n, d]]) => `<div class="${g === b.grade ? 'on' : ''}"><b>${n}${g === b.grade ? ' · 이 책' : ''}</b>${d}</div>`).join('')}</div>
        <dl class="spec"><dt>ISBN</dt><dd class="num">${b.isbn}</dd><dt>판</dt><dd class="num">${b.year}년판</dd><dt>재고</dt><dd class="num" id="stk">${b.stock ? b.stock + '권' : '품절'}</dd><dt>배송</dt><dd>결제 후 출고(데모 문구)</dd></dl>
        <div class="row"><button class="btn" id="add" ${b.stock ? '' : 'disabled'}>장바구니 담기</button><button class="btn ghost" id="now" ${b.stock ? '' : 'disabled'}>바로 주문</button></div>
      </div></div>`;
  const add = () => { const n = db.cart[b.id] || 0; if (n >= b.stock) return toast('재고보다 많이 담을 수 없습니다.'), false; db.cart[b.id] = n + 1; save(); return true; };
  $('#add').onclick = () => add() && toast('장바구니에 담았습니다.');
  $('#now').onclick = () => { if (db.cart[b.id] || add()) location.hash = 'order'; };
}

/* ---------- 장바구니 ---------- */
const cartLines = () => Object.entries(db.cart).map(([id, q]) => ({ b: book(id), q })).filter(x => x.b && x.q > 0);
const ship = sum => sum >= 30000 || !sum ? 0 : 3000;
function summary(lines) {
  const sum = lines.reduce((a, { b, q }) => a + price(b) * q, 0), list = lines.reduce((a, { b, q }) => a + b.list * q, 0);
  return { sum, list, ship: ship(sum), html: `<div class="sumrow"><span>정가 합계</span><span class="num">${won(list)}</span></div>
    <div class="sumrow"><span>중고 할인</span><span class="num">-${won(list - sum)}</span></div>
    <div class="sumrow"><span>배송비 <small>(3만원 이상 무료, 예시)</small></span><span class="num">${won(ship(sum))}</span></div>
    <div class="sumrow total"><span>결제 금액</span><span class="num">${won(sum + ship(sum))}</span></div>` };
}
function cart() {
  const lines = cartLines();
  if (!lines.length) { app.innerHTML = `<h1>장바구니</h1><div class="panel done"><b>장바구니가 비어 있습니다</b><p class="sub">시험 분류에서 필요한 책을 찾아 담아 보세요.</p><a class="btn" href="#home">도서 보러 가기</a></div>`; return; }
  const s = summary(lines);
  app.innerHTML = `<h1>장바구니</h1><p class="sub">중고도서는 권마다 재고가 적어 담은 순서대로 확보되지 않습니다.</p>
    <div class="two"><div class="panel">${lines.map(({ b, q }) => `<div class="line">${cover(b, 'mini')}<div><div class="nm">${esc(b.title)}</div><small>${GRADE[b.grade][0]} · ${won(price(b))}</small></div>
      <div class="qty"><button aria-label="${esc(b.title)} 수량 줄이기" data-id="${b.id}" data-d="-1">−</button><span class="num">${q}</span><button aria-label="${esc(b.title)} 수량 늘리기" data-id="${b.id}" data-d="1">+</button></div></div>`).join('')}</div>
    <div class="panel">${s.html}<a class="btn" href="#order" style="width:100%;margin-top:14px">주문서 작성</a></div></div>`;
  $$('.qty button').forEach(btn => btn.onclick = () => {
    const b = book(btn.dataset.id), n = (db.cart[b.id] || 0) + +btn.dataset.d;
    if (n > b.stock) return toast('재고가 부족합니다.');
    if (n <= 0) delete db.cart[b.id]; else db.cart[b.id] = n;
    save(); cart();
  });
}

/* ---------- 주문서 (PG 연동 자리) ---------- */
function order() {
  const lines = cartLines();
  if (!lines.length) return cart();
  const s = summary(lines);
  app.innerHTML = `<h1>주문서</h1><p class="sub">실제 결제는 일어나지 않습니다. 회원 정보가 있으면 배송지는 자동으로 채워지는 자리입니다.</p>
    <form class="two" id="of" novalidate><div class="panel form">
      <h2>받는 분</h2>
      <div class="grid2">${fld('nm', '이름', 'text', '예: 김수험')}${fld('ph', '휴대폰 번호', 'tel', '숫자만 입력')}</div>
      ${fld('ad', '주소', 'text', '도로명 주소 (실서비스는 주소 검색 연동)')}
      <h2 style="margin-top:8px">결제 수단</h2>
      <div class="pay" role="radiogroup" aria-label="결제 수단">${['신용카드', '계좌이체', '간편결제'].map((m, i) => `<label><input type="radio" name="pm" value="${m}" ${i ? '' : 'checked'}>${m}</label>`).join('')}</div>
      <div class="pg">국내 PG 결제창이 열리는 자리입니다. 어느 PG사를 쓸지는 미팅에서 정하고, 결제 성공·실패·취소 응답을 받아 주문 상태를 바꾸도록 연결합니다.</div>
    </div>
    <div class="panel">${lines.map(({ b, q }) => `<div class="sumrow"><span>${esc(b.title)} × ${q}</span></div>`).join('')}${s.html}
      <button class="btn" style="width:100%;margin-top:14px" type="submit">${won(s.sum + s.ship)} 결제하기 (데모)</button></div></form>`;
  $('#of').onsubmit = e => {
    e.preventDefault();
    const v = { nm: $('#nm').value.trim(), ph: $('#ph').value.replace(/\D/g, ''), ad: $('#ad').value.trim() };
    const errs = { nm: !v.nm && '이름을 입력해 주세요.', ph: !/^01\d{8,9}$/.test(v.ph) && '휴대폰 번호 10~11자리를 입력해 주세요.', ad: v.ad.length < 5 && '주소를 입력해 주세요.' };
    let first;
    for (const k in errs) { const el = $('#' + k); el.setAttribute('aria-invalid', !!errs[k]); $('#' + k + '-e').textContent = errs[k] || ''; if (errs[k] && !first) first = el; }
    if (first) return first.focus();
    const no = 'D' + String(Date.now()).slice(-8);
    lines.forEach(({ b, q }) => b.stock = Math.max(0, b.stock - q));
    db.orders.unshift({ no, at: new Date().toLocaleString('ko-KR'), items: lines.map(({ b, q }) => `${b.title} ×${q}`).join(', '), amount: s.sum + s.ship, pm: e.target.pm.value, st: '결제완료' });
    db.cart = {}; save();
    app.innerHTML = `<div class="panel done"><b>주문이 접수되었습니다 (데모)</b><p class="sub">주문번호 <span class="num">${no}</span> · 재고가 자동으로 차감되었습니다. 관리자 화면의 주문 탭에서 확인할 수 있습니다.</p><div class="row" style="justify-content:center"><a class="btn" href="#admin">관리자에서 보기</a><a class="btn ghost" href="#home">계속 둘러보기</a></div></div>`;
  };
}
const fld = (id, label, type, help) => `<div class="field"><label for="${id}">${label}</label><input id="${id}" type="${type}" autocomplete="off" aria-describedby="${id}-h ${id}-e"><div class="help" id="${id}-h">${help}</div><div class="err" id="${id}-e" aria-live="polite"></div></div>`;

/* ---------- 매입문의 ---------- */
function sell() {
  app.innerHTML = `<h1>책 팔기 · 매입문의</h1><p class="sub">다 본 수험서를 보내 주시면 상태를 보고 매입가를 안내합니다. 아래 접수 내용은 관리자 화면에 바로 쌓입니다.</p>
    <div class="two"><form class="panel form" id="sf" novalidate>
      ${fld('sn', '이름', 'text', '연락처 대신 이름만 받는 예시입니다')}
      <div class="field"><label for="sb">팔 책 (한 줄에 한 권, 제목 또는 ISBN)</label><textarea id="sb" rows="4" aria-describedby="sb-e"></textarea><div class="err" id="sb-e" aria-live="polite"></div></div>
      <div class="grid2"><div class="field"><label for="sg">대략의 상태</label><select id="sg">${Object.entries(GRADE).map(([g, [n, d]]) => `<option value="${g}">${n} · ${d}</option>`).join('')}</select></div>
        <div class="field"><label for="sw">보내는 방법</label><select id="sw"><option>택배 수거 요청</option><option>직접 방문</option></select></div></div>
      <button class="btn" type="submit">매입 문의 접수</button></form>
      <div class="panel"><h2>매입 진행 순서</h2><ol style="margin:0;padding-left:20px;color:var(--ink-2)"><li>문의 접수</li><li>책 도착 후 바코드로 검수</li><li>등급 확정, 매입가 안내</li><li>동의하시면 정산 후 판매 등록</li></ol>
      <p class="sub" style="margin-top:14px">실서비스에서는 상담 채팅 또는 알림 메시지 연동 여부를 미팅에서 정합니다.</p></div></div>`;
  $('#sf').onsubmit = e => {
    e.preventDefault();
    const n = $('#sn').value.trim(), books = $('#sb').value.split('\n').map(s => s.trim()).filter(Boolean);
    $('#sn').setAttribute('aria-invalid', !n); $('#sn-e').textContent = n ? '' : '이름을 입력해 주세요.';
    $('#sb').setAttribute('aria-invalid', !books.length); $('#sb-e').textContent = books.length ? '' : '팔 책을 한 권 이상 적어 주세요.';
    if (!n) return $('#sn').focus(); if (!books.length) return $('#sb').focus();
    db.inq.unshift({ at: new Date().toLocaleString('ko-KR'), name: n, books, grade: $('#sg').value, how: $('#sw').value, st: '접수' });
    save(); e.target.reset(); toast(`매입문의 ${books.length}권이 접수되었습니다. 관리자 > 매입문의에서 확인하세요.`);
  };
}

/* ---------- 관리자 ---------- */
let atab = 'scan';
function admin() {
  const T = [['scan', '바코드 입고'], ['stock', '재고'], ['add', '상품 등록'], ['inq', `매입문의 ${db.inq.length}`], ['ord', `주문 ${db.orders.length}`]];
  app.innerHTML = `<h1>관리자</h1><p class="sub">실서비스에서는 로그인한 관리자만 들어옵니다. 바코드 스캐너는 키보드처럼 숫자를 입력하고 Enter를 보내므로, 아래 입력창에 ISBN을 치고 Enter를 누르면 같은 동작을 확인할 수 있습니다.</p>
    <div class="admin-tabs" role="tablist">${T.map(([k, n]) => `<button role="tab" aria-selected="${k === atab}" data-t="${k}">${n}</button>`).join('')}</div><div id="ap"></div>`;
  $$('.admin-tabs button').forEach(b => b.onclick = () => { atab = b.dataset.t; admin(); });
  ({ scan, stock, add: addForm, inq: inqList, ord: ordList })[atab]();
}
function scan() {
  $('#ap').innerHTML = `<div class="scan"><form class="scanbox" id="scf"><div class="bars" aria-hidden="true"></div>
      <label for="isbn">ISBN 스캔 / 입력</label><input id="isbn" inputmode="numeric" autocomplete="off" placeholder="9791100000011">
      <p>예시 ISBN: ${db.books.slice(0, 3).map(b => `<button type="button" class="btn sm ghost" data-i="${b.isbn}" style="margin:4px 4px 0 0">${b.isbn}</button>`).join('')}</p></form>
    <div><h2>입고 기록</h2><ul class="log" id="log">${logHtml()}</ul></div></div>`;
  const inp = $('#isbn'); inp.focus();
  $$('[data-i]').forEach(b => b.onclick = () => { inp.value = b.dataset.i; $('#scf').requestSubmit(); });
  $('#scf').onsubmit = e => {
    e.preventDefault();
    const code = inp.value.replace(/\D/g, ''); inp.value = ''; inp.focus();
    if (!code) return;
    const b = db.books.find(x => x.isbn === code);
    if (b) { b.stock++; db.log.unshift({ ok: 1, t: `${b.title}`, s: `재고 ${b.stock}권 (+1)` }); }
    else db.log.unshift({ ok: 0, t: `등록되지 않은 ISBN ${code}`, s: '상품 등록 필요', code });
    db.log = db.log.slice(0, 12); save();
    $('#log').innerHTML = logHtml(true); bindLog();
  };
  bindLog();
}
const bindLog = () => $$('#log [data-new]').forEach(btn => btn.onclick = () => { atab = 'add'; admin(); $('#ai').value = btn.dataset.new; $('#at').focus(); });
const logHtml = fresh => db.log.length ? db.log.map((l, i) => `<li class="${l.ok ? '' : 'miss'} ${fresh && !i ? 'new' : ''}"><span>${esc(l.t)}</span><span class="num">${l.ok ? esc(l.s) : `<button class="btn sm" data-new="${l.code}">상품 등록</button>`}</span></li>`).join('') : '<li>아직 입고 기록이 없습니다.</li>';
function stock() {
  $('#ap').innerHTML = `<div class="tablewrap"><table><thead><tr><th>ISBN</th><th>도서</th><th>등급</th><th class="r">판매가</th><th class="r">재고</th></tr></thead><tbody>
    ${db.books.map(b => `<tr><td class="num">${b.isbn}</td><td>${esc(b.title)}</td><td>${gradeTag(b.grade)}</td><td class="r num">${won(price(b))}</td><td class="r num" style="${b.stock ? '' : 'color:var(--bad);font-weight:700'}">${b.stock}</td></tr>`).join('')}</tbody></table></div>
    <div class="row" style="margin-top:14px"><button class="btn ghost sm" id="rs">데모 데이터 초기화</button></div>`;
  $('#rs').onclick = () => { try { localStorage.removeItem(KEY); } catch {} db = { books: SEED.map(b => ({ ...b })), cart: {}, orders: [], inq: [], log: [] }; save(); admin(); toast('처음 상태로 되돌렸습니다.'); };
}
function addForm() {
  $('#ap').innerHTML = `<form class="panel form" id="af" novalidate style="max-width:640px">
    <div class="grid2">${fld('ai', 'ISBN (13자리)', 'text', '바코드 스캔으로 채워질 수 있습니다')}${fld('at', '도서명', 'text', '')}</div>
    <div class="grid2"><div class="field"><label for="ac">분류</label><select id="ac">${CATS.slice(1).map(c => `<option>${c}</option>`).join('')}</select></div>${fld('ae', '시험명', 'text', '예: 전기기사')}</div>
    <div class="grid2">${fld('al', '정가', 'number', '판매가는 등급별 비율로 자동 계산(예시)')}<div class="field"><label for="ag">상태 등급</label><select id="ag">${Object.keys(GRADE).map(g => `<option value="${g}">${GRADE[g][0]}</option>`).join('')}</select></div></div>
    <button class="btn" type="submit">상품 등록 (재고 1권)</button></form>`;
  $('#af').onsubmit = e => {
    e.preventDefault();
    const v = { ai: $('#ai').value.replace(/\D/g, ''), at: $('#at').value.trim(), ae: $('#ae').value.trim(), al: +$('#al').value };
    const errs = { ai: (v.ai.length !== 13 && 'ISBN 13자리를 입력해 주세요.') || (db.books.some(b => b.isbn === v.ai) && '이미 등록된 ISBN입니다. 바코드 입고로 재고를 늘리세요.'), at: !v.at && '도서명을 입력해 주세요.', ae: !v.ae && '시험명을 입력해 주세요.', al: !(v.al >= 1000) && '정가를 1,000원 이상으로 입력해 주세요.' };
    let first;
    for (const k in errs) { $('#' + k).setAttribute('aria-invalid', !!errs[k]); $('#' + k + '-e').textContent = errs[k] || ''; if (errs[k] && !first) first = $('#' + k); }
    if (first) return first.focus();
    const id = Math.max(...db.books.map(b => b.id)) + 1;
    db.books.push({ id, isbn: v.ai, title: v.at, cat: $('#ac').value, exam: v.ae, year: new Date().getFullYear(), list: v.al, grade: $('#ag').value, stock: 1 });
    save(); toast('등록했습니다. 쇼핑몰 목록에 바로 나타납니다.'); atab = 'stock'; admin();
  };
}
function inqList() {
  $('#ap').innerHTML = db.inq.length ? `<div class="tablewrap"><table><thead><tr><th>접수</th><th>이름</th><th>책</th><th>상태</th><th>방법</th><th>처리</th></tr></thead><tbody>
    ${db.inq.map((q, i) => `<tr><td class="num">${esc(q.at)}</td><td>${esc(q.name)}</td><td>${q.books.map(esc).join('<br>')}</td><td>${gradeTag(q.grade)}</td><td>${esc(q.how)}</td>
      <td><select class="status" data-i="${i}" aria-label="처리 상태">${['접수', '검수 중', '매입가 안내', '정산 완료'].map(s => `<option ${s === q.st ? 'selected' : ''}>${s}</option>`).join('')}</select></td></tr>`).join('')}</tbody></table></div>`
    : `<div class="panel done"><b>매입문의가 없습니다</b><p class="sub">매입문의 화면에서 하나 접수해 보세요.</p><a class="btn" href="#sell">매입문의 열기</a></div>`;
  $$('.status').forEach(s => s.onchange = () => { db.inq[s.dataset.i].st = s.value; save(); toast('처리 상태를 바꿨습니다.'); });
}
function ordList() {
  $('#ap').innerHTML = db.orders.length ? `<div class="tablewrap"><table><thead><tr><th>주문번호</th><th>일시</th><th>도서</th><th>결제</th><th class="r">금액</th><th>상태</th></tr></thead><tbody>
    ${db.orders.map(o => `<tr><td class="num">${o.no}</td><td class="num">${esc(o.at)}</td><td>${esc(o.items)}</td><td>${esc(o.pm)}</td><td class="r num">${won(o.amount)}</td><td>${o.st}</td></tr>`).join('')}</tbody></table></div>`
    : `<div class="panel done"><b>주문이 없습니다</b><p class="sub">책을 장바구니에 담고 주문서를 제출하면 여기에 쌓입니다.</p><a class="btn" href="#home">도서 보러 가기</a></div>`;
}

/* ---------- 로고 시안 ---------- */
function logo() {
  app.innerHTML = `<h1>로고 시안 3종</h1><p class="sub">방향을 고르기 위한 초안입니다. 하나를 고르시면 글꼴·색·간격을 다듬어 로고 원본(AI·SVG·PNG)으로 정리합니다.</p>
    <div class="logos">${LOGOS.map((l, i) => `<div class="logo-card"><div class="art ${i === 1 ? '' : 'dark'}" style="${i === 1 ? 'background:#F5F6F8' : ''}"><div style="display:flex;align-items:center;gap:12px">${l.svg().replace('<svg', '<svg width="72" height="72"')}<b style="font-size:22px;letter-spacing:-.03em;color:${i === 1 ? 'var(--ink)' : '#fff'}">다시봄 책방</b></div></div>
      <div class="txt"><b>시안 ${i + 1} · ${l.name}</b>${l.note}<div class="row" style="margin-top:10px">${l.svg().replace('<svg', '<svg width="28" height="28"')}${l.svg('#2B55D8', '#14213D').replace('<svg', '<svg width="28" height="28"')}<span>작은 크기 확인</span></div></div></div>`).join('')}</div>`;
}

let tt;
function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('on'), 2600); }
updCnt(); route();

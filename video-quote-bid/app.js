'use strict';
// 가상 데이터만 사용. 역할 간 공유는 localStorage (실서비스에서는 Spring Boot API가 대신함)
const KEY = 'vqb-state-v1';
const CATS = ['기획', '촬영', '편집', '모션', '기타'];
const TYPES = ['브랜드 홍보', '제품·서비스 설명', '행사·스케치', '인터뷰', '교육·튜토리얼', 'SNS 숏폼'];
const COMPANIES = [
  { id: 'c1', name: '필름온 스튜디오', rating: 4.8, reviews: 126 },
  { id: 'c2', name: '프레임웍스 미디어', rating: 4.6, reviews: 88 },
  { id: 'c3', name: '모션랩 서울', rating: 4.9, reviews: 41 },
  { id: 'c4', name: '라운드컷 필름', rating: 4.3, reviews: 57 },
];
const BUYER = { id: 'm1', name: '김서연', org: '라온헬스케어 마케팅팀' };
const co = id => COMPANIES.find(c => c.id === id);

const day = n => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const won = n => n.toLocaleString('ko-KR') + '원';
const man = n => (n / 10000).toLocaleString('ko-KR') + '만원';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtDate = s => s.slice(5).replace('-', '.');

const sumItems = items => items.reduce((a, i) => a + (Number(i.amount) || 0), 0);
const calc = items => { const supply = sumItems(items); const vat = Math.round(supply * 0.1); return { supply, vat, total: supply + vat }; };

function mkItems(rows) { return rows.map(([cat, name, m]) => ({ cat, name, amount: m * 10000 })); }

function seed() {
  const s = { requests: [], quotes: [], selections: [], logs: [], seq: { r: 1004, q: 9 } };
  s.requests.push(
    { id: 'R-1001', memberId: 'm1', title: '신제품 런칭 브랜드 필름', type: '브랜드 홍보', length: '60~90초', purpose: '웹사이트 메인, 유튜브 광고', budgetMin: 500, budgetMax: 800, due: day(45), ref: 'https://example.com/ref/brand-film', closeAt: day(5), createdAt: day(-5), closed: false },
    { id: 'R-1002', memberId: 'm1', title: '앱 사용법 튜토리얼 영상', type: '교육·튜토리얼', length: '2~3분', purpose: '앱 온보딩, 상세페이지', budgetMin: 200, budgetMax: 350, due: day(55), ref: '', closeAt: day(9), createdAt: day(-1), closed: false },
    { id: 'R-1003', memberId: 'm1', title: '하반기 임직원 워크숍 스케치', type: '행사·스케치', length: '2분 + 숏폼 30초 2편', purpose: '사내 공유, 인스타그램', budgetMin: 150, budgetMax: 250, due: day(14), ref: 'https://example.com/ref/event-sketch', closeAt: day(-4), createdAt: day(-12), closed: false },
  );
  const q = (id, reqId, companyId, rows, days, revisions, note, ago) => {
    const items = mkItems(rows); s.quotes.push({ id, reqId, companyId, items, ...calc(items), days, revisions, note, createdAt: day(-ago), proxy: false });
  };
  q('Q-1', 'R-1001', 'c1', [['기획', '콘셉트·스토리보드', 120], ['촬영', '1일 촬영, 감독·촬영감독 2인', 280], ['편집', '본편 90초 + 15초 컷 2종', 150], ['모션', '로고·자막 모션', 60]], 28, 3, '제품 클로즈업용 매크로 렌즈 포함', 4);
  q('Q-2', 'R-1001', 'c2', [['기획', '콘셉트 2안', 80], ['촬영', '1일 촬영, 스튜디오 대관 포함', 220], ['편집', '본편 90초', 120], ['모션', '자막 모션', 40]], 35, 2, '', 3);
  q('Q-3', 'R-1001', 'c3', [['기획', '콘셉트·스토리보드', 100], ['촬영', '반일 촬영', 200], ['편집', '본편 + 컷 3종', 140], ['모션', '3D 제품 모션 20초', 180]], 24, 4, '제품 3D 모델링 파일이 있으면 모션 비용 30% 절감', 2);
  q('Q-4', 'R-1003', 'c2', [['촬영', '행사 촬영 6시간, 2캠', 110], ['편집', '스케치 2분 + 숏폼 2편', 70], ['모션', '타이틀', 20]], 10, 2, '', 9);
  q('Q-5', 'R-1003', 'c4', [['기획', '촬영 동선 사전 협의', 20], ['촬영', '행사 촬영 6시간, 1캠', 90], ['편집', '스케치 2분', 60]], 7, 1, '숏폼은 별도 견적', 8);
  s.selections.push({ reqId: 'R-1003', quoteId: 'Q-4', selectedAt: day(-3) });
  return s;
}

let S, ui = { role: 'buyer', buyerTab: 'list', reqId: null, sort: 'price', pending: null, supplierId: 'c4', supTab: 'inbox', writeFor: null, draft: null, adminReq: '', adminCo: '' };

function load() {
  try { const raw = localStorage.getItem(KEY); if (raw) { S = JSON.parse(raw); return; } } catch (e) { /* 저장소 차단 시 메모리로 동작 */ }
  S = seed();
  logRequest(S.requests[0], true); logQuote(S.quotes[2], true); logSelect(S.requests[2], S.quotes[3], true);
  save();
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { } }
try { const r = localStorage.getItem(KEY + '-ui'); if (r) Object.assign(ui, JSON.parse(r), { pending: null, draft: null, writeFor: null }); } catch (e) { }
const saveUi = () => { try { localStorage.setItem(KEY + '-ui', JSON.stringify({ role: ui.role, supplierId: ui.supplierId })); } catch (e) { } };

// ---------- 도메인 ----------
const quotesOf = id => S.quotes.filter(q => q.reqId === id);
const selOf = id => S.selections.find(x => x.reqId === id);
function status(r) {
  if (selOf(r.id)) return ['done', '선정 완료'];
  if (r.closed || r.closeAt < day(0)) return ['closed', '마감'];
  return quotesOf(r.id).length ? ['cmp', '비교 중'] : ['wait', '견적 대기'];
}
const isOpen = r => ['wait', 'cmp'].includes(status(r)[0]);
const pill = r => { const [k, t] = status(r); return `<span class="st ${k}">${t}</span>`; };

// ---------- 알림톡 템플릿 (#{변수} 표기, 실제 발송 아님) ----------
const TPL = {
  REQ: { code: 'VQ_REQ_001', name: '새 견적 요청', to: '공급업체', btn: '견적서 작성하기',
    body: '[필름매치] 새 견적 요청이 도착했습니다.\n\n요청명: #{요청명}\n영상 종류: #{영상종류}\n예산: #{예산}\n희망 납기: #{희망납기}\n견적 마감: #{견적마감}\n\n마감 전에 견적서를 제출해 주세요.' },
  QUOTE: { code: 'VQ_QUOTE_001', name: '견적 도착', to: '수요자', btn: '견적 비교하기',
    body: '[필름매치] #{고객명}님, 새 견적이 도착했습니다.\n\n요청명: #{요청명}\n업체명: #{업체명}\n견적 금액: #{견적금액} (VAT 포함)\n받은 견적: 총 #{견적수}건\n\n금액·납기·평점을 비교해 보세요.' },
  SELECT: { code: 'VQ_SELECT_001', name: '업체 선정 안내', to: '선정 업체', btn: '진행 상세 보기',
    body: '[필름매치] #{업체명}님, 제출하신 견적이 선정되었습니다.\n\n요청명: #{요청명}\n고객명: #{고객명}\n선정 금액: #{견적금액}\n\n플랫폼 채팅에서 일정을 확정해 주세요.' },
};
function pushLog(kind, toLabel, vals, silent) {
  S.logs.unshift({ n: Date.now() + Math.random(), kind, toLabel, vals, at: new Date().toTimeString().slice(0, 5) });
  S.logs = S.logs.slice(0, 30);
  if (!silent) save();
}
const logRequest = (r, s) => pushLog('REQ', `공급업체 ${COMPANIES.length}곳`, { 요청명: r.title, 영상종류: r.type, 예산: `${r.budgetMin}~${r.budgetMax}만원`, 희망납기: r.due, 견적마감: r.closeAt }, s);
const logQuote = (q, s) => { const r = S.requests.find(x => x.id === q.reqId); pushLog('QUOTE', `${BUYER.name} (수요자)`, { 고객명: BUYER.name, 요청명: r.title, 업체명: co(q.companyId).name, 견적금액: won(q.total), 견적수: quotesOf(r.id).length }, s); };
const logSelect = (r, q, s) => pushLog('SELECT', `${co(q.companyId).name}`, { 업체명: co(q.companyId).name, 요청명: r.title, 고객명: BUYER.name, 견적금액: won(q.total) }, s);

let seen = null;
function renderTalk() {
  const first = !seen; seen = seen || new Set();
  const el = document.getElementById('talk');
  if (!S.logs.length) { el.innerHTML = '<div class="empty">요청을 등록하거나 견적을 제출하면 발송 예정 알림톡이 여기에 쌓입니다.</div>'; return; }
  el.innerHTML = S.logs.map(l => {
    const t = TPL[l.kind];
    const body = esc(t.body).replace(/#\{([^}]+)\}/g, '<span class="var">#{$1}</span>');
    const fresh = !first && !seen.has(l.n); seen.add(l.n);
    return `<div class="msg${fresh ? ' fresh' : ''}">
      <div class="msg-meta"><span>${t.name} · ${esc(t.code)}</span><span>${l.at} · 미발송</span></div>
      <div class="bubble"><div class="bh">알림톡 도착</div><div class="bb">${body}</div><div class="bt">${t.btn}</div></div>
      <div class="vals">수신: <b>${esc(l.toLabel)}</b>${Object.entries(l.vals).map(([k, v]) => `<span>${esc(k)}=<b>${esc(v)}</b></span>`).join('')}</div>
    </div>`;
  }).join('');
}

// ---------- 수요자 ----------
function buyerView() {
  const mine = S.requests.filter(r => r.memberId === BUYER.id);
  const sub = `<div class="sub">
    <button data-act="btab" data-v="list" class="${ui.buyerTab === 'list' && !ui.reqId ? 'on' : ''}">내 요청 ${mine.length}</button>
    <button data-act="btab" data-v="new" class="${ui.buyerTab === 'new' ? 'on' : ''}">견적 요청하기</button></div>`;
  const head = `<div class="head-row"><div><h1>${ui.reqId ? '받은 견적 비교' : ui.buyerTab === 'new' ? '견적 요청 등록' : '내 견적 요청'}</h1>
    <p class="who">${BUYER.name} · ${BUYER.org} 로 로그인됨</p></div></div>`;
  if (ui.reqId) return head + buyerDetail(S.requests.find(r => r.id === ui.reqId));
  if (ui.buyerTab === 'new') return head + sub + requestForm();
  if (!mine.length) return head + sub + `<div class="card empty"><b>아직 등록한 요청이 없습니다</b>영상 종류와 예산을 입력하면 공급업체가 견적을 보냅니다.<button class="btn pri" data-act="btab" data-v="new">견적 요청하기</button></div>`;
  return head + sub + `<div class="list">${mine.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(r => {
    const n = quotesOf(r.id).length, sel = selOf(r.id);
    return `<button class="card req" data-act="open" data-id="${r.id}">
      <div class="t">${esc(r.title)}</div>
      <div class="right">${pill(r)}<div class="cnt"><b>${n}</b>건 견적</div></div>
      <div class="meta"><span>${r.id}</span><span>${esc(r.type)} · ${esc(r.length)}</span><span>예산 ${r.budgetMin}~${r.budgetMax}만원</span><span>견적 마감 ${fmtDate(r.closeAt)}</span>${sel ? `<span>선정 ${esc(co(S.quotes.find(q => q.id === sel.quoteId).companyId).name)}</span>` : ''}</div>
    </button>`;
  }).join('')}</div>`;
}

function requestForm() {
  return `<form class="card form" id="reqForm" novalidate>
    <div class="field full"><label for="f-title">요청 제목</label><input id="f-title" name="title" maxlength="40" placeholder="예: 신규 서비스 소개 영상"><span class="err">제목을 입력해 주세요.</span></div>
    <div class="field full"><label>영상 종류</label><div class="chips">${TYPES.map((t, i) => `<label><input type="radio" name="type" value="${t}" ${i ? '' : 'checked'}>${t}</label>`).join('')}</div></div>
    <div class="field"><label for="f-len">영상 길이</label><select id="f-len" name="length"><option>30초 이내</option><option selected>60~90초</option><option>2~3분</option><option>5분 이상</option><option>본편 + 숏폼 세트</option></select></div>
    <div class="field"><label for="f-pur">용도</label><input id="f-pur" name="purpose" placeholder="예: 유튜브 광고, 전시회 상영"><span class="err">용도를 입력해 주세요.</span></div>
    <div class="field"><label>예산 범위 (만원, VAT 포함)</label><div class="range"><input name="budgetMin" type="number" inputmode="numeric" min="10" step="10" value="300" aria-label="최소 예산"><span class="mu">~</span><input name="budgetMax" type="number" inputmode="numeric" min="10" step="10" value="500" aria-label="최대 예산"></div><span class="err">최소 예산이 최대 예산보다 클 수 없습니다.</span></div>
    <div class="field"><label for="f-due">희망 납기</label><input id="f-due" name="due" type="date" value="${day(40)}" min="${day(7)}"><span class="help">견적 마감은 등록일로부터 7일 뒤로 자동 설정됩니다.</span></div>
    <div class="field full"><label for="f-ref">참고 영상 링크 (선택)</label><input id="f-ref" name="ref" type="url" placeholder="https://"><span class="err">http(s)로 시작하는 주소를 입력해 주세요.</span></div>
    <div class="form-foot"><button type="button" class="btn ghost" data-act="btab" data-v="list">취소</button><button class="btn pri" type="submit">요청 등록</button></div>
  </form>`;
}

function submitRequest(form) {
  const f = Object.fromEntries(new FormData(form));
  const bad = {};
  if (!f.title.trim()) bad.title = 1;
  if (!f.purpose.trim()) bad.purpose = 1;
  if (!(+f.budgetMin > 0 && +f.budgetMax >= +f.budgetMin)) bad.budgetMin = 1;
  if (f.ref && !/^https?:\/\/\S+$/.test(f.ref)) bad.ref = 1;
  form.querySelectorAll('.field').forEach(x => x.classList.remove('bad'));
  Object.keys(bad).forEach(k => form.querySelector(`[name="${k}"]`).closest('.field').classList.add('bad'));
  if (Object.keys(bad).length) return;
  const r = { id: 'R-' + S.seq.r++, memberId: BUYER.id, title: f.title.trim(), type: f.type, length: f.length, purpose: f.purpose.trim(), budgetMin: +f.budgetMin, budgetMax: +f.budgetMax, due: f.due, ref: f.ref, closeAt: day(7), createdAt: day(0), closed: false };
  S.requests.push(r); logRequest(r);
  ui.buyerTab = 'list'; ui.reqId = r.id; render(); toTop();
}

function buyerDetail(r) {
  const qs = quotesOf(r.id), sel = selOf(r.id), open = isOpen(r);
  const sorters = { price: (a, b) => a.total - b.total, days: (a, b) => a.days - b.days, rating: (a, b) => co(b.companyId).rating - co(a.companyId).rating };
  const sorted = qs.slice().sort(sorters[ui.sort]);
  const min = k => Math.min(...qs.map(k));
  const lowest = qs.length ? min(q => q.total) : 0, fastest = qs.length ? min(q => q.days) : 0, best = qs.length ? Math.max(...qs.map(q => co(q.companyId).rating)) : 0;
  let html = `<button class="back link" data-act="back">내 요청 목록</button>
  <div class="card detail-head">
    <div class="head-row" style="margin:0"><h2>${esc(r.title)}</h2>${pill(r)}</div>
    <dl class="spec">
      <div><dt>영상 종류</dt><dd>${esc(r.type)}</dd></div><div><dt>길이</dt><dd>${esc(r.length)}</dd></div>
      <div><dt>용도</dt><dd>${esc(r.purpose)}</dd></div><div><dt>예산</dt><dd>${r.budgetMin}~${r.budgetMax}만원</dd></div>
      <div><dt>희망 납기</dt><dd>${r.due}</dd></div><div><dt>견적 마감</dt><dd>${r.closeAt}</dd></div>
      <div><dt>참고 링크</dt><dd>${r.ref ? esc(r.ref) : '없음'}</dd></div>
    </dl>
    ${open ? `<div><button class="btn ghost sm" data-act="close" data-id="${r.id}">견적 받기 마감</button></div>` : ''}
  </div>`;
  if (sel) {
    const q = S.quotes.find(x => x.id === sel.quoteId), c = co(q.companyId);
    html += `<div class="card result"><span class="tag ok" style="justify-self:start">선정 결과</span><div class="big">${esc(c.name)} · ${won(q.total)}</div>
      <p class="mu">${sel.selectedAt} 선정 · 납기 ${q.days}일 · 수정 ${q.revisions}회. 선정 안내 알림톡이 업체에 발송되고, 이후 일정 조율은 플랫폼 채팅으로 이어집니다.</p></div>`;
  }
  if (!qs.length) return html + `<div class="card empty"><b>아직 도착한 견적이 없습니다</b>공급업체 ${COMPANIES.length}곳에 요청 알림톡이 나갔습니다. 공급업체 탭에서 견적을 직접 제출해 볼 수 있습니다.<button class="btn ghost" data-act="role" data-v="supplier">공급업체로 전환</button></div>`;
  html += `<div class="sortbar"><span>견적 ${qs.length}건 정렬</span>${[['price', '가격 낮은순'], ['days', '납기 빠른순'], ['rating', '평점 높은순']].map(([k, t]) => `<button data-act="sort" data-v="${k}" class="${ui.sort === k ? 'on' : ''}">${t}</button>`).join('')}</div>`;
  html += `<div class="quotes">${sorted.map(q => {
    const c = co(q.companyId), isSel = sel && sel.quoteId === q.id;
    const over = q.total > r.budgetMax * 10000;
    const badges = [q.total === lowest && qs.length > 1 ? '<span class="tag ac">최저가</span>' : '', q.days === fastest && qs.length > 1 ? '<span class="tag ac">최단 납기</span>' : '', co(q.companyId).rating === best && qs.length > 1 ? '<span class="tag ac">최고 평점</span>' : '', over ? '<span class="tag warn">예산 초과</span>' : '<span class="tag">예산 내</span>', q.proxy ? '<span class="tag">관리자 대리 등록</span>' : ''].join('');
    const byCat = CATS.map(k => [k, q.items.filter(i => i.cat === k)]).filter(([, v]) => v.length);
    let acts = '';
    if (!sel && open) acts = ui.pending === q.id
      ? `<button class="btn ghost sm" data-act="cancelpick">취소</button><button class="btn pri sm" data-act="confirm" data-id="${q.id}">선정 확정</button>`
      : `<button class="btn pri sm" data-act="pick" data-id="${q.id}">이 업체 선정</button>`;
    return `<article class="card q ${isSel ? 'sel' : sel ? 'dim' : ''}">
      <div class="co"><b>${esc(c.name)}</b><span class="rate">평점 <strong>${c.rating.toFixed(1)}</strong> (${c.reviews})</span></div>
      <div class="badges">${badges}</div>
      <div class="total">${won(q.total)}<small>VAT 포함</small></div>
      <div class="kv"><div><span>납기</span><b>${q.days}일</b></div><div><span>수정</span><b>${q.revisions}회</b></div></div>
      <details><summary>세부 내역</summary><div class="items">
        ${byCat.map(([k, v]) => v.map(i => `<div class="row"><span class="c">${k}</span><span>${esc(i.name)}</span><span class="a">${man(i.amount)}</span></div>`).join('')).join('')}
        <div class="sum"><span>공급가 ${man(q.supply)} + 부가세 ${man(q.vat)}</span></div>
      </div></details>
      ${q.note ? `<p class="note">${esc(q.note)}</p>` : ''}
      ${acts ? `<div class="acts">${acts}</div>` : ''}
    </article>`;
  }).join('')}</div>`;
  return html;
}

// ---------- 견적서 편집기 (공급업체·관리자 공용) ----------
const newDraft = () => ({ items: [{ cat: '기획', name: '', amount: '' }, { cat: '촬영', name: '', amount: '' }, { cat: '편집', name: '', amount: '' }], days: 21, revisions: 2, note: '' });
function editor(r, companyId, proxy) {
  const d = ui.draft, t = calc(d.items);
  return `<form class="card editor" id="qForm" novalidate>
    <div><h2>${esc(r.title)}</h2><p class="mu">${r.id} · ${esc(r.type)} · ${esc(r.length)} · 예산 ${r.budgetMin}~${r.budgetMax}만원 · 희망 납기 ${r.due}${proxy ? ` · <b>${esc(co(companyId).name)}</b> 대리 작성` : ''}</p></div>
    <div class="lines">
      <div class="lines-head"><span>항목</span><span>내역</span><span style="text-align:right">금액 (원, VAT 별도)</span><span></span></div>
      ${d.items.map((it, i) => `<div class="line">
        <select data-i="${i}" data-k="cat" aria-label="항목">${CATS.map(c => `<option ${c === it.cat ? 'selected' : ''}>${c}</option>`).join('')}</select>
        <input class="nm" data-i="${i}" data-k="name" value="${esc(it.name)}" placeholder="예: 1일 촬영, 감독 1인" aria-label="내역">
        <input class="amt" data-i="${i}" data-k="amount" value="${it.amount === '' ? '' : Number(it.amount).toLocaleString('ko-KR')}" inputmode="numeric" placeholder="0" aria-label="금액">
        <button type="button" class="del" data-act="delrow" data-i="${i}" aria-label="행 삭제" ${d.items.length < 2 ? 'disabled' : ''}>×</button>
      </div>`).join('')}
      <div><button type="button" class="btn ghost sm" data-act="addrow">항목 행 추가</button></div>
    </div>
    <div class="totals" id="totals">${totalsHtml(t)}</div>
    <div class="ed-meta">
      <div class="field"><label for="e-days">작업 기간 (일)</label><input id="e-days" data-k="days" type="number" min="1" value="${d.days}"></div>
      <div class="field"><label for="e-rev">무상 수정 횟수</label><input id="e-rev" data-k="revisions" type="number" min="0" value="${d.revisions}"></div>
      <div class="field" style="grid-column:1/-1"><label for="e-note">수요자에게 전할 말 (선택)</label><textarea id="e-note" data-k="note" maxlength="200" placeholder="포함·제외 범위, 추가 비용 조건 등">${esc(d.note)}</textarea></div>
    </div>
    <p class="mu" id="qErr" style="color:#c0362c;display:none">내역과 금액을 한 줄 이상 입력해 주세요.</p>
    <div class="form-foot"><button type="button" class="btn ghost" data-act="cancelwrite">취소</button><button class="btn pri" type="submit">견적 제출</button></div>
  </form>`;
}
const totalsHtml = t => `<div><span>공급가액</span><span>${won(t.supply)}</span></div><div><span>부가세 10%</span><span>${won(t.vat)}</span></div><div class="grand"><span>합계</span><span>${won(t.total)}</span></div>`;

function submitQuote(reqId, companyId, proxy) {
  const items = ui.draft.items.filter(i => i.name.trim() && Number(i.amount) > 0).map(i => ({ cat: i.cat, name: i.name.trim(), amount: Number(i.amount) }));
  if (!items.length) { document.getElementById('qErr').style.display = 'block'; return false; }
  if (S.quotes.some(q => q.reqId === reqId && q.companyId === companyId)) return false; // 업체당 1건 (DB UNIQUE)
  const q = { id: 'Q-' + S.seq.q++, reqId, companyId, items, ...calc(items), days: Math.max(1, +ui.draft.days || 1), revisions: Math.max(0, +ui.draft.revisions || 0), note: ui.draft.note.trim(), createdAt: day(0), proxy };
  S.quotes.push(q); logQuote(q);
  ui.draft = null; ui.writeFor = null;
  return true;
}

// ---------- 공급업체 ----------
function supplierView() {
  const me = co(ui.supplierId);
  const mineQ = S.quotes.filter(q => q.companyId === me.id);
  const head = `<div class="head-row"><div><h1>${ui.writeFor ? '견적서 작성' : ui.supTab === 'sent' ? '제출 내역' : '받은 견적 요청'}</h1>
    <p class="who">로그인 업체 <select data-act="supplier" aria-label="로그인 업체">${COMPANIES.map(c => `<option value="${c.id}" ${c.id === me.id ? 'selected' : ''}>${c.name}</option>`).join('')}</select></p></div></div>`;
  const lock = `<div class="lock"><i>!</i><div><b>다른 업체의 견적은 보이지 않습니다.</b> 서버는 로그인한 업체의 company_id로 작성된 견적만 돌려주고, 경쟁 견적은 건수만 공개합니다.</div></div>`;
  if (ui.writeFor) return head + editor(S.requests.find(r => r.id === ui.writeFor), me.id, false);
  const sub = `<div class="sub"><button data-act="stab" data-v="inbox" class="${ui.supTab === 'inbox' ? 'on' : ''}">받은 요청</button><button data-act="stab" data-v="sent" class="${ui.supTab === 'sent' ? 'on' : ''}">제출 내역 ${mineQ.length}</button></div>`;
  if (ui.supTab === 'sent') {
    if (!mineQ.length) return head + sub + `<div class="card empty"><b>제출한 견적이 없습니다</b>받은 요청에서 견적서를 작성해 보세요.</div>`;
    return head + sub + lock + `<div class="table-wrap"><table><thead><tr><th>요청</th><th>상태</th><th class="num">내 견적</th><th class="num">납기</th><th>결과</th><th>제출일</th></tr></thead><tbody>${mineQ.map(q => {
      const r = S.requests.find(x => x.id === q.reqId), sel = selOf(r.id);
      const res = sel ? (sel.quoteId === q.id ? '<span class="tag ok">선정</span>' : '<span class="tag">미선정</span>') : '<span class="tag">검토 중</span>';
      return `<tr><td>${esc(r.title)}</td><td>${pill(r)}</td><td class="num">${won(q.total)}</td><td class="num">${q.days}일</td><td>${res}</td><td>${q.createdAt}</td></tr>`;
    }).join('')}</tbody></table></div>`;
  }
  const inbox = S.requests.filter(r => isOpen(r) || quotesOf(r.id).some(q => q.companyId === me.id)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (!inbox.length) return head + sub + `<div class="card empty"><b>열려 있는 견적 요청이 없습니다</b>수요자가 요청을 등록하면 알림톡과 함께 여기 표시됩니다.</div>`;
  return head + sub + lock + `<div class="list">${inbox.map(r => {
    const mine = quotesOf(r.id).find(q => q.companyId === me.id), n = quotesOf(r.id).length;
    const act = mine ? `<span class="tag ok">제출함 ${won(mine.total)}</span>` : isOpen(r) ? `<span class="btn pri sm">견적서 작성</span>` : '<span class="tag">마감</span>';
    return `<${!mine && isOpen(r) ? `button data-act="write" data-id="${r.id}"` : 'div'} class="card req">
      <div class="t">${esc(r.title)}</div>
      <div class="right">${act}<div class="cnt">경쟁 견적 <b>${n}</b>건 · 금액 비공개</div></div>
      <div class="meta"><span>${esc(r.type)} · ${esc(r.length)}</span><span>${esc(r.purpose)}</span><span>예산 ${r.budgetMin}~${r.budgetMax}만원</span><span>마감 ${fmtDate(r.closeAt)}</span></div>
    </${!mine && isOpen(r) ? 'button' : 'div'}>`;
  }).join('')}</div>`;
}

// ---------- 관리자 ----------
function adminView() {
  const R = S.requests, Q = S.quotes;
  const done = R.filter(r => selOf(r.id)).length, ended = R.filter(r => !isOpen(r)).length;
  const kpi = [['견적 요청', R.length + '건'], ['제출 견적', Q.length + '건'], ['요청당 평균 견적', (R.length ? Q.length / R.length : 0).toFixed(1) + '건'], ['선정률 (종료 요청 기준)', ended ? Math.round(done / ended * 100) + '%' : '-']];
  const openReqs = R.filter(isOpen);
  const cands = ui.adminReq ? COMPANIES.filter(c => !quotesOf(ui.adminReq).some(q => q.companyId === c.id)) : [];
  if (ui.adminCo && !cands.some(c => c.id === ui.adminCo)) ui.adminCo = '';
  const proxyBody = ui.writeFor && ui.adminCo
    ? editor(R.find(r => r.id === ui.writeFor), ui.adminCo, true)
    : `<div class="card form">
        <div class="field"><label for="a-req">견적 요청</label><select id="a-req" data-act="areq"><option value="">선택</option>${openReqs.map(r => `<option value="${r.id}" ${r.id === ui.adminReq ? 'selected' : ''}>${r.id} ${esc(r.title)}</option>`).join('')}</select></div>
        <div class="field"><label for="a-co">공급업체</label><select id="a-co" data-act="aco" ${ui.adminReq ? '' : 'disabled'}><option value="">선택</option>${cands.map(c => `<option value="${c.id}" ${c.id === ui.adminCo ? 'selected' : ''}>${c.name}</option>`).join('')}</select><span class="help">이미 견적을 낸 업체는 목록에서 빠집니다.</span></div>
        <div class="form-foot"><span class="mu" style="margin-right:auto">전화·메일로 받은 견적을 관리자가 대신 입력합니다. 등록자는 proxy_admin_id로 남습니다.</span><button class="btn pri" data-act="proxystart" ${ui.adminReq && ui.adminCo ? '' : 'disabled'}>견적서 입력</button></div>
      </div>`;
  return `<div class="head-row"><div><h1>견적 현황</h1><p class="who">운영 관리자 · 전체 요청 열람 권한</p></div></div>
    <div class="admin-grid">
      <div class="kpis">${kpi.map(([k, v]) => `<div class="card kpi"><span>${k}</span><b>${v}</b></div>`).join('')}</div>
      <div class="table-wrap"><table><thead><tr><th>요청</th><th>제목</th><th>상태</th><th class="num">견적</th><th class="num">최저</th><th class="num">최고</th><th>선정 업체</th><th>마감</th></tr></thead><tbody>
      ${R.slice().sort((a, b) => b.id.localeCompare(a.id)).map(r => {
        const qs = quotesOf(r.id), sel = selOf(r.id), t = qs.map(q => q.total);
        return `<tr><td>${r.id}</td><td>${esc(r.title)}</td><td>${pill(r)}</td><td class="num">${qs.length}</td><td class="num">${t.length ? man(Math.min(...t)) : '-'}</td><td class="num">${t.length ? man(Math.max(...t)) : '-'}</td><td>${sel ? esc(co(S.quotes.find(q => q.id === sel.quoteId).companyId).name) : '-'}</td><td>${r.closeAt}</td></tr>`;
      }).join('')}</tbody></table></div>
      <div><h2 style="margin:8px 0 10px">공급업체 대리 견적 등록</h2>${proxyBody}</div>
    </div>`;
}

// ---------- 렌더·이벤트 ----------
function render() {
  document.querySelectorAll('#roles button').forEach(b => b.classList.toggle('on', b.dataset.role === ui.role));
  document.getElementById('app').innerHTML = ui.role === 'buyer' ? buyerView() : ui.role === 'supplier' ? supplierView() : adminView();
  renderTalk(); saveUi();
}

const NAV = ['btab', 'open', 'back', 'role', 'stab', 'write', 'cancelwrite', 'proxystart'];
const toTop = () => { const y = document.getElementById('app').getBoundingClientRect().top + scrollY - document.querySelector('.top').offsetHeight - 12; if (scrollY > y) scrollTo(0, Math.max(0, y)); };
document.addEventListener('click', e => {
  const roleBtn = e.target.closest('#roles button');
  if (roleBtn) { ui.role = roleBtn.dataset.role; ui.writeFor = null; ui.draft = null; ui.pending = null; render(); toTop(); return; }
  const b = e.target.closest('[data-act]'); if (!b || b.tagName === 'SELECT') return;
  const { act, id, v } = b.dataset;
  const go = {
    btab() { ui.buyerTab = v; ui.reqId = null; },
    open() { ui.reqId = id; ui.pending = null; },
    back() { ui.reqId = null; ui.buyerTab = 'list'; },
    sort() { ui.sort = v; },
    pick() { ui.pending = id; },
    cancelpick() { ui.pending = null; },
    confirm() {
      const q = S.quotes.find(x => x.id === id), r = S.requests.find(x => x.id === q.reqId);
      if (selOf(r.id)) return; // 요청당 선정 1회 (DB UNIQUE)
      S.selections.push({ reqId: r.id, quoteId: q.id, selectedAt: day(0) }); logSelect(r, q); ui.pending = null;
    },
    close() { S.requests.find(x => x.id === id).closed = true; save(); },
    role() { ui.role = v; },
    stab() { ui.supTab = v; },
    write() { ui.writeFor = id; ui.draft = newDraft(); },
    cancelwrite() { ui.writeFor = null; ui.draft = null; },
    addrow() { ui.draft.items.push({ cat: '모션', name: '', amount: '' }); },
    delrow() { ui.draft.items.splice(+b.dataset.i, 1); },
    proxystart() { ui.writeFor = ui.adminReq; ui.draft = newDraft(); },
    clearlog() { S.logs = []; save(); },
    reset() { try { localStorage.removeItem(KEY); } catch (err) { } S = null; load(); ui.reqId = null; ui.writeFor = null; ui.draft = null; ui.adminReq = ''; ui.adminCo = ''; },
  }[act];
  if (!go) return;
  e.preventDefault(); go(); render();
  if (NAV.includes(act)) toTop();
});

document.addEventListener('change', e => {
  const a = e.target.dataset.act;
  if (a === 'supplier') { ui.supplierId = e.target.value; ui.writeFor = null; ui.draft = null; render(); }
  if (a === 'areq') { ui.adminReq = e.target.value; ui.adminCo = ''; render(); }
  if (a === 'aco') { ui.adminCo = e.target.value; render(); }
});

document.addEventListener('input', e => {
  const k = e.target.dataset.k; if (!k || !ui.draft) return;
  const i = e.target.dataset.i;
  if (i === undefined) { ui.draft[k] = e.target.value; return; }
  if (k === 'amount') {
    const n = e.target.value.replace(/[^\d]/g, '').slice(0, 10);
    ui.draft.items[i].amount = n === '' ? '' : Number(n);
    e.target.value = n === '' ? '' : Number(n).toLocaleString('ko-KR');
  } else ui.draft.items[i][k] = e.target.value;
  document.getElementById('totals').innerHTML = totalsHtml(calc(ui.draft.items));
});
document.addEventListener('change', e => { if (e.target.dataset.k === 'cat' && ui.draft) ui.draft.items[e.target.dataset.i].cat = e.target.value; });

document.addEventListener('submit', e => {
  e.preventDefault();
  if (e.target.id === 'reqForm') return submitRequest(e.target);
  if (e.target.id === 'qForm') {
    const proxy = ui.role === 'admin', cid = proxy ? ui.adminCo : ui.supplierId, rid = ui.writeFor;
    if (submitQuote(rid, cid, proxy)) { if (proxy) { ui.adminReq = ''; ui.adminCo = ''; } else ui.supTab = 'sent'; render(); toTop(); }
  }
});

window.addEventListener('storage', e => { if (e.key === KEY) { load(); render(); } });

// ---------- 설계 섹션 ----------
function erd() {
  const T = [
    ['member', 20, 30, 200, false, ['id PK', 'name', 'phone', 'role'], '기존'],
    ['company', 20, 350, 200, false, ['id PK', 'member_id FK', 'name', 'rating'], '기존'],
    ['quote_request', 290, 30, 220, true, ['id PK', 'member_id FK', 'title', 'video_type', 'length', 'purpose', 'budget_min / budget_max', 'due_date', 'ref_url', 'status', 'close_at', 'created_at']],
    ['quote', 290, 350, 220, true, ['id PK', 'request_id FK', 'company_id FK', 'supply_amount', 'vat_amount', 'total_amount', 'lead_days', 'revision_count', 'note', 'proxy_admin_id', 'created_at', 'UK(request_id, company_id)']],
    ['quote_selection', 600, 30, 230, true, ['id PK', 'request_id FK UK', 'quote_id FK', 'selected_by', 'selected_at']],
    ['quote_item', 600, 420, 230, true, ['id PK', 'quote_id FK', 'category', 'description', 'amount', 'sort_order']],
  ];
  const box = ([n, x, y, w, isNew, f, tag]) => {
    const h = 34 + f.length * 20 + 8;
    return `<rect class="box ${isNew ? 'new' : ''}" x="${x}" y="${y}" width="${w}" height="${h}" rx="8"/>
      <path class="bh ${isNew ? 'new' : ''}" d="M${x + 1} ${y + 33}V${y + 8}a7 7 0 0 1 7-7h${w - 16}a7 7 0 0 1 7 7V${y + 33}z"/>
      <text class="tn" x="${x + 12}" y="${y + 22}">${n}</text>${tag ? `<text class="fd" x="${x + w - 12}" y="${y + 22}" text-anchor="end">${tag}</text>` : ''}
      ${f.map((t, i) => `<text class="${/PK/.test(t) ? 'pk' : 'fd'}" x="${x + 12}" y="${y + 52 + i * 20}">${t}</text>`).join('')}`;
  };
  const rel = (d, lx, ly, label) => `<path class="rel" d="${d}"/><text class="rl" x="${lx}" y="${ly}" text-anchor="middle">${label}</text>`;
  return `<svg class="erd" viewBox="0 0 850 640" role="img" aria-label="견적 기능 ERD">
    ${rel('M220 80H290', 255, 72, '1:N')}
    ${rel('M220 400H290', 255, 392, '1:N')}
    ${rel('M400 312V350', 418, 336, '1:N')}
    ${rel('M510 470H600', 555, 462, '1:N')}
    ${rel('M510 80H600', 555, 72, '1:0..1')}
    ${rel('M715 177V330H480V350', 760, 300, 'N:1')}
    ${T.map(box).join('')}
  </svg>`;
}
const API = [
  ['POST', '/api/quote-requests', '견적 요청 등록, 공급업체 알림톡 발송', '수요자'],
  ['GET', '/api/quote-requests/me', '내 요청 목록 (상태·견적 수 포함)', '수요자 본인'],
  ['GET', '/api/quote-requests/{id}', '요청 상세', '작성자·관리자'],
  ['PATCH', '/api/quote-requests/{id}/close', '견적 받기 마감', '작성자'],
  ['GET', '/api/quote-requests/{id}/quotes?sort=price|days|rating', '요청별 견적 비교 (세부 항목 포함)', '작성자·관리자'],
  ['POST', '/api/quote-requests/{id}/selection', '업체 선정, 선정 알림톡 발송', '작성자'],
  ['GET', '/api/supplier/quote-requests', '열린 요청 목록 (경쟁 견적은 건수만)', '공급업체'],
  ['POST', '/api/quote-requests/{id}/quotes', '견적서 제출 (항목·부가세·합계 서버 재계산)', '공급업체'],
  ['PUT', '/api/quotes/{id}', '견적 수정 (선정 전, 마감 전)', '제출 업체 본인'],
  ['GET', '/api/supplier/quotes', '제출 내역 (본인 company_id만)', '공급업체'],
  ['GET', '/api/admin/quote-stats', '요청·견적 건수, 평균 견적 수, 선정률', '관리자'],
  ['POST', '/api/admin/quote-requests/{id}/quotes', '공급업체 대리 견적 등록 (proxy_admin_id 기록)', '관리자'],
];

load();
document.getElementById('erd').innerHTML = erd();
document.getElementById('api').innerHTML = API.map(([m, p, d, a]) => `<tr><td><span class="method m-${m}">${m}</span></td><td><code>${esc(p)}</code></td><td>${d}</td><td>${a}</td></tr>`).join('');
render();

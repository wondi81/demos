// 제안용 데모: 데이터는 localStorage에만 저장. 실서비스는 서버 DB로 교체.
const KEY = 'classaction_demo_v1';
const STEPS = ['모집 중', '소장 접수', '재판 진행', '판결·종결'];
const STEP_DESC = ['참여자 모집·서류 접수', '법원에 소장 제출', '변론·증거 조사', '판결 선고·배상 집행'];
const APP_ST = ['접수', '서류 확인 완료', '보완 요청'];
const DAY = 864e5;
const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const iso = (offset) => new Date(today().getTime() + offset * DAY).toLocaleDateString('sv'); // YYYY-MM-DD, 로컬 기준

function seed() {
  const cases = [
    { id: 'privacy', cat: '개인정보·IT', title: '온라인 쇼핑몰 개인정보 유출 손해배상', target: '가상의 A 온라인몰 회원 중 2026년 상반기 개인정보 유출 통지를 받은 분',
      summary: '회원 정보 관리 소홀로 이름·연락처·주소가 외부에 유출된 사안입니다. 정신적 손해에 대한 위자료 배상을 청구합니다.', base: 1842, goal: 3000, deadline: iso(18), status: 0,
      qs: ['가상의 A 온라인몰에 회원으로 가입한 적이 있나요?', '개인정보 유출 안내 문자나 이메일을 받으셨나요?', '유출 이후 스팸·피싱 연락이 늘었나요?', '현재 만 19세 이상인가요?'],
      fee: ['0원', '1만 1천원', '배상액의 15%'] },
    { id: 'apartment', cat: '부동산·건설', title: '신축 아파트 하자 보수 비용 청구', target: '가상의 ○○동 ○○아파트 소유자 중 누수·균열 하자를 겪은 세대',
      summary: '입주 후 지하주차장 누수와 외벽 균열이 반복되었으나 시공사가 보수를 미루고 있습니다. 하자 보수 비용 상당의 손해배상을 청구합니다.', base: 312, goal: 400, deadline: iso(-6), status: 1,
      qs: ['해당 아파트의 현재 소유자인가요?', '누수·균열 등 하자를 직접 확인하셨나요?', '하자 보수를 요청한 기록(민원, 사진 등)이 있나요?'],
      fee: ['0원', '세대당 3만원', '배상액의 12%'] },
    { id: 'refund', cat: '소비자 분쟁', title: '온라인 강의 플랫폼 환불 거부 집단 대응', target: '가상의 B 학습 플랫폼에서 장기 수강권을 결제한 뒤 환불을 거절당한 분',
      summary: '중도 해지 시 환불이 불가하다는 약관을 근거로 잔여 기간 수강료 반환을 거부한 사안입니다. 약관의 효력을 다투고 잔여 금액 반환을 청구합니다.', base: 1205, goal: 2000, deadline: iso(33), status: 0,
      qs: ['B 학습 플랫폼에서 6개월 이상 수강권을 결제했나요?', '환불을 요청했으나 거절당했나요?', '결제 내역이나 환불 거절 기록을 갖고 있나요?'],
      fee: ['0원', '1만원', '반환액의 10%'] },
  ];
  const names = ['김○○', '이○○', '박○○', '최○○', '정○○', '강○○', '윤○○'];
  const harms = ['유출 통지 후 피싱 문자 다수 수신', '택배 사칭 문자로 결제 시도 피해', '스팸 전화 증가', '지하주차장 천장 누수', '거실 벽면 균열', '잔여 8개월 환불 거절'];
  const apps = [
    ['privacy', 0, 0, 0], ['privacy', 1, 1, 1], ['privacy', 2, 2, 0], ['privacy', 3, 0, 2],
    ['apartment', 4, 3, 1], ['apartment', 5, 4, 1], ['refund', 6, 5, 0],
  ].map(([caseId, n, h, st], i) => ({ id: 'a' + (i + 1), caseId, name: names[n], phone: '010-****-' + String(1000 + i * 1111).slice(0, 4),
    harm: harms[h], files: ['증빙자료_' + (i + 1) + '.jpg'], result: st === 2 ? '상담 필요' : '참여 가능', status: APP_ST[st], at: iso(-(i * 2 + 1)) }));
  return { cases, apps, authed: false };
}

let db;
try { db = JSON.parse(localStorage.getItem(KEY)) || seed(); } catch { db = seed(); }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch {} };

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (n) => n.toLocaleString('ko-KR');
const getCase = (id) => db.cases.find((c) => c.id === id);
const appsOf = (id) => db.apps.filter((a) => a.caseId === id);
const joined = (c) => c.base + appsOf(c.id).length;
const pct = (c) => Math.min(100, Math.round((joined(c) / c.goal) * 100));
const dleft = (c) => Math.round((new Date(c.deadline + 'T00:00') - today()) / DAY);
const open = (c) => c.status === 0 && dleft(c) >= 0;
const badge = (c) => `<span class="badge b${c.status}">${STEPS[c.status]}</span>`;
const dday = (c) => { const d = dleft(c); return !open(c) ? '<span class="dday off">모집 마감</span>' : `<span class="dday">${d === 0 ? 'D-DAY' : 'D-' + d}</span>`; };

function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('show'), 2600); }

const I = {
  mark: `<svg class="mark" viewBox="0 0 32 32" fill="none"><rect x="1" y="1" width="30" height="30" rx="6" stroke="currentColor" stroke-width="1.5"/><path d="M16 7v18M9 25h14M8 12h16M8 12l-3 7a3 3 0 006 0l-3-7M24 12l-3 7a3 3 0 006 0l-3-7" stroke="#a6814f" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`,
  info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.5"/></svg>`,
  cursor: `<svg class="mcursor" viewBox="0 0 24 24"><path d="M4 3l7 18 2.5-7.5L21 11z" fill="#13213a" stroke="#fff" stroke-width="1.5"/></svg>`,
};
const AREA_ICONS = [
  '<path d="M4 20h16M6 20V9l6-5 6 5v11M10 20v-6h4v6"/>',
  '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  '<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 018 0v3"/>',
  '<path d="M3 6h18l-2 12H5zM8 6l1-3h6l1 3"/>',
  '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6M15 14.5c3 0 5 2 5 5"/>',
  '<path d="M12 3l8 4v5c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V7z"/>',
];
const AREAS = [['부동산·건설', '하자 소송, 재건축·재개발 조합 분쟁, 임대차'], ['기업 법무', '계약 검토, 주주 분쟁, 컴플라이언스 자문'], ['개인정보·IT', '정보 유출 대응, 플랫폼 약관, 데이터 규제'],
  ['소비자 분쟁', '환불 거부, 부당 약관, 제조물 책임'], ['집단소송', '다수 피해자 공동 소송의 모집부터 판결까지'], ['민사·손해배상', '불법행위·계약 위반으로 인한 손해 회복']];

const shell = (body) => `
<header class="hdr"><div class="wrap">
  <a class="logo" href="#/">${I.mark}법무법인 ○○ <small>데모</small></a>
  <nav class="nav"><a href="#/" data-scroll="areas">업무 분야</a><a href="#/" data-scroll="cases">진행 중인 집단소송</a><a href="#/" data-scroll="how">참여 절차</a></nav>
  <span class="spacer"></span>
  <a class="btn btn-line btn-admin" href="#/admin">관리자 화면 보기</a>
</div></header>
<main>${body}</main>
<footer class="ftr"><div class="wrap">
  <div class="row"><span class="logo">법무법인 ○○ <small>데모</small></span><span>업무 분야 · 집단소송 · 개인정보처리방침</span></div>
  <div class="notice" style="margin-top:22px;background:transparent;border-color:rgba(255,255,255,.15);color:#8f9ab0"><b style="color:#b7c0d0">변호사 광고 규정 준수 문구 영역</b>변호사업무광고규정에 따른 광고책임변호사, 사무소 정보, 과거 승소 사례 표기 제한 등 필수 고지 문구가 들어갈 자리입니다.</div>
  <p class="demo">제안용 데모 · 가상 데이터 · 실제 사이트는 의뢰서와 프로토타입 기준으로 제작</p>
</div></footer>`;

const caseCard = (c) => `
<a class="card case" href="#/case/${c.id}">
  <div class="case-top">${badge(c)}<span class="cat">${esc(c.cat)}</span></div>
  <h3>${esc(c.title)}</h3>
  <p class="target"><b>대상</b> · ${esc(c.target)}</p>
  <div class="prog"><div class="prog-row"><span>참여 인원</span><span><b>${fmt(joined(c))}</b> / ${fmt(c.goal)}명</span></div><div class="bar"><i style="width:${pct(c)}%"></i></div></div>
  <div class="case-foot">${dday(c)}<span class="more">자세히 보기 →</span></div>
</a>`;

function home() {
  const total = db.cases.reduce((s, c) => s + joined(c), 0);
  return shell(`
<section class="hero"><div class="wrap hero-in">
  <div>
    <span class="eyebrow">CLASS ACTION · 집단소송</span>
    <h1>한 사람의 피해는 작아도,<br><em>함께 모이면</em> 바로잡을 수 있습니다.</h1>
    <p class="lead">개인정보 유출, 아파트 하자, 부당한 환불 거부처럼 혼자 다투기 어려운 분쟁을 모아 대응합니다. 참여 자격 확인부터 진행 상황 안내까지 온라인으로 확인하세요.</p>
    <div class="ctas"><a class="btn btn-gold" href="#/" data-scroll="cases">진행 중인 소송 보기</a><a class="btn btn-ghost-light" href="#/check/${(db.cases.find(open) || db.cases[0]).id}">참여 자격 확인</a></div>
  </div>
  <div class="hero-panel">
    <h3>지금 모집 중 <span>실시간 참여 현황</span></h3>
    ${db.cases.filter(open).slice(0, 3).map((c) => `<a class="hp-item" href="#/case/${c.id}"><div class="hp-t">${esc(c.title)}</div><div class="hp-m"><span>${fmt(joined(c))}명 참여</span><span>마감 D-${dleft(c)}</span></div><div class="hp-bar"><i style="width:${pct(c)}%"></i></div></a>`).join('') || '<p class="hp-m">현재 모집 중인 소송이 없습니다.</p>'}
  </div>
</div>
<div class="wrap"><div class="stats">
  <div><b>${db.cases.length}건</b><span>진행 중인 집단소송</span></div><div><b>${fmt(total)}명</b><span>누적 참여 신청</span></div>
  <div><b>평균 3분</b><span>온라인 자격 확인</span></div><div><b>단계별</b><span>진행 상황 문자 안내</span></div>
</div></div></section>

<section class="sec" id="areas"><div class="wrap">
  <div class="sec-head"><div><p class="kicker">PRACTICE AREAS</p><h2>업무 분야</h2><p>분야별 전담 변호사가 사건 초기부터 끝까지 맡습니다.</p></div></div>
  <div class="areas">${AREAS.map(([t, d], i) => `<div class="area"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${AREA_ICONS[i]}</svg><h3>${t}</h3><p>${d}</p></div>`).join('')}</div>
</div></section>

<section class="sec" id="cases" style="padding-top:0"><div class="wrap">
  <div class="sec-head"><div><p class="kicker">ONGOING CASES</p><h2>진행 중인 집단소송</h2><p>참여 인원과 진행 단계는 담당자가 관리자 화면에서 바꾸는 즉시 반영됩니다.</p></div></div>
  <div class="cases">${db.cases.map(caseCard).join('')}</div>
</div></section>

<section class="sec" id="how" style="padding-top:0"><div class="wrap">
  <div class="sec-head"><div><p class="kicker">HOW TO JOIN</p><h2>참여 절차</h2></div></div>
  <div class="how">
    <div><h3>자격 자가진단</h3><p>3~4개의 질문에 답하면 참여 가능 여부를 바로 알려드립니다.</p></div>
    <div><h3>온라인 신청</h3><p>피해 내용과 증빙 자료를 휴대폰으로 올릴 수 있습니다.</p></div>
    <div><h3>서류 확인</h3><p>담당자가 서류를 검토하고 보완이 필요하면 연락드립니다.</p></div>
    <div><h3>진행 안내</h3><p>소장 접수부터 판결까지 단계가 바뀔 때마다 안내합니다.</p></div>
  </div>
  <div class="notice" style="margin-top:28px"><b>변호사 광고 규정 준수 문구 영역</b>집단소송 참여 모집 광고 시 필요한 고지(결과 비보장, 비용 부담 구조, 광고책임변호사 등)가 들어갈 자리입니다.</div>
</div></section>`);
}

function detail(id) {
  const c = getCase(id); if (!c) return notFound();
  const faqs = [
    ['소송에서 지면 비용을 더 내야 하나요?', '착수금 외 추가 비용은 원칙적으로 법무법인이 부담합니다. 다만 상대방 소송비용 부담 가능성 등 세부 조건은 위임계약서에 명시됩니다. (가상 안내)'],
    ['참여 후 중간에 취소할 수 있나요?', '소장 접수 전에는 언제든 신청을 철회할 수 있습니다. 접수 이후에는 담당자와 상담 후 소 취하 절차를 진행합니다.'],
    ['진행 상황은 어떻게 알 수 있나요?', '이 페이지의 진행 단계가 실시간으로 갱신되며, 단계가 바뀔 때 신청 시 남긴 연락처로 안내드립니다.'],
    ['증빙 자료가 없으면 참여할 수 없나요?', '자료가 부족해도 우선 신청하실 수 있습니다. 서류 확인 단계에서 담당자가 대체 자료를 안내해 드립니다.'],
  ];
  return shell(`
<div class="wrap">
  <p class="crumb"><a href="#/">홈</a> · <a href="#/" data-scroll="cases">집단소송</a> · ${esc(c.cat)}</p>
  <div class="dhead">${badge(c)}<h1>${esc(c.title)}</h1><p class="sum">${esc(c.summary)}</p></div>
  <div class="dgrid">
    <div>
      <div class="block"><h2>진행 단계</h2><div class="tl">${STEPS.map((s, i) => `<div class="tl-step ${i < c.status ? 'done' : i === c.status ? 'now' : ''}"><span class="tl-dot">${i < c.status ? '✓' : i + 1}</span>${s}<small>${STEP_DESC[i]}</small></div>`).join('')}</div></div>
      <div class="block"><h2>누가 참여할 수 있나요?</h2><ul class="checks"><li>${I.check}<span><b>${esc(c.target)}</b></span></li>${c.qs.map((q) => `<li>${I.check}<span>${esc(q)} <small style="color:var(--muted)">→ 예</small></span></li>`).join('')}</ul></div>
      <div class="block"><h2>비용 안내 <small style="font-family:var(--sans);font-size:13px;color:var(--muted);font-weight:500">가상 예시</small></h2>
        <div class="costs"><div><span>상담·자격 확인</span><b>${esc(c.fee[0])}</b><p>온라인 자가진단 무료</p></div><div><span>착수금</span><b>${esc(c.fee[1])}</b><p>인지대·송달료 포함</p></div><div><span>성공보수</span><b>${esc(c.fee[2])}</b><p>배상금 수령 시에만</p></div></div></div>
      <div class="block faq"><h2>자주 묻는 질문</h2>${faqs.map(([q, a], i) => `<details${i === 0 ? ' open' : ''}><summary>${q}</summary><p>${a}</p></details>`).join('')}</div>
      <div class="notice"><b>변호사 광고 규정 준수 문구 영역</b>소송 결과는 사안에 따라 달라질 수 있으며 승소를 보장하지 않는다는 고지, 광고책임변호사 표시 등이 들어갈 자리입니다.</div>
    </div>
    <aside class="card side">
      <div class="big">${fmt(joined(c))}<small> / ${fmt(c.goal)}명 참여</small></div>
      <div class="bar" style="margin-top:12px"><i style="width:${pct(c)}%"></i></div>
      <dl><dt>모집 마감</dt><dd>${c.deadline} · ${dday(c)}</dd><dt>현재 단계</dt><dd>${STEPS[c.status]}</dd><dt>분야</dt><dd>${esc(c.cat)}</dd></dl>
      ${open(c) ? `<a class="btn btn-primary" href="#/check/${c.id}">참여 자격 확인하기</a><p class="hint">질문 ${c.qs.length}개 · 약 1분 소요</p>` : `<button class="btn btn-line" disabled>모집이 마감되었습니다</button><p class="hint">진행 상황은 이 페이지에서 계속 안내됩니다.</p>`}
    </aside>
  </div>
</div>`);
}

// 자가진단: 답변은 메모리에만 두고 결과만 신청서로 넘김
let quiz = { id: null, answers: [] };
function check(id) {
  const c = getCase(id); if (!c) return notFound();
  if (quiz.id !== id) quiz = { id, answers: [] };
  const n = quiz.answers.length, total = c.qs.length;
  const bar = `<div class="stepper">${c.qs.map((_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</div>`;
  let inner;
  if (!open(c)) inner = `<div class="card result warn"><div class="ico">${I.info}</div><h2>모집이 마감된 소송입니다</h2><p>진행 상황은 소송 안내 페이지에서 확인하실 수 있습니다.</p><div class="ctas"><a class="btn btn-line" href="#/case/${c.id}">소송 안내로</a></div></div>`;
  else if (n < total) inner = `${bar}<div class="card qcard"><p class="qn">질문 ${n + 1} / ${total}</p><h2>${esc(c.qs[n])}</h2><div class="yn"><button data-ans="1">예</button><button data-ans="0">아니요</button></div>
    ${n ? '<p style="margin-top:18px;text-align:center"><button class="btn btn-sm btn-line" data-back>이전 질문</button></p>' : ''}</div>`;
  else {
    const ok = quiz.answers.every(Boolean);
    inner = `${bar}<div class="card result ${ok ? 'ok' : 'warn'}"><div class="ico">${ok ? I.check : I.info}</div>
      <h2>${ok ? '참여 가능합니다' : '상담이 필요합니다'}</h2>
      <p>${ok ? '답변하신 내용으로 보아 이 소송의 참여 요건을 충족합니다. 신청서를 작성해 주세요.' : '일부 요건이 확인되지 않았습니다. 신청서를 남기시면 담당자가 참여 가능 여부를 검토해 연락드립니다.'}</p>
      <div class="ctas"><a class="btn btn-primary" href="#/apply/${c.id}">${ok ? '참여 신청하기' : '상담 신청하기'}</a><button class="btn btn-line" data-restart>다시 진단하기</button></div></div>`;
  }
  return shell(`<div class="narrow"><p class="crumb" style="padding-top:0;margin-bottom:18px"><a href="#/case/${c.id}">← ${esc(c.title)}</a></p><p class="kicker">참여 자격 자가진단</p>${inner}</div>`);
}

let files = [];
function apply(id) {
  const c = getCase(id); if (!c) return notFound();
  files = [];
  const done = quiz.id === id && quiz.answers.length === c.qs.length;
  const result = done ? (quiz.answers.every(Boolean) ? '참여 가능' : '상담 필요') : '진단 미실시';
  return shell(`<div class="narrow">
<p class="crumb" style="padding-top:0;margin-bottom:18px"><a href="#/case/${c.id}">← ${esc(c.title)}</a></p>
<form class="card form" id="applyForm" novalidate data-result="${result}">
  <p class="kicker">참여 신청서</p><h1>${esc(c.title)}</h1>
  <p class="sub">자가진단 결과: <b>${result}</b> · 작성 시간 약 2분</p>
  <div class="fld"><label class="l" for="f-name">이름<em>*</em></label><input class="inp" id="f-name" name="name" autocomplete="name" placeholder="실명을 입력해 주세요"></div>
  <div class="fld"><label class="l" for="f-phone">연락처<em>*</em></label><input class="inp" id="f-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="숫자만 입력"></div>
  <div class="fld"><label class="l" for="f-harm">피해 내용<em>*</em></label><textarea class="inp" id="f-harm" name="harm" placeholder="언제, 어떤 피해를 입으셨는지 간단히 적어 주세요"></textarea></div>
  <div class="fld"><span class="l" style="display:block;font-weight:600;font-size:14.5px;margin-bottom:8px">증빙 파일 첨부 <small style="color:var(--muted);font-weight:400">(선택)</small></span>
    <label class="drop"><input type="file" id="f-files" multiple accept="image/*,.pdf"><b>파일 선택</b> 또는 사진 촬영<br><small>유출 안내 문자 캡처, 결제 내역, 하자 사진 등 · 데모에서는 파일명만 저장됩니다</small></label>
    <ul class="files" id="fileList"></ul></div>
  <label class="agree"><input type="checkbox" id="f-agree"><span><b>[필수] 개인정보 수집·이용에 동의합니다</b><small>수집 항목: 이름, 연락처, 피해 내용, 증빙 자료 · 목적: 집단소송 참여 검토 및 진행 안내 · 보유 기간: 소송 종결 후 5년 (가상 문구)</small></span></label>
  <p class="err" id="formErr"></p>
  <button class="btn btn-primary" style="width:100%;margin-top:8px;padding:15px" type="submit">신청서 제출</button>
</form></div>`);
}

function applied(id) {
  const c = getCase(id); if (!c) return notFound();
  return shell(`<div class="narrow"><div class="card result ok"><div class="ico">${I.check}</div><h2>신청이 접수되었습니다</h2>
  <p>담당자가 서류를 확인한 뒤 연락드립니다. 진행 상황은 소송 안내 페이지에서 언제든 확인할 수 있습니다.</p>
  <p style="margin-top:-8px"><span class="demo-note">데모: 실제 전송되지 않음 · 이 브라우저에만 저장됨</span></p>
  <div class="ctas"><a class="btn btn-primary" href="#/admin/case/${c.id}">관리자 화면에서 확인</a><a class="btn btn-line" href="#/case/${c.id}">소송 안내로</a></div></div></div>`);
}

/* ---------- admin ---------- */
const ashell = (on, body) => `<div class="admin">
<nav class="aside"><span class="logo">${I.mark}관리자<small>데모</small></span>
  <a href="#/admin" class="${on === 'dash' ? 'on' : ''}">대시보드</a>
  ${db.cases.map((c) => `<a href="#/admin/case/${c.id}" class="${on === c.id ? 'on' : ''}">${esc(c.title.length > 13 ? c.title.slice(0, 13) + '…' : c.title)}</a>`).join('')}
  <a href="#/admin/new" class="${on === 'new' ? 'on' : ''}">＋ 새 소송 등록</a>
  <span class="sp"></span><a class="pub" href="#/">공개 페이지 보기</a><a href="#/admin" data-logout>로그아웃</a></nav>
<div class="amain">${body}</div></div>`;

function login() {
  return `<div class="login"><form class="card" id="loginForm"><span class="logo">${I.mark}법무법인 ○○ <small>데모</small></span>
  <h1>관리자 로그인</h1><p class="sub">데모 화면입니다. 아무 값이나 입력하면 들어갈 수 있습니다.</p>
  <div class="fld"><label class="l" for="l-id">아이디</label><input class="inp" id="l-id" value="staff" autocomplete="off"></div>
  <div class="fld"><label class="l" for="l-pw">비밀번호</label><input class="inp" id="l-pw" type="password" value="demo1234" autocomplete="off"></div>
  <button class="btn btn-primary" style="width:100%" type="submit">로그인</button>
  <p style="text-align:center;margin-top:16px;font-size:13.5px"><a href="#/" style="color:var(--muted)">← 공개 페이지로</a></p></form></div>`;
}

const mini = (kind) => {
  const win = (inner) => `<div class="mshot"><div class="mwin"><div class="dots"><i></i><i></i><i></i></div>${inner}</div>${I.cursor}</div>`;
  if (kind === 0) return win('<div class="ln n" style="width:40%"></div><div class="mfield"></div><div class="mfield"></div><div class="mfield" style="width:60%"></div><div class="mbtn"></div>');
  if (kind === 1) return win('<div class="ln n" style="width:50%"></div><div style="display:flex;gap:4px;margin-top:6px"><div class="ln n" style="flex:1;height:10px"></div><div class="ln n" style="flex:1;height:10px"></div><div class="ln g" style="flex:1;height:10px"></div><div class="ln" style="flex:1;height:10px"></div></div><div class="mfield" style="width:55%;margin-top:6px"></div>');
  return win('<div class="ln n" style="width:35%"></div><div class="ln"></div><div class="ln"></div><div class="ln"></div><div class="ln" style="width:80%"></div><div class="mbtn" style="background:var(--gold)"></div>');
};

function dash() {
  const pend = db.apps.filter((a) => a.status === '접수').length;
  return ashell('dash', `
<div class="atop"><div><h1>대시보드<span class="tag-demo">데모</span></h1><p>오늘 기준 소송별 신청 현황입니다.</p></div><a class="btn btn-primary btn-sm" href="#/admin/new">＋ 새 소송 등록</a></div>
<div class="kpis"><div class="card kpi"><span>진행 중 소송</span><b>${db.cases.filter((c) => c.status < 3).length}</b></div><div class="card kpi"><span>온라인 신청자</span><b>${db.apps.length}</b></div><div class="card kpi"><span>서류 확인 대기</span><b>${pend}</b></div></div>
<div class="panel"><div class="panel-h"><h2>소송 목록</h2><span style="font-size:13px;color:var(--muted)">이름을 누르면 신청자 관리로 이동</span></div>
<table class="tbl"><thead><tr><th>소송명</th><th>진행 상태</th><th>온라인 신청</th><th>총 참여</th><th>마감</th></tr></thead><tbody>
${db.cases.map((c) => `<tr><td class="t"><a href="#/admin/case/${c.id}">${esc(c.title)}</a></td><td data-l="진행 상태">${badge(c)}</td><td data-l="온라인 신청" class="num">${appsOf(c.id).length}명 <span style="color:var(--muted)">(대기 ${appsOf(c.id).filter((a) => a.status === '접수').length})</span></td><td data-l="총 참여" class="num">${fmt(joined(c))} / ${fmt(c.goal)}</td><td data-l="마감">${dday(c)}</td></tr>`).join('')}
</tbody></table></div>
<div class="panel"><div class="panel-h"><h2>운영 매뉴얼 미리보기</h2><span style="font-size:13px;color:var(--muted)">납품 시 화면 캡처가 들어간 PDF 매뉴얼 제공</span></div><div class="panel-b"><div class="manual">
  <div class="mstep">${mini(0)}<div class="mtext"><b>1. 새 소송 등록</b><span>3분</span><p>정해진 칸에 제목·대상·마감일·질문을 채우면 소송 페이지가 자동으로 만들어집니다.</p></div></div>
  <div class="mstep">${mini(1)}<div class="mtext"><b>2. 진행 상태 바꾸기</b><span>1분</span><p>소송 화면에서 상태를 고르면 공개 페이지의 단계 표시가 즉시 바뀝니다.</p></div></div>
  <div class="mstep">${mini(2)}<div class="mtext"><b>3. 신청자 명단 내려받기</b><span>1분</span><p>CSV 다운로드를 누르면 엑셀에서 바로 열리는 명단 파일이 저장됩니다.</p></div></div>
</div></div></div>`);
}

let filt = { q: '', st: '' };
function adminCase(id) {
  const c = getCase(id); if (!c) return notFound();
  return ashell(id, `
<div class="atop"><div><h1>${esc(c.title)}<span class="tag-demo">데모</span></h1><p>${esc(c.cat)} · 마감 ${c.deadline}</p></div><a class="btn btn-line btn-sm" href="#/case/${c.id}">공개 페이지에서 보기 ↗</a></div>
<div class="panel"><div class="panel-h"><h2>진행 상태</h2></div><div class="panel-b">
  <div class="statusbox"><select class="inp" id="statusSel" aria-label="진행 상태">${STEPS.map((s, i) => `<option value="${i}"${i === c.status ? ' selected' : ''}>${s}</option>`).join('')}</select>
  <span class="live" id="live">✓ 공개 페이지에 반영되었습니다</span></div>
  <div class="mini-tl" id="miniTl">${miniTl(c)}</div></div></div>
<div class="panel"><div class="panel-h"><h2>신청자 <span id="cnt" style="color:var(--muted);font-weight:500"></span></h2><button class="btn btn-gold btn-sm" id="csvBtn">CSV 다운로드</button></div>
  <div class="tools"><input class="inp" id="q" placeholder="이름·연락처·피해 내용 검색" value="${esc(filt.q)}"><select class="inp" id="stf" aria-label="진행 상태 필터"><option value="">전체 상태</option>${APP_ST.map((s) => `<option${filt.st === s ? ' selected' : ''}>${s}</option>`).join('')}</select></div>
  <div id="rows"></div></div>`);
}
const miniTl = (c) => STEPS.map((s, i) => `<span class="${i < c.status ? 'done' : i === c.status ? 'now' : ''}">${s}</span>`).join('');
const stCls = (s) => 'st st-' + 'abc'[APP_ST.indexOf(s)];
function filtered(id) {
  const q = filt.q.trim().toLowerCase();
  return appsOf(id).filter((a) => (!filt.st || a.status === filt.st) && (!q || [a.name, a.phone, a.harm].join(' ').toLowerCase().includes(q))).sort((a, b) => b.at.localeCompare(a.at));
}
function renderRows(id) {
  const list = filtered(id);
  $('#cnt').textContent = `${list.length}명`;
  $('#rows').innerHTML = list.length ? `<table class="tbl"><thead><tr><th>신청일</th><th>이름</th><th>연락처</th><th>피해 내용</th><th>자가진단</th><th>상태</th><th></th></tr></thead><tbody>
  ${list.map((a) => `<tr><td data-l="신청일" class="num">${a.at}</td><td data-l="이름" style="font-weight:600">${esc(a.name)}</td><td data-l="연락처" class="num">${esc(a.phone)}</td>
  <td data-l="피해 내용"><span>${esc(a.harm)}${a.files.length ? `<small style="display:block;color:var(--muted)">첨부 ${a.files.length}개</small>` : ''}</span></td><td data-l="자가진단">${esc(a.result)}</td>
  <td data-l="상태"><span class="${stCls(a.status)}">${a.status}</span></td>
  <td data-l="처리">${a.status === '서류 확인 완료' ? '<span style="color:var(--muted);font-size:13px">완료</span>' : `<button class="btn btn-line btn-sm" data-ok="${a.id}">서류 확인 완료</button>`}</td></tr>`).join('')}
  </tbody></table>` : '<p class="empty">조건에 맞는 신청자가 없습니다.</p>';
}

function csv(id) {
  const c = getCase(id);
  const rows = [['신청일', '이름', '연락처', '피해 내용', '첨부 파일', '자가진단', '상태'], ...filtered(id).map((a) => [a.at, a.name, a.phone, a.harm, a.files.join(' / '), a.result, a.status])];
  const text = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' })); // BOM: 엑셀 한글 깨짐 방지
  const a = Object.assign(document.createElement('a'), { href: url, download: `신청자명단_${c.id}_${iso(0)}.csv` });
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('신청자 명단 CSV를 내려받았습니다');
}

function newCase() {
  return ashell('new', `
<div class="atop"><div><h1>새 소송 등록<span class="tag-demo">데모</span></h1><p>정해진 칸만 채우면 공개 페이지가 같은 디자인으로 자동 생성됩니다.</p></div></div>
<div class="tpl-note">자유 편집형 페이지 빌더 대신 <b>고정 템플릿 + 입력 칸</b> 방식입니다. 디자인이 깨질 일이 없고, 직원 누구나 3분 안에 등록할 수 있습니다.</div>
<form class="panel" id="newForm" novalidate><div class="panel-b">
  <div class="grid2"><div class="fld"><label class="l" for="n-title">소송명<em>*</em></label><input class="inp" id="n-title" placeholder="예) 헬스장 회원권 환불 거부 집단 대응"></div>
  <div class="fld"><label class="l" for="n-cat">분야</label><select class="inp" id="n-cat">${['소비자 분쟁', '개인정보·IT', '부동산·건설', '민사·손해배상'].map((x) => `<option>${x}</option>`).join('')}</select></div></div>
  <div class="fld"><label class="l" for="n-target">참여 대상<em>*</em></label><input class="inp" id="n-target" placeholder="예) 가상의 C 피트니스 회원 중 폐업 통지를 받은 분"></div>
  <div class="fld"><label class="l" for="n-sum">사건 요약<em>*</em></label><textarea class="inp" id="n-sum" style="min-height:80px" placeholder="2~3문장으로 사건을 설명해 주세요"></textarea></div>
  <div class="grid2"><div class="fld"><label class="l" for="n-goal">모집 목표 인원</label><input class="inp" id="n-goal" type="number" min="1" value="500"></div>
  <div class="fld"><label class="l" for="n-dl">모집 마감일</label><input class="inp" id="n-dl" type="date" value="${iso(30)}" min="${iso(0)}"></div></div>
  <div class="fld"><label class="l">자격 확인 질문 (예/아니요로 답하는 질문 3개)</label>
    ${[1, 2, 3].map((i) => `<input class="inp" id="n-q${i}" style="margin-bottom:8px" placeholder="질문 ${i}">`).join('')}</div>
  <p class="err" id="newErr"></p>
  <div style="display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap"><a class="btn btn-line" href="#/admin">취소</a><button class="btn btn-primary" type="submit">등록하고 공개하기</button></div>
</div></form>`);
}

const notFound = () => shell('<div class="narrow"><div class="card result warn"><h2>페이지를 찾을 수 없습니다</h2><p>주소를 확인해 주세요.</p><div class="ctas"><a class="btn btn-primary" href="#/">홈으로</a></div></div></div>');

/* ---------- router ---------- */
function route() {
  const [, a = '', b = '', c2 = ''] = location.hash.replace(/^#/, '').split('/');
  let html;
  if (a === 'admin') {
    if (!db.authed) html = login();
    else if (b === 'case') html = adminCase(c2);
    else if (b === 'new') html = newCase();
    else html = dash();
  } else if (a === 'case') html = detail(b);
  else if (a === 'check') html = check(b);
  else if (a === 'apply') html = apply(b);
  else if (a === 'done') html = applied(b);
  else html = home();
  $('#app').innerHTML = html;
  document.title = (a === 'admin' ? '관리자 · ' : '') + '법무법인 ○○ 집단소송 데모';
  if (a === 'admin' && b === 'case' && db.authed && getCase(c2)) renderRows(c2);
  const sc = sessionStorage.getItem('scroll'); sessionStorage.removeItem('scroll');
  if (sc && document.getElementById(sc)) document.getElementById(sc).scrollIntoView();
  else window.scrollTo(0, 0);
}
window.addEventListener('hashchange', route);

document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-scroll],[data-ans],[data-back],[data-restart],[data-ok],[data-logout],#csvBtn');
  if (!t) return;
  const id = location.hash.split('/').pop();
  if (t.dataset.scroll) {
    e.preventDefault();
    const el = document.getElementById(t.dataset.scroll);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
    else { sessionStorage.setItem('scroll', t.dataset.scroll); location.hash = '#/'; }
  } else if (t.dataset.ans) { quiz.answers.push(t.dataset.ans === '1'); route(); }
  else if ('back' in t.dataset) { quiz.answers.pop(); route(); }
  else if ('restart' in t.dataset) { quiz.answers = []; route(); }
  else if (t.dataset.ok) { db.apps.find((a) => a.id === t.dataset.ok).status = '서류 확인 완료'; save(); renderRows(id); toast('서류 확인 완료로 변경했습니다'); }
  else if ('logout' in t.dataset) { e.preventDefault(); db.authed = false; save(); location.hash = '#/admin'; route(); }
  else if (t.id === 'csvBtn') csv(id);
});

document.addEventListener('input', (e) => {
  const id = location.hash.split('/').pop();
  if (e.target.id === 'q') { filt.q = e.target.value; renderRows(id); }
  const fe = e.target.form && e.target.form.querySelector('.err'); if (fe) fe.textContent = '';
});

document.addEventListener('change', (e) => {
  const id = location.hash.split('/').pop();
  if (e.target.id === 'stf') { filt.st = e.target.value; renderRows(id); }
  if (e.target.id === 'statusSel') {
    const c = getCase(id); c.status = +e.target.value; save();
    $('#miniTl').innerHTML = miniTl(c);
    $('#live').classList.add('show');
    toast(`진행 상태를 '${STEPS[c.status]}'(으)로 변경했습니다`);
  }
  if (e.target.id === 'f-files') {
    files = [...e.target.files].map((f) => ({ name: f.name, size: f.size }));
    $('#fileList').innerHTML = files.map((f) => `<li><span>${esc(f.name)}</span><span style="color:var(--muted)">${Math.max(1, Math.round(f.size / 1024))}KB</span></li>`).join('');
  }
});

document.addEventListener('submit', (e) => {
  e.preventDefault();
  const f = e.target, id = location.hash.split('/').pop();
  if (f.id === 'loginForm') { db.authed = true; save(); route(); }
  if (f.id === 'applyForm') {
    const v = (k) => $('#f-' + k).value.trim();
    const err = !v('name') ? '이름을 입력해 주세요.' : v('phone').replace(/\D/g, '').length < 9 ? '연락처를 정확히 입력해 주세요.' : !v('harm') ? '피해 내용을 입력해 주세요.' : !$('#f-agree').checked ? '개인정보 수집·이용에 동의해 주세요.' : '';
    $('#formErr').textContent = err;
    if (err) return;
    db.apps.push({ id: 'a' + Date.now(), caseId: id, name: v('name'), phone: v('phone').replace(/\D/g, '').replace(/^(\d{3})(\d{3,4})(\d{4})$/, '$1-$2-$3'), harm: v('harm'), files: files.map((x) => x.name), result: f.dataset.result, status: '접수', at: iso(0) });
    save(); quiz = { id: null, answers: [] };
    location.hash = '#/done/' + id;
  }
  if (f.id === 'newForm') {
    const v = (k) => $('#n-' + k).value.trim();
    const qs = [1, 2, 3].map((i) => v('q' + i)).filter(Boolean);
    const err = !v('title') ? '소송명을 입력해 주세요.' : !v('target') ? '참여 대상을 입력해 주세요.' : !v('sum') ? '사건 요약을 입력해 주세요.' : qs.length < 1 ? '자격 확인 질문을 1개 이상 입력해 주세요.' : '';
    $('#newErr').textContent = err;
    if (err) return;
    const nid = 'c' + Date.now().toString(36);
    db.cases.unshift({ id: nid, cat: v('cat'), title: v('title'), target: v('target'), summary: v('sum'), base: 0, goal: Math.max(1, +v('goal') || 100), deadline: v('dl') || iso(30), status: 0, qs, fee: ['0원', '협의', '협의'] });
    save(); toast('새 소송이 공개 페이지에 등록되었습니다');
    location.hash = '#/admin/case/' + nid;
  }
});

route();

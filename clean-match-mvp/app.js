'use strict';
// 클린매치 MVP 시연. 모든 데이터는 가상이며 이 브라우저(localStorage) 안에만 저장됩니다.
const KEY = 'cleanmatch-demo-v1';
const QUOTA = 3;
const TYPES = ['입주청소', '이사청소', '사무실청소', '준공청소', '거주청소', '상가청소'];
const CONDS = ['엘리베이터 없음', '주차 불가', '베란다 확장', '반려동물 있음', '새집증후군 시공', '곰팡이 제거'];
const SRC = { search: '검색', ad: '광고', direct: '직접', ref: '추천' };
const ST = { received: '접수', bidding: '업체 참여 중', consult: '상담 중', won: '계약 성사', lost: '미성사' };
const STEPS = ['received', 'bidding', 'consult', 'won'];
const MATES = ['이○○', '최○○', '한○○'];
const ME_WORKER = '박○○';

function seed() {
  return {
    v: 1,
    ui: { role: 'customer', mode: 'biz', acting: 'me', openReq: 'r1' },
    companies: [
      { id: 'me', name: '반짝홈케어', owner: '박○○', region: '서울 마포구', bizNo: '214-86-*****', status: 'none' },
      { id: 'c2', name: '깨끗한하루', owner: '정○○', region: '서울 강남구', bizNo: '120-81-*****', status: 'approved' },
      { id: 'c3', name: '미소클린', owner: '오○○', region: '경기 성남시', bizNo: '129-87-*****', status: 'approved' },
      { id: 'c4', name: '새집청소연구소', owner: '서○○', region: '서울 송파구', bizNo: '215-88-*****', status: 'approved' },
      { id: 'c5', name: '한빛클리닝', owner: '조○○', region: '인천 연수구', bizNo: '131-86-*****', status: 'approved' },
      { id: 'c6', name: '바른청소', owner: '임○○', region: '경기 수원시', bizNo: '124-81-*****', status: 'pending' },
    ],
    requests: [
      req('r1', 'me', '윤○○', '010-0000-4821', '입주청소', '서울', '송파구 잠실동', '2026-11-14', 32, ['베란다 확장'], 'search', ['c2', 'c3'], 'bidding'),
      req('r2', 'x', '이○○', '010-0000-7310', '사무실청소', '서울', '강남구 역삼동', '2026-11-09', 45, ['주차 불가'], 'ad', ['c2', 'c3', 'c4'], 'consult', 'c4'),
      req('r3', 'me', '윤○○', '010-0000-4821', '준공청소', '경기', '성남시 분당구', '2026-11-20', 58, ['새집증후군 시공'], 'direct', [], 'received'),
      req('r4', 'x', '최○○', '010-0000-2296', '이사청소', '인천', '연수구 송도동', '2026-10-28', 24, [], 'ref', ['c5', 'c2', 'c3'], 'won', 'c5'),
      req('r5', 'x', '정○○', '010-0000-5584', '입주청소', '경기', '수원시 영통구', '2026-10-25', 34, ['반려동물 있음'], 'search', ['c3', 'c4'], 'lost'),
      req('r6', 'x', '강○○', '010-0000-9142', '거주청소', '서울', '마포구 합정동', '2026-11-12', 21, ['엘리베이터 없음'], 'search', ['c4'], 'bidding'),
    ],
    jobs: [
      { id: 'j1', co: 'c2', region: '서울 송파구', date: '2026-11-14', cond: '입주청소 보조 · 09~18시 · 일당 15만원', head: 3, team: true },
      { id: 'j2', co: 'c3', region: '경기 성남시', date: '2026-11-20', cond: '준공청소 · 2일 · 일당 17만원', head: 4, team: true },
      { id: 'j3', co: 'c5', region: '인천 연수구', date: '2026-11-10', cond: '사무실 정기청소 · 야간 · 시급 1.3만원', head: 1, team: false },
    ],
    apps: [
      { id: 'a1', job: 'j1', by: '강○○', type: 'solo', members: [{ name: '강○○', ok: true }], status: 'pending' },
      { id: 'a2', job: 'j2', by: '문○○', type: 'team', members: [{ name: '문○○', ok: true }, { name: '배○○', ok: true }], status: 'accepted' },
    ],
    seq: 10,
  };
}
function req(id, owner, name, phone, type, sido, dong, date, area, conds, src, parts, status, consultWith) {
  const bids = {};
  parts.forEach(c => { bids[c] = price(area, c); });
  return { id, owner, name, phone, type, sido, dong, date, area, conds, memo: '', photos: 0, src, parts, bids, cancelled: [], status, consultWith: consultWith || null };
}
function price(area, cid) { // 가상 견적가: 평당 1.2~1.5만원
  const k = 12 + (cid.charCodeAt(cid.length - 1) % 4);
  return Math.round(area * k / 1) * 1000;
}

let S = load();
const photoMem = {}; // reqId -> objectURL[] (새로고침하면 사라짐, 서버 전송 없음)
let draftPhotos = [];

function load() {
  try { const v = JSON.parse(localStorage.getItem(KEY)); if (v && v.v === 1) return v; } catch (e) { /* 저장소 차단 시 기본값 */ }
  return seed();
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* 무시 */ } }

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ic = (n, cls) => `<svg class="ic ${cls || ''}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const co = id => S.companies.find(c => c.id === id);
const rq = id => S.requests.find(r => r.id === id);
const won = n => (n / 10000).toLocaleString('ko-KR', { maximumFractionDigits: 1 }) + '만원';
const fmtDate = d => { const [, m, dd] = d.split('-'); const w = '일월화수목금토'[new Date(d + 'T00:00').getDay()]; return `${+m}월 ${+dd}일(${w})`; };
const mask = p => p.replace(/\d{4}-\d{4}$/, '****-****');
const isOpen = r => r.status === 'received' || r.status === 'bidding';
const left = r => QUOTA - r.parts.length;
const chip = st => `<span class="st st-${st}">${ST[st]}</span>`;

let toastT;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2400);
}
function commit(msg) { save(); render(); if (msg) toast(msg); }
function syncStatus(r) { if (isOpen(r)) r.status = r.parts.length ? 'bidding' : 'received'; }

/* ---------- 정원·연락처 규칙 (실서비스는 서버 함수 + RLS) ---------- */
function join(rid, cid) {
  const r = rq(rid), c = co(cid);
  if (c.status !== 'approved') return '관리자 승인 후 참여할 수 있습니다';
  if (!isOpen(r)) return '이미 상담이 시작되었거나 종료된 요청입니다';
  if (r.parts.includes(cid)) return '이미 참여한 요청입니다';
  if (r.cancelled.includes(cid)) return '참여를 취소한 요청은 다시 참여할 수 없습니다';
  if (left(r) <= 0) return '정원 3곳이 모두 찼습니다';
  r.parts.push(cid); r.bids[cid] = price(r.area, cid); syncStatus(r);
  return null;
}
function cancel(rid, cid) {
  const r = rq(rid);
  if (!isOpen(r)) return '상담이 시작된 뒤에는 취소할 수 없습니다';
  if (!r.parts.includes(cid)) return '참여하지 않은 요청입니다';
  r.parts = r.parts.filter(x => x !== cid); delete r.bids[cid]; r.cancelled.push(cid); syncStatus(r);
  return null;
}

/* ---------- 공통 조각 ---------- */
function slots(r) {
  const full = left(r) <= 0;
  const dots = Array.from({ length: QUOTA }, (_, i) => `<i class="${i < r.parts.length ? 'on' : ''}"></i>`).join('');
  const txt = !isOpen(r) ? `참여 ${r.parts.length}곳` : full ? '마감' : `잔여 ${left(r)}곳`;
  return `<span class="slots ${full && isOpen(r) ? 'full' : ''}"><span class="dots">${dots}</span><b>${txt}</b></span>`;
}
function meta(r) {
  return `<div class="meta">
    <span>${ic('cal')}희망일 ${fmtDate(r.date)}</span>
    ${r.photos ? `<span>${ic('cam')}사진 ${r.photos}장</span>` : ''}
  </div>
  ${r.conds.length || r.memo ? `<div class="tags">${r.conds.map(c => `<span>${esc(c)}</span>`).join('')}${r.memo ? `<span class="memo">${esc(r.memo)}</span>` : ''}</div>` : ''}`;
}
function steps(r) {
  const idx = r.status === 'lost' ? 3 : STEPS.indexOf(r.status);
  return `<ol class="steps">${STEPS.map((s, i) => {
    const label = i === 3 && r.status === 'lost' ? '미성사' : i === 3 ? '계약 성사/미성사' : ST[s];
    const cls = i < idx ? 'done' : i === idx ? (r.status === 'lost' ? 'cur lost' : 'cur') : '';
    return `<li class="${cls}"><i></i><span>${label}</span></li>`;
  }).join('')}</ol>`;
}

/* ---------- 고객 ---------- */
function renderCustomer() {
  const mine = S.requests.filter(r => r.owner === 'me');
  $('#myCount').textContent = `${mine.length}건`;
  $('#myReqs').innerHTML = mine.map(r => {
    const open = S.ui.openReq === r.id;
    let detail = '';
    if (open) {
      const pics = (photoMem[r.id] || []).map(u => `<img src="${u}" alt="현장 사진">`).join('');
      const rows = r.parts.map(cid => {
        const c = co(cid);
        let act = '';
        if (isOpen(r)) act = `<button class="btn sm" data-act="consult" data-r="${r.id}" data-c="${cid}">상담 시작</button>`;
        else if (r.consultWith === cid) act = r.status === 'consult' ? '<span class="st st-consult">상담 중</span>' : chip(r.status);
        return `<li><div><b>${esc(c.name)}</b><small>${esc(c.region)} · 견적 ${won(r.bids[cid])}</small></div>${act}</li>`;
      }).join('');
      detail = `<div class="detail">
        ${steps(r)}
        ${pics ? `<div class="thumbs">${pics}</div>` : r.photos ? `<p class="hint">사진 ${r.photos}장 (미리보기는 등록한 탭에서만 유지됩니다)</p>` : ''}
        <div class="privacy">${ic('lock')}<span>내 연락처 <b>${r.phone}</b>는 참여한 업체 <b>${r.parts.length}곳</b>에만 공개됩니다.</span></div>
        <h4>참여 업체 ${r.parts.length}/${QUOTA}</h4>
        ${rows ? `<ul class="bids">${rows}</ul>` : '<p class="empty">아직 참여한 업체가 없습니다. 업체·작업자 탭에서 참여해 보세요.</p>'}
        ${r.status === 'consult' ? `<div class="actions"><button class="btn pri" data-act="won" data-r="${r.id}">${ic('check')}계약 성사</button><button class="btn" data-act="lost" data-r="${r.id}">미성사</button></div>` : ''}
      </div>`;
    }
    return `<article class="card req ${open ? 'open' : ''}">
      <button class="req-h" data-act="toggle" data-r="${r.id}" aria-expanded="${open}">
        <div class="req-top"><span class="type">${esc(r.type)}</span>${chip(r.status)}</div>
        <div class="req-title">${esc(r.sido)} ${esc(r.dong)} · ${r.area}평</div>
        <div class="req-sub"><span>${fmtDate(r.date)}</span>${slots(r)}</div>
      </button>${detail}</article>`;
  }).join('') || '<p class="empty card">등록한 요청이 없습니다.</p>';
}

/* ---------- 업체 ---------- */
function renderBiz() {
  const me = co('me');
  const reg = $('#regCard');
  if (me.status === 'none') {
    reg.innerHTML = `<h3>내 업체 사업자 등록</h3><p class="small muted">등록 후 관리자 승인이 나야 견적 참여와 공고 등록이 열립니다.</p>
      <form id="regForm" class="form tight">
        <label class="field"><span class="lbl">상호</span><input name="name" required maxlength="20" value="반짝홈케어"></label>
        <div class="row2"><label class="field"><span class="lbl">사업자번호</span><input name="bizNo" required maxlength="12" value="214-86-00000"></label>
        <label class="field"><span class="lbl">지역</span><input name="region" required maxlength="20" value="서울 마포구"></label></div>
        <button class="btn pri wide" type="submit">등록 신청</button></form>`;
  } else {
    const map = { pending: ['승인 대기', '관리자 검토 중입니다. 관리자 탭에서 승인해 보세요.', 'clock'], approved: ['승인 완료', '견적 참여와 구인 공고 등록을 할 수 있습니다.', 'check'], rejected: ['반려', '서류를 보완해 다시 신청해 주세요.', 'x'] }[me.status];
    reg.innerHTML = `<div class="reg-st reg-${me.status}">${ic(map[2])}<div><b>${esc(me.name)} · ${map[0]}</b><small>${map[1]}</small></div></div>
      <dl class="kv"><dt>사업자번호</dt><dd>${esc(me.bizNo)}</dd><dt>지역</dt><dd>${esc(me.region)}</dd></dl>`;
  }
  $('#actingSel').innerHTML = S.companies.filter(c => c.id === 'me' ? c.status !== 'none' : c.status === 'approved')
    .map(c => `<option value="${c.id}" ${c.id === S.ui.acting ? 'selected' : ''}>${esc(c.name)}${c.id === 'me' ? ' (내 업체)' : ''}${c.status !== 'approved' ? ' · 승인 대기' : ''}</option>`).join('');
  if (!$('#actingSel').value) { S.ui.acting = 'c2'; $('#actingSel').value = 'c2'; }

  const cid = S.ui.acting, actor = co(cid);
  const list = S.requests.filter(r => r.status !== 'won' && r.status !== 'lost');
  $('#openCount').textContent = `${esc(actor.name)} 시점 · ${list.length}건`;
  $('#openReqs').innerHTML = list.map(r => {
    const mineIn = r.parts.includes(cid);
    const wasCancelled = r.cancelled.includes(cid);
    const full = left(r) <= 0;
    let btn;
    if (mineIn && isOpen(r)) btn = `<button class="btn sm" data-act="cancel" data-r="${r.id}">참여 취소</button>`;
    else if (mineIn) btn = `<span class="st st-consult">${r.consultWith === cid ? '고객과 상담 중' : '고객이 다른 업체와 상담 중'}</span>`;
    else if (!isOpen(r)) btn = '<button class="btn sm" disabled>상담 진행 중</button>';
    else if (wasCancelled) btn = '<button class="btn sm" disabled>취소함 · 재참여 불가</button>';
    else if (full) btn = '<button class="btn sm closed" disabled>마감</button>';
    else if (actor.status !== 'approved') btn = '<button class="btn sm" disabled>승인 후 참여 가능</button>';
    else btn = `<button class="btn sm pri" data-act="join" data-r="${r.id}">참여하기</button>`;
    const contact = mineIn
      ? `<div class="contact on">${ic('unlock')}<span><b>${esc(r.name)} · ${r.phone}</b><small>우리 업체에만 공개됨 · 견적 ${won(r.bids[cid])}</small></span></div>`
      : `<div class="contact">${ic('lock')}<span><b>${esc(r.name)} · ${mask(r.phone)}</b><small>${full && isOpen(r) ? '정원 마감 · 연락처 비공개' : '참여하면 우리 업체에만 공개'}</small></span></div>`;
    return `<article class="card req biz ${full && !mineIn && isOpen(r) ? 'dim' : ''}" data-id="${r.id}">
      <div class="req-top"><span class="type">${esc(r.type)}</span>${chip(r.status)}${slots(r)}</div>
      <div class="req-title">${esc(r.sido)} ${esc(r.dong)} · ${r.area}평</div>
      ${meta(r)}
      <div class="req-foot">${contact}${btn}</div>
    </article>`;
  }).join('');

  const jobs = S.jobs.filter(j => j.co === cid);
  $('#jobForm').querySelector('button').disabled = actor.status !== 'approved';
  $('#myJobs').innerHTML = jobs.map(j => {
    const apps = S.apps.filter(a => a.job === j.id && a.status !== 'drafting');
    const hired = apps.filter(a => a.status === 'accepted').reduce((n, a) => n + a.members.length, 0);
    return `<article class="card job">
      <div class="req-top"><b>${esc(j.region)} · ${fmtDate(j.date)}</b><span class="muted">확정 ${hired}/${j.head}명</span></div>
      <p class="small">${esc(j.cond)}${j.team ? ' · 팀 지원 허용' : ''}</p>
      ${apps.length ? `<ul class="apps">${apps.map(a => `<li>
        <div>${ic(a.type === 'team' ? 'team' : 'user')}<span><b>${a.members.map(m => esc(m.name)).join(', ')}</b><small>${a.type === 'team' ? `팀 ${a.members.length}명 · 전원 동의 완료` : '개인 지원'}</small></span></div>
        ${a.status === 'pending' ? `<span class="pair"><button class="btn sm pri" data-act="accept" data-a="${a.id}">승인</button><button class="btn sm" data-act="reject" data-a="${a.id}">거절</button></span>` : `<span class="st st-${a.status === 'accepted' ? 'won' : 'lost'}">${a.status === 'accepted' ? '승인' : '거절'}</span>`}
      </li>`).join('')}</ul>` : '<p class="empty">아직 지원자가 없습니다.</p>'}
    </article>`;
  }).join('') || `<p class="empty card">${esc(actor.name)}의 공고가 없습니다.</p>`;
}

/* ---------- 작업자 ---------- */
function renderWorker() {
  const mine = S.apps.filter(a => a.by === ME_WORKER);
  $('#myApps').innerHTML = mine.map(a => {
    const j = S.jobs.find(x => x.id === a.job), c = co(j.co);
    const allOk = a.members.every(m => m.ok);
    const label = { drafting: ['팀원 동의 대기', 'consult'], pending: ['지원 완료 · 업체 검토 중', 'bidding'], accepted: ['승인됨', 'won'], rejected: ['거절됨', 'lost'] }[a.status];
    let body = '';
    if (a.type === 'team') {
      body = `<ul class="members">${a.members.map((m, i) => `<li><span class="avatar sm">${esc(m.name[0])}</span><b>${esc(m.name)}${i === 0 ? ' (나)' : ''}</b>
        ${m.ok ? `<span class="ok">${ic('check')}동의</span>` : `<button class="btn sm" data-act="agree" data-a="${a.id}" data-i="${i}">동의 처리</button>`}</li>`).join('')}</ul>
        ${a.status === 'drafting' ? `<p class="hint">팀원 휴대폰으로 초대 알림이 간 것으로 가정합니다. 시연에서는 '동의 처리'로 대신 누르세요.</p>
        <button class="btn pri wide" data-act="confirm" data-a="${a.id}" ${allOk ? '' : 'disabled'}>${allOk ? '팀 지원 확정' : `동의 ${a.members.filter(m => m.ok).length}/${a.members.length} · 전원 동의 후 확정`}</button>` : ''}`;
    }
    return `<article class="card app"><div class="req-top"><b>${esc(c.name)}</b><span class="st st-${label[1]}">${label[0]}</span></div>
      <p class="small">${esc(j.region)} · ${fmtDate(j.date)} · ${a.type === 'team' ? '팀 지원' : '개인 지원'}</p>${body}</article>`;
  }).join('') || '<p class="empty card">아직 지원한 공고가 없습니다.</p>';

  $('#jobList').innerHTML = S.jobs.map(j => {
    const c = co(j.co);
    const my = S.apps.find(a => a.job === j.id && a.by === ME_WORKER);
    const hired = S.apps.filter(a => a.job === j.id && a.status === 'accepted').reduce((n, a) => n + a.members.length, 0);
    let foot;
    if (my) foot = `<span class="muted small">이미 ${my.type === 'team' ? '팀으로 ' : ''}지원했습니다</span>`;
    else if (S.ui.teamFor === j.id) foot = `<div class="invite"><b>팀원 2명 초대</b><div class="chips">${MATES.map(m => `<label class="chip"><input type="checkbox" name="mate" value="${m}"><span>${m}</span></label>`).join('')}</div>
      <div class="pair"><button class="btn sm pri" data-act="invite" data-j="${j.id}">초대 보내기</button><button class="btn sm" data-act="teamcancel">닫기</button></div></div>`;
    else foot = `<div class="pair"><button class="btn sm pri" data-act="solo" data-j="${j.id}">개인 지원</button>${j.team ? `<button class="btn sm" data-act="team" data-j="${j.id}">${ic('team')}팀 지원</button>` : ''}</div>`;
    return `<article class="card job"><div class="req-top"><b>${esc(c.name)}</b><span class="muted small">모집 ${j.head}명 · 확정 ${hired}명</span></div>
      <div class="req-title">${esc(j.cond)}</div>
      <div class="meta"><span>${ic('pin')}${esc(j.region)}</span><span>${ic('cal')}${fmtDate(j.date)}</span>${j.team ? `<span>${ic('team')}팀 지원 가능</span>` : ''}</div>
      <div class="req-foot">${foot}</div></article>`;
  }).join('');
}

/* ---------- 관리자 ---------- */
function renderAdmin() {
  const R = S.requests;
  const n = s => R.filter(r => r.status === s).length;
  const ing = R.filter(r => ['received', 'bidding', 'consult'].includes(r.status)).length;
  const done = n('won') + n('lost');
  const pend = S.companies.filter(c => c.status === 'pending').length;
  $('#kpis').innerHTML = [
    ['전체 요청', R.length + '건'], ['진행 중', ing + '건'], ['계약 성사', n('won') + '건'],
    ['성사율', done ? Math.round(n('won') / done * 100) + '%' : '-'], ['승인 대기 업체', pend + '곳'],
  ].map(([k, v]) => `<div class="kpi"><small>${k}</small><b>${v}</b></div>`).join('');

  const cos = S.companies.filter(c => c.status !== 'none');
  $('#coTable').innerHTML = `<div class="tbl"><table><thead><tr><th>상호</th><th>지역</th><th>사업자번호</th><th>상태</th></tr></thead><tbody>${cos.map(c => `<tr>
    <td><b>${esc(c.name)}</b>${c.id === 'me' ? '<small class="muted"> 박○○</small>' : ''}</td><td>${esc(c.region)}</td><td class="mono">${esc(c.bizNo.replace(/\d{5}$/, '*****'))}</td>
    <td>${c.status === 'pending' ? `<span class="pair"><button class="btn sm pri" data-act="approve" data-c="${c.id}">승인</button><button class="btn sm" data-act="deny" data-c="${c.id}">반려</button></span>` : `<span class="st st-${c.status === 'approved' ? 'won' : 'lost'}">${c.status === 'approved' ? '승인' : '반려'}</span>`}</td></tr>`).join('')}</tbody></table></div>`;

  const cnt = Object.keys(SRC).map(k => [k, R.filter(r => r.src === k).length]);
  const max = Math.max(1, ...cnt.map(x => x[1]));
  $('#srcBars').innerHTML = cnt.map(([k, v]) => `<div class="bar"><span>${SRC[k]}</span><div><i style="width:${v / max * 100}%"></i></div><b>${v}</b></div>`).join('');
  const parts = [['won', n('won'), '성사'], ['lost', n('lost'), '미성사'], ['ing', ing, '진행 중']];
  $('#resultBar').innerHTML = `<div class="stackbar">${parts.map(([k, v]) => v ? `<i class="sb-${k}" style="flex:${v}"></i>` : '').join('')}</div>
    <div class="legend">${parts.map(([k, v, l]) => `<span><i class="sb-${k}"></i>${l} <b>${v}</b></span>`).join('')}</div>`;

  $('#reqTable').innerHTML = `<div class="tbl"><table><thead><tr><th>요청</th><th>희망일</th><th>참여 / 정원</th><th>상태</th><th>유입</th><th>계약 업체</th></tr></thead><tbody>${R.map(r => `<tr>
    <td><b>${esc(r.type)}</b><small class="muted"> ${esc(r.sido)} ${esc(r.dong)} · ${r.area}평</small></td><td>${fmtDate(r.date)}</td>
    <td>${slots(r)}<small class="muted">${r.parts.map(c => esc(co(c).name)).join(', ')}${r.cancelled.length ? ` · 취소 ${r.cancelled.length}` : ''}</small></td>
    <td>${chip(r.status)}</td><td>${SRC[r.src]}</td><td>${r.status === 'won' ? esc(co(r.consultWith).name) : r.status === 'consult' ? `<span class="muted">${esc(co(r.consultWith).name)} 상담 중</span>` : '-'}</td></tr>`).join('')}</tbody></table></div>`;
}

/* ---------- 화면 전환 ---------- */
function render() {
  document.querySelectorAll('.roles [data-role]').forEach(b => { const on = b.dataset.role === S.ui.role; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
  document.querySelectorAll('.panel').forEach(p => p.classList.toggle('on', p.id === 'p-' + S.ui.role));
  document.querySelectorAll('#modeSeg [data-mode]').forEach(b => b.classList.toggle('on', b.dataset.mode === S.ui.mode));
  $('#m-biz').classList.toggle('on', S.ui.mode === 'biz');
  $('#m-worker').classList.toggle('on', S.ui.mode === 'worker');
  renderCustomer(); renderBiz(); renderWorker(); renderAdmin();
}

/* ---------- 이벤트 ---------- */
const urlSrc = new URLSearchParams(location.search).get('src');
if (urlSrc && SRC[urlSrc]) { $('#srcSel').value = urlSrc; $('#srcNow').textContent = `현재 접속 유입: ?src=${urlSrc} (${SRC[urlSrc]})`; }
else $('#srcNow').textContent = '주소 뒤에 ?src=ad 처럼 붙이면 유입 경로가 자동 기록됩니다.';

$('#typeChips').innerHTML = TYPES.map((t, i) => `<label class="chip"><input type="radio" name="type" value="${t}" ${i === 0 ? 'checked' : ''}><span>${t}</span></label>`).join('');
$('#condChips').innerHTML = CONDS.map(t => `<label class="chip"><input type="checkbox" name="cond" value="${t}"><span>${t}</span></label>`).join('');

document.querySelector('.roles').addEventListener('click', e => {
  const b = e.target.closest('[data-role]'); if (!b) return;
  S.ui.role = b.dataset.role; commit(); window.scrollTo({ top: 0 });
});
$('#modeSeg').addEventListener('click', e => {
  const b = e.target.closest('[data-mode]'); if (!b) return;
  S.ui.mode = b.dataset.mode; commit(b.dataset.mode === 'biz' ? '업체 모드로 전환했습니다' : '작업자 모드로 전환했습니다');
});
$('#actingSel').addEventListener('change', e => { S.ui.acting = e.target.value; commit(`${co(e.target.value).name} 시점으로 전환`); });
$('#reset').addEventListener('click', () => {
  try { localStorage.removeItem(KEY); } catch (e) { /* 무시 */ }
  S = seed(); draftPhotos = []; $('#thumbs').innerHTML = ''; $('#reqForm').reset(); commit('시연 데이터를 처음 상태로 되돌렸습니다');
});

$('#photo').addEventListener('change', e => {
  const files = [...e.target.files].filter(f => f.type.startsWith('image/')).slice(0, 4);
  draftPhotos.forEach(URL.revokeObjectURL);
  draftPhotos = files.map(f => URL.createObjectURL(f));
  $('#thumbs').innerHTML = draftPhotos.map(u => `<img src="${u}" alt="첨부 미리보기">`).join('');
});

$('#reqForm').addEventListener('submit', e => {
  e.preventDefault();
  const f = new FormData(e.target);
  const id = 'r' + (++S.seq);
  const r = req(id, 'me', '윤○○', '010-0000-4821', f.get('type'), f.get('sido'), f.get('dong').trim(), f.get('date'), +f.get('area'), f.getAll('cond'), f.get('src'), [], 'received');
  r.memo = (f.get('memo') || '').trim(); r.photos = draftPhotos.length;
  if (draftPhotos.length) photoMem[id] = draftPhotos;
  draftPhotos = []; $('#thumbs').innerHTML = ''; $('#photo').value = '';
  S.requests.unshift(r); S.ui.openReq = id;
  commit('요청이 등록되었습니다. 업체·작업자 탭에서 참여해 보세요');
});

document.addEventListener('submit', e => {
  if (e.target.id === 'regForm') {
    e.preventDefault();
    const f = new FormData(e.target), me = co('me');
    me.name = f.get('name').trim(); me.bizNo = f.get('bizNo').trim(); me.region = f.get('region').trim(); me.status = 'pending'; S.ui.acting = 'me';
    commit('등록 신청 완료 · 관리자 승인 대기');
  }
});

$('#jobForm').addEventListener('submit', e => {
  e.preventDefault();
  const f = new FormData(e.target);
  S.jobs.unshift({ id: 'j' + (++S.seq), co: S.ui.acting, region: f.get('region').trim(), date: f.get('date'), cond: f.get('cond').trim(), head: +f.get('head'), team: !!f.get('team') });
  commit('공고가 등록되었습니다. 작업자 모드에서 지원해 보세요');
});

document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
  const { act, r, c, a, j, i } = b.dataset;
  const app = a && S.apps.find(x => x.id === a);
  let err;
  switch (act) {
    case 'toggle': S.ui.openReq = S.ui.openReq === r ? null : r; return commit();
    case 'join': err = join(r, S.ui.acting); return err ? toast(err) : commit('참여 완료 · 고객 연락처가 우리 업체에만 공개되었습니다');
    case 'cancel': err = cancel(r, S.ui.acting); return err ? toast(err) : commit('참여 취소 · 정원 1곳이 복구되고 연락처가 다시 잠겼습니다');
    case 'consult': { const x = rq(r); x.status = 'consult'; x.consultWith = c; return commit(`${co(c).name}와 상담을 시작했습니다`); }
    case 'won': rq(r).status = 'won'; return commit('계약 성사로 기록했습니다');
    case 'lost': rq(r).status = 'lost'; return commit('미성사로 기록했습니다');
    case 'approve': co(c).status = 'approved'; return commit(`${co(c).name} 승인 완료`);
    case 'deny': co(c).status = 'rejected'; return commit(`${co(c).name} 반려`);
    case 'accept': app.status = 'accepted'; return commit('지원을 승인했습니다');
    case 'reject': app.status = 'rejected'; return commit('지원을 거절했습니다');
    case 'solo': S.apps.push({ id: 'a' + (++S.seq), job: j, by: ME_WORKER, type: 'solo', members: [{ name: ME_WORKER, ok: true }], status: 'pending' }); return commit('개인 지원 완료');
    case 'team': S.ui.teamFor = j; return commit();
    case 'teamcancel': S.ui.teamFor = null; return commit();
    case 'invite': {
      const picked = [...b.closest('.invite').querySelectorAll('input[name=mate]:checked')].map(x => x.value);
      if (picked.length !== 2) return toast('팀원을 정확히 2명 골라 주세요');
      S.apps.push({ id: 'a' + (++S.seq), job: j, by: ME_WORKER, type: 'team', members: [{ name: ME_WORKER, ok: true }, ...picked.map(name => ({ name, ok: false }))], status: 'drafting' });
      S.ui.teamFor = null; return commit('초대를 보냈습니다. 팀원 전원 동의 후 지원이 확정됩니다');
    }
    case 'agree': app.members[+i].ok = true; return commit(`${app.members[+i].name} 동의 완료`);
    case 'confirm':
      if (!app.members.every(m => m.ok)) return toast('팀원 전원이 동의해야 확정됩니다');
      app.status = 'pending'; return commit('팀 지원이 확정되어 업체에 전달되었습니다');
  }
});

render();

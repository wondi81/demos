/* 학회 사무국 일정·미팅 관리 제안용 데모 — 데이터는 브라우저(localStorage)에만 저장됩니다. */
const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const app = $('#app'), dlg = $('#dlg');
const KEY = 'schedule-office-v1';

const STAFF = [
  ['s1', '한서윤', '사무국장'], ['s2', '정민재', '학술팀'], ['s3', '오지현', '학술팀'], ['s4', '류태호', '회원팀'],
  ['s5', '배수아', '회원팀'], ['s6', '신동욱', '행사팀'], ['s7', '임하늘', '행사팀'], ['s8', '최예린', '총무'],
  ['s9', '강도윤', '재무'], ['s10', '문채원', '홍보'],
];
const NAME = Object.fromEntries(STAFF.map(([id, n]) => [id, n]));
const KINDS = { conf: '학술대회', comm: '위원회', event: '행사', admin: '행정', meet: '내부 미팅' };
const ROOMS = ['사무국 회의실', '소회의실', '화상(온라인)'];
const DOW = ['일', '월', '화', '수', '목', '금', '토'];

const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const TODAY = ymd(new Date());

/* ---------- 데이터 ---------- */
function seed() {
  const t = new Date(), b = (n) => ymd(addDays(t, n));
  const list = [
    ['event', 'conf', '추계학술대회 연제 접수 마감', 0, '09:00', '18:00', 's2', [], '', ''],
    ['meet', 'meet', '주간 사무국 회의', 0, '10:00', '11:00', 's1', ['s2', 's4', 's6', 's8'], '사무국 회의실', '1. 주간 일정 공유\n2. 추계학술대회 준비 현황'],
    ['event', 'comm', '편집위원회 (온라인)', 1, '16:00', '17:30', 's3', [], '화상(온라인)', ''],
    ['event', 'admin', '회비 납부 안내 메일 발송', 2, '10:00', '11:00', 's5', [], '', ''],
    ['meet', 'meet', '학술대회 프로그램 조율', 2, '14:00', '15:00', 's2', ['s3', 's6'], '소회의실', '세션 배치 초안 검토'],
    ['event', 'event', '연수강좌 장소 답사', 3, '13:00', '16:00', 's6', [], '', '외부 일정'],
    ['event', 'admin', '월 결산 마감', 5, '09:00', '12:00', 's9', [], '', ''],
    ['meet', 'meet', '홍보물 시안 리뷰', 6, '15:00', '16:00', 's10', ['s1', 's7'], '사무국 회의실', '포스터·초청장 2차 시안'],
    ['event', 'comm', '이사회', 8, '18:30', '20:30', 's1', [], '', '이사 15명 참석 예정'],
    ['event', 'conf', '추계학술대회 초록 심사 결과 통보', 10, '10:00', '12:00', 's3', [], '', ''],
    ['meet', 'meet', '회원 DB 정리 방안 논의', 12, '11:00', '12:00', 's4', ['s5', 's8'], '소회의실', ''],
    ['event', 'event', '전공의 연수강좌', 15, '09:00', '17:00', 's7', [], '', ''],
    ['event', 'admin', '사무용품 정기 발주', -2, '10:00', '10:30', 's8', [], '', ''],
    ['event', 'comm', '학술위원회', -3, '17:00', '18:30', 's2', [], '사무국 회의실', ''],
    ['meet', 'meet', '주간 사무국 회의', -7, '10:00', '11:00', 's1', ['s2', 's4', 's6', 's8'], '사무국 회의실', ''],
    ['event', 'conf', '추계학술대회 사전등록 오픈', -5, '09:00', '09:30', 's6', [], '', ''],
    ['meet', 'meet', '주간 사무국 회의', 7, '10:00', '11:00', 's1', ['s2', 's4', 's6', 's8'], '사무국 회의실', ''],
  ];
  return list.map(([type, kind, title, off, start, end, owner, attendees, place, note], i) =>
    ({ id: 'e' + (i + 1), type, kind, title, date: b(off), start, end, owner, attendees, place, note }));
}
let db;
try { db = JSON.parse(localStorage.getItem(KEY)); } catch (e) { }
if (!db || !Array.isArray(db.events)) db = { user: null, events: seed() };
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { } };

const st = { view: 'month', cursor: TODAY, sel: TODAY, kinds: new Set(Object.keys(KINDS)), who: 'all' };

/* ---------- 공통 ---------- */
const people = e => [e.owner, ...(e.attendees || [])];
const visible = e => st.kinds.has(e.kind) && (st.who === 'all' || people(e).includes(st.who));
const sorted = arr => arr.slice().sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
const onDate = d => sorted(db.events.filter(e => e.date === d && visible(e)));
const label = d => { const x = parse(d); return `${x.getMonth() + 1}월 ${x.getDate()}일 (${DOW[x.getDay()]})`; };
function toast(msg) {
  const el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status'); el.textContent = msg;
  document.body.appendChild(el); setTimeout(() => el.remove(), 2200);
}

/* 같은 날 시간이 겹치면서 사람이나 회의실이 겹치는 일정 */
function conflicts(e) {
  const me = new Set(people(e));
  return db.events.filter(o => o.id !== e.id && o.date === e.date && o.start < e.end && e.start < o.end)
    .map(o => {
      const who = people(o).filter(p => me.has(p)).map(p => NAME[p]);
      const room = e.place && o.place === e.place;
      return (who.length || room) ? { o, who, room } : null;
    }).filter(Boolean);
}

/* ---------- 로그인 ---------- */
function renderLogin() {
  app.innerHTML = `<div class="login"><form class="card" id="lf">
    <div class="mark"><i aria-hidden="true"></i>○○의학회 사무국</div>
    <h1>일정·미팅 관리</h1>
    <p>사무국 직원 계정으로 로그인합니다.</p>
    <label class="f" for="lu">계정 (데모용 가상 직원)</label>
    <select class="in" id="lu">${STAFF.map(([id, n, r]) => `<option value="${id}">${n} · ${r}</option>`).join('')}</select>
    <label class="f" for="lp" style="margin-top:12px">비밀번호</label>
    <input class="in" id="lp" type="password" value="demo1234" autocomplete="off">
    <button class="btn" style="width:100%;margin-top:18px">로그인</button>
    <p class="hint">데모에서는 비밀번호를 확인하지 않습니다. 실제 시스템은 직원별 계정·비밀번호로 접속합니다.</p>
  </form></div>`;
  $('#lf').onsubmit = ev => { ev.preventDefault(); db.user = $('#lu').value; save(); render(); };
}

/* ---------- 메인 ---------- */
function title() {
  const c = parse(st.cursor);
  if (st.view === 'week') {
    const s = addDays(c, -c.getDay()), e = addDays(s, 6);
    return `${s.getMonth() + 1}.${s.getDate()} – ${e.getMonth() + 1}.${e.getDate()}`;
  }
  return `${c.getFullYear()}년 ${c.getMonth() + 1}월`;
}
function render() {
  if (!db.user) return renderLogin();
  const btn = (v, t) => `<button type="button" data-view="${v}" aria-pressed="${st.view === v}">${t}</button>`;
  app.innerHTML = `
  <header class="top"><div class="wrap">
    <div class="mark"><i aria-hidden="true"></i>○○의학회 사무국</div><div class="sp"></div>
    <div class="me"><span>로그인: </span><b>${esc(NAME[db.user])}</b></div>
    <button class="btn ghost sm" id="logout">로그아웃</button>
  </div></header>
  <main class="wrap">
    <div class="bar">
      <h2>${title()}</h2>
      <div class="nav">
        <button class="btn ghost sm" data-move="-1" aria-label="이전">‹</button>
        <button class="btn ghost sm" data-move="0">오늘</button>
        <button class="btn ghost sm" data-move="1" aria-label="다음">›</button>
      </div>
      <div class="seg" role="group" aria-label="보기 전환">${btn('month', '월간')}${btn('week', '주간')}${btn('list', '목록')}</div>
      <div class="sp"></div>
      <div class="addbtns">
        <button class="btn" data-add="event">+ 일정 등록</button>
        <button class="btn ghost" data-add="meet">+ 내부 미팅</button>
      </div>
    </div>
    <div class="filters" role="group" aria-label="분류 필터">
      ${Object.entries(KINDS).map(([k, n]) => `<button class="chip k-${k}" data-kind="${k}" aria-pressed="${st.kinds.has(k)}"><span class="dot"></span>${n}</button>`).join('')}
      <select id="who" aria-label="담당자·참석자 필터">
        <option value="all">담당자 전체</option>
        ${STAFF.map(([id, n]) => `<option value="${id}" ${st.who === id ? 'selected' : ''}>${n}${id === db.user ? ' (나)' : ''}</option>`).join('')}
      </select>
    </div>
    <div id="view">${st.view === 'month' ? monthView() : st.view === 'week' ? weekView() : listView()}</div>
  </main>`;
  bind();
}

function evBtn(e, long) {
  return `<button class="ev k-${e.kind}" data-id="${e.id}">${long
    ? `<b>${e.start}</b>${esc(e.title)}<small>${e.type === 'meet' ? esc(e.place || '') + ' · ' : ''}${esc(NAME[e.owner])}</small>`
    : `<b>${e.start}</b>${esc(e.title)}`}</button>`;
}
function monthView() {
  const c = parse(st.cursor), first = new Date(c.getFullYear(), c.getMonth(), 1);
  const start = addDays(first, -first.getDay());
  let cells = '';
  for (let i = 0; i < 42; i++) {
    const d = addDays(start, i), k = ymd(d), evs = onDate(k);
    if (i >= 35 && d.getMonth() !== c.getMonth()) break;
    cells += `<div class="day ${d.getMonth() !== c.getMonth() ? 'out' : ''} ${k === TODAY ? 'today' : ''} ${k === st.sel ? 'sel' : ''}" data-date="${k}" role="button" tabindex="0" aria-label="${label(k)} 일정 ${evs.length}건">
      <span class="n">${d.getDate()}</span>
      <div class="evs">${evs.slice(0, 3).map(e => evBtn(e)).join('')}${evs.length > 3 ? `<span class="more">+${evs.length - 3}건 더</span>` : ''}</div>
      <div class="dots" aria-hidden="true">${evs.slice(0, 4).map(e => `<span class="dot k-${e.kind}"></span>`).join('')}</div>
    </div>`;
  }
  const sel = onDate(st.sel);
  return `<div class="card month">${DOW.map(d => `<div class="dow">${d}</div>`).join('')}${cells}</div>
    <section class="daypanel"><h3>${label(st.sel)}</h3>${sel.length ? sel.map(rowItem).join('') : '<div class="card empty">등록된 일정이 없습니다.</div>'}</section>`;
}
function weekView() {
  const c = parse(st.cursor), s = addDays(c, -c.getDay());
  return `<div class="week">${[...Array(7)].map((_, i) => {
    const k = ymd(addDays(s, i)), evs = onDate(k);
    return `<div class="wcol ${k === TODAY ? 'today' : ''}"><h3>${label(k)}</h3>${evs.map(e => evBtn(e, true)).join('') || '<div class="none">일정 없음</div>'}</div>`;
  }).join('')}</div>`;
}
function rowItem(e) {
  return `<button class="litem k-${e.kind}" data-id="${e.id}">
    <span class="t">${e.start}–${e.end}</span>
    <span><b>${esc(e.title)}</b><br><span class="meta">${esc(NAME[e.owner])}${e.attendees.length ? ` 외 ${e.attendees.length}명` : ''}${e.place ? ' · ' + esc(e.place) : ''}</span></span>
    <span class="tag">${KINDS[e.kind]}</span></button>`;
}
function listView() {
  const ym = st.cursor.slice(0, 7);
  const evs = sorted(db.events.filter(e => e.date.startsWith(ym) && visible(e)));
  if (!evs.length) return '<div class="card empty">조건에 맞는 일정이 없습니다.</div>';
  const days = [...new Set(evs.map(e => e.date))];
  return `<div class="list">${days.map(d => `<div class="lgroup"><h3>${label(d)}${d === TODAY ? ' · 오늘' : ''}</h3>${evs.filter(e => e.date === d).map(rowItem).join('')}</div>`).join('')}</div>`;
}

function bind() {
  $('#logout').onclick = () => { db.user = null; save(); render(); };
  app.onclick = ev => {
    const t = ev.target.closest('button,[data-date]');
    if (!t) return;
    if (t.dataset.id) return openDetail(t.dataset.id);
    if (t.dataset.view) { st.view = t.dataset.view; return render(); }
    if (t.dataset.add) return openForm({ type: t.dataset.add });
    if (t.dataset.kind) { st.kinds.has(t.dataset.kind) ? st.kinds.delete(t.dataset.kind) : st.kinds.add(t.dataset.kind); return render(); }
    if (t.dataset.move !== undefined) {
      const m = +t.dataset.move, c = parse(st.cursor);
      st.cursor = m === 0 ? TODAY : ymd(st.view === 'week' ? addDays(c, 7 * m) : new Date(c.getFullYear(), c.getMonth() + m, 1));
      if (m === 0) st.sel = TODAY;
      return render();
    }
    if (t.dataset.date) {
      if (st.sel === t.dataset.date && matchMedia('(min-width:761px)').matches) return openForm({ type: 'event', date: t.dataset.date });
      st.sel = t.dataset.date; render();
    }
  };
  app.onkeydown = ev => { if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.dataset.date) { ev.preventDefault(); ev.target.click(); } };
  $('#who').onchange = e => { st.who = e.target.value; render(); };
}

/* ---------- 상세 ---------- */
function openDetail(id) {
  const e = db.events.find(x => x.id === id);
  dlg.innerHTML = `<div class="dh"><h3>${esc(e.title)}</h3><button class="x" data-close aria-label="닫기">×</button></div>
  <div class="db"><dl class="det">
    <dt>분류</dt><dd><span class="tag k-${e.kind}">${KINDS[e.kind]}</span></dd>
    <dt>일시</dt><dd>${label(e.date)} ${e.start}–${e.end}</dd>
    <dt>${e.type === 'meet' ? '주관' : '담당자'}</dt><dd>${esc(NAME[e.owner])}</dd>
    ${e.type === 'meet' ? `<dt>참석자</dt><dd>${e.attendees.map(p => esc(NAME[p])).join(', ') || '-'}</dd>` : ''}
    ${e.place ? `<dt>장소</dt><dd>${esc(e.place)}</dd>` : ''}
    ${e.note ? `<dt>${e.type === 'meet' ? '안건' : '메모'}</dt><dd>${esc(e.note)}</dd>` : ''}
  </dl></div>
  <div class="df"><button class="btn danger" id="del">삭제</button><span class="sp"></span><button class="btn ghost" data-close>닫기</button><button class="btn" id="edit">수정</button></div>`;
  dlg.showModal();
  $('#edit', dlg).onclick = () => openForm(e);
  $('#del', dlg).onclick = () => {
    if (!confirm(`'${e.title}' 일정을 삭제할까요?`)) return;
    db.events = db.events.filter(x => x.id !== id); save(); dlg.close(); render(); toast('삭제했습니다.');
  };
}

/* ---------- 등록·수정 ---------- */
function openForm(init) {
  const e = { type: 'event', kind: init.type === 'meet' ? 'meet' : 'admin', title: '', date: st.sel, start: '10:00', end: '11:00', owner: db.user, attendees: [], place: '', note: '', ...init };
  if (init.date) e.date = init.date;
  const isNew = !e.id;
  const draw = () => {
    const meet = e.type === 'meet';
    dlg.innerHTML = `<form method="dialog" id="ef">
    <div class="dh"><h3>${isNew ? (meet ? '내부 미팅 등록' : '일정 등록') : '수정'}</h3><button type="button" class="x" data-close aria-label="닫기">×</button></div>
    <div class="db">
      <div class="seg typeseg" role="group" aria-label="구분"><button type="button" data-t="event" aria-pressed="${!meet}">일정</button><button type="button" data-t="meet" aria-pressed="${meet}">내부 미팅</button></div>
      <div><label class="f" for="f-title">제목</label><input class="in" id="f-title" required maxlength="60" value="${esc(e.title)}" placeholder="${meet ? '예: 학술대회 준비 회의' : '예: 편집위원회'}"></div>
      ${meet ? '' : `<div><label class="f" for="f-kind">분류</label><select class="in" id="f-kind">${Object.entries(KINDS).filter(([k]) => k !== 'meet').map(([k, n]) => `<option value="${k}" ${e.kind === k ? 'selected' : ''}>${n}</option>`).join('')}</select></div>`}
      <div class="row3">
        <div><label class="f" for="f-date">날짜</label><input class="in" type="date" id="f-date" required value="${e.date}"></div>
        <div><label class="f" for="f-start">시작</label><input class="in" type="time" id="f-start" required step="600" value="${e.start}"></div>
        <div><label class="f" for="f-end">종료</label><input class="in" type="time" id="f-end" required step="600" value="${e.end}"></div>
      </div>
      <div class="row2">
        <div><label class="f" for="f-owner">${meet ? '주관' : '담당자'}</label><select class="in" id="f-owner">${STAFF.map(([id, n]) => `<option value="${id}" ${e.owner === id ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
        <div><label class="f" for="f-place">장소</label><select class="in" id="f-place"><option value="">${meet ? '선택' : '없음 / 외부'}</option>${ROOMS.map(r => `<option ${e.place === r ? 'selected' : ''}>${r}</option>`).join('')}</select></div>
      </div>
      ${meet ? `<fieldset style="border:0;padding:0;margin:0"><legend class="f" style="font-weight:700;font-size:13.5px;margin-bottom:6px">참석자</legend><div class="ppl">${STAFF.filter(([id]) => id !== e.owner).map(([id, n]) => `<label><input type="checkbox" value="${id}" ${e.attendees.includes(id) ? 'checked' : ''}>${n}</label>`).join('')}</div></fieldset>` : ''}
      <div><label class="f" for="f-note">${meet ? '안건' : '메모'}</label><textarea class="in" id="f-note" rows="3">${esc(e.note)}</textarea></div>
      <div id="warn" aria-live="polite"></div>
    </div>
    <div class="df"><button type="button" class="btn ghost" data-close>취소</button><button class="btn" id="ok">저장</button></div></form>`;
    const f = $('#ef', dlg);
    f.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { read(); e.type = b.dataset.t; e.kind = e.type === 'meet' ? 'meet' : (e.kind === 'meet' ? 'admin' : e.kind); if (e.type !== 'meet') e.attendees = []; draw(); });
    $('#f-owner', dlg).onchange = () => { read(); e.attendees = e.attendees.filter(p => p !== e.owner); draw(); };
    f.oninput = () => { read(); check(); };
    f.onsubmit = ev => {
      ev.preventDefault(); read();
      if (e.end <= e.start) return check('종료 시간이 시작 시간보다 늦어야 합니다.');
      const c = conflicts(e);
      if (c.length && !f.dataset.ok) { f.dataset.ok = '1'; return check(); }
      if (isNew) { e.id = 'e' + Date.now(); db.events.push(e); } else db.events = db.events.map(x => x.id === e.id ? e : x);
      save(); dlg.close(); st.sel = e.date; st.cursor = e.date; st.kinds.add(e.kind); render(); toast(isNew ? '등록했습니다.' : '수정했습니다.');
    };
    check();
    setTimeout(() => $('#f-title', dlg).focus());
  };
  const read = () => {
    e.title = $('#f-title', dlg).value.trim(); e.date = $('#f-date', dlg).value; e.start = $('#f-start', dlg).value; e.end = $('#f-end', dlg).value;
    e.owner = $('#f-owner', dlg).value; e.place = $('#f-place', dlg).value; e.note = $('#f-note', dlg).value;
    if ($('#f-kind', dlg)) e.kind = $('#f-kind', dlg).value;
    if (e.type === 'meet') e.attendees = [...dlg.querySelectorAll('.ppl input:checked')].map(i => i.value);
  };
  const check = (err) => {
    const box = $('#warn', dlg), ok = $('#ok', dlg), f = $('#ef', dlg);
    if (err) { box.innerHTML = `<p class="err">${err}</p>`; return; }
    const c = e.date && e.start && e.end ? conflicts(e) : [];
    if (!c.length) { box.innerHTML = ''; ok.textContent = '저장'; ok.classList.remove('warn'); delete f.dataset.ok; return; }
    box.innerHTML = `<div class="alert"><b>시간이 겹치는 일정이 ${c.length}건 있습니다</b><ul>${c.map(({ o, who, room }) =>
      `<li>${o.start}–${o.end} ${esc(o.title)} — ${[who.length ? who.join('·') + ' 일정 중복' : '', room ? esc(o.place) + ' 사용 중' : ''].filter(Boolean).join(', ')}</li>`).join('')}</ul></div>`;
    ok.textContent = f.dataset.ok ? '확인했습니다, 그대로 저장' : '저장';
    ok.classList.toggle('warn', !!f.dataset.ok);
  };
  draw();
  if (!dlg.open) dlg.showModal();
}

dlg.addEventListener('click', ev => { if (ev.target === dlg || ev.target.closest('[data-close]')) dlg.close(); });
render();

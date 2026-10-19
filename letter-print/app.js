'use strict';
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const won = n => n.toLocaleString('ko-KR') + '원';
const MAX = 600;
const KEY = 'letterprint_v1';

const PAPERS = [
  {id:'lined', name:'크림 줄지', desc:'단정한 줄 편지지', price:2500},
  {id:'grid', name:'하늘 모눈', desc:'맑은 모눈 편지지', price:2500},
  {id:'flower', name:'꽃 테두리', desc:'기념일용 장식 편지지', price:3500},
];
const paper = id => PAPERS.find(p => p.id === id) || PAPERS[0];

const ic = {
  mail:'<svg class="ic" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 6.5 8.5 6 8.5-6"/></svg>',
  back:'<svg class="ic" viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
  check:'<svg class="ic" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  print:'<svg class="ic" viewBox="0 0 24 24"><path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/></svg>',
  pdf:'<svg class="ic" viewBox="0 0 24 24"><path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4M9 13h6M9 17h6"/></svg>',
  x:'<svg class="ic" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>',
};

function ago(min){ return new Date(Date.now() - min*60000).toISOString(); }
const SAMPLE = [
  {id:'L-1041', from:'김하늘', to:'사랑하는 엄마께', paper:'flower', body:'엄마, 생신 축하드려요.\n멀리 있어서 직접 못 가는 게 마음에 걸려요.\n이번 주말엔 꼭 전화 길게 드릴게요.\n늘 건강하세요.', at:ago(12), status:'wait'},
  {id:'L-1040', from:'박서준', to:'훈련소에 있는 민호에게', paper:'lined', body:'민호야, 잘 지내지?\n밥은 잘 먹고 있는지 궁금하다.\n나오면 우리 늘 가던 국밥집 가자.\n힘내라. 금방 지나간다.', at:ago(48), status:'wait'},
  {id:'L-1039', from:'이수아', to:'담임 선생님께', paper:'grid', body:'선생님, 1년 동안 감사했습니다.\n수학 시간에 해 주신 이야기가 오래 기억에 남을 것 같아요.\n새 학년에도 열심히 할게요.', at:ago(95), status:'wait'},
  {id:'L-1038', from:'정우진', to:'지은에게', paper:'flower', body:'우리 처음 만난 지 벌써 3년이네.\n늘 옆에 있어 줘서 고마워.\n앞으로도 잘 부탁해.', at:ago(160), status:'wait'},
  {id:'L-1037', from:'최민지', to:'할머니께', paper:'lined', body:'할머니, 보내 주신 김치 정말 맛있게 먹고 있어요.\n날이 추워지니 감기 조심하세요.\n설에 뵈러 갈게요.', at:ago(300), status:'done'},
];

let db = load();
function load(){
  try { const d = JSON.parse(localStorage.getItem(KEY)); if (d && Array.isArray(d.orders)) return d; } catch(e) {}
  return {user:null, orders:SAMPLE.map(o => ({...o})), seq:1042};
}
function save(){ try { localStorage.setItem(KEY, JSON.stringify(db)); } catch(e) {} }

/* ---------- letter sheet (shared by app preview, admin preview, print) ---------- */
function fmtDate(iso){ const d = new Date(iso); return `${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일`; }
function sheet(o){
  return `<div class="sheet p-${esc(o.paper)}"><div class="in-sheet">
    <div class="to">${esc(o.to || '받는 사람')}</div>
    <div class="body">${esc(o.body || '')}</div>
    <div class="date">${fmtDate(o.at || new Date().toISOString())}</div>
    <div class="from">${esc(o.from)} 드림</div>
  </div></div>`;
}
function thumb(id){
  return `<div class="thumb"><div class="sheet p-${id}"><div class="in-sheet"><div class="ln" style="width:55%"></div><div class="ln"></div><div class="ln"></div><div class="ln" style="width:80%"></div><div class="ln"></div><div class="ln" style="width:40%;margin-left:auto"></div></div></div></div>`;
}

/* ---------- customer app ---------- */
const app = $('#app');
let draft = {paper:'lined', to:'', body:''};
let screen = db.user ? 'paper' : 'login';
let paying = false;
let lastId = null;

function go(s){ screen = s; renderApp(); const sc = app.querySelector('.scroll'); if (sc) sc.scrollTop = 0; }
function bar(title, back){ return `<header class="bar">${back ? `<button class="back" data-go="${back}" aria-label="뒤로">${ic.back}</button>` : '<span style="width:8px"></span>'}<h1>${title}</h1></header>`; }

function renderApp(){
  let h = '';
  if (screen === 'login') {
    h = `<form class="login fade" id="loginForm">
      <div class="mark">${ic.mail}</div>
      <h2>마음을 종이에 담아<br>보내드려요</h2>
      <p class="sub">앱에서 쓰면, 예쁜 편지지에 출력해 드립니다.</p>
      <label class="f" for="nm">이름</label>
      <input class="in" id="nm" required maxlength="10" placeholder="홍길동" autocomplete="name">
      <label class="f" for="ph">휴대폰 번호</label>
      <input class="in" id="ph" required inputmode="numeric" maxlength="13" placeholder="010-0000-0000" autocomplete="tel">
      <div style="height:20px"></div>
      <button class="btn" type="submit">시작하기</button>
      <p class="fine">데모용 가상 로그인 · 입력 정보는 이 기기에만 저장됩니다</p>
    </form>`;
  } else if (screen === 'paper') {
    const mine = db.orders.filter(o => o.mine).length;
    h = bar('편지지 고르기') + `<div class="scroll fade">
      <div class="hello"><b>${esc(db.user)}님, 안녕하세요</b><button class="chip" data-go="mine">내 편지함 ${mine}</button></div>
      <h2>어떤 편지지에 쓸까요?</h2><p class="sub">출력 품질 그대로 미리보기로 확인할 수 있어요.</p>
      <div class="papers" role="radiogroup" aria-label="편지지">${PAPERS.map(p => `
        <button class="paper ${draft.paper===p.id?'on':''}" role="radio" aria-checked="${draft.paper===p.id}" data-paper="${p.id}">
          ${thumb(p.id)}<span><b>${p.name}</b><small>${p.desc}</small><div class="price">${won(p.price)}</div></span>
        </button>`).join('')}</div>
    </div><div class="foot"><button class="btn" data-go="write">이 편지지로 쓰기</button></div>`;
  } else if (screen === 'write') {
    h = bar('편지 쓰기', 'paper') + `<div class="scroll fade">
      <label class="f" for="to" style="margin-top:0">받는 사람</label>
      <input class="in" id="to" maxlength="20" placeholder="예) 사랑하는 엄마께" value="${esc(draft.to)}">
      <label class="f" for="bd">편지 내용</label>
      <textarea class="in" id="bd" maxlength="${MAX}" placeholder="전하고 싶은 마음을 적어 주세요">${esc(draft.body)}</textarea>
      <div class="count" id="cnt"></div>
    </div><div class="foot"><button class="btn" id="toPreview" data-go="preview">미리보기</button></div>`;
  } else if (screen === 'preview') {
    h = bar('미리보기', 'write') + `<div class="scroll fade">
      <p class="sub" style="margin-bottom:12px">${paper(draft.paper).name} · A4 · 실제 출력과 같은 비율</p>
      <div class="preview-wrap">${sheet({...draft, from:db.user, at:new Date().toISOString()})}</div>
    </div><div class="foot btn-row"><button class="btn ghost" data-go="write">수정</button><button class="btn" data-go="pay">결제하기</button></div>`;
  } else if (screen === 'pay') {
    const p = paper(draft.paper);
    h = bar('결제', 'preview') + `<div class="scroll fade">
      <h2>결제 정보 <span class="testpay">테스트 결제</span></h2>
      <p class="sub">실제로 돈이 나가지 않는 가상 결제입니다.</p>
      <div class="sum">
        <div><span>편지지</span>${p.name}</div>
        <div><span>받는 사람</span>${esc(draft.to)}</div>
        <div><span>분량</span>${draft.body.length}자 · A4 1장</div>
        <div class="total"><span>결제 금액</span><b>${won(p.price)}</b></div>
      </div>
      <label class="f">결제 수단</label>
      <div class="methods">${['신용·체크카드','간편결제','계좌이체'].map((m,i) => `<label class="method"><input type="radio" name="pm" ${i?'':'checked'}>${m}</label>`).join('')}</div>
      <label class="agree"><input type="checkbox" id="agree">주문 내용을 확인했으며 결제에 동의합니다.</label>
    </div><div class="foot"><button class="btn" id="payBtn" disabled>${paying ? '<span class="spin"></span>결제 중' : won(p.price) + ' 테스트 결제'}</button></div>`;
  } else if (screen === 'done') {
    const o = db.orders.find(x => x.id === lastId);
    h = bar('주문 완료') + `<div class="scroll fade"><div class="done">
      <div class="ok">${ic.check}</div>
      <h2>편지가 접수됐어요</h2>
      <p class="sub">출력 대기열에 올라갔어요.<br>출력이 끝나면 내 편지함에서 확인할 수 있어요.</p>
    </div>
    <div class="sum receipt">
      <div><span>주문 번호</span>${o ? o.id : '-'}</div>
      <div><span>받는 사람</span>${o ? esc(o.to) : '-'}</div>
      <div><span>결제</span>${o ? won(o.price) : '-'} (테스트)</div>
    </div></div>
    <div class="foot btn-row"><button class="btn ghost" data-go="mine">내 편지함</button><button class="btn" data-act="new">새 편지 쓰기</button></div>`;
  } else if (screen === 'mine') {
    const list = db.orders.filter(o => o.mine);
    h = bar('내 편지함', 'paper') + `<div class="scroll fade">
      ${list.length ? `<div class="mine">${list.map(o => `<div class="mi"><div><b>${esc(o.to)}</b><small>${o.id} · ${paper(o.paper).name} · ${fmtDate(o.at)}</small></div><span class="st ${o.status==='done'?'done':''}">${o.status==='done'?'출력 완료':'출력 대기'}</span></div>`).join('')}</div>`
      : '<p class="empty">아직 보낸 편지가 없어요.</p>'}
      <button class="link" data-act="logout" style="padding-left:0">로그아웃</button>
    </div>`;
  }
  app.innerHTML = h;
  if (screen === 'write') updateCount();
  if (screen === 'pay') { const a = $('#agree'); a.onchange = () => { $('#payBtn').disabled = !a.checked; }; }
}

function updateCount(){
  const n = draft.body.length, c = $('#cnt');
  c.className = 'count' + (n >= MAX ? ' over' : '');
  c.innerHTML = `<span>A4 한 장에 맞춰 최대 ${MAX}자</span><span><b>${n}</b> / ${MAX}자</span>`;
  $('#toPreview').disabled = !(draft.to.trim() && draft.body.trim());
}

app.addEventListener('input', e => {
  if (e.target.id === 'to') { draft.to = e.target.value; updateCount(); }
  if (e.target.id === 'bd') { draft.body = e.target.value.slice(0, MAX); updateCount(); }
});
app.addEventListener('submit', e => {
  e.preventDefault();
  const nm = $('#nm').value.trim();
  if (!nm) return;
  db.user = nm; save(); go('paper');
});
app.addEventListener('click', e => {
  const t = e.target.closest('button'); if (!t) return;
  if (t.dataset.paper) { draft.paper = t.dataset.paper; renderApp(); return; }
  if (t.dataset.go) { if (!t.disabled) go(t.dataset.go); return; }
  if (t.dataset.act === 'new') { draft = {paper:'lined', to:'', body:''}; go('paper'); return; }
  if (t.dataset.act === 'logout') { db.user = null; save(); go('login'); return; }
  if (t.id === 'payBtn' && !paying) pay();
});

function pay(){
  paying = true;
  const b = $('#payBtn'); b.disabled = true; b.innerHTML = '<span class="spin"></span>결제 중';
  setTimeout(() => {
    const o = {id:'L-' + db.seq++, from:db.user, to:draft.to.trim(), paper:draft.paper, body:draft.body, at:new Date().toISOString(), status:'wait', price:paper(draft.paper).price, mine:true, fresh:true};
    db.orders.unshift(o); save();
    lastId = o.id; paying = false;
    draft = {paper:'lined', to:'', body:''};
    go('done'); renderAdmin();
    $('#newDot').hidden = false;
    toast('새 편지가 출력 대기에 들어왔어요');
  }, 900);
}

/* ---------- admin ---------- */
const admin = $('#admin');
let filter = 'wait';
let picked = new Set();

function renderAdmin(){
  const wait = db.orders.filter(o => o.status === 'wait');
  const done = db.orders.filter(o => o.status === 'done');
  const list = filter === 'all' ? db.orders : db.orders.filter(o => o.status === filter);
  picked.forEach(id => { if (!list.some(o => o.id === id)) picked.delete(id); });
  const sales = db.orders.reduce((s,o) => s + (o.price || paper(o.paper).price), 0);
  admin.innerHTML = `<div class="ad-hd"><h2>출력 대기</h2>
    <div class="stats">
      <div class="stat"><small>출력 대기</small><b>${wait.length}</b>건</div>
      <div class="stat"><small>출력 완료</small><b>${done.length}</b>건</div>
      <div class="stat"><small>누적 결제</small><b>${(sales/10000).toFixed(1)}</b>만원</div>
    </div>
    <div class="filters" role="tablist">
      ${[['wait','대기 '+wait.length],['done','완료 '+done.length],['all','전체 '+db.orders.length]].map(([k,l]) => `<button role="tab" aria-selected="${filter===k}" class="${filter===k?'on':''}" data-filter="${k}">${l}</button>`).join('')}
    </div></div>
    <div class="tools">
      <label class="sel"><input type="checkbox" id="all" ${list.length && picked.size===list.length?'checked':''} ${list.length?'':'disabled'}> 전체 선택 ${picked.size ? `(${picked.size})` : ''}</label>
      <button class="tb pri" data-act="pdf" ${picked.size?'':'disabled'}>${ic.pdf}PDF로 받기</button>
      <button class="tb" data-act="done" ${[...picked].some(id => db.orders.find(o => o.id===id)?.status==='wait')?'':'disabled'}>${ic.check}완료 처리</button>
    </div>
    <ul class="rows">${list.length ? list.map(o => `
      <li class="row ${o.fresh?'new':''}">
        <input type="checkbox" data-pick="${o.id}" ${picked.has(o.id)?'checked':''} aria-label="${o.id} 선택">
        <button class="main" data-open="${o.id}"><b>${esc(o.to)}</b>${o.fresh?'<span class="newtag">NEW</span>':''}
          <small>${o.id} · 보낸 사람 ${esc(o.from)} · ${paper(o.paper).name} · ${o.body.length}자</small>
          <p>${esc(o.body.split('\n')[0])}</p></button>
        <div class="rt"><span class="st ${o.status==='done'?'done':''}">${o.status==='done'?'완료':'대기'}</span><small>${timeStr(o.at)}</small></div>
      </li>`).join('') : '<li class="empty">이 상태의 편지가 없어요.</li>'}</ul>
    <button class="link" data-act="reset">데모 데이터 초기화</button>`;
}
function timeStr(iso){ const m = Math.round((Date.now() - new Date(iso)) / 60000); return m < 1 ? '방금' : m < 60 ? m + '분 전' : m < 1440 ? Math.floor(m/60) + '시간 전' : fmtDate(iso); }

admin.addEventListener('change', e => {
  const list = filter === 'all' ? db.orders : db.orders.filter(o => o.status === filter);
  if (e.target.id === 'all') { picked = e.target.checked ? new Set(list.map(o => o.id)) : new Set(); renderAdmin(); }
  if (e.target.dataset.pick) { const id = e.target.dataset.pick; e.target.checked ? picked.add(id) : picked.delete(id); renderAdmin(); }
});
admin.addEventListener('click', e => {
  const t = e.target.closest('button'); if (!t) return;
  if (t.dataset.filter) { filter = t.dataset.filter; picked.clear(); renderAdmin(); }
  if (t.dataset.open) openPreview([t.dataset.open]);
  if (t.dataset.act === 'pdf') openPreview([...picked]);
  if (t.dataset.act === 'done') markDone([...picked]);
  if (t.dataset.act === 'reset') { try { localStorage.removeItem(KEY); } catch(e) {} db = load(); picked.clear(); screen = 'login'; renderApp(); renderAdmin(); toast('데모 데이터를 처음 상태로 되돌렸어요'); }
});

function markDone(ids){
  let n = 0;
  ids.forEach(id => { const o = db.orders.find(x => x.id === id); if (o && o.status === 'wait') { o.status = 'done'; o.fresh = false; n++; } });
  save(); picked.clear(); renderAdmin(); if (screen === 'mine') renderApp();
  if (n) toast(`${n}건을 출력 완료로 옮겼어요`);
}

/* ---------- PDF preview + print ---------- */
const modal = $('#modal');
let modalIds = [];
function openPreview(ids){
  modalIds = ids;
  const os = ids.map(id => db.orders.find(o => o.id === id)).filter(Boolean);
  os.forEach(o => o.fresh = false); save(); renderAdmin();
  modal.innerHTML = `<div class="mbox fade" role="dialog" aria-modal="true" aria-labelledby="mt">
    <div class="mhd"><b id="mt">PDF 미리보기 · ${os.length}장</b><button class="back" data-m="close" aria-label="닫기">${ic.x}</button></div>
    <div class="mbody">${os.map(o => `<div class="preview-wrap">${sheet(o)}</div>`).join('')}</div>
    <div class="mfoot">
      <p class="hint">인쇄 창의 대상에서 <b>PDF로 저장</b>을 고르면 PDF 파일로, 프린터를 고르면 바로 출력됩니다. 편지 1통 = A4 1장.</p>
      <div class="btn-row"><button class="btn ghost" data-m="done" ${os.some(o => o.status==='wait')?'':'disabled'}>출력 완료</button><button class="btn" data-m="print">${ic.print}PDF 저장 · 인쇄</button></div>
    </div></div>`;
  $('#print').innerHTML = os.map(sheet).join('');
  modal.hidden = false;
  modal.querySelector('[data-m="print"]').focus();
}
function closeModal(){ modal.hidden = true; modal.innerHTML = ''; }
modal.addEventListener('click', e => {
  if (e.target === modal) return closeModal();
  const t = e.target.closest('button'); if (!t) return;
  if (t.dataset.m === 'close') closeModal();
  if (t.dataset.m === 'print') window.print();
  if (t.dataset.m === 'done') { markDone(modalIds); closeModal(); }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.hidden) closeModal(); });

/* ---------- misc ---------- */
let tt;
function toast(m){ const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('on'), 2200); }

document.querySelector('.switch').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  document.querySelectorAll('.switch button').forEach(x => x.classList.toggle('on', x === b));
  $('#paneApp').classList.toggle('on', b.dataset.pane === 'app');
  $('#paneAdmin').classList.toggle('on', b.dataset.pane === 'admin');
  if (b.dataset.pane === 'admin') $('#newDot').hidden = true;
  window.scrollTo(0, 0);
});

renderApp(); renderAdmin();

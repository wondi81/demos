'use strict';
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KEY = 'carmeet_v1';
const reduce = matchMedia('(prefers-reduced-motion: reduce)');

const REGIONS = ['충북 청주', '충북 충주', '대전 유성', '세종', '충남 천안'];
const KINDS = ['차종 무관', '세단', 'SUV', '스포츠·튜닝', '수입차', '전기차'];
const ME = {nick:'오창드라이버', c:'#E4502A'};

const ic = {
  cal:'<svg class="ic" viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
  pin:'<svg class="ic" viewBox="0 0 24 24"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
  car:'<svg class="ic" viewBox="0 0 24 24"><path d="M4 16v-3l1.8-4.2A2 2 0 0 1 7.6 7.5h8.8a2 2 0 0 1 1.8 1.3L20 13v3z"/><circle cx="7.5" cy="16.5" r="1.8"/><circle cx="16.5" cy="16.5" r="1.8"/></svg>',
  back:'<svg class="ic" viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
  heart:'<svg class="ic" viewBox="0 0 24 24"><path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.3a4.3 4.3 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20z"/></svg>',
  chat:'<svg class="ic" viewBox="0 0 24 24"><path d="M5 5h14v11H9l-4 4z"/></svg>',
  plus:'<svg class="ic" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  user:'<svg class="ic" viewBox="0 0 24 24"><circle cx="9" cy="8.5" r="3.3"/><path d="M3 19.5a6 6 0 0 1 12 0M16 5.5a3.3 3.3 0 0 1 0 6.3M18 14.5a6 6 0 0 1 3 5"/></svg>',
  cam:'<svg class="ic" viewBox="0 0 24 24"><path d="M4 8h3l1.5-2h7L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
};
// stylised side-view car; colour per post so lists don't look identical
const carArt = (body, bg) => `<svg viewBox="0 0 200 90" aria-hidden="true"><rect width="200" height="90" fill="${bg}" opacity="0"/><path d="M14 62c0-7 4-10 12-11l26-4 22-14c6-4 12-5 20-5h30c9 0 16 3 23 9l14 11 18 3c6 1 9 5 9 11v6H14z" fill="${body}"/><path d="M80 34c5-3 9-4 15-4h12v17H66zM113 30h14c7 0 12 2 17 7l8 10h-39z" fill="#fff" opacity=".55"/><circle cx="50" cy="68" r="13" fill="#15181D"/><circle cx="50" cy="68" r="5.5" fill="#C9CDD3"/><circle cx="150" cy="68" r="13" fill="#15181D"/><circle cx="150" cy="68" r="5.5" fill="#C9CDD3"/></svg>`;
const PAL = [['#E4502A','#FDECE6'],['#2D3748','#EEF0F3'],['#3567C8','#E8EFFB'],['#8C9199','#F1F2F4'],['#1E7A5A','#E5F3EC']];

/* ---------- data ---------- */
const day = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0,10); };
const SEED = {
  '충북 청주': {
    meets:[
      {t:'토요일 밤 오창호수공원 정기 카밋', d:day(5), tm:'21:00', place:'오창호수공원 공영주차장', kind:'차종 무관', n:18, max:30, type:'정기', host:'은빛세단'},
      {t:'문의 청남대 가는 길 와인딩 드라이브', d:day(8), tm:'07:30', place:'문의면 대청댐 물문화관 주차장', kind:'스포츠·튜닝', n:9, max:12, type:'드라이브', host:'코너마스터'},
      {t:'전기차 오너 충전·정보 나눔 모임', d:day(12), tm:'14:00', place:'청주 오송역 환승주차장', kind:'전기차', n:6, max:15, type:'번개', host:'조용한모터'},
    ],
    posts:[
      {cat:'자랑', t:'세차 끝나고 노을 맞춰 한 장', b:'3시간 손세차하고 코팅까지 올렸습니다.\n무심천 뚝방길 노을이 딱 맞아서 기분 좋네요.', by:'광택장인', car:'그랜저 하이브리드', likes:42, cm:[['은빛세단','색감 미쳤네요. 코팅제 뭐 쓰셨어요?'],['광택장인','유리막 계열이에요. 다음 모임 때 보여드릴게요.']], pal:1},
      {cat:'정비', t:'브레이크 밟을 때 끼익 소리, 패드 교체 시기일까요?', b:'주행 4만 km, 아침 첫 출발 때만 소리가 납니다.\n습기 때문인지 패드 문제인지 궁금합니다.', by:'초보오너', car:'아반떼', likes:7, cm:[['코너마스터','아침에만 나면 습기로 인한 녹일 가능성이 커요. 그래도 두께는 한번 확인해 보세요.']], pal:0},
      {cat:'자랑', t:'드디어 휠 교체했습니다 (19인치)', b:'고민만 1년 했는데 바꾸고 나니 왜 진작 안 했나 싶네요.\n승차감은 살짝 단단해졌어요.', by:'휠덕후', car:'쏘렌토', likes:25, cm:[], pal:2},
      {cat:'정비', t:'청주 근처 판금·도색 잘하는 곳 있을까요?', b:'뒷범퍼에 작은 긁힘이 생겼습니다. 부분 도색 견적 받아보신 분 계신가요?', by:'조용한모터', car:'아이오닉 5', likes:3, cm:[], pal:3},
    ],
  },
  '충북 충주': {
    meets:[{t:'충주호 일주 아침 드라이브', d:day(6), tm:'08:00', place:'충주댐 물문화관 주차장', kind:'차종 무관', n:11, max:20, type:'드라이브', host:'호수길'}],
    posts:[{cat:'자랑', t:'충주호 벚꽃길에서 찍은 사진', b:'주말 아침이라 한산해서 좋았습니다.', by:'호수길', car:'K5', likes:15, cm:[], pal:4}],
  },
  '대전 유성': {
    meets:[
      {t:'유성 수입차 오너 커피 모임', d:day(4), tm:'19:30', place:'엑스포 시민광장 주차장', kind:'수입차', n:14, max:20, type:'정기', host:'독일차러버'},
      {t:'SUV 차박 장비 공유 번개', d:day(10), tm:'18:00', place:'갑천 둔치 주차장', kind:'SUV', n:5, max:10, type:'번개', host:'캠핑카운터'},
    ],
    posts:[{cat:'정비', t:'엔진오일 교환 주기, 5천 vs 1만 km?', b:'도심 주행 위주입니다. 의견 부탁드려요.', by:'독일차러버', car:'3시리즈', likes:11, cm:[], pal:1}],
  },
  '세종': {meets:[], posts:[]},
  '충남 천안': {
    meets:[{t:'천안 신규 회원 환영 카밋', d:day(7), tm:'20:00', place:'천안종합운동장 주차장', kind:'차종 무관', n:8, max:25, type:'정기', host:'흰색세단'}],
    posts:[],
  },
};
function seed(){
  let id = 1; const meets = [], posts = [];
  for (const [r, v] of Object.entries(SEED)) {
    v.meets.forEach(m => meets.push({...m, id:id++, region:r, joined:false}));
    v.posts.forEach((p, i) => posts.push({...p, id:id++, region:r, liked:false, ago:(i+1)*37, cm:p.cm.map(([by, tx]) => ({by, tx}))}));
  }
  return {region:'충북 청주', meets, posts, cars:[{model:'아반떼 N', year:'2023', photo:''}], noti:true, seq:id};
}
let db = (() => { try { const d = JSON.parse(localStorage.getItem(KEY)); if (d && d.meets) return d; } catch(e) {} return seed(); })();
const save = () => { try { const c = {...db, cars:db.cars.map(x => ({...x, photo:''}))}; localStorage.setItem(KEY, JSON.stringify(c)); } catch(e) {} };

const fmtD = s => { const d = new Date(s + 'T00:00'); return `${d.getMonth()+1}월 ${d.getDate()}일 (${'일월화수목금토'[d.getDay()]})`; };
const ago = m => m < 60 ? `${m}분 전` : m < 1440 ? `${Math.floor(m/60)}시간 전` : `${Math.floor(m/1440)}일 전`;
const avColor = s => PAL[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % PAL.length][0];
const av = s => `<span class="av" style="--c:${avColor(s)}">${esc(s[0])}</span>`;
const here = arr => arr.filter(x => x.region === db.region);

/* ---------- views ---------- */
function meetCard(m){
  const full = m.n >= m.max && !m.joined;
  return `<article class="card meet">
    <div class="top"><span class="tag">${m.type}</span><span class="tag g">${esc(m.kind)}</span></div>
    <h3>${esc(m.t)}</h3>
    <div class="meta"><div>${ic.cal}${fmtD(m.d)} ${esc(m.tm)}</div><div>${ic.pin}${esc(m.place)}</div></div>
    <div class="prog">${ic.user}<div class="bar"><i style="width:${Math.min(100, m.n / m.max * 100)}%"></i></div><span><b>${m.n}</b> / ${m.max}명</span></div>
    <button class="btn ${m.joined ? 'joined' : ''}" data-join="${m.id}" ${full ? 'disabled' : ''} aria-pressed="${m.joined}">${m.joined ? '참가 중 · 취소하기' : full ? '모집 마감' : '참가하기'}</button>
  </article>`;
}
function postItem(p){
  const th = p.cat === '자랑' ? `<div class="thumb" style="background:${PAL[p.pal][1]}">${carArt(PAL[p.pal][0])}</div>` : `<div class="thumb q">Q</div>`;
  return `<button class="card post" data-post="${p.id}">
    <div><span class="tag ${p.cat === '정비' ? 'g' : ''}">${p.cat === '자랑' ? '내 차 자랑' : '정비 질문'}</span>
      <h3>${esc(p.t)}</h3><p>${esc(p.b)}</p>
      <div class="foot"><span>${esc(p.by)}</span><span>${ago(p.ago)}</span><span>${ic.heart}${p.likes}</span><span>${ic.chat}${p.cm.length}</span></div></div>
    ${th}</button>`;
}
const empty = t => `<p class="empty">${t}</p>`;

let boardCat = '전체', meetKind = '전체';
const R = {
  home(){
    const ms = here(db.meets).sort((a, b) => a.d.localeCompare(b.d)), next = ms[0];
    const ps = here(db.posts).slice().sort((a, b) => b.likes - a.likes).slice(0, 2);
    return `${next ? `<div class="hero">
        <small>다가오는 ${esc(db.region.split(' ').pop())} 카밋</small>
        <h3>${esc(next.t)}</h3><p>${fmtD(next.d)} ${esc(next.tm)} · ${esc(next.place)}</p>
        <div class="car">${carArt('#E4502A')}</div>
        <div class="row"><span class="who">${next.n}명 참가 중</span><button class="btn ${next.joined ? 'joined' : ''}" style="${next.joined ? 'background:#fff;color:#15181D' : ''}" data-join="${next.id}">${next.joined ? '참가 중' : '참가하기'}</button></div>
      </div>` : `<div class="hero"><small>${esc(db.region)}</small><h3>아직 예정된 모임이 없어요</h3><p>첫 카밋을 직접 열어 보세요.</p><div class="row"><span></span><button class="btn" data-act="newMeet">모임 만들기</button></div></div>`}
      <div class="stats">
        <div class="card stat"><b>${ms.length}</b><small>예정 모임</small></div>
        <div class="card stat"><b>${ms.reduce((s, m) => s + m.n, 0)}</b><small>참가 신청</small></div>
        <div class="card stat"><b>${here(db.posts).length}</b><small>게시글</small></div>
      </div>
      <h2>인기 글<button class="more" data-goto="board">전체 보기</button></h2>
      <div class="posts">${ps.map(postItem).join('') || empty('아직 글이 없어요.')}</div>
      <h2>이번 달 모임<button class="more" data-goto="meet">전체 보기</button></h2>
      <div class="meets">${ms.slice(1, 3).map(meetCard).join('') || empty('다른 모임이 없어요.')}</div>`;
  },
  meet(){
    const ms = here(db.meets).filter(m => meetKind === '전체' || m.kind === meetKind).sort((a, b) => a.d.localeCompare(b.d));
    return `<h2>카미팅 모임</h2>
      <div class="chips">${['전체', ...KINDS].map(k => `<button class="chip ${meetKind === k ? 'on' : ''}" data-kind="${k}">${k}</button>`).join('')}</div>
      <div class="meets" style="margin-top:12px">${ms.map(meetCard).join('') || empty('조건에 맞는 모임이 없어요.')}</div>`;
  },
  board(){
    const ps = here(db.posts).filter(p => boardCat === '전체' || p.cat === boardCat);
    return `<h2>게시판</h2>
      <div class="chips">${[['전체','전체'],['자랑','내 차 자랑'],['정비','정비 질문']].map(([k, l]) => `<button class="chip ${boardCat === k ? 'on' : ''}" data-cat="${k}">${l}</button>`).join('')}</div>
      <div class="posts" style="margin-top:12px">${ps.map(postItem).join('') || empty('첫 글을 남겨 보세요.')}</div>`;
  },
  me(){
    const joined = db.meets.filter(m => m.joined).length, mine = db.posts.filter(p => p.by === ME.nick).length;
    return `<div class="card profile">${av(ME.nick)}<div><b>${ME.nick}</b><span class="muted">${esc(db.region)} · 가입 2개월</span></div></div>
      <h2>내 차<button class="more" data-act="addCar">+ 등록</button></h2>
      <div class="cars">${db.cars.map(c => `<div class="card mycar"><div class="ph-img" style="${c.photo ? `background-image:url(${c.photo})` : ''}">${c.photo ? '' : carArt('#8C9199')}</div><div><b>${esc(c.model)}</b><span class="muted">${esc(c.year)}년식</span></div></div>`).join('') || empty('등록된 차가 없어요.')}</div>
      <h2>활동</h2>
      <div class="card list"><div><span>참가한 모임</span><b>${joined}</b></div><div><span>쓴 글</span><b>${mine}</b></div><div><span>알림 설정</span><span class="muted">모임·댓글</span></div></div>
      <button class="more" data-act="reset" style="border:0;background:none;color:var(--muted);text-decoration:underline;margin-top:16px;min-height:44px;padding:0">데모 데이터 초기화</button>`;
  },
};

let tab = 'home';
const fab = document.createElement('button');
fab.className = 'btn fab'; fab.hidden = true;
$('.views').appendChild(fab);

function render(which){
  (which ? [which] : Object.keys(R)).forEach(k => { $('#v-' + k).innerHTML = R[k](); });
  $('#regionName').textContent = db.region;
  $('#badge').hidden = !db.noti;
  $('#bellBtn').setAttribute('aria-label', db.noti ? '알림 1건' : '알림');
  fab.hidden = !(tab === 'meet' || tab === 'board');
  fab.innerHTML = tab === 'meet' ? `${ic.plus}모임 만들기` : `${ic.plus}글쓰기`;
  fab.dataset.act = tab === 'meet' ? 'newMeet' : 'newPost';
}

function switchTab(t){
  const v = $('#v-' + t);
  if (t === tab) { v.scrollTo({top:0, behavior: reduce.matches ? 'auto' : 'smooth'}); return; }
  $('#v-' + tab).classList.remove('on'); v.classList.add('on');
  document.querySelectorAll('.tabs button').forEach(b => { const on = b.dataset.tab === t; b.classList.toggle('on', on); on ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current'); });
  tab = t; render();
}
document.querySelector('.tabs').addEventListener('click', e => { const b = e.target.closest('button'); if (b) switchTab(b.dataset.tab); });

/* ---------- actions ---------- */
let tt;
function toast(m){ const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('on'), 1800); }

document.querySelector('.phone').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.join) {
    const m = db.meets.find(x => x.id === +b.dataset.join);
    m.joined = !m.joined; m.n += m.joined ? 1 : -1; save(); render();
    toast(m.joined ? '참가 신청 완료' : '참가를 취소했어요');
  }
  else if (b.dataset.kind) { meetKind = b.dataset.kind; render('meet'); }
  else if (b.dataset.cat) { boardCat = b.dataset.cat; render('board'); }
  else if (b.dataset.goto) switchTab(b.dataset.goto);
  else if (b.dataset.post) openPost(+b.dataset.post);
  else if (b.dataset.act === 'newMeet') openMeetForm();
  else if (b.dataset.act === 'newPost') openPostForm();
  else if (b.dataset.act === 'addCar') openCarForm();
  else if (b.dataset.act === 'reset') { try { localStorage.removeItem(KEY); } catch(e) {} db = seed(); render(); toast('처음 상태로 되돌렸어요'); }
  else if (b.dataset.act === 'back') closePage();
  else if (b.dataset.act === 'like') {
    const p = db.posts.find(x => x.id === +b.dataset.id);
    p.liked = !p.liked; p.likes += p.liked ? 1 : -1; save(); render(); openPost(p.id, true);
  }
});
$('#regionBtn').addEventListener('click', () => openSheet(`<h3>지역 선택</h3>${REGIONS.map(r => `<button class="opt ${r === db.region ? 'on' : ''}" data-region="${r}">${r}</button>`).join('')}`));
$('#bellBtn').addEventListener('click', () => {
  db.noti = false; save(); render();
  openSheet(`<h3>알림</h3><div class="noti"><span class="dotc">${ic.cal}</span><div><p><b>토요일 밤 오창호수공원 정기 카밋</b> 모임이 5일 남았어요. 참가 인원이 18명을 넘었어요.</p><small>10분 전</small></div></div>`);
});

/* bottom sheet */
const sheet = $('#sheet');
function openSheet(html){ sheet.innerHTML = `<div class="sheetbox" role="dialog" aria-modal="true"><div class="grab"></div>${html}</div>`; sheet.hidden = false; sheet.querySelector('button')?.focus(); }
sheet.addEventListener('click', e => {
  if (e.target === sheet) { sheet.hidden = true; return; }
  const b = e.target.closest('[data-region]');
  if (b) {
    db.region = b.dataset.region; meetKind = '전체'; boardCat = '전체'; save(); render();
    Object.keys(R).forEach(k => $('#v-' + k).scrollTop = 0);
    sheet.hidden = true; toast(`${db.region} 지역으로 바꿨어요`);
  }
});

/* overlay page */
const page = $('#page');
let pageOpen = 'none';
function openPage(title, body, foot, keep){
  page.innerHTML = `<div class="ph"><button class="iconbtn" data-act="back" aria-label="뒤로">${ic.back}</button><h1>${title}</h1></div><div class="pb">${body}</div>${foot ? `<div class="pf">${foot}</div>` : ''}`;
  if (!keep) { page.classList.add('off'); page.hidden = false; requestAnimationFrame(() => requestAnimationFrame(() => page.classList.remove('off'))); }
  pageOpen = title;
}
function closePage(){
  pageOpen = 'none';
  if (reduce.matches) { page.hidden = true; return; }
  page.classList.add('off');
  setTimeout(() => { if (pageOpen === 'none') page.hidden = true; }, 230);
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') { if (!sheet.hidden) sheet.hidden = true; else if (!page.hidden) closePage(); } });

function openPost(id, keep){
  const p = db.posts.find(x => x.id === id);
  const sc = page.querySelector('.pb')?.scrollTop || 0;
  openPage(p.cat === '자랑' ? '내 차 자랑' : '정비 질문', `<article class="art">
      <div class="author">${av(p.by)}<div><b>${esc(p.by)}</b><small>${esc(p.car)} · ${ago(p.ago)}</small></div></div>
      <h1>${esc(p.t)}</h1>
      ${p.cat === '자랑' ? `<div class="img" style="background:${PAL[p.pal][1]}">${carArt(PAL[p.pal][0])}</div>` : ''}
      <div class="txt">${esc(p.b)}</div>
      <div class="likebar"><button class="likebtn ${p.liked ? 'on' : ''}" data-act="like" data-id="${p.id}" aria-pressed="${p.liked}">${ic.heart}좋아요 ${p.likes}</button><span class="likebtn" style="box-shadow:none;background:none">${ic.chat}댓글 ${p.cm.length}</span></div>
      <ul class="cmts">${p.cm.map(c => `<li class="cmt">${av(c.by)}<div><b>${esc(c.by)}</b>${c.by === ME.nick ? '<small>나</small>' : ''}<p>${esc(c.tx)}</p></div></li>`).join('') || '<li class="empty">첫 댓글을 남겨 보세요.</li>'}</ul>
    </article>`,
    `<form class="cform" id="cform"><input class="in" id="ctext" maxlength="200" placeholder="댓글을 입력하세요" aria-label="댓글"><button class="btn">등록</button></form>`, keep);
  if (keep) page.querySelector('.pb').scrollTop = sc;
  $('#cform').onsubmit = e => {
    e.preventDefault(); const tx = $('#ctext').value.trim(); if (!tx) return;
    p.cm.push({by:ME.nick, tx}); save(); render(); openPost(id, true);
    const pb = page.querySelector('.pb'); pb.scrollTop = pb.scrollHeight;
  };
}

function openMeetForm(){
  openPage('모임 만들기', `<form id="mform">
      <label class="f" for="mt">모임 이름</label><input class="in" id="mt" required maxlength="30" placeholder="예) 금요일 밤 세차 후 커피 모임">
      <label class="f">모임 유형</label><div class="seg" style="grid-template-columns:repeat(3,1fr)">${['정기','번개','드라이브'].map((t, i) => `<label><input type="radio" name="mtype" value="${t}" ${i ? '' : 'checked'}>${t}</label>`).join('')}</div>
      <div class="two"><div><label class="f" for="md">날짜</label><input class="in" id="md" type="date" required min="${day(0)}" value="${day(3)}"></div>
      <div><label class="f" for="mtm">시간</label><input class="in" id="mtm" type="time" required value="20:00"></div></div>
      <label class="f" for="mp">장소</label><input class="in" id="mp" required maxlength="40" placeholder="예) 오창호수공원 공영주차장">
      <div class="two"><div><label class="f" for="mk">차종</label><select class="in" id="mk">${KINDS.map(k => `<option>${k}</option>`).join('')}</select></div>
      <div><label class="f" for="mm">최대 인원</label><input class="in" id="mm" type="number" min="2" max="100" value="20" required></div></div>
      <p class="muted" style="font-size:14px;margin-top:14px">${esc(db.region)} 지역 모임으로 올라갑니다. 만든 사람은 자동으로 참가돼요.</p>
    </form>`, `<button class="btn block" form="mform">모임 올리기</button>`);
  $('#mform').onsubmit = e => {
    e.preventDefault();
    db.meets.push({id:db.seq++, region:db.region, t:$('#mt').value.trim(), type:document.querySelector('[name=mtype]:checked').value, d:$('#md').value, tm:$('#mtm').value, place:$('#mp').value.trim(), kind:$('#mk').value, n:1, max:Math.max(2, +$('#mm').value || 20), joined:true, host:ME.nick});
    save(); meetKind = '전체'; closePage(); if (tab !== 'meet') switchTab('meet'); else render(); toast('모임을 올렸어요');
  };
}

function openPostForm(){
  openPage('글쓰기', `<form id="pform">
      <label class="f">카테고리</label><div class="seg"><label><input type="radio" name="pcat" value="자랑" ${boardCat !== '정비' ? 'checked' : ''}>내 차 자랑</label><label><input type="radio" name="pcat" value="정비" ${boardCat === '정비' ? 'checked' : ''}>정비 질문</label></div>
      <label class="f" for="pt">제목</label><input class="in" id="pt" required maxlength="40" placeholder="제목을 입력하세요">
      <label class="f" for="pb">내용</label><textarea class="in" id="pb" required maxlength="1000" placeholder="내 차 이야기나 궁금한 점을 적어 주세요"></textarea>
    </form>`, `<button class="btn block" form="pform">올리기</button>`);
  $('#pform').onsubmit = e => {
    e.preventDefault();
    const cat = document.querySelector('[name=pcat]:checked').value;
    db.posts.unshift({id:db.seq++, region:db.region, cat, t:$('#pt').value.trim(), b:$('#pb').value.trim(), by:ME.nick, car:db.cars[0]?.model || '차량 미등록', likes:0, liked:false, cm:[], ago:1, pal:0});
    save(); boardCat = '전체'; closePage(); $('#v-board').scrollTop = 0; render(); toast('글을 올렸어요');
  };
}

function openCarForm(){
  let photo = '';
  const yrs = Array.from({length:20}, (_, i) => 2026 - i);
  openPage('내 차 등록', `<form id="cfm">
      <label class="f">사진</label>
      <label class="photo" id="photo">${ic.cam}<span>사진 추가 (선택)</span><input type="file" id="pf" accept="image/*"></label>
      <label class="f" for="cm">차종</label><input class="in" id="cm" required maxlength="30" placeholder="예) 쏘나타 N 라인" list="models">
      <datalist id="models">${['아반떼','쏘나타','그랜저','K5','쏘렌토','투싼','아이오닉 5','EV6','GV70','3시리즈'].map(m => `<option value="${m}">`).join('')}</datalist>
      <label class="f" for="cy">연식</label><select class="in" id="cy">${yrs.map(y => `<option>${y}</option>`).join('')}</select>
    </form>`, `<button class="btn block" form="cfm">등록하기</button>`);
  $('#pf').onchange = e => {
    const f = e.target.files[0]; if (!f) return;
    photo = URL.createObjectURL(f);
    const el = $('#photo'); el.style.backgroundImage = `url(${photo})`; el.classList.add('has');
  };
  $('#cfm').onsubmit = e => {
    e.preventDefault();
    db.cars.push({model:$('#cm').value.trim(), year:$('#cy').value, photo});
    save(); closePage(); render(); toast('내 차를 등록했어요');
  };
}

render();

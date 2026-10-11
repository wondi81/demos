/* ○○ 동물구조단체 CMS 제안용 데모 — 데이터는 브라우저(localStorage)에만 저장됩니다. */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const app = $('#app');

const STATUSES = ['보호 중', '임시보호 중', '입양 심사 중', '입양 완료'];
const ST_CLS = { '보호 중': 's-care', '임시보호 중': 's-foster', '입양 심사 중': 's-review', '입양 완료': 's-done' };
const HEALTH = ['중성화 완료', '예방접종 완료', '심장사상충 음성', '마이크로칩 등록', '피부 치료 중', '슬개골 주의', '사람을 좋아해요', '다른 동물과 잘 지내요', '배변 훈련 완료'];
const MENUS = [['about', '단체 소개'], ['news', '구조 소식'], ['adopt', '입양·임시보호'], ['donate', '후원'], ['volunteer', '봉사·문의'], ['reviews', '후기']];

/* ---------- EN 토글 (용어집 기반 데모) ---------- */
const EN = {
  '단체 소개': 'About', '구조 소식': 'Rescue News', '입양·임시보호': 'Adopt & Foster', '후원': 'Donate', '봉사·문의': 'Volunteer', '후기': 'Stories',
  '관리자': 'Admin', '입양 가족을 기다려요': 'Waiting for a family', '보호 중': 'In care', '임시보호 중': 'In foster', '입양 심사 중': 'Under review', '입양 완료': 'Adopted',
  '개': 'Dog', '고양이': 'Cat', '기타': 'Other', '수컷': 'Male', '암컷': 'Female', '구분 전체': 'All species', '성별 전체': 'Any sex', '나이 전체': 'Any age', '체중 전체': 'Any weight', '상태 전체': 'Any status',
  '1살 미만': 'Under 1', '1~3살': '1–3 yrs', '4~7살': '4–7 yrs', '8살 이상': '8+ yrs', '5kg 미만': 'Under 5kg', '5~15kg': '5–15kg', '15kg 이상': '15kg+',
  '이름으로 찾기': 'Search by name', '구조 이야기': 'Rescue story', '건강 상태': 'Health', '보호 기록': 'Care timeline', '입양 신청하기': 'Apply to adopt', '목록으로': 'Back to list',
  '나이': 'Age', '체중': 'Weight', '성별': 'Sex', '구분': 'Species', '입양 후기': 'Adoption story',
  '구조된 친구들이 새 가족을 기다려요': 'Rescued friends are waiting for a new family', '친구들 만나러 가기': 'Meet the animals', '관리자 화면 체험하기': 'Try the admin',
};
let lang = 'ko';
try { lang = localStorage.getItem('rescue-lang') || 'ko'; } catch (e) {}
const t = s => (lang === 'en' && EN[s]) || s;

/* ---------- 아이콘 ---------- */
const I = {
  paw: '<svg class="ico" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="15.5" r="4.5"/><circle cx="5.5" cy="10" r="2.2"/><circle cx="18.5" cy="10" r="2.2"/><circle cx="9" cy="5.5" r="2.2"/><circle cx="15" cy="5.5" r="2.2"/></svg>',
  star: '<svg class="ico" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9z"/></svg>',
  trash: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  eye: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  eyeoff: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4M6.6 6.6A17 17 0 0 0 2 12s3.6 7 10 7a10 10 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>',
  lock: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
  img: '<svg class="ico big" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/></svg>',
  search: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>',
  plus: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  left: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M15 5l-7 7 7 7"/></svg>',
  move: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 3v18M3 12h18M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3"/></svg>',
  shield: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/></svg>',
};

/* ---------- 동물 일러스트 (외부 이미지 없이 SVG로 생성) ---------- */
const artCache = {};
function petArt({ kind, fur, dark, bg, v = 0 }) {
  const key = [kind, fur, dark, bg, v].join('|');
  if (artCache[key]) return artCache[key];
  const tilt = [-6, 5, -2, 8][v % 4];
  const eyes = `<g><circle cx="165" cy="150" r="13" fill="#fff"/><circle cx="167" cy="152" r="9" fill="#2b2420"/><circle cx="170" cy="148" r="3.2" fill="#fff"/>
    <circle cx="235" cy="150" r="13" fill="#fff"/><circle cx="237" cy="152" r="9" fill="#2b2420"/><circle cx="240" cy="148" r="3.2" fill="#fff"/></g>
    <circle cx="142" cy="184" r="11" fill="#F49AA0" opacity=".45"/><circle cx="258" cy="184" r="11" fill="#F49AA0" opacity=".45"/>`;
  let body = `<ellipse cx="200" cy="318" rx="118" ry="78" fill="${fur}"/>`, head;
  if (kind === '고양이') head = `
    <path d="M118 120 L128 40 L182 88Z" fill="${fur}"/><path d="M282 120 L272 40 L218 88Z" fill="${fur}"/>
    <path d="M132 104 L138 60 L168 88Z" fill="#F7B8BE"/><path d="M268 104 L262 60 L232 88Z" fill="#F7B8BE"/>
    <ellipse cx="200" cy="160" rx="98" ry="84" fill="${fur}"/>
    <path d="M180 82 q20 -8 40 0 q-20 14 -40 0z" fill="${dark}" opacity=".55"/>
    ${eyes}
    <path d="M193 180 h14 l-7 8z" fill="#E77C8A"/>
    <path d="M200 188 q-6 10 -15 7 M200 188 q6 10 15 7" stroke="#2b2420" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M128 178 l-40 -6 M128 188 l-40 4 M272 178 l40 -6 M272 188 l40 4" stroke="${dark}" stroke-width="2.5" stroke-linecap="round" opacity=".6"/>`;
  else if (kind === '기타') head = `
    <ellipse cx="165" cy="60" rx="24" ry="70" fill="${fur}" transform="rotate(-10 165 60)"/><ellipse cx="235" cy="60" rx="24" ry="70" fill="${fur}" transform="rotate(10 235 60)"/>
    <ellipse cx="165" cy="62" rx="11" ry="52" fill="${dark}" transform="rotate(-10 165 62)"/><ellipse cx="235" cy="62" rx="11" ry="52" fill="${dark}" transform="rotate(10 235 62)"/>
    <ellipse cx="200" cy="168" rx="88" ry="78" fill="${fur}"/>${eyes}
    <ellipse cx="200" cy="180" rx="8" ry="6" fill="#E77C8A"/>
    <path d="M200 186 q-5 9 -13 6 M200 186 q5 9 13 6" stroke="#2b2420" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  else head = `
    <ellipse cx="112" cy="150" rx="34" ry="64" fill="${dark}" transform="rotate(22 112 150)"/>
    <ellipse cx="288" cy="150" rx="34" ry="64" fill="${dark}" transform="rotate(-22 288 150)"/>
    <ellipse cx="200" cy="158" rx="94" ry="88" fill="${fur}"/>
    <ellipse cx="238" cy="124" rx="34" ry="28" fill="${dark}" opacity=".45"/>
    <ellipse cx="200" cy="200" rx="50" ry="38" fill="#fff" opacity=".8"/>${eyes}
    <ellipse cx="200" cy="184" rx="15" ry="11" fill="#2b2420"/><ellipse cx="196" cy="180" rx="5" ry="3" fill="#fff" opacity=".6"/>
    <path d="M200 194 q0 14 -15 16 M200 194 q0 14 15 16" stroke="#2b2420" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    ${v % 2 ? '<path d="M191 210 q9 24 18 0z" fill="#F28B9B"/>' : ''}`;
  const acc = [
    '',
    '<path d="M330 70c-8-14-30-8-26 8 3 10 26 24 26 24s23-14 26-24c4-16-18-22-26-8z" fill="#F4777F" opacity=".85"/>',
    '<circle cx="70" cy="240" r="30" fill="#FFD25E"/><path d="M42 232c18 8 38 8 56 0M44 252c18-8 38-8 54 0" stroke="#fff" stroke-width="4" fill="none"/>',
    '<path d="M60 70l6 14 15 2-11 10 3 15-13-7-13 7 3-15-11-10 15-2z" fill="#fff" opacity=".8"/>',
  ][v % 4];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">
    <rect width="400" height="300" fill="${bg}"/><circle cx="${60 + v * 70}" cy="40" r="90" fill="#fff" opacity=".35"/><circle cx="360" cy="270" r="110" fill="#fff" opacity=".25"/>
    ${acc}<g transform="rotate(${tilt} 200 170)">${body}${head}</g></svg>`;
  return (artCache[key] = 'data:image/svg+xml,' + encodeURIComponent(svg));
}
const srcOf = p => p.src || petArt(p.art);

/* ---------- 데이터 ---------- */
const d0 = (s) => new Date(s).toISOString();
function seed() {
  const A = (id, name, species, sex, age, weight, status, pub, look, story, health, log) => ({
    id, name, species, sex, age, weight, status, public: pub, story, health,
    photos: [0, 1, 2].map(v => ({ id: id + v, art: { ...look, kind: species, v: (v + id.length) % 4 }, cover: v === 0 })),
    log: log.map(([at, s]) => ({ at: d0(at), status: s })), updatedAt: d0(log[0][0]),
  });
  return [
    A('bori', '보리', '개', '수컷', 3, 8.2, '보호 중', true, { fur: '#E3B47A', dark: '#A86B35', bg: '#FFE3C9' },
      '비 오는 날 공사장 옆 컨테이너에 묶여 있던 아이예요.\n처음엔 사람 손만 봐도 몸을 낮췄지만, 지금은 산책 줄만 보면 꼬리를 흔들어요.\n간식보다 칭찬을 더 좋아하는 다정한 친구입니다.',
      ['중성화 완료', '예방접종 완료', '사람을 좋아해요'], [['2026-09-28T10:20', '보호 중']]),
    A('kong', '콩이', '고양이', '암컷', 1, 3.1, '임시보호 중', true, { fur: '#A7ADB6', dark: '#5F656E', bg: '#DDEBFF' },
      '아파트 지하주차장에서 혼자 울고 있던 새끼 고양이였어요.\n지금은 임시보호 가정에서 장난감 사냥 실력을 키우는 중이에요.',
      ['예방접종 완료', '배변 훈련 완료', '다른 동물과 잘 지내요'], [['2026-09-14T15:00', '임시보호 중'], ['2026-08-30T09:10', '보호 중']]),
    A('dubu', '두부', '개', '수컷', 7, 18.5, '입양 심사 중', true, { fur: '#F7F1E6', dark: '#D8C3A3', bg: '#E1F2E1' },
      '번식장 철장 안에서 7년을 보낸 아이예요.\n땅을 처음 밟던 날, 한참을 냄새만 맡았어요. 느리지만 분명하게 마음을 열고 있어요.',
      ['중성화 완료', '심장사상충 음성', '슬개골 주의'], [['2026-10-05T11:30', '입양 심사 중'], ['2026-07-02T13:00', '보호 중']]),
    A('nabi', '나비', '고양이', '암컷', 5, 4.0, '입양 완료', true, { fur: '#F0A85A', dark: '#C7742E', bg: '#FFF0D6' },
      '재개발 지역에 남겨진 고양이였어요.\n좋은 가족을 만나 지금은 창가 자리를 독차지하고 있대요.',
      ['중성화 완료', '예방접종 완료', '마이크로칩 등록'], [['2026-09-20T16:40', '입양 완료'], ['2026-09-02T10:00', '입양 심사 중'], ['2026-06-11T09:00', '보호 중']]),
    A('hodu', '호두', '개', '암컷', 0.5, 3.4, '보호 중', true, { fur: '#8A5A3C', dark: '#5A3825', bg: '#FCE1E4' },
      '형제들과 함께 박스에 담겨 버려진 아기 강아지예요.\n호기심이 많아서 무엇이든 한 번씩 물어봐야 직성이 풀려요.',
      ['예방접종 완료', '사람을 좋아해요'], [['2026-10-01T14:10', '보호 중']]),
    A('kkam', '까망이', '고양이', '수컷', 2, 5.2, '보호 중', true, { fur: '#3D3734', dark: '#1F1B1A', bg: '#E9E1FF' },
      '다친 다리로 골목을 다니던 아이를 이웃 주민 제보로 구조했어요.\n수술 후 잘 회복했고, 무릎 위에 올라오는 걸 좋아해요.',
      ['중성화 완료', '마이크로칩 등록'], [['2026-08-21T12:00', '보호 중']]),
    A('somi', '솜이', '기타', '암컷', 2, 1.8, '보호 중', true, { fur: '#FFFFFF', dark: '#F3C6CF', bg: '#DDF3EF' },
      '공원에 유기된 토끼예요. 겁이 많지만 건초를 주면 코를 씰룩이며 다가와요.',
      ['다른 동물과 잘 지내요'], [['2026-09-09T10:00', '보호 중']]),
    A('mango', '망고', '개', '수컷', 4, 11, '보호 중', false, { fur: '#F2C14E', dark: '#C9962A', bg: '#FFF6CC' },
      '(비공개) 학대 사건 수사가 진행 중이라 아직 공개하지 않는 아이예요.',
      ['피부 치료 중'], [['2026-10-09T18:00', '보호 중']]),
  ];
}
const LS = 'rescue-demo-v1';
let animals;
function load() { try { animals = JSON.parse(localStorage.getItem(LS)); } catch (e) {} if (!Array.isArray(animals)) animals = seed(); }
function persist() { try { localStorage.setItem(LS, JSON.stringify(animals)); return true; } catch (e) { toast('브라우저 저장 공간이 부족해요 (데모 한계 — 실제 사이트는 서버에 저장)'); return false; } }
const getA = id => animals.find(a => a.id === id);
const cover = a => a.photos.find(p => p.cover) || a.photos[0];
const ageTxt = y => !y && y !== 0 ? '-' : y < 1 ? Math.round(y * 12) + (lang === 'en' ? ' mo' : '개월') : (lang === 'en' ? y + ' yrs' : y + '살');
const fmtB = b => b >= 1048576 ? (b / 1048576).toFixed(1) + 'MB' : Math.max(1, Math.round(b / 1024)) + 'KB';
const pad2 = n => String(n).padStart(2, '0');
const fmtD = iso => { const d = new Date(iso); return `${d.getFullYear()}.${pad2(d.getMonth() + 1)}.${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };
const badge = s => `<span class="badge ${ST_CLS[s]}">${esc(t(s))}</span>`;
const draftKey = id => 'rescue-draft-' + id;
const hasDraft = id => { try { return !!localStorage.getItem(draftKey(id)); } catch (e) { return false; } };

/* ---------- 공통 UI ---------- */
let toastT;
function toast(msg, link) {
  $('.toast')?.remove(); clearTimeout(toastT);
  const el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status');
  el.innerHTML = esc(msg) + (link ? ` <a href="${link[0]}">${esc(link[1])}</a>` : '');
  document.body.append(el); toastT = setTimeout(() => el.remove(), 4200);
}
function header(route) {
  const isAdmin = route.startsWith('admin');
  $('#top').innerHTML = `<div class="wrap">
    <a class="brand" href="#/"><span class="logo">${I.paw}</span>○○ 동물구조단체 (데모)</a>
    <nav class="nav" aria-label="주 메뉴">${MENUS.map(([k, n]) => `<a href="#/${k === 'adopt' ? 'adopt' : 'page/' + k}" class="${route === k || (k === 'adopt' && route === 'animal') ? 'on' : ''}">${esc(t(n))}</a>`).join('')}</nav>
    <div class="top-actions">
      <button class="lang" id="lang" aria-label="언어 전환">${lang === 'ko' ? '<b>KO</b> · EN' : 'KO · <b>EN</b>'}</button>
      <a class="btn sm ${isAdmin ? '' : 'dark'}" href="#/admin">${esc(t('관리자'))}</a>
    </div></div>`;
  $('#lang').onclick = () => { lang = lang === 'ko' ? 'en' : 'ko'; try { localStorage.setItem('rescue-lang', lang); } catch (e) {} document.documentElement.lang = lang; route_(); };
  $('#adminbar').innerHTML = isAdmin ? `<div class="adminbar"><div class="wrap">
    <span class="tag">관리자</span><span class="hide-m">봉사자 누구나 쓰는 화면</span>
    <a href="#/admin" class="${route === 'admin' ? 'on' : ''}">동물 목록</a>
    <a href="#/admin/new" class="${location.hash === '#/admin/new' ? 'on' : ''}">새 동물 등록</a>
    <span class="sp"></span><a href="#/adopt">공개 페이지 보기 →</a></div></div>` : '';
}

/* ---------- 홈 ---------- */
function renderHome() {
  const pub = animals.filter(a => a.public);
  app.innerHTML = `<section class="hero">
    <div><span class="badge s-care">${I.paw} ${lang === 'en' ? 'Rescue · Care · Adoption' : '구조 · 보호 · 입양'}</span>
      <h1 style="margin-top:14px">${esc(t('구조된 친구들이 새 가족을 기다려요'))}</h1>
      <p>${lang === 'en' ? 'Every animal here was rescued from abuse or danger. Meet them and become their family.' : '학대와 위험 속에서 구조된 아이들이 보호소와 임시보호 가정에서 지내고 있어요. 한 번 만나보세요.'}</p>
      <div class="ctas"><a class="btn" href="#/adopt">${esc(t('친구들 만나러 가기'))}</a><a class="btn ghost" href="#/admin">${esc(t('관리자 화면 체험하기'))}</a></div></div>
    <div class="collage">${pub.slice(0, 3).map(a => `<img src="${srcOf(cover(a))}" alt="${esc(a.name)}">`).join('')}</div></section>
    <h2>이 데모에서 직접 해 보세요</h2>
    <div class="steps">
      <div class="card step"><div class="n">1</div><h3>사진 여러 장 끌어다 놓기</h3><p>관리자 → 동물 수정에서 사진을 한 번에 올리면 브라우저가 알아서 용량을 줄여요.</p></div>
      <div class="card step"><div class="n">2</div><h3>공개 / 숨김 한 번에</h3><p>스위치 하나로 숨기면 공개 목록에서 바로 사라지고, 링크로 들어와도 막혀요.</p></div>
      <div class="card step"><div class="n">3</div><h3>입양 상태 바꾸기</h3><p>'입양 심사 중'으로 바꾸면 신청 버튼이 자동으로 숨고, 변경 날짜가 기록돼요.</p></div>
    </div>`;
}

/* ---------- 공개: 입양 목록 ---------- */
const pf = { q: '', species: '', sex: '', age: '', weight: '', status: '' };
const AGE = { '1살 미만': a => a < 1, '1~3살': a => a >= 1 && a <= 3, '4~7살': a => a >= 4 && a <= 7, '8살 이상': a => a >= 8 };
const WT = { '5kg 미만': w => w < 5, '5~15kg': w => w >= 5 && w < 15, '15kg 이상': w => w >= 15 };
function renderAdopt() {
  const sel = (k, all, opts) => `<select class="fsel ${pf[k] ? 'on' : ''}" data-k="${k}" aria-label="${esc(all)}"><option value="">${esc(t(all))}</option>${opts.map(o => `<option value="${esc(o)}" ${pf[k] === o ? 'selected' : ''}>${esc(t(o))}</option>`).join('')}</select>`;
  app.innerHTML = `<h1>${esc(t('입양 가족을 기다려요'))}</h1>
    <p class="sub">${lang === 'en' ? 'Use the filters to find a friend that fits your home.' : '조건을 고르면 우리 집에 맞는 친구를 찾기 쉬워요.'}</p>
    <div class="card filters">
      <label class="search">${I.search}<input id="q" type="search" placeholder="${esc(t('이름으로 찾기'))}" value="${esc(pf.q)}"></label>
      ${sel('species', '구분 전체', ['개', '고양이', '기타'])}${sel('sex', '성별 전체', ['수컷', '암컷'])}
      ${sel('age', '나이 전체', Object.keys(AGE))}${sel('weight', '체중 전체', Object.keys(WT))}${sel('status', '상태 전체', STATUSES)}
    </div><p class="count" id="count"></p><div class="grid" id="grid"></div>`;
  $('#q').oninput = e => { pf.q = e.target.value; list(); };
  $$('.fsel').forEach(s => s.onchange = () => { pf[s.dataset.k] = s.value; s.classList.toggle('on', !!s.value); list(); });
  list();
  function list() {
    // ponytail: 클라이언트 필터 — 실제 사이트는 서버에서 공개 글만 내려주고(비공개는 응답에 포함 안 됨) 정적 페이지로 캐시
    const r = animals.filter(a => a.public
      && (!pf.q || a.name.includes(pf.q.trim())) && (!pf.species || a.species === pf.species) && (!pf.sex || a.sex === pf.sex)
      && (!pf.age || AGE[pf.age](a.age)) && (!pf.weight || WT[pf.weight](a.weight)) && (!pf.status || a.status === pf.status));
    $('#count').textContent = lang === 'en' ? `${r.length} animals` : `${r.length}마리의 친구들`;
    $('#grid').innerHTML = r.length ? r.map(a => `<a class="card pet" href="#/animal/${a.id}">
      <div class="ph"><img loading="lazy" src="${srcOf(cover(a))}" alt="${esc(a.name)} 사진" width="400" height="300">${badge(a.status)}</div>
      <div class="bd"><p class="nm">${esc(a.name)}</p><div class="meta">${esc(t(a.species))} · ${esc(t(a.sex))} · ${ageTxt(a.age)} · ${a.weight}kg</div></div></a>`).join('')
      : `<div class="empty" style="grid-column:1/-1">${lang === 'en' ? 'No matches. Try other filters.' : '조건에 맞는 친구가 없어요. 조건을 바꿔 보세요.'}</div>`;
  }
}

/* ---------- 공개: 상세 ---------- */
function renderDetail(id) {
  const a = getA(id);
  if (!a || !a.public) {
    app.innerHTML = `<div class="card locked">${I.lock}<h2 style="margin-top:12px">비공개 글이에요</h2>
      <p class="sub" style="margin:0 0 20px">링크를 알고 들어와도 볼 수 없어요. 실제 사이트에서는 <b>서버가 로그인한 관리자에게만</b> 이 내용을 보내 줍니다 (지금 사이트의 '숨긴 링크로 열람' 문제 해결).</p>
      <a class="btn" href="#/adopt">${esc(t('목록으로'))}</a></div>`;
    return;
  }
  const photos = [...a.photos].sort((x, y) => (y.cover ? 1 : 0) - (x.cover ? 1 : 0));
  const en = lang === 'en';
  let apply;
  if (a.status === '입양 심사 중') apply = `<div class="note"><b>${en ? 'Adoption under review' : '지금 입양 심사가 진행 중이에요.'}</b><br>${en ? 'Applications are paused for now. Please check other friends!' : '심사가 끝날 때까지 새 신청은 잠시 받지 않아요. 다른 친구들도 만나 보세요.'}</div>`;
  else if (a.status === '입양 완료') apply = `<div class="note done"><b>${en ? 'Adopted!' : `${esc(a.name)}는 새 가족을 만났어요.`}</b><br>${en ? 'Thank you for caring.' : '응원해 주신 모든 분께 감사드려요.'}</div>`;
  else apply = `<button class="btn" id="apply" style="width:100%">${esc(t('입양 신청하기'))}</button>
    <p style="margin:10px 0 0;color:var(--muted);font-size:14px;text-align:center">${en ? 'Fostering is also welcome.' : '임시보호 신청도 함께 받고 있어요.'}</p>`;
  app.innerHTML = `<a class="back" href="#/adopt">${I.left}${esc(t('목록으로'))}</a>
    <div class="detail">
      <div class="gallery"><div class="main"><img id="mainimg" src="${srcOf(photos[0])}" alt="${esc(a.name)} 대표 사진"></div>
        <div class="thumbs">${photos.map((p, i) => `<button data-i="${i}" class="${i ? '' : 'on'}" aria-label="사진 ${i + 1}"><img loading="lazy" src="${srcOf(p)}" alt=""></button>`).join('')}</div></div>
      <div class="info">
        <h1>${esc(a.name)} ${badge(a.status)}</h1>
        <div class="facts">
          <div class="fact"><small>${esc(t('구분'))}</small><b>${esc(t(a.species))}</b></div><div class="fact"><small>${esc(t('성별'))}</small><b>${esc(t(a.sex))}</b></div>
          <div class="fact"><small>${esc(t('나이'))}</small><b>${ageTxt(a.age)} ${en ? '(est.)' : '(추정)'}</b></div><div class="fact"><small>${esc(t('체중'))}</small><b>${a.weight}kg</b></div>
        </div>
        <div class="lbl">${esc(t('건강 상태'))}</div><div class="chips">${a.health.map(h => `<span class="chip">${esc(h)}</span>`).join('') || '-'}</div>
        <div class="card applybox">${apply}</div>
      </div></div>
    <div class="sect"><h2>${esc(t('구조 이야기'))}</h2><div class="card story">${esc(a.story)}</div></div>
    ${a.status === '입양 완료' ? `<div class="sect"><h2>${esc(t('입양 후기'))}</h2><div class="card pad" style="color:var(--muted)">${en ? 'The family\'s story and photos will appear here.' : '입양 가족이 보내준 후기와 사진이 이곳에 올라와요. (관리자 화면에서 사진과 글만 넣으면 끝)'}</div></div>` : ''}
    <div class="sect"><h2>${esc(t('보호 기록'))}</h2><div class="card pad"><ul class="timeline">${a.log.map(l => `<li><time>${fmtD(l.at)}</time><b>${esc(t(l.status))}</b></li>`).join('')}</ul></div></div>`;
  $$('.thumbs button').forEach(b => b.onclick = () => { $('#mainimg').src = srcOf(photos[b.dataset.i]); $$('.thumbs button').forEach(x => x.classList.toggle('on', x === b)); });
  $('#apply') && ($('#apply').onclick = () => openApply(a));
}
function openApply(a) {
  const m = document.createElement('div'); m.className = 'modal';
  m.innerHTML = `<div class="card" role="dialog" aria-modal="true" aria-labelledby="mt"><h2 id="mt">${esc(a.name)} 입양 신청</h2>
    <div class="field"><label for="an">신청자 이름</label><input class="inp" id="an" placeholder="예) 김하늘"></div>
    <div class="field"><label for="am">함께 살 가족과 집 환경</label><textarea class="inp" id="am" style="min-height:100px" placeholder="예) 아파트, 가족 3명, 낮에는 재택근무"></textarea></div>
    <div class="tip">실제 사이트에서는 신청 내용이 단체의 <b>구글 시트에 한 줄씩 자동 저장</b>되고 담당자에게 알림이 가요. (데모라 저장되지 않아요)</div>
    <div style="display:flex;gap:8px"><button class="btn ghost" id="mc" style="flex:1">닫기</button><button class="btn" id="ms" style="flex:2">신청 보내기</button></div></div>`;
  document.body.append(m);
  const close = () => m.remove();
  m.onclick = e => e.target === m && close();
  $('#mc', m).onclick = close;
  $('#ms', m).onclick = () => { close(); toast('신청이 접수됐어요 (데모)'); };
  $('#an', m).focus();
}

/* ---------- 관리자: 목록 ---------- */
let qf = '전체', aq = '';
function renderAdmin() {
  const n = f => animals.filter(f).length;
  const F = { '전체': () => true, ...Object.fromEntries(STATUSES.map(s => [s, a => a.status === s])), '숨김': a => !a.public };
  app.innerHTML = `<h1>보호 동물 관리</h1><p class="sub">사진·상태를 바꾸고 저장하면 공개 페이지에 바로 반영돼요.</p>
    <details class="card infocard"><summary>${I.shield} 방문자가 몰려도 안 멈추는 구조</summary><ul>
      <li><b>이미지 자동 최적화</b> — 올릴 때 브라우저가 1600px·WebP로 줄여서 원본의 5~10% 용량</li>
      <li><b>CDN 캐시</b> — 사진과 페이지를 전 세계 캐시 서버가 대신 전달</li>
      <li><b>정적 페이지 생성</b> — 방문자가 몰려도 DB를 매번 조회하지 않음</li>
      <li><b>서버에서 비공개 차단</b> — 숨긴 글은 링크를 알아도 열리지 않음</li></ul></details>
    <div class="toolbar"><div class="qf">${Object.keys(F).map(k => `<button data-f="${k}" class="${qf === k ? 'on' : ''}">${k}<span>${n(F[k])}</span></button>`).join('')}</div>
      <span class="sp"></span><a class="btn" href="#/admin/new">${I.plus}새 동물 등록</a></div>
    <label class="search card" style="margin-bottom:14px;box-shadow:none">${I.search}<input id="aq" type="search" placeholder="이름으로 찾기" value="${esc(aq)}"></label>
    <div class="rows" id="rows"></div>`;
  $$('.qf button').forEach(b => b.onclick = () => { qf = b.dataset.f; renderAdmin(); });
  $('#aq').oninput = e => { aq = e.target.value; rows(); };
  rows();
  function rows() {
    const r = animals.filter(F[qf]).filter(a => !aq || a.name.includes(aq.trim()));
    $('#rows').innerHTML = r.map(a => `<div class="card row">
      <img src="${srcOf(cover(a))}" alt="" loading="lazy">
      <div><div class="nm">${esc(a.name)} ${hasDraft(a.id) ? '<span class="badge s-draft">작성 중</span>' : ''}</div>
        <div class="meta">${esc(a.species)} · ${esc(a.sex)} · ${ageTxt(a.age)} · ${a.weight}kg · 사진 ${a.photos.length}장 · ${fmtD(a.updatedAt)} 수정</div></div>
      <span class="badge st ${ST_CLS[a.status]}">${esc(a.status)}</span>
      <button class="vis ${a.public ? 'pub' : 'hid'}" data-id="${a.id}" title="눌러서 공개/숨김 바꾸기">${a.public ? I.eye + '<span class="t">공개</span>' : I.eyeoff + '<span class="t">숨김</span>'}</button>
      <a class="btn sm ghost edit" href="#/admin/edit/${a.id}">수정하기</a></div>`).join('') || '<div class="empty card">해당하는 동물이 없어요.</div>';
    $$('.vis').forEach(b => b.onclick = () => {
      const a = getA(b.dataset.id); a.public = !a.public; a.updatedAt = new Date().toISOString(); persist();
      toast(a.public ? `${a.name}: 공개했어요` : `${a.name}: 숨겼어요 — 공개 목록에서 사라져요`); renderAdmin();
    });
  }
}

/* ---------- 관리자: 등록/수정 ---------- */
let ed = null, sortable = null, relT;
function blank() { return { id: 'new', name: '', species: '개', sex: '수컷', age: '', weight: '', status: '보호 중', public: false, story: '', health: [], photos: [], log: [{ at: new Date().toISOString(), status: '보호 중' }] }; }
function renderEditor(id) {
  const base = id === 'new' ? blank() : getA(id) && JSON.parse(JSON.stringify(getA(id)));
  if (!base) { location.hash = '#/admin'; return; }
  let saved = null; try { saved = JSON.parse(localStorage.getItem(draftKey(id))); } catch (e) {}
  ed = { id, d: saved?.d || base, at: saved?.at || null };
  const d = ed.d;
  const seg = (k, opts) => `<div class="seg" data-k="${k}">${opts.map(o => `<button type="button" data-v="${o}" class="${d[k] === o ? 'on' : ''}">${o}</button>`).join('')}</div>`;
  app.innerHTML = `<a class="back" href="#/admin">${I.left}동물 목록</a>
    <h1>${id === 'new' ? '새 동물 등록' : esc(d.name) + ' 정보 수정'}</h1>
    <p class="sub">카톡으로 사진 보내듯 올리고, 빈칸만 채우면 돼요. 쓰는 동안 자동으로 저장돼요.</p>
    ${saved ? `<div class="banner">작성하던 내용을 불러왔어요 (${fmtD(saved.at)}). <button id="discard">처음 상태로 되돌리기</button></div>` : ''}
    <div class="editor"><div>
      <section class="card pad" style="margin-bottom:20px"><h2>사진</h2>
        <div class="drop" id="drop">${I.img}<h3>사진을 여기로 끌어다 놓으세요</h3><p>여러 장을 한꺼번에 골라도 돼요</p>
          <button class="btn" type="button" id="pick">${I.plus}사진 고르기</button>
          <input type="file" id="file" accept="image/*" multiple hidden>
          <div class="rules"><span>JPG·PNG·WEBP</span><span>한 장 최대 30MB</span><span>자동으로 1600px · WebP로 최적화</span></div></div>
        <div class="photos" id="photos"></div>
        <div class="phhint" id="phhint">${I.move}끌어서 순서를 바꾸고, ★을 눌러 대표 사진을 정하세요.</div>
      </section>
      <section class="card pad"><h2>기본 정보</h2>
        <div class="field"><label for="f-name">이름</label><input class="inp" id="f-name" data-f="name" value="${esc(d.name)}" placeholder="예) 보리"></div>
        <div class="field"><span class="lbl">구분</span>${seg('species', ['개', '고양이', '기타'])}</div>
        <div class="field"><span class="lbl">성별</span>${seg('sex', ['수컷', '암컷'])}</div>
        <div class="f2">
          <div class="field"><label for="f-age">추정 나이<span class="hint">0.5 = 6개월</span></label><div class="unit"><input class="inp" id="f-age" data-f="age" type="number" inputmode="decimal" min="0" step="0.5" value="${d.age}" placeholder="3"><span>살</span></div></div>
          <div class="field"><label for="f-wt">체중</label><div class="unit"><input class="inp" id="f-wt" data-f="weight" type="number" inputmode="decimal" min="0" step="0.1" value="${d.weight}" placeholder="8.2"><span>kg</span></div></div>
        </div>
        <div class="field"><span class="lbl">건강 상태<span class="hint">해당하는 것을 눌러 주세요</span></span><div class="chips" id="health">${HEALTH.map(h => `<button type="button" class="hchip ${d.health.includes(h) ? 'on' : ''}" data-h="${h}">${h}</button>`).join('')}</div></div>
        <div class="field" style="margin:0"><label for="f-story">구조 이야기<span class="hint">편하게 쓰세요. 줄바꿈 그대로 보여요</span></label>
          <textarea class="inp" id="f-story" data-f="story" placeholder="어디서, 어떻게 구조됐는지, 지금은 어떤 성격인지 적어 주세요.">${esc(d.story)}</textarea></div>
      </section></div>
      <aside class="side">
        <div class="card pad"><button type="button" class="switch" id="pub" role="switch" aria-checked="${d.public}">
          <span class="tr"></span><span><b id="pubt"></b><small id="pubs"></small></span></button></div>
        <div class="card pad"><label class="lbl" for="f-status">입양 상태</label>
          <select class="inp fsel" id="f-status" style="width:100%">${STATUSES.map(s => `<option ${d.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select>
          <p style="font-size:13px;color:var(--muted);margin:8px 0 14px">바꾸면 날짜와 시간이 자동으로 기록돼요.</p>
          <div class="lbl">상태 변경 기록</div><ul class="log" id="log"></ul></div>
      </aside></div>
    <div class="savebar"><span class="saved idle" id="saved"><span class="dot"></span><span id="savedt">아직 변경 없음</span></span><span class="sp"></span>
      ${id !== 'new' ? `<a class="btn sm ghost hide-m" href="#/animal/${id}" target="_blank">미리보기</a>` : ''}
      <button class="btn" id="save">저장하기</button></div>`;

  // 입력 바인딩
  $$('[data-f]').forEach(el => el.oninput = () => { d[el.dataset.f] = el.type === 'number' ? (el.value === '' ? '' : +el.value) : el.value; el.classList.remove('err'); autosave(); });
  $$('.seg').forEach(s => s.onclick = e => { const b = e.target.closest('button'); if (!b) return; d[s.dataset.k] = b.dataset.v; $$('button', s).forEach(x => x.classList.toggle('on', x === b)); autosave(); });
  $('#health').onclick = e => { const b = e.target.closest('.hchip'); if (!b) return; const h = b.dataset.h; d.health = d.health.includes(h) ? d.health.filter(x => x !== h) : [...d.health, h]; b.classList.toggle('on'); autosave(); };
  $('#pub').onclick = () => { d.public = !d.public; pubUI(); autosave(); };
  $('#f-status').onchange = e => { if (e.target.value === d.status) return; d.status = e.target.value; d.log.unshift({ at: new Date().toISOString(), status: d.status }); logUI(true); autosave(); };
  $('#discard') && ($('#discard').onclick = () => { try { localStorage.removeItem(draftKey(id)); } catch (e) {} renderEditor(id); toast('저장된 상태로 되돌렸어요'); });
  $('#save').onclick = save;

  // 사진
  const drop = $('#drop'), file = $('#file');
  $('#pick').onclick = () => file.click();
  file.onchange = () => { addFiles(file.files); file.value = ''; };
  ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', e => addFiles(e.dataTransfer.files));
  $('#photos').onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    const i = +b.closest('.pc').dataset.i;
    if (b.dataset.act === 'star') d.photos.forEach((p, j) => p.cover = j === i);
    if (b.dataset.act === 'del') { const was = d.photos[i].cover; d.photos.splice(i, 1); if (was && d.photos[0]) d.photos[0].cover = true; }
    photosUI(); autosave();
  };
  sortable?.destroy(); sortable = null;
  if (window.Sortable) sortable = Sortable.create($('#photos'), {
    animation: 180, delay: 180, delayOnTouchOnly: true, filter: 'button,.pending', preventOnFilter: false,
    onEnd: ev => { if (ev.oldIndex === ev.newIndex) return; const [m] = d.photos.splice(ev.oldIndex, 1); d.photos.splice(ev.newIndex, 0, m); photosUI(); autosave(); },
  });
  pubUI(); logUI(); photosUI(); savedUI();
  clearInterval(relT); relT = setInterval(savedUI, 15000);

  function pubUI() {
    $('#pub').setAttribute('aria-checked', d.public);
    $('#pubt').textContent = d.public ? '공개 중' : '숨김 (비공개)';
    $('#pubs').textContent = d.public ? '누구나 입양 페이지에서 볼 수 있어요' : '링크를 알아도 볼 수 없어요 (서버에서 차단)';
  }
  function logUI(flash) { $('#log').innerHTML = d.log.map((l, i) => `<li class="${flash && !i ? 'new' : ''}">${badge(l.status)}<time>${fmtD(l.at)}</time></li>`).join(''); }
  function photosUI() {
    $('#photos').innerHTML = d.photos.map((p, i) => p.pending
      ? `<div class="pc pending" data-i="${i}"><div class="im"><div><div class="spin"></div>최적화 중…</div></div><div class="sz">${esc(p.name)}</div></div>`
      : `<div class="pc ${p.cover ? 'cover' : ''}" data-i="${i}"><div class="im"><img src="${srcOf(p)}" alt="사진 ${i + 1}">
        ${p.cover ? '<span class="covertag">대표 사진</span>' : ''}<span class="num">${i + 1}</span></div>
        <div class="acts"><button type="button" data-act="star" class="star ${p.cover ? 'on' : ''}" aria-label="대표 사진으로" title="대표 사진으로">${I.star}</button><button type="button" data-act="del" aria-label="사진 삭제" title="삭제">${I.trash}</button></div>
        <div class="sz">${p.orig ? `원본 <span class="s">${fmtB(p.orig)}</span> → 최적화 <b>${fmtB(p.opt)}</b> (-${Math.max(0, Math.round((1 - p.opt / p.orig) * 100))}%)<br>${p.ow}×${p.oh} → ${p.w}×${p.h} · ${p.fmt}` : '기존 사진'}</div></div>`).join('');
    $('#phhint').style.display = d.photos.length > 1 ? '' : 'none';
  }
  async function addFiles(list) {
    const files = [...list];
    const bad = files.filter(f => !/^image\/(jpeg|png|webp|gif|bmp)$/.test(f.type) || f.size > 30 * 1048576);
    if (bad.length) toast(`${bad.length}개 파일은 사진이 아니거나 너무 커서 건너뛰었어요`);
    for (const f of files.filter(f => !bad.includes(f))) {
      const p = { id: 'p' + Date.now() + Math.random().toString(36).slice(2, 6), pending: true, name: f.name };
      d.photos.push(p); photosUI();
      try { Object.assign(p, await optimize(f)); delete p.pending; delete p.name; if (!d.photos.some(x => x.cover)) p.cover = true; }
      catch (e) { d.photos.splice(d.photos.indexOf(p), 1); toast(`${f.name}: 읽을 수 없는 사진이에요`); }
      photosUI();
    }
    autosave();
  }
  function autosave() {
    ed.at = new Date().toISOString();
    const clean = { ...d, photos: d.photos.filter(p => !p.pending) };
    try { localStorage.setItem(draftKey(id), JSON.stringify({ at: ed.at, d: clean })); ed.err = false; } catch (e) { ed.err = true; }
    savedUI();
  }
  function save() {
    if (!d.name.trim()) { $('#f-name').classList.add('err'); $('#f-name').focus(); toast('이름을 적어 주세요'); return; }
    if (d.photos.some(p => p.pending)) { toast('사진 최적화가 끝나면 저장할 수 있어요'); return; }
    const rec = { ...d, name: d.name.trim(), age: +d.age || 0, weight: +d.weight || 0, updatedAt: new Date().toISOString() };
    if (id === 'new') { rec.id = 'a' + Date.now().toString(36); animals.unshift(rec); } else animals[animals.findIndex(a => a.id === id)] = rec;
    if (!persist()) return;
    try { localStorage.removeItem(draftKey(id)); } catch (e) {}
    location.hash = '#/admin';
    toast(rec.public ? `${rec.name} 저장 완료 — 공개 페이지에 바로 반영됐어요` : `${rec.name} 저장 완료 (숨김 상태)`, rec.public ? ['#/animal/' + rec.id, '보러 가기'] : null);
  }
}
function savedUI() {
  const el = $('#saved'); if (!el || !ed) return;
  if (ed.err) { el.className = 'saved idle'; $('#savedt').textContent = '자동 저장 공간 부족 (데모 한계)'; return; }
  if (!ed.at) return;
  const s = (Date.now() - new Date(ed.at)) / 1000;
  el.className = 'saved';
  $('#savedt').textContent = '자동 저장됨 · ' + (s < 30 ? '방금' : s < 3600 ? Math.round(s / 60) + '분 전' : fmtD(ed.at));
}
async function optimize(file) {
  const bmp = await createImageBitmap(file);
  const s = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * s), h = Math.round(bmp.height * s);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  c.getContext('2d').drawImage(bmp, 0, 0, w, h);
  const blobOf = (type, q) => new Promise(r => c.toBlob(r, type, q));
  let blob = await blobOf('image/webp', 0.8);
  if (!blob || blob.type !== 'image/webp') blob = await blobOf('image/jpeg', 0.82); // 구형 사파리
  const src = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); });
  return { src, orig: file.size, opt: blob.size, ow: bmp.width, oh: bmp.height, w, h, fmt: blob.type.split('/')[1].toUpperCase().replace('JPEG', 'JPG') };
}

/* ---------- 안내 페이지 ---------- */
const PAGES = {
  about: '구조부터 치료, 입양까지 함께하는 단체의 이야기와 활동 원칙을 소개하는 페이지예요.',
  news: '새로 구조한 아이들 소식과 치료 경과를 사진과 함께 올리는 게시판이에요.',
  donate: '정기·일시 후원 안내와 후원금 사용 내역을 보여 주는 페이지예요.',
  volunteer: '봉사 신청·문의 양식이에요. 제출 내용은 구글 시트로 바로 쌓여요.',
  reviews: '입양 가족이 보내준 후기와 근황 사진을 모아 보는 게시판이에요.',
};
function renderPage(k) {
  const name = (MENUS.find(m => m[0] === k) || [])[1];
  if (!name) { location.hash = '#/'; return; }
  app.innerHTML = `<div class="ph-page"><h1>${esc(t(name))}</h1><p class="sub">${PAGES[k]}</p>
    <div class="card pad"><p style="margin:0 0 16px">이 메뉴는 요구사항 확정 후 제작해요. 관리자 화면에서 <b>글과 사진을 같은 방식으로</b> 올리면 됩니다.</p>
    <a class="btn" href="#/adopt">${esc(t('입양·임시보호'))} 보러 가기</a></div></div>`;
}

/* ---------- 라우터 ---------- */
function route_() {
  const parts = location.hash.replace(/^#\/?/, '').split('/');
  const [p, a, b] = parts;
  document.querySelector('.modal')?.remove();
  if (!(p === 'admin' && (a === 'new' || a === 'edit'))) { clearInterval(relT); ed = null; }
  let r = p || 'home';
  if (p === 'admin' && a) r = 'admin-edit';
  header(r === 'page' ? a : r);
  if (r === 'home') renderHome();
  else if (r === 'adopt') renderAdopt();
  else if (r === 'animal') renderDetail(a);
  else if (r === 'admin') renderAdmin();
  else if (r === 'admin-edit') renderEditor(a === 'new' ? 'new' : b);
  else if (r === 'page') renderPage(a);
  else renderHome();
  window.scrollTo(0, 0);
}
load();
document.documentElement.lang = lang;
window.addEventListener('hashchange', route_);
window.addEventListener('dragover', e => e.preventDefault());
window.addEventListener('drop', e => e.preventDefault());
route_();

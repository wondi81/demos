/* 한결한우(가상) 스마트스토어 시안 데모. 상품·가격·문구는 모두 예시이며 체크 상태만 localStorage에 저장된다. */
const $ = (s, el = document) => el.querySelector(s);
const app = $('#app');
const won = n => n.toLocaleString('ko-KR') + '원';

/* 사진 대신 쓰는 마블링: SVG 노이즈를 지방 결처럼 걸러 배경으로 쓴다(외부 파일 없음) */
const marb = (seed, fx = 0.02, fy = 0.07, cut = 8.6) =>
  `url('data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='600' height='600'><filter id='m'><feTurbulence type='fractalNoise' baseFrequency='${fx} ${fy}' numOctaves='4' seed='${seed}'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 .93 0 0 0 0 .9 14 0 0 0 -${cut}'/></filter><rect width='100%' height='100%' filter='url(#m)'/></svg>`).replace(/'/g, '%27')}')`;
const meat = (seed, cls = '', o = {}) =>
  `<div class="ph meat ${cls}" style="--marb:${marb(seed, o.fx, o.fy, o.cut || (cls.includes('pork') ? 9.6 : undefined))}" role="img" aria-label="${o.alt || '고기 사진 자리'}"></div>`;
const box = (name, cls = '') =>
  `<div class="ph box ${cls}" role="img" aria-label="${name} 선물 포장 사진 자리"><span class="lbl">${name}<small>HANGYEOL</small></span></div>`;

const ICON = {
  left: '<svg class="ico" viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
  right: '<svg class="ico" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  snow: '<svg class="ico" viewBox="0 0 24 24"><path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9 4.5l3 2 3-2M9 19.5l3-2 3 2"/></svg>',
  truck: '<svg class="ico" viewBox="0 0 24 24"><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/></svg>',
  gift: '<svg class="ico" viewBox="0 0 24 24"><path d="M4 10h16v10H4zM3 7h18v3H3zM12 7v13M12 7c-2-4-6-3-5 0M12 7c2-4 6-3 5 0"/></svg>',
  flag: '<svg class="ico" viewBox="0 0 24 24"><path d="M5 21V4M5 4h11l-2 4 2 4H5"/></svg>',
};

/* 상품 10종(가상). parts: [부위, 비율, 설명], w: [중량kg, 가격] */
const P = [
  { id: 1, cat: '선물세트', name: '등심·채끝 구이 선물세트', tag: '명절 1순위', seed: 7, parts: [['등심', .5, '마블링이 고른 구이용'], ['채끝', .5, '결이 곱고 담백한 구이용']], w: [[1.2, 189000], [1.6, 249000], [2.0, 309000]] },
  { id: 2, cat: '선물세트', name: '안심·등심 명품 세트', tag: '어른 선물', seed: 11, parts: [['안심', .4, '가장 부드러운 부위'], ['등심', .6, '구이 기본']], w: [[1.2, 229000], [1.6, 299000], [2.0, 369000]] },
  { id: 3, cat: '선물세트', name: '찜갈비 정성 세트', tag: '손질 완료', seed: 19, parts: [['찜갈비', 1, '핏물 빼고 기름 정리해 보냄']], w: [[2.0, 159000], [3.0, 229000]] },
  { id: 4, cat: '선물세트', name: '불고기·국거리 실속 세트', tag: '실속', seed: 23, parts: [['불고기', .5, '얇게 썬 앞다리·우둔'], ['국거리', .5, '양지·사태']], w: [[1.2, 99000], [2.0, 159000]] },
  { id: 5, cat: '구이', name: '차돌·부채살 구이 세트', tag: '캠핑', seed: 31, parts: [['차돌박이', .5, '얇게 말아 슬라이스'], ['부채살', .5, '한 장씩 진공 포장']], w: [[0.8, 79000], [1.2, 115000]] },
  { id: 6, cat: '구이', name: '살치·업진 특수부위 세트', tag: '소량 한정', seed: 41, parts: [['살치살', .5, '한 마리에서 적게 나오는 부위'], ['업진살', .5, '고소한 결']], w: [[0.6, 89000], [1.0, 145000]] },
  { id: 7, cat: '한돈', name: '한돈 삼겹·목살 세트', tag: '한돈', seed: 53, pork: 1, parts: [['삼겹살', .5, '두께 1.5cm'], ['목살', .5, '두께 1.5cm']], w: [[1.0, 39000], [2.0, 72000]] },
  { id: 8, cat: '한돈', name: '한우·한돈 섞어담은 세트', tag: '가족 모임', seed: 61, parts: [['한우 등심', .4, '구이용'], ['한돈 삼겹', .3, '구이용'], ['한돈 목살', .3, '구이용']], w: [[1.5, 109000], [2.4, 169000]] },
  { id: 9, cat: '정기구독', name: '한우 월구독 (월 1회)', tag: '매달 다른 부위', seed: 71, parts: [['이달의 구이 부위', .6, '달마다 바뀜'], ['국거리', .4, '양지·사태']], w: [[1.0, 89000], [1.5, 129000]] },
  { id: 10, cat: '정기구독', name: '한돈 월구독 (월 2회)', tag: '구독', seed: 83, pork: 1, parts: [['삼겹·목살', .7, '격주 발송'], ['앞다리 찌개용', .3, '격주 발송']], w: [[1.0, 49000], [2.0, 92000]] },
];
const CATS = ['전체', '선물세트', '구이', '한돈', '정기구독'];
const thumbOf = p => p.cat === '선물세트' && p.id !== 3 ? box(p.name.split(' ')[0]) : meat(p.seed, p.pork ? 'pork' : '', { alt: p.name + ' 사진 자리' });

let cat = '전체';
const state = { w: 0, q: 1, shot: 0 };

/* ---------- 라우팅 ---------- */
function route() {
  const h = location.hash.slice(1) || 'main';
  const [v, id] = h.split('/');
  document.querySelectorAll('.seg a').forEach(a => a.toggleAttribute('aria-current', false));
  const cur = document.querySelector(`.seg a[data-tab="${v === 'p' ? 'p' : v}"]`);
  if (cur) cur.setAttribute('aria-current', 'page');
  if (v === 'p') { const p = P.find(x => x.id === +id) || P[0]; $('.seg a[data-tab="p"]').href = '#p/' + p.id; detail(p); }
  else if (v === 'todo') todo();
  else storeMain();
  app.firstElementChild?.classList.add('enter');
}
addEventListener('hashchange', () => { route(); scrollTo({ top: 0 }); });

/* ---------- 스토어 메인 ---------- */
function storeMain() {
  app.innerHTML = `<div class="stage">
    <section class="phone" aria-label="스토어 메인 미리보기">
      <div class="s-hero">${meat(5, '', { alt: '대표 등심 단면 사진 자리', fx: .013, fy: .05 })}<div class="shade"></div>
        <div class="txt"><h1>식당에서 매일 손질하던 한우를, 선물 상자에 그대로</h1>
          <p>정육식당 주인이 직접 고르고 손질해 냉장으로 보냅니다.</p>
          <a class="btn light" href="#list">선물세트 보기 <span class="arr">${ICON.right}</span></a></div>
      </div>
      <section class="s-sec story" aria-labelledby="st">
        <h2 id="st">가게 이야기</h2>
        <p class="lead">온라인은 처음이지만, 고기를 보는 눈은 오래됐습니다.</p>
        <div class="story-grid">${meat(13, 'tall', { alt: '숙성고 사진 자리' })}<div class="ph knife" role="img" aria-label="손질 작업대 사진 자리"></div>${box('한결')}</div>
        <ol class="years">
          <li><b>식당 시절</b><span>매일 아침 들어온 고기를 직접 손질해 상에 냈습니다.</span></li>
          <li><b>정육 코너</b><span>단골 손님이 "집에 가져가고 싶다"고 해서 포장 판매를 시작했습니다.</span></li>
          <li><b>지금</b><span>같은 손질 기준으로 선물세트와 월구독을 온라인에 엽니다.</span></li>
        </ol>
      </section>
      <section class="s-sec" id="list" aria-labelledby="lt">
        <h2 id="lt">선물세트 · 구독</h2>
        <p class="lead">상품을 누르면 상세페이지 템플릿으로 바뀝니다.</p>
        <div class="chips" role="group" aria-label="분류">${CATS.map(c => `<button class="chip" aria-pressed="${c === cat}" data-cat="${c}">${c}</button>`).join('')}</div>
        <div class="grid" id="grid"></div>
      </section>
      <footer class="s-foot"><b>한결한우</b><br>가상 업체 · 제안용 시안. 실제 스토어에는 사업자 정보가 스마트스토어 하단에 자동 표시됩니다.</footer>
    </section>
    <aside class="notes" aria-label="시안 설명">
      <h2>스마트스토어 메인을 휴대폰 화면 기준으로 먼저 잡았습니다</h2>
      <p>스마트스토어 방문은 대부분 휴대폰에서 일어나기 때문에, 대표님이 받으실 이미지도 이 폭에서 글자가 읽히는지를 기준으로 만듭니다. 왼쪽 화면은 실제로 눌러볼 수 있습니다.</p>
      <ol>
        <li><span class="k">1</span><div><b>첫 화면 배너</b><span>등심 단면 한 컷과 한 줄 문장. 실제 사진이 오면 이 자리에 들어갑니다.</span></div></li>
        <li><span class="k">2</span><div><b>가게 이야기</b><span>식당 운영 기간과 손질 기준을 짧게. "처음 온라인"이 약점이 아니라 이유가 되도록 씁니다.</span></div></li>
        <li><span class="k">3</span><div><b>세트 목록</b><span>분류 버튼으로 걸러 보세요. 상품을 누르면 상세 템플릿이 열립니다.</span></div></li>
      </ol>
      <p class="callout">스마트스토어는 화면 배치를 자유롭게 바꿀 수 없어서, 실제 납품물은 배너·소개·상세 <b>이미지 원본</b>과 상품 등록입니다. 이 데모는 그 이미지들이 모였을 때의 모습을 미리 보여드리는 용도입니다.</p>
    </aside>
  </div>`;
  drawGrid();
  app.querySelectorAll('.chip').forEach(b => b.onclick = () => {
    cat = b.dataset.cat;
    app.querySelectorAll('.chip').forEach(x => x.setAttribute('aria-pressed', x === b));
    drawGrid();
  });
  $('.s-hero .btn').onclick = e => { e.preventDefault(); $('#list').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); };
}
function drawGrid() {
  const list = P.filter(p => cat === '전체' || p.cat === cat);
  $('#grid').innerHTML = list.length ? list.map((p, i) => `<a class="card ${i === 0 && cat === '전체' ? 'first' : ''}" href="#p/${p.id}">
      ${thumbOf(p)}<div><div class="tg">${p.tag}</div><div class="nm">${p.name}</div>
      <div class="pr num">${won(p.w[0][1])}~</div></div></a>`).join('')
    : '<p class="empty">이 분류에 등록된 상품이 없습니다.</p>';
}

/* ---------- 상세페이지 공통 템플릿 ---------- */
const SHOTS = [
  ['대표 컷', '상자를 연 위에서 45도. 구성 전체가 한 장에 보이게'],
  ['단면 클로즈업', '자른 면을 정면에서. 마블링 결이 보이도록 가까이'],
  ['손질 컷', '도마 위 손질 과정 한 장. 손과 칼만 나오게'],
  ['포장 컷', '아이스팩·보냉 상자 포장 상태. 받는 분이 보는 그대로'],
];
function detail(p) {
  if (state.pid !== p.id) Object.assign(state, { pid: p.id, w: 0, q: 1, shot: 0 });
  const [kg, price] = p.w[state.w];
  const thumbs = [thumbOf(p), meat(p.seed + 2, p.pork ? 'pork fatcap' : 'fatcap', { alt: '단면' }), `<div class="ph knife"></div>`, box('보냉 포장')];
  app.innerHTML = `<div class="stage">
    <section class="phone" aria-label="상세페이지 미리보기">
      <div class="d-top"><a href="#main">${ICON.left}스토어</a>
        <label for="pp">다른 상품</label><select id="pp">${P.map(x => `<option value="${x.id}" ${x.id === p.id ? 'selected' : ''}>${x.name}</option>`).join('')}</select></div>
      <div class="gal"><div class="main" id="gmain">${thumbs[state.shot]}</div>
        <div class="thumbs" role="group" aria-label="사진 선택">${SHOTS.map((s, i) => `<button aria-pressed="${i === state.shot}" aria-label="${s[0]}" data-i="${i}">${thumbs[i]}</button>`).join('')}</div>
        <p class="shot" id="shot"><b>촬영 가이드 · ${SHOTS[state.shot][0]}</b><br>${SHOTS[state.shot][1]}</p></div>
      <div class="buy">
        <div class="tg">${p.cat} · ${p.tag}</div>
        <h1>${p.name}</h1>
        <div class="price num" id="price">${won(price)}<small>${kg}kg 기준</small></div>
        <div class="opt"><span class="lab" id="wl">중량 선택</span>
          <div class="weights" role="group" aria-labelledby="wl">${p.w.map(([k, pr], i) => `<button aria-pressed="${i === state.w}" data-w="${i}"><b class="num">${k}kg</b><span class="num">${won(pr)}</span></button>`).join('')}</div></div>
        <div class="opt"><span class="lab">수량</span><div class="qty"><button aria-label="수량 줄이기" data-q="-1">−</button><output id="q" aria-live="polite">${state.q}</output><button aria-label="수량 늘리기" data-q="1">+</button></div></div>
        <div class="sum"><span>총 상품금액</span><b class="num" id="total">${won(price * state.q)}</b></div>
        <div class="cta2"><button class="btn line" data-act="gift">${ICON.gift}선물하기</button><button class="btn" data-act="buy">구매하기</button></div>
      </div>
      <section class="d-sec head-copy"><h2>${p.name.replace(/ \(.+\)/, '')}</h2><p>식당에서 상에 내던 기준 그대로 손질해, 받는 날 바로 굽거나 끓일 수 있게 보냅니다.</p></section>
      <section class="d-sec" aria-labelledby="ct"><h2 id="ct">이렇게 들어갑니다</h2>
        <p class="lead">위에서 중량을 바꾸면 부위별 무게가 같이 바뀝니다.</p>
        <div class="comp" id="comp"></div></section>
      <section class="d-sec" aria-labelledby="cl"><h2 id="cl">가까이서 보세요</h2>
        <p class="lead">실제 사진으로 바뀌는 자리입니다. 컷마다 각도를 다르게 잡습니다.</p>
        <div class="close"><figure class="w">${meat(p.seed + 5, p.pork ? 'pork' : '', { fx: .014, fy: .05, alt: '단면 클로즈업' })}<figcaption>단면 정면 클로즈업 (가로 컷)</figcaption></figure>
          <figure>${meat(p.seed + 8, p.pork ? 'pork fatcap' : 'fatcap', { alt: '측면' })}<figcaption>측면 45도, 두께가 보이게</figcaption></figure>
          <figure><div class="ph knife" role="img" aria-label="손질 사진 자리"></div><figcaption>손질하는 손</figcaption></figure></div></section>
      <section class="d-sec" aria-labelledby="sh"><h2 id="sh">보관과 배송</h2>
        <div class="ship">
          <div><i>${ICON.snow}</i><p style="margin:0"><b>냉장 상태로 보냅니다</b><span>보냉 상자와 아이스팩으로 포장합니다. 받으시면 바로 냉장 보관해 주세요.</span></p></div>
          <div><i>${ICON.truck}</i><p style="margin:0"><b>출고일·지역 안내</b><span>출고 요일과 도서산간 가능 여부는 대표님 운영 기준에 맞춰 이 자리에 적습니다.</span></p></div>
          <div><i>${ICON.gift}</i><p style="margin:0"><b>선물 포장·메시지</b><span>선물하기 주문은 가격이 보이지 않는 명세서로 동봉하는 방식 등을 함께 정합니다.</span></p></div>
        </div></section>
      <section class="d-sec" aria-labelledby="lb"><h2 id="lb">표시 정보</h2>
        <dl class="info"><dt>원산지</dt><dd>${p.pork ? '국내산(한돈)' : '국내산(한우)'}</dd><dt>등급</dt><dd>상품별 기재</dd><dt>이력번호</dt><dd>${p.pork ? '해당 시 기재' : '상품별 기재'}</dd>
          <dt>중량</dt><dd class="num" id="kg">${kg}kg</dd><dt>포장일·소비기한</dt><dd>출고 상품별 표기</dd><dt>보관방법</dt><dd>냉장(0~4℃ 표기 예시)</dd></dl>
        <p class="note">실제 표기 항목과 문구는 축산물 표시 기준과 스마트스토어 상품정보제공고시를 확인한 뒤 반영합니다. 위 칸은 들어갈 자리를 보여드리는 예시입니다.</p></section>
    </section>
    <aside class="notes" aria-label="시안 설명">
      <h2>상세페이지는 공통 템플릿 하나에 상품별 내용만 바꿔 끼웁니다</h2>
      <p>10종을 따로 디자인하면 같은 비용에서 한 장 한 장의 완성도가 떨어집니다. 틀은 하나로 단단하게 만들고, 사진·구성·중량만 상품마다 바꾸는 방식을 제안드립니다.</p>
      <ol>
        <li><span class="k">1</span><div><b>사진 4컷 자리</b><span>썸네일을 눌러 보세요. 컷마다 필요한 촬영 각도가 아래에 나옵니다.</span></div></li>
        <li><span class="k">2</span><div><b>중량만 다른 상품은 하나로</b><span>1.2·1.6·2.0kg을 옵션으로 묶으면 리뷰와 판매량이 한 상품에 모입니다.</span></div></li>
        <li><span class="k">3</span><div><b>구성 블록이 함께 바뀜</b><span>중량을 고르면 부위별 무게와 금액이 즉시 다시 계산됩니다.</span></div></li>
        <li><span class="k">4</span><div><b>보관·배송·표시 정보</b><span>정육 상품에서 문의가 가장 많은 부분이라 고정 블록으로 넣었습니다.</span></div></li>
      </ol>
    </aside>
  </div>`;
  drawComp(p);
  $('#pp').onchange = e => location.hash = 'p/' + e.target.value;
  app.querySelectorAll('.thumbs button').forEach(b => b.onclick = () => {
    state.shot = +b.dataset.i;
    $('#gmain').innerHTML = thumbs[state.shot];
    app.querySelectorAll('.thumbs button').forEach(x => x.setAttribute('aria-pressed', x === b));
    $('#shot').innerHTML = `<b>촬영 가이드 · ${SHOTS[state.shot][0]}</b><br>${SHOTS[state.shot][1]}`;
  });
  app.querySelectorAll('.weights button').forEach(b => b.onclick = () => {
    state.w = +b.dataset.w;
    app.querySelectorAll('.weights button').forEach(x => x.setAttribute('aria-pressed', x === b));
    updatePrice(p); drawComp(p, true);
  });
  app.querySelectorAll('.qty button').forEach(b => b.onclick = () => {
    state.q = Math.min(20, Math.max(1, state.q + +b.dataset.q));
    $('#q').textContent = state.q; updatePrice(p);
  });
  app.querySelectorAll('[data-act]').forEach(b => b.onclick = () =>
    toast(b.dataset.act === 'gift' ? '데모입니다. 실제 스토어에서는 네이버 선물하기 화면으로 넘어갑니다.' : `데모입니다. ${p.w[state.w][0]}kg × ${state.q}개 주문 화면으로 넘어가는 자리입니다.`));
}
function updatePrice(p) {
  const [kg, price] = p.w[state.w];
  $('#price').innerHTML = `${won(price)}<small>${kg}kg 기준</small>`;
  $('#total').textContent = won(price * state.q);
  $('#kg').textContent = kg + 'kg';
}
function drawComp(p, flash) {
  const kg = p.w[state.w][0];
  $('#comp').innerHTML = p.parts.map(([n, r, d], i) =>
    `<div class="comp-row">${meat(p.seed + i * 3, p.pork || n.includes('한돈') ? 'pork' : '', { alt: n })}<div><b>${n}</b><span>${d}</span></div><div class="g num ${flash ? 'flash' : ''}">${(Math.round(kg * r * 1000 / 50) * 50).toLocaleString()}g</div></div>`).join('');
  if (flash) setTimeout(() => app.querySelectorAll('.comp-row .g').forEach(g => g.classList.remove('flash')), 600);
}

/* ---------- 오픈 체크리스트(3주) ---------- */
const WEEKS = [
  ['1주차 · 기본 세팅과 자료 받기', '10/24(토) ~ 10/30(금)', [
    ['착수 미팅: 상품 10종과 중량 묶음 확정', '이게 정해져야 상품 등록·상세 분량이 정해집니다', '함께'],
    ['사진 원본을 공유 폴더로 전달', '받은 사진을 보고 부족한 컷을 2일 안에 알려드립니다', '대표님'],
    ['스토어 이름·소개글·대표 이미지 입력', '이미 만든 계정에 기본 정보만 채웁니다', '제작'],
    ['배송비·묶음배송·출고지·반품지 설정', '금액과 기준은 대표님이 정하고 입력은 제가 합니다', '함께'],
    ['선물하기·정기구독 등 추가 기능의 사용 조건 확인', '신청이 필요한 항목은 절차를 정리해 같이 진행합니다', '제작'],
  ]],
  ['2주차 · 디자인', '10/31(토) ~ 11/6(금)', [
    ['스토어 메인 배너·가게 이야기 시안 2종', '하나를 고르시면 그 방향으로 다듬습니다', '제작'],
    ['상세페이지 공통 템플릿 시안', '여기서 수정 의견을 모아 한 번에 반영합니다', '제작'],
    ['표시 정보·상품정보제공고시 항목 정리', '원산지·등급·이력번호·보관 문구를 대표님이 확인', '함께'],
    ['대표 상품 3종 상세페이지 완성', '템플릿이 실제 상품에 맞는지 먼저 검증', '제작'],
  ]],
  ['3주차 · 등록과 오픈', '11/7(토) ~ 11/12(목)', [
    ['나머지 7종 상세페이지 완성', '공통 템플릿에 사진·구성만 바꿔 끼웁니다', '제작'],
    ['상품 10종 등록·옵션·재고 입력', '등록 규정에 걸리는 문구가 없는지 함께 점검', '제작'],
    ['테스트 주문 1건으로 주문→발송 처리 연습', '실제 주문이 들어왔을 때 누를 버튼을 같이 확인', '함께'],
    ['오픈, 운영 안내 문서와 이미지 원본 전달', '주문 확인·발송 처리·문의 답변 순서를 한 장으로', '제작'],
  ]],
];
const KEY = 'hanwoo-todo';
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const save = d => { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch {} };
function todo() {
  const done = load();
  const all = WEEKS.flatMap((w, wi) => w[2].map((t, ti) => ({ k: wi + '-' + ti, t })));
  const n = all.filter(x => done[x.k]).length;
  const next = all.find(x => !done[x.k]);
  app.innerHTML = `<div class="todo">
    <div class="todo-head"><div><h1>오픈까지 해야 할 일, 순서대로</h1>
      <p>처음 여는 스토어는 무엇부터 해야 하는지가 가장 막막합니다. 3주를 주 단위로 나누고, 각 일이 왜 그 순서인지와 누가 하는지를 붙였습니다. 체크하면 이 브라우저에 저장됩니다.</p></div>
      <div class="count"><b class="num">${n}/${all.length}</b><span>완료</span></div></div>
    <div class="next" aria-live="polite">${ICON.flag}<div><small>${next ? '지금 할 일' : '모두 끝났습니다'}</small><b>${next ? next.t[0] : '오픈 준비 완료. 첫 주문을 기다리면 됩니다.'}</b></div></div>
    <div class="weeks">${WEEKS.map(([title, dt, tasks], wi) => `<section class="week" aria-labelledby="w${wi}"><h2 id="w${wi}">${title}</h2><p class="dt num">${dt}</p>
      ${tasks.map(([t, why, who], ti) => { const k = wi + '-' + ti; return `<label class="task ${done[k] ? 'done' : ''} ${next && next.k === k ? 'now' : ''}"><input type="checkbox" data-k="${k}" ${done[k] ? 'checked' : ''}><span><b>${t}</b><span class="why">${why}</span><span class="who ${who === '제작' ? 'me' : ''}">${who}</span></span></label>`; }).join('')}
    </section>`).join('')}</div>
    <div class="legend"><span>제작: 제가 진행 · 대표님: 자료나 결정이 필요 · 함께: 미팅에서 같이</span><button class="btn line" id="reset">체크 초기화</button></div>
  </div>`;
  app.querySelectorAll('.task input').forEach(c => c.onchange = () => {
    const d = load(); d[c.dataset.k] = c.checked; save(d); todo();
    $(`.task input[data-k="${c.dataset.k}"]`)?.focus();
  });
  $('#reset').onclick = () => { save({}); todo(); toast('체크를 모두 지웠습니다.'); };
}

let tt;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('on');
  clearTimeout(tt); tt = setTimeout(() => t.classList.remove('on'), 2600);
}
route();

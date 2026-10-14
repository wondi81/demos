// 가상 시뮬레이션: 실제 납품 시 영상=IVS Player, 채팅/이벤트=IVS Chat, 주문/재고=서버 API로 교체
const $ = s => document.querySelector(s);
const won = n => n.toLocaleString('ko-KR') + '원';

const products = [
  { id: 'p1', name: '저자극 수분 크림 50ml', price: 23900, stock: 40, c: '#9FC6B5', opts: ['단품', '1+1'] },
  { id: 'p2', name: '데일리 선크림 SPF50+', price: 18900, stock: 25, c: '#E9C46A', opts: ['50ml', '70ml'] },
  { id: 'p3', name: '클렌징 오일 200ml', price: 21000, stock: 12, c: '#E4A189', opts: ['기본'] },
  { id: 'p4', name: '수분 앰플 30ml', price: 29000, stock: 8, c: '#A9B8D8', opts: ['기본', '대용량'] },
];
const S = { live: true, pinned: 'p1', viewers: 312, t0: Date.now(), orders: [], qty: 1 };
const byId = id => products.find(p => p.id === id);

const NAMES = ['소금빵', '하늘', 'mint', '지니', '오늘도', '봄봄', 'yuna', '도토리', '라떼', '해피'];
const LINES = ['방금 들어왔어요', '발림성 보여주세요', '건성 피부도 괜찮나요?', '1+1 언제까지예요?', '배송 빠른가요', '지난 방송에서 샀는데 좋았어요', '용량 다시 알려주세요', '가격 착하네요', '재고 얼마 남았어요?', '향 있나요?'];
const pick = a => a[Math.floor(Math.random() * a.length)];

function chat(name, text, cls = '') {
  const li = document.createElement('li');
  if (cls) li.className = cls;
  if (name) { const b = document.createElement('b'); b.textContent = name; li.append(b); }
  li.append(text);
  const ol = $('#chat');
  ol.append(li);
  while (ol.children.length > 30) ol.firstElementChild.remove();
}

let toastT;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 1800);
}

function stockLabel(p) {
  if (p.stock <= 0) return '품절';
  if (p.stock <= 5) return `${p.stock}개 남음`;
  return `재고 ${p.stock}`;
}

function renderPin() {
  const p = byId(S.pinned), pin = $('#pin');
  pin.style.display = S.live && p ? '' : 'none';
  if (!p) return;
  pin.disabled = p.stock <= 0;
  pin.setAttribute('aria-label', `${p.name} ${won(p.price)} ${stockLabel(p)} — 구매하기`);
  pin.innerHTML = `<span class="thumb" style="--c:${p.c}"></span>
    <span class="t"><span>${p.name}</span><small class="${p.stock <= 5 ? 'low' : ''}">${won(p.price)} · ${stockLabel(p)}</small></span>
    <span class="go">${p.stock <= 0 ? '품절' : '구매하기'}</span>`;
}

function renderList() {
  $('#plist').innerHTML = products.map(p => {
    const tag = p.stock <= 0 ? '<span class="tag out">품절</span>'
      : p.id === S.pinned ? '<span class="tag now">방송 중 소개</span>'
      : p.stock <= 5 ? '<span class="tag low">마감 임박</span>' : '';
    return `<li class="${p.id === S.pinned ? 'now' : ''}"><span class="thumb" style="--c:${p.c}"></span>
      <span class="info"><b>${p.name}</b><span>${won(p.price)} · ${stockLabel(p)}</span></span>${tag}</li>`;
  }).join('');

  $('#alist').innerHTML = products.map((p, i) => `<li data-id="${p.id}">
    <span class="thumb" style="--c:${p.c}"></span>
    <span class="nm"><b>${i + 1}. ${p.name}</b><span>${won(p.price)} · ${stockLabel(p)}</span></span>
    <span class="ctrls">
      <button class="sbtn" data-act="up" aria-label="${p.name} 위로" ${i === 0 ? 'disabled' : ''}>↑</button>
      <button class="sbtn" data-act="down" aria-label="${p.name} 아래로" ${i === products.length - 1 ? 'disabled' : ''}>↓</button>
      <label class="sr" for="st-${p.id}">${p.name} 재고</label>
      <input id="st-${p.id}" type="number" min="0" inputmode="numeric" value="${p.stock}" data-act="stock">
      <button class="sbtn ${p.id === S.pinned ? 'on' : ''}" data-act="pin" aria-pressed="${p.id === S.pinned}">${p.id === S.pinned ? '노출 중' : '지금 노출'}</button>
    </span></li>`).join('');
}

function renderStats() {
  const v = S.live ? S.viewers : 0;
  $('#viewers').textContent = '시청 ' + v.toLocaleString('ko-KR');
  $('#sViewers').textContent = v.toLocaleString('ko-KR');
  $('#sOrders').textContent = S.orders.length;
  $('#sSales').textContent = won(S.orders.reduce((a, o) => a + o.total, 0));
  $('#orders').innerHTML = S.orders.length
    ? S.orders.slice(-8).reverse().map(o => `<li><span>${o.who} · ${o.name} ×${o.qty}</span><span>${won(o.total)} <time>${o.at}</time></span></li>`).join('')
    : '<li class="empty">아직 주문이 없습니다</li>';
}

function renderLive() {
  $('#stage').classList.toggle('on', S.live);
  $('#liveBadge').textContent = S.live ? 'LIVE' : 'OFF';
  $('#toggleLive').textContent = S.live ? '방송 종료' : '방송 시작';
  $('#toggleLive').classList.toggle('stop', S.live);
  $('#aStatus').textContent = S.live ? '송출 중 · 시청자 화면에 실시간 반영' : '대기 중 · 시청자에게 준비 화면 표시';
  $('#sayInput').disabled = !S.live;
  renderPin();
}

const renderAll = () => { renderLive(); renderList(); renderStats(); };

// 주문 처리 — 재고가 부족하면 거절 (서버에서는 트랜잭션으로 같은 검사)
function order(p, qty, who, opt) {
  if (p.stock < qty) return false;
  p.stock -= qty;
  const d = new Date();
  S.orders.push({ who, name: p.name + (opt && opt !== '기본' ? `(${opt})` : ''), qty, total: p.price * qty, at: d.toTimeString().slice(0, 5) });
  if (p.stock === 0) chat('', `${p.name} 품절되었습니다`, 'sys');
  renderAll();
  if (!$('#sheet').hidden && sheetP === p) fillSheet();
  return true;
}

// 구매 시트
let sheetP = null;
function fillSheet() {
  const p = sheetP;
  $('#sheetThumb').style.setProperty('--c', p.c);
  $('#sheetTitle').textContent = p.name;
  $('#sheetPrice').textContent = won(p.price);
  $('#sheetStock').textContent = stockLabel(p);
  S.qty = Math.max(1, Math.min(S.qty, p.stock || 1));
  $('#qty').textContent = S.qty;
  const btn = $('#buyBtn');
  btn.disabled = p.stock <= 0;
  btn.textContent = p.stock <= 0 ? '품절' : `${won(p.price * S.qty)} 결제하기`;
}
function openSheet() {
  sheetP = byId(S.pinned);
  if (!sheetP || sheetP.stock <= 0) return;
  S.qty = 1;
  $('#opts').innerHTML = '<legend>옵션</legend>' + sheetP.opts.map((o, i) =>
    `<label><input type="radio" name="opt" value="${o}" ${i ? '' : 'checked'}>${o}</label>`).join('');
  fillSheet();
  $('#sheet').hidden = $('#sheetBg').hidden = false;
  $('#sheetClose').focus();
}
function closeSheet() {
  $('#sheet').hidden = $('#sheetBg').hidden = true;
  $('#pin').focus();
}

$('#pin').addEventListener('click', openSheet);
$('#sheetClose').addEventListener('click', closeSheet);
$('#sheetBg').addEventListener('click', closeSheet);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#sheet').hidden) closeSheet(); });
$('#qMinus').addEventListener('click', () => { S.qty = Math.max(1, S.qty - 1); fillSheet(); });
$('#qPlus').addEventListener('click', () => { S.qty = Math.min(sheetP.stock, S.qty + 1); fillSheet(); });
$('#buyBtn').addEventListener('click', () => {
  const opt = document.querySelector('input[name=opt]:checked')?.value;
  if (!order(sheetP, S.qty, '나', opt)) { toast('재고가 부족합니다'); fillSheet(); return; }
  closeSheet();
  toast('결제 완료 · 방송은 계속됩니다');
  chat('나', `${sheetP.name} 구매했어요`, 'me');
});

$('#sayForm').addEventListener('submit', e => {
  e.preventDefault();
  const v = $('#sayInput').value.trim();
  if (!v || !S.live) return;
  chat('나', v, 'me');
  $('#sayInput').value = '';
});

// 탭
const tabs = { viewer: $('#tab-viewer'), admin: $('#tab-admin') };
function show(name) {
  for (const k in tabs) {
    tabs[k].setAttribute('aria-selected', k === name);
    $('#' + k).hidden = k !== name;
  }
  try { history.replaceState(null, '', name === 'admin' ? '#admin' : location.pathname); } catch (e) {}
}
tabs.viewer.addEventListener('click', () => show('viewer'));
tabs.admin.addEventListener('click', () => show('admin'));

// 관리자
$('#toggleLive').addEventListener('click', () => {
  S.live = !S.live;
  if (S.live) { S.t0 = Date.now(); chat('', '방송이 시작되었습니다', 'sys'); }
  else if (!$('#sheet').hidden) closeSheet();
  renderAll();
});
$('#alist').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  const id = b.closest('li').dataset.id, i = products.findIndex(p => p.id === id);
  if (b.dataset.act === 'up' && i > 0) [products[i - 1], products[i]] = [products[i], products[i - 1]];
  if (b.dataset.act === 'down' && i < products.length - 1) [products[i + 1], products[i]] = [products[i], products[i + 1]];
  if (b.dataset.act === 'pin') { S.pinned = id; chat('', `지금 소개: ${byId(id).name}`, 'sys'); }
  renderAll();
  const again = document.querySelector(`#alist li[data-id="${id}"] [data-act="${b.dataset.act}"]`);
  (again && !again.disabled ? again : document.querySelector(`#st-${id}`)).focus();
});
$('#alist').addEventListener('change', e => {
  if (e.target.dataset.act !== 'stock') return;
  const p = byId(e.target.closest('li').dataset.id);
  p.stock = Math.max(0, parseInt(e.target.value, 10) || 0);
  renderAll();
});

// 가상 시청자 흐름: 채팅 유입 · 다른 시청자 주문 · 시청자 수 변동
setInterval(() => { if (S.live) chat(pick(NAMES), pick(LINES)); }, 1600);
setInterval(() => {
  if (!S.live) return;
  const p = byId(S.pinned);
  if (p && p.stock > 0 && Math.random() < .6) {
    const who = pick(NAMES);
    if (order(p, 1, who)) chat('', `${who}님이 ${p.name} 구매`, 'sys');
  }
}, 4200);
setInterval(() => {
  if (S.live) S.viewers = Math.max(80, S.viewers + Math.round((Math.random() - .4) * 12));
  const s = S.live ? Math.floor((Date.now() - S.t0) / 1000) : 0;
  $('#elapsed').textContent = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  renderStats();
}, 1000);

['방송 시작했어요! 오늘 수분 라인 소개합니다', '하늘님 반가워요'].forEach((t, i) => chat(i ? '하늘' : '진행자', t));
if (location.hash === '#admin') show('admin');
renderAll();

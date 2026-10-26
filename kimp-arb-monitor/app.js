'use strict';
// 가상 시세 시뮬레이터. 실제 거래소 API 호출 없음.
const $ = id => document.getElementById(id);
const COINS = [
  { s: 'BTC',  n: '비트코인',   p: 67250,  vol: .0007, base: 2.1, amp: 1.2, per: 140 },
  { s: 'ETH',  n: '이더리움',   p: 3480,   vol: .0009, base: 1.9, amp: 1.3, per: 110 },
  { s: 'XRP',  n: '리플',       p: 0.6142, vol: .0013, base: 2.4, amp: 1.5, per: 90 },
  { s: 'SOL',  n: '솔라나',     p: 164.3,  vol: .0014, base: 1.5, amp: 1.4, per: 120 },
  { s: 'DOGE', n: '도지코인',   p: 0.1583, vol: .0016, base: 1.8, amp: 1.6, per: 80 },
  { s: 'ADA',  n: '에이다',     p: 0.4471, vol: .0012, base: -0.1, amp: 1.1, per: 100 },
];
const FUND_TICKS = 30; // 8시간 펀딩 주기를 데모용 30초로 압축

const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const won = (x, d = 0) => (x < 0 ? '-' : '') + Math.abs(x).toLocaleString('ko-KR', { minimumFractionDigits: d, maximumFractionDigits: d });
const signed = x => (x > 0 ? '+' : '') + won(Math.round(x)) + '원';
const pct = x => (x > 0 ? '+' : '') + (x * 100).toFixed(2) + '%';
const krwP = x => x >= 1000 ? won(Math.round(x)) : x >= 100 ? won(x, 1) : won(x, 2);
const usdP = x => x >= 1000 ? won(x, 1) : x >= 10 ? x.toFixed(2) : x.toFixed(4);
const hhmmss = d => d.toTimeString().slice(0, 8);

let S;
function cfg() {
  const v = id => parseFloat($(id).value);
  const n = (id, d) => Number.isFinite(v(id)) ? v(id) : d;
  return {
    entry: n('sEntry', .6) / 100, exit: n('sExit', 2.2) / 100,
    rEntry: n('sREntry', 3.2) / 100, rExit: n('sRExit', 1.6) / 100, rev: $('sRev').checked,
    amt: Math.max(100000, n('sAmt', 3e6)), max: Math.max(1, Math.round(n('sMax', 3))),
    slip: Math.max(0, n('sSlip', .03)) / 100, loss: Math.max(0, n('sLoss', 150000)),
    feeU: Math.max(0, n('sFeeU', .05)) / 100, feeB: Math.max(0, n('sFeeB', .06)) / 100,
  };
}

function reset() {
  S = {
    t: 0, rate: 1391.6, realized: 0, series: [0], trades: 0, cleanups: 0,
    halted: false, maintUntil: -1, forceOneLeg: false,
    coins: COINS.map(c => ({ ...c, bg: c.p, k: (c.base + c.amp * Math.sin(Math.random() * 6)) / 100, ph: Math.random() * 6, fr: .0001, prevUp: 0 })),
    pos: [],
  };
  $('log').innerHTML = '<li><span class="empty-log">시세를 받는 중입니다. 조건에 닿으면 체결 내역이 여기에 쌓입니다.</span></li>';
  $('tg').innerHTML = '';
  tg('모의 모드로 시작했습니다. 실제 주문은 나가지 않습니다.');
  setHalt(false);
  render();
}

const upPrice = c => c.bg * S.rate * (1 + c.k);

function step() {
  S.t++;
  S.rate += (1391.6 - S.rate) * .02 + gauss() * .35;
  for (const c of S.coins) {
    c.bg *= 1 + gauss() * c.vol;
    const target = (c.base + c.amp * Math.sin(S.t / c.per * 2 * Math.PI + c.ph)) / 100;
    c.k += (target - c.k) * .12 + gauss() * .0009 + (Math.random() < .006 ? gauss() * .008 : 0);
    if (S.t % FUND_TICKS === 0) c.fr = Math.max(-.0003, Math.min(.0006, .0001 + gauss() * .00012));
  }
  if (S.t % FUND_TICKS === 0) fund();
  trade();
}

// 펀딩비: 숏은 펀딩비가 양수일 때 받고, 롱은 낸다.
function fund() {
  for (const p of S.pos) {
    const c = S.coins.find(x => x.s === p.s);
    const amt = p.qty * c.bg * c.fr * S.rate * (p.dir === 'fwd' ? 1 : -1);
    p.funding += amt;
    log('fund', '펀딩', `${p.s} ${p.dir === 'fwd' ? '숏' : '롱'} 펀딩비 ${(c.fr * 100).toFixed(4)}% → ${signed(amt)}`);
  }
}

// 지금 청산했을 때의 순손익 (수수료 4회·슬리피지·펀딩 반영)
function closeValue(p, c, k) {
  const sgn = p.dir === 'fwd' ? 1 : -1;
  const up = c.bg * S.rate * (1 + c.k);
  const upExit = up * (1 - sgn * k.slip);
  const bgExit = c.bg * (1 + sgn * k.slip);
  const upLeg = sgn * p.qty * (upExit - p.upIn);
  const bgLeg = sgn * p.qty * (p.bgIn - bgExit) * S.rate;
  const fees = p.feeIn + p.qty * upExit * k.feeU + p.qty * bgExit * k.feeB * S.rate;
  return upLeg + bgLeg - fees + p.funding;
}

function open(c, dir, k) {
  const sgn = dir === 'fwd' ? 1 : -1;
  const up = upPrice(c);
  const upIn = up * (1 + sgn * k.slip), bgIn = c.bg * (1 - sgn * k.slip);
  const qty = k.amt / upIn;
  const feeU = k.amt * k.feeU;
  const legA = dir === 'fwd' ? '업비트 현물 매수' : '업비트 보유분 매도';
  const legB = dir === 'fwd' ? '비트겟 선물 숏' : '비트겟 선물 롱';
  if (S.forceOneLeg || Math.random() < .03) {
    S.forceOneLeg = false;
    // 비트겟 주문 실패 → 업비트 체결분 즉시 반대 주문
    const back = up * (1 - sgn * k.slip);
    const loss = sgn * qty * (back - upIn) - feeU - qty * back * k.feeU;
    book(loss); S.cleanups++;
    log('warn', '정리', `${c.s} ${legA} 체결, ${legB} 거부(증거금·API 오류 가정) → 업비트 즉시 반대 주문 ${signed(loss)}`);
    tg(`[한쪽 체결] ${c.s} ${legB} 실패. 업비트 체결분 즉시 정리 완료 (${signed(loss)})`);
    return;
  }
  S.pos.push({ s: c.s, dir, qty, upIn, bgIn, kIn: c.k, feeIn: feeU + qty * bgIn * k.feeB * S.rate, funding: 0, t0: S.t });
  S.trades++;
  log('in', '진입', `${c.s} 김프 ${pct(c.k)} · ${legA} ${krwP(upIn)}원 + ${legB} ${usdP(bgIn)} USDT · 수량 ${qty.toPrecision(5)}`);
  tg(`[진입] ${c.s} ${dir === 'fwd' ? '매수·숏' : '매도·롱'} 김프 ${pct(c.k)} · ${won(k.amt)}원`);
}

function close(p, c, k, why) {
  const v = closeValue(p, c, k);
  S.pos.splice(S.pos.indexOf(p), 1);
  book(v);
  log(why ? 'warn' : 'out', '청산', `${p.s} 김프 ${pct(p.kIn)} → ${pct(c.k)} · 양쪽 청산 순손익 ${signed(v)}${why ? ' (' + why + ')' : ''}`);
  if (!why) tg(`[청산] ${p.s} ${pct(p.kIn)} → ${pct(c.k)} · 순손익 ${signed(v)}`);
}

function book(v) { S.realized += v; }

function trade() {
  const k = cfg();
  for (const p of [...S.pos]) {
    const c = S.coins.find(x => x.s === p.s);
    if (p.dir === 'fwd' ? c.k >= k.exit : c.k <= k.rExit) close(p, c, k);
  }
  if (!S.halted && S.realized <= -k.loss) haltAll(k, `누적 손실 ${signed(S.realized)}이 한도 -${won(k.loss)}원에 닿음`);
  const maint = S.t < S.maintUntil;
  if (S.halted || maint) return;
  for (const c of S.coins) {
    if (S.pos.length >= k.max) break;
    if (S.pos.some(p => p.s === c.s)) continue;
    if (c.k <= k.entry) open(c, 'fwd', k);
    else if (k.rev && c.k >= k.rEntry) open(c, 'rev', k);
  }
}

function haltAll(k, why) {
  for (const p of [...S.pos]) close(p, S.coins.find(x => x.s === p.s), k, '손실 한도 정리');
  setHalt(true);
  log('warn', '중지', `${why}. 전 포지션 정리, 신규 진입 중단`);
  tg(`[중지] ${why}. 전 포지션 정리 후 신규 진입을 멈췄습니다. 재개는 직접 확인 후.`);
}

function setHalt(h) {
  S.halted = h;
  $('modeChip').textContent = h ? '손실 한도 중지' : '모의 모드';
  $('modeChip').classList.toggle('halt', h);
}

let logFirst = true;
function log(cls, tag, msg) {
  const ul = $('log');
  if (logFirst) { ul.innerHTML = ''; logFirst = false; }
  const li = document.createElement('li');
  li.className = cls + ' fresh';
  li.innerHTML = `<time>${hhmmss(new Date())}</time><span><b>${tag}</b> ${msg}</span>`;
  ul.prepend(li);
  while (ul.children.length > 60) ul.lastChild.remove();
}
function tg(msg) {
  const ol = $('tg');
  const li = document.createElement('li');
  li.innerHTML = `<small>KimpBot · ${hhmmss(new Date())}</small>${msg}`;
  ol.prepend(li);
  while (ol.children.length > 20) ol.lastChild.remove();
}

function render() {
  const k = cfg();
  const maint = S.t < S.maintUntil;
  $('clock').textContent = '갱신 ' + hhmmss(new Date());
  $('kRate').textContent = S.rate.toFixed(1) + '원';
  const pnl = $('kPnl'); pnl.textContent = signed(S.realized); pnl.className = S.realized >= 0 ? 'pos-v' : 'neg-v';
  let unreal = 0;
  const rows = S.pos.map(p => {
    const c = S.coins.find(x => x.s === p.s);
    const v = closeValue(p, c, k); unreal += v;
    const age = S.t - p.t0;
    return `<tr><td class="coin">${p.s}</td><td><span class="tag ${p.dir === 'fwd' ? 'hold' : 'rev'}">${p.dir === 'fwd' ? '현물 매수 · 선물 숏' : '현물 매도 · 선물 롱'}</span></td>
      <td>${pct(p.kIn)}</td><td>${pct(c.k)}</td><td>${p.qty.toPrecision(5)}</td><td class="${p.funding >= 0 ? 'pos-v' : 'neg-v'}">${signed(p.funding)}</td>
      <td class="${v >= 0 ? 'pos-v' : 'neg-v'}">${signed(v)}</td><td>${Math.floor(age / 60)}분 ${age % 60}초</td></tr>`;
  });
  $('pos').innerHTML = rows.join('') || '<tr class="empty"><td colspan="8">보유 포지션이 없습니다. 김프가 진입값에 닿으면 자동으로 생깁니다.</td></tr>';
  const un = $('kUnreal'); un.textContent = signed(unreal); un.className = unreal >= 0 ? 'pos-v' : 'neg-v';
  $('kPos').textContent = `${S.pos.length} / ${k.max}`;
  $('posCount').textContent = S.pos.length + '개';
  $('kTrades').textContent = `${S.trades} / ${S.cleanups}`;

  $('board').innerHTML = S.coins.map(c => {
    const up = upPrice(c);
    const held = S.pos.find(p => p.s === c.s);
    let st = '<span class="tag">대기</span>';
    if (held) st = `<span class="tag ${held.dir === 'fwd' ? 'hold' : 'rev'}">보유 중</span>`;
    else if (maint) st = '<span class="tag">점검 정지</span>';
    else if (c.k <= k.entry + .003 || (k.rev && c.k >= k.rEntry - .003)) st = '<span class="tag near">진입 임박</span>';
    const fl = c.prevUp ? (up > c.prevUp ? 'flash-up' : up < c.prevUp ? 'flash-dn' : '') : '';
    c.prevUp = up;
    const kc = c.k >= k.rEntry ? 'hi' : c.k <= k.entry ? 'lo' : '';
    return `<tr><td class="coin">${c.s}<small>${c.n}</small></td><td class="${fl}">${krwP(up)}</td><td>${usdP(c.bg)}</td>
      <td>${krwP(c.bg * S.rate)}</td><td class="kp ${kc}">${pct(c.k)}</td><td>${st}</td></tr>`;
  }).join('');

  const rt = k.feeU * 2 + k.feeB * 2 + k.slip * 4;
  $('costLine').innerHTML = `왕복 비용 약 <b>${(rt * 100).toFixed(2)}%</b> (수수료 4회 + 슬리피지 4회). 매수·숏을 김프 ${pct(k.entry)}에 잡아 ${pct(k.exit)}에 닫으면 차이 <b>${((k.exit - k.entry) * 100).toFixed(2)}%p</b>, 1회 ${won(k.amt)}원 기준 펀딩 전 예상 순이익 약 <b>${signed(k.amt * (k.exit - k.entry - rt))}</b>.`;

  const ss = $('safeStatus');
  ss.textContent = S.halted ? '손실 한도 중지' : maint ? `업비트 점검 정지 (${S.maintUntil - S.t}초)` : '정상 감시 중';
  ss.className = 'status' + (S.halted ? ' bad' : maint ? ' warn' : '');
  drawChart();
}

function drawChart() {
  const cv = $('chart'), box = cv.parentElement;
  const dpr = window.devicePixelRatio || 1, w = box.clientWidth, h = box.clientHeight;
  if (cv.width !== w * dpr || cv.height !== h * dpr) { cv.width = w * dpr; cv.height = h * dpr; }
  const g = cv.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);
  const d = S.series.slice(-600);
  const lo = Math.min(0, ...d), hi = Math.max(0, ...d), span = (hi - lo) || 1;
  const pad = { l: 8, r: 70, t: 12, b: 18 };
  const X = i => pad.l + (w - pad.l - pad.r) * (d.length < 2 ? 1 : i / (d.length - 1));
  const Y = v => pad.t + (h - pad.t - pad.b) * (1 - (v - lo) / span);
  g.font = '11px "JetBrains Mono", monospace'; g.textBaseline = 'middle';
  g.strokeStyle = 'rgba(214,226,235,.18)'; g.setLineDash([3, 4]); g.lineWidth = 1;
  g.beginPath(); g.moveTo(pad.l, Y(0)); g.lineTo(w - pad.r, Y(0)); g.stroke(); g.setLineDash([]);
  g.fillStyle = '#7f8c97'; g.fillText('0', w - pad.r + 8, Y(0));
  if (hi > 0) g.fillText(won(Math.round(hi)), w - pad.r + 8, Y(hi));
  if (lo < 0) g.fillText(won(Math.round(lo)), w - pad.r + 8, Y(lo));
  const last = d[d.length - 1];
  const col = last >= 0 ? '#3fbf8f' : '#ef6a5b';
  g.beginPath(); d.forEach((v, i) => i ? g.lineTo(X(i), Y(v)) : g.moveTo(X(i), Y(v)));
  g.strokeStyle = col; g.lineWidth = 1.8; g.lineJoin = 'round'; g.stroke();
  g.lineTo(X(d.length - 1), Y(0)); g.lineTo(X(0), Y(0)); g.closePath();
  g.fillStyle = last >= 0 ? 'rgba(63,191,143,.1)' : 'rgba(239,106,91,.1)'; g.fill();
  g.fillStyle = col; g.beginPath(); g.arc(X(d.length - 1), Y(last), 3, 0, 7); g.fill();
  if (d.length < 3) { g.fillStyle = '#7f8c97'; g.textAlign = 'center'; g.fillText('첫 청산 후 그려집니다', (w - pad.r) / 2, h / 2 - 20); g.textAlign = 'left'; }
}

// 실행 루프: 1초마다 1틱, 10배속이면 1초에 10틱
let speed = 1, running = true;
setInterval(() => {
  if (!running) return;
  for (let i = 0; i < speed; i++) { step(); S.series.push(S.realized); }
  if (S.series.length > 2000) S.series.splice(0, S.series.length - 2000);
  render();
}, 1000);

$('runBtn').onclick = e => { running = !running; e.target.textContent = running ? '일시정지' : '재개'; e.target.setAttribute('aria-pressed', running); };
$('resetBtn').onclick = () => { logFirst = true; reset(); };
document.querySelectorAll('[data-speed]').forEach(b => b.onclick = () => {
  speed = +b.dataset.speed;
  document.querySelectorAll('[data-speed]').forEach(x => x.setAttribute('aria-checked', x === b));
});
$('setForm').addEventListener('input', render);
$('setForm').addEventListener('submit', e => e.preventDefault());
document.querySelectorAll('[data-sim]').forEach(b => b.onclick = () => {
  const k = cfg(), m = b.dataset.sim;
  if (m === 'oneleg') {
    S.forceOneLeg = true;
    const c = S.coins.find(x => !S.pos.some(p => p.s === x.s));
    if (c && !S.halted) open(c, 'fwd', k); else S.forceOneLeg = false;
  } else if (m === 'maint') {
    S.maintUntil = S.t + 20;
    log('warn', '정지', '업비트 점검 공지 감지(가정). 20초간 신규 진입 정지, 보유 포지션은 청산 조건만 감시');
    tg('[점검] 업비트 점검 감지. 신규 진입을 멈췄습니다. 점검 해제 확인 후 자동 재개.');
  } else if (m === 'loss') {
    if (!S.halted) haltAll(k, '손실 한도 시험 버튼(강제 발동)');
  }
  render();
});
window.addEventListener('resize', drawChart);

reset();

// 자가 점검: 김프·가격 변화 없이 즉시 청산하면 순손익 = -(수수료 4회 + 슬리피지) 로 음수여야 한다.
(() => {
  const k = { slip: .0003, feeU: .0005, feeB: .0006, amt: 1e6 };
  const c = { bg: 100, k: .02 }; const save = S.rate; S.rate = 1400;
  const up = c.bg * S.rate * (1 + c.k), upIn = up * (1 + k.slip), qty = k.amt / upIn, bgIn = c.bg * (1 - k.slip);
  const p = { dir: 'fwd', qty, upIn, bgIn, funding: 0, feeIn: k.amt * k.feeU + qty * bgIn * k.feeB * S.rate };
  const v = closeValue(p, c, k);
  const expect = -k.amt * (k.feeU * 2 + k.feeB * 2 * (1 / 1.02) + k.slip * 2 + k.slip * 2 / 1.02);
  console.assert(v < 0 && Math.abs(v - expect) < k.amt * 2e-5, 'closeValue 비용 계산 오류', v, expect);
  S.rate = save;
})();

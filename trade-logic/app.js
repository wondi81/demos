'use strict';
/* 단계 엔진 데모 — 모든 데이터는 시드 기반 가상 데이터, 주문은 모의 기록일 뿐 */

const STAGES = [
  { name: '대기', color: '#8a94a6' },
  { name: '1차 진입', color: '#2dd4bf' },
  { name: '추세 확인', color: '#38bdf8' },
  { name: '2차 진입', color: '#a78bfa' },
  { name: '부분 청산', color: '#fbbf24' },
  { name: '전량 청산', color: '#84cc16' },
  { name: '손실 방어', color: '#fb7185' },
];

const RULES = [
  { id: 'R1', from: 0, to: 1, txt: p => `단기MA(${p.fast})가 장기MA(${p.slow}) 상향 돌파` },
  { id: 'R2', from: 1, to: 2, txt: p => `진입가 대비 +${p.confirm}% & 단기MA 상승` },
  { id: 'R3', from: 1, to: 6, txt: p => `진입가 대비 -${p.stop}% 이탈` },
  { id: 'R4', from: 2, to: 3, txt: p => `고점 대비 -${p.pullback}% 되돌림 & 장기MA 위` },
  { id: 'R5', from: 2, to: 5, txt: () => `단기MA가 장기MA 하향 이탈(추세 붕괴)` },
  { id: 'R6', from: 3, to: 4, txt: p => `2차 진입가 대비 +${p.take}%` },
  { id: 'R7', from: 3, to: 6, txt: p => `2차 진입가 대비 -${p.stop}% 이탈` },
  { id: 'R8', from: 4, to: 5, txt: p => `고점 대비 -${p.pullback}% 또는 추세 붕괴` },
];

const BASE_QTY = 100, COOLDOWN = 5, N_BARS = 320;

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function genBars(seed, n = N_BARS) {
  const r = rng(seed), ph = r() * 6.28, ph2 = r() * 6.28;
  const g = () => r() + r() + r() + r() + r() + r() - 3;
  const bars = [];
  let c = 100;
  for (let i = 0; i < n; i++) {
    const o = c;
    const drift = 0.0012 * Math.sin(i / 21 + ph) + 0.0005 * Math.sin(i / 6.3 + ph2);
    c = o * (1 + drift + g() * 0.0026);
    const h = Math.max(o, c) * (1 + Math.abs(g()) * 0.0011);
    const l = Math.min(o, c) * (1 - Math.abs(g()) * 0.0011);
    bars.push({ o, h, l, c });
  }
  return bars;
}

function sma(xs, n) {
  const out = new Array(xs.length).fill(null);
  let s = 0;
  for (let i = 0; i < xs.length; i++) {
    s += xs[i];
    if (i >= n) s -= xs[i - n];
    if (i >= n - 1) out[i] = s / n;
  }
  return out;
}

function simulate(bars, p) {
  const closes = bars.map(b => b.c);
  const fast = sma(closes, p.fast), slow = sma(closes, p.slow);
  let st = 0, qty = 0, avg = 0, entry = 0, entry2 = 0, peak = 0, cool = 0, realized = 0;
  const per = [], events = [], fills = [];

  for (let i = 0; i < bars.length; i++) {
    const c = bars[i].c;
    if (st === 5 || st === 6) st = 0; // 청산 다음 봉에 대기 복귀
    const ready = i > 0 && fast[i - 1] != null && slow[i - 1] != null;
    const buy = (q, label) => { avg = (avg * qty + c * q) / (qty + q); qty += q; fills.push({ i, side: '매수', q, price: c, label }); };
    const sell = (q, label) => { realized += (c - avg) * q; qty -= q; if (!qty) avg = 0; fills.push({ i, side: '매도', q, price: c, label }); };
    const go = (to, rule, action) => { events.push({ i, rule, from: st, to, action }); st = to; };

    if (ready) {
      const crossUp = fast[i - 1] <= slow[i - 1] && fast[i] > slow[i];
      const broken = fast[i] < slow[i];
      if (st >= 1) peak = Math.max(peak, c);
      switch (st) {
        case 0:
          if (cool > 0) cool--;
          else if (crossUp) { buy(BASE_QTY, '1차'); entry = c; peak = c; go(1, 'R1', `1차 매수 ${BASE_QTY}주`); }
          break;
        case 1:
          if (c <= entry * (1 - p.stop / 100)) { const q = qty; sell(q, '방어'); cool = COOLDOWN; go(6, 'R3', `보유 ${q}주 전량 매도`); }
          else if (c >= entry * (1 + p.confirm / 100) && fast[i] > fast[i - 1]) go(2, 'R2', '주문 없음 · 고점 추적 시작');
          break;
        case 2:
          if (broken) { const q = qty; sell(q, '청산'); go(5, 'R5', `보유 ${q}주 전량 매도`); }
          else if (c <= peak * (1 - p.pullback / 100) && c > slow[i]) { const q = Math.max(1, Math.round(BASE_QTY * p.add / 100)); buy(q, '2차'); entry2 = c; go(3, 'R4', `추가 매수 ${p.add}% (${q}주)`); }
          break;
        case 3:
          if (c <= entry2 * (1 - p.stop / 100)) { const q = qty; sell(q, '방어'); cool = COOLDOWN; go(6, 'R7', `보유 ${q}주 전량 매도`); }
          else if (c >= entry2 * (1 + p.take / 100)) { const q = Math.floor(qty / 2); sell(q, '부분'); go(4, 'R6', `보유의 50% (${q}주) 매도`); }
          break;
        case 4:
          if (c <= peak * (1 - p.pullback / 100) || broken) { const q = qty; sell(q, '청산'); go(5, 'R8', `잔량 ${q}주 전량 매도`); }
          break;
      }
    }
    per.push({ st, qty, avg, realized, pnl: realized + (qty ? (c - avg) * qty : 0) });
  }
  return { fast, slow, per, events, fills };
}

if (typeof module !== 'undefined') module.exports = { genBars, simulate, RULES };

/* ---------------- UI ---------------- */
if (typeof document !== 'undefined') {
  const $ = s => document.querySelector(s);
  const P = { fast: 5, slow: 20, confirm: 0.8, pullback: 0.4, add: 30, take: 1.0, stop: 1.0 };
  const LIMITS = { fast: [2, 30], slow: [5, 80], confirm: [0.1, 5], pullback: [0.2, 5], add: [5, 100], take: [0.2, 8], stop: [0.2, 5] };
  let seed = 2, bars, sim, cursor = 0, timer = null, speed = 2, lastLogged = -1;

  const tm = i => { const m = 570 + i; return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };
  const money = v => (v >= 0 ? '+' : '-') + '$' + Math.abs(v).toFixed(2);
  const ruleById = Object.fromEntries(RULES.map(r => [r.id, r]));

  function rebuild(keepCursor) {
    bars = genBars(seed);
    sim = simulate(bars, P);
    if (!keepCursor) cursor = P.slow + 2;
    $('#seed').textContent = '#' + seed;
    $('#scrub').max = N_BARS - 1;
    document.querySelectorAll('[data-show]').forEach(el => { el.textContent = P[el.dataset.show]; });
    lastLogged = -1;
    render();
  }

  /* chart */
  const cv = $('#chart'), ctx = cv.getContext('2d');
  function draw() {
    const dpr = window.devicePixelRatio || 1, W = cv.clientWidth, H = cv.clientHeight;
    if (cv.width !== W * dpr || cv.height !== H * dpr) { cv.width = W * dpr; cv.height = H * dpr; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const padR = 56, padB = 22, strip = 6, plotW = W - padR, plotH = H - padB - strip - 4;
    let lo = Infinity, hi = -Infinity;
    for (const b of bars) { lo = Math.min(lo, b.l); hi = Math.max(hi, b.h); }
    const pad = (hi - lo) * 0.16; lo -= pad; hi += pad;
    const step = plotW / N_BARS, x = i => i * step + step / 2, y = v => 12 + (plotH - 12) * (1 - (v - lo) / (hi - lo));

    // grid + axis
    ctx.font = '11px Pretendard, sans-serif'; ctx.textBaseline = 'middle';
    for (let k = 0; k <= 5; k++) {
      const v = lo + (hi - lo) * k / 5, yy = Math.round(y(v)) + 0.5;
      ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(plotW, yy); ctx.stroke();
      ctx.fillStyle = '#6b7487'; ctx.textAlign = 'left'; ctx.fillText(v.toFixed(2), plotW + 8, yy);
    }
    ctx.textAlign = 'center';
    for (let i = 30; i < N_BARS; i += 60) ctx.fillText(tm(i), x(i), H - padB / 2);

    // stage bands
    for (let i = 0; i <= cursor; i++) {
      const s = sim.per[i].st; if (!s) continue;
      ctx.fillStyle = STAGES[s].color + '1c'; ctx.fillRect(i * step, 0, step + 0.5, plotH);
    }
    for (let i = 0; i <= cursor; i++) { ctx.fillStyle = STAGES[sim.per[i].st].color; ctx.fillRect(i * step, plotH + 4, step + 0.5, strip); }

    // candles
    const bw = Math.max(1, step * 0.62);
    for (let i = 0; i <= cursor; i++) {
      const b = bars[i], up = b.c >= b.o;
      ctx.strokeStyle = ctx.fillStyle = up ? '#f04452' : '#3d8bfd';
      ctx.beginPath(); ctx.moveTo(x(i), y(b.h)); ctx.lineTo(x(i), y(b.l)); ctx.stroke();
      const top = y(Math.max(b.o, b.c)); ctx.fillRect(x(i) - bw / 2, top, bw, Math.max(1, y(Math.min(b.o, b.c)) - top));
    }
    // MAs
    const line = (arr, col, dash) => {
      ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.setLineDash(dash); ctx.beginPath();
      let started = false;
      for (let i = 0; i <= cursor; i++) { if (arr[i] == null) continue; started ? ctx.lineTo(x(i), y(arr[i])) : ctx.moveTo(x(i), y(arr[i])); started = true; }
      ctx.stroke(); ctx.setLineDash([]); ctx.lineWidth = 1;
    };
    line(sim.fast, 'rgba(255,255,255,0.85)', []);
    line(sim.slow, '#f59e0b', [5, 4]);

    // avg price line
    const cur = sim.per[cursor];
    if (cur.qty) {
      ctx.strokeStyle = 'rgba(167,139,250,0.7)'; ctx.setLineDash([2, 3]);
      ctx.beginPath(); ctx.moveTo(0, y(cur.avg)); ctx.lineTo(plotW, y(cur.avg)); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#a78bfa'; ctx.textAlign = 'right'; ctx.fillText('평단 ' + cur.avg.toFixed(2), plotW - 6, y(cur.avg) - 9);
    }
    // markers
    ctx.textAlign = 'center';
    const last = {}; // 가까운 체결 라벨이 겹치지 않게 층을 쌓음
    for (const f of sim.fills) {
      if (f.i > cursor) break;
      const buy = f.side === '매수', b = bars[f.i], xx = x(f.i);
      const yy = buy ? y(b.l) + 10 : y(b.h) - 10, col = buy ? '#2dd4bf' : f.label === '방어' ? '#fb7185' : '#fbbf24';
      ctx.fillStyle = col; ctx.beginPath();
      if (buy) { ctx.moveTo(xx, yy - 5); ctx.lineTo(xx - 5, yy + 3); ctx.lineTo(xx + 5, yy + 3); }
      else { ctx.moveTo(xx, yy + 5); ctx.lineTo(xx - 5, yy - 3); ctx.lineTo(xx + 5, yy - 3); }
      ctx.fill();
      const L = last[f.side] && x(f.i) - last[f.side].x < 34 ? last[f.side].lv + 1 : 0; last[f.side] = { x: x(f.i), lv: L };
      const ly = Math.min(plotH - 10, Math.max(10, buy ? yy + 14 + L * 18 : yy - 14 - L * 18)), tw = ctx.measureText(f.label).width + 8;
      ctx.fillStyle = 'rgba(12,16,24,0.85)'; ctx.fillRect(xx - tw / 2, ly - 8, tw, 16);
      ctx.fillStyle = col; ctx.fillText(f.label, xx, ly);
    }
    // last price tag
    const lc = bars[cursor].c, ly = y(lc);
    ctx.fillStyle = STAGES[cur.st].color; ctx.fillRect(plotW + 2, ly - 9, padR - 4, 18);
    ctx.fillStyle = '#0b0f17'; ctx.textAlign = 'left'; ctx.fillText(lc.toFixed(2), plotW + 8, ly);
  }

  /* panels */
  function render() {
    const cur = sim.per[cursor], evs = sim.events.filter(e => e.i <= cursor);
    draw();
    $('#scrub').value = cursor;
    $('#clock').textContent = `${tm(cursor)} · ${cursor + 1}/${N_BARS}봉`;
    const sc = STAGES[cur.st];
    $('#stageNow').textContent = `${cur.st}단계 · ${sc.name}`;
    $('#stageNow').style.setProperty('--c', sc.color);
    document.querySelectorAll('#legend [data-s]').forEach(el => el.classList.toggle('on', +el.dataset.s === cur.st));
    document.querySelectorAll('#rules tbody tr').forEach(tr => tr.classList.toggle('active', +tr.dataset.s === cur.st));

    // summary
    const pnl = $('#pnl'); pnl.textContent = money(cur.pnl); pnl.className = 'big ' + (cur.pnl >= 0 ? 'up' : 'down');
    $('#realized').textContent = money(cur.realized);
    $('#pos').textContent = cur.qty ? `${cur.qty}주 @ ${cur.avg.toFixed(2)}` : '없음';
    $('#trans').textContent = evs.length + '회';
    const fills = sim.fills.filter(f => f.i <= cursor);
    $('#fillCount').textContent = fills.length + '건';
    $('#fills').innerHTML = fills.length ? fills.slice().reverse().map(f =>
      `<li><span class="t">${tm(f.i)}</span><span class="sd ${f.side === '매수' ? 'b' : 's'}">${f.side}</span><span>${f.label}</span><span class="num">${f.q}주</span><span class="num">${f.price.toFixed(2)}</span></li>`).join('')
      : '<li class="empty">아직 체결 없음</li>';

    // checklist
    const counts = {}; evs.forEach(e => { counts[e.rule] = (counts[e.rule] || 0) + 1; });
    const done = RULES.filter(r => counts[r.id]).length;
    $('#checkScore').textContent = `${done}/${RULES.length}`;
    $('#checkBar').style.width = (done / RULES.length * 100) + '%';
    $('#checks').innerHTML = RULES.map(r => `<li class="${counts[r.id] ? 'ok' : ''}"><span class="box">${counts[r.id] ? '✓' : ''}</span><b>${r.id}</b><span class="desc">${STAGES[r.from].name} → ${STAGES[r.to].name}</span><span class="cnt">${counts[r.id] ? counts[r.id] + '회' : '미발동'}</span></li>`).join('');
    document.querySelectorAll('#rules [data-rule]').forEach(el => el.classList.toggle('fired', !!counts[el.dataset.rule]));

    // log
    const log = $('#log');
    log.innerHTML = evs.length ? evs.slice().reverse().map(e => {
      const r = ruleById[e.rule];
      return `<li class="${e.i === cursor && e.i !== lastLogged ? 'new' : ''}"><span class="t">${tm(e.i)}</span> <span class="st" style="--c:${STAGES[e.from].color}">[${e.from}단계]</span> 조건 '${r.txt(P)}' 충족 → <b>${e.action}</b> <span class="mock">(모의)</span> <span class="to" style="--c:${STAGES[e.to].color}">${STAGES[e.to].name}</span></li>`;
    }).join('') : '<li class="empty">재생을 누르면 판단 로그가 여기에 쌓입니다.</li>';
    lastLogged = cursor;
  }

  /* controls */
  function stop() { clearInterval(timer); timer = null; $('#play').textContent = '▶ 재생'; $('#play').classList.remove('on'); }
  function stepOnce() { if (cursor >= N_BARS - 1) { stop(); return; } cursor++; render(); }
  $('#play').onclick = () => {
    if (timer) return stop();
    if (cursor >= N_BARS - 1) cursor = P.slow + 2;
    $('#play').textContent = '⏸ 일시정지'; $('#play').classList.add('on');
    timer = setInterval(() => { for (let k = 0; k < speed; k++) stepOnce(); }, 110);
  };
  $('#step').onclick = () => { stop(); stepOnce(); };
  $('#reset').onclick = () => { stop(); cursor = P.slow + 2; render(); };
  $('#speed').onchange = e => { speed = +e.target.value; };
  $('#reseed').onclick = () => { stop(); seed = 1 + Math.floor(Math.random() * 9999); rebuild(false); };
  $('#scrub').oninput = e => { stop(); cursor = +e.target.value; render(); };

  document.querySelectorAll('#rules input[data-p]').forEach(inp => {
    inp.addEventListener('change', () => {
      const k = inp.dataset.p, [mn, mx] = LIMITS[k];
      let v = parseFloat(inp.value);
      if (!isFinite(v)) v = P[k];
      v = Math.min(mx, Math.max(mn, v));
      if (k === 'fast' || k === 'slow' || k === 'add') v = Math.round(v);
      if (k === 'fast' && v >= P.slow) v = P.slow - 1;
      if (k === 'slow' && v <= P.fast) v = P.fast + 1;
      inp.value = P[k] = v;
      inp.closest('td').classList.remove('flash'); void inp.offsetWidth; inp.closest('td').classList.add('flash');
      rebuild(true);
      const t = $('#toast'); t.textContent = `설정값 변경 → 같은 시세로 처음부터 다시 계산했습니다 (규칙 발동 ${sim.events.length}회)`;
      t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2600);
    });
  });

  new ResizeObserver(draw).observe(cv);
  document.fonts && document.fonts.ready.then(draw);
  rebuild(false);
}

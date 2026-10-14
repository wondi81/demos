// 레벨·EXP 정책 정의서 샘플 — 모든 수치는 예시
const MAX_LV = 50;
const SOURCES = [
  { id: 'attend', label: '출석(접속일)', val: 10, max: 50, c: 'var(--c5)' },
  { id: 'pick', label: '픽 참여', val: 5, max: 30, c: 'var(--c1)' },
  { id: 'hit', label: '픽 적중 보너스', val: 15, max: 60, c: 'var(--c4)' },
  { id: 'post', label: '분석글 작성', val: 20, max: 80, c: 'var(--c2)' },
  { id: 'comment', label: '댓글', val: 3, max: 20, c: 'var(--c3)' },
  { id: 'like', label: '받은 공감', val: 1, max: 10, c: '#9aa39b' },
];
const ACTS = [
  { id: 'days', label: '주 접속일', min: 1, max: 7, step: 1, unit: '일' },
  { id: 'picks', label: '접속일당 픽 참여', min: 0, max: 30, step: 1, unit: '회' },
  { id: 'rate', label: '적중률', min: 0, max: 100, step: 1, unit: '%' },
  { id: 'posts', label: '접속일당 분석글', min: 0, max: 3, step: 0.1, unit: '개' },
  { id: 'comments', label: '접속일당 댓글', min: 0, max: 30, step: 1, unit: '개' },
  { id: 'likes', label: '접속일당 받은 공감', min: 0, max: 50, step: 1, unit: '개' },
];
const PERSONAS = {
  light: { days: 3, picks: 3, rate: 45, posts: 0, comments: 2, likes: 1 },
  normal: { days: 5, picks: 6, rate: 50, posts: 0.3, comments: 5, likes: 4 },
  heavy: { days: 7, picks: 15, rate: 55, posts: 1, comments: 15, likes: 15 },
};
const P_LABEL = { light: '가벼운', normal: '일반', heavy: '헤비' };
const CURVE = [
  { id: 'base', label: '기본 필요 EXP', min: 20, max: 200, step: 5, unit: '', val: 40 },
  { id: 'growth', label: '증가 계수(지수)', min: 1, max: 2.5, step: 0.05, unit: '', val: 1.5 },
  { id: 'cap', label: '하루 EXP 상한', min: 100, max: 1000, step: 10, unit: '', val: 300 },
];
const TIERS = [
  { name: '브론즈', lv: 1, color: '#a47551', cond: '가입 즉시', reward: '기본 프로필 배지' },
  { name: '실버', lv: 10, color: '#9fa6ad', cond: '최근 30일 픽 참여 10회 이상', reward: '전문가 픽 열람권 월 1장 · 닉네임 색' },
  { name: '골드', lv: 20, color: '#c9a23a', cond: '최근 30일 픽 참여 30회 이상', reward: '열람권 월 2장 · 프로필 테두리' },
  { name: '플래티넘', lv: 30, color: '#4a8fbf', cond: '최근 30일 픽 참여 50회 + 분석글 3개', reward: '열람권 월 4장 · 분석글 상단 노출 1회' },
  { name: '다이아', lv: 40, color: '#5b6fd6', cond: '최근 30일 픽 참여 80회 + 분석글 5개', reward: '열람권 월 6장 · 전문가 픽 선공개 알림' },
  { name: '마스터', lv: 50, color: '#1c1e1b', cond: '시즌 랭킹 상위 + 운영 검토', reward: '열람권 월 8장 · 시즌 한정 배지' },
];

const exp = Object.fromEntries(SOURCES.map(s => [s.id, s.val]));
const curve = Object.fromEntries(CURVE.map(c => [c.id, c.val]));
const acts = JSON.parse(JSON.stringify(PERSONAS));
let persona = 'normal';
const $ = id => document.getElementById(id);
const fmt = n => Math.round(n).toLocaleString();

function slider(parent, o, value, onInput, dot) {
  const id = 's_' + o.id;
  const d = document.createElement('div');
  d.className = 'sl';
  d.innerHTML = `<label for="${id}">${dot ? `<span class="dot" style="background:${dot}"></span>` : ''}${o.label}</label><output for="${id}"></output><input type="range" id="${id}" min="${o.min ?? 0}" max="${o.max}" step="${o.step ?? 1}" value="${value}">`;
  const inp = d.querySelector('input'), out = d.querySelector('output');
  const show = () => (out.textContent = (+inp.value).toLocaleString() + (o.unit ?? ' EXP'));
  inp.addEventListener('input', () => { onInput(+inp.value); show(); update(); });
  show();
  parent.appendChild(d);
  return inp;
}

// 레벨 L → L+1 필요 EXP
const need = L => Math.round(curve.base * Math.pow(L, curve.growth));
function cumulative() {
  const cum = [0, 0];
  for (let L = 1; L < MAX_LV; L++) cum[L + 1] = cum[L] + need(L);
  return cum;
}
function daily(a) {
  const parts = {
    attend: exp.attend, pick: a.picks * exp.pick, hit: a.picks * (a.rate / 100) * exp.hit,
    post: a.posts * exp.post, comment: a.comments * exp.comment, like: a.likes * exp.like,
  };
  const raw = Object.values(parts).reduce((s, v) => s + v, 0);
  const perActive = Math.min(curve.cap, raw);
  return { parts, raw, perActive, perDay: (perActive * a.days) / 7 };
}
const daysTo = (cum, L, perDay) => (perDay > 0 ? Math.ceil(cum[L] / perDay) : Infinity);
const dayTxt = d => (d === Infinity ? '도달 불가' : d >= 365 ? `${(d / 365).toFixed(1)}년` : `${fmt(d)}일`);

function update() {
  const cum = cumulative();
  const dl = daily(acts[persona]);
  $('kDaily').textContent = fmt(dl.perDay);
  $('kL10').textContent = dayTxt(daysTo(cum, 10, dl.perDay));
  $('kL30').textContent = dayTxt(daysTo(cum, 30, dl.perDay));
  $('kMax').textContent = dayTxt(daysTo(cum, MAX_LV, dl.perDay));

  // EXP 구성
  const total = dl.raw || 1;
  $('shareBar').innerHTML = SOURCES.map(s => `<i style="width:${(dl.parts[s.id] / total) * 100}%;background:${s.c}" title="${s.label}"></i>`).join('');
  $('shareLegend').innerHTML = SOURCES.map(s => `<span style="--c:${s.c}">${s.label} ${Math.round((dl.parts[s.id] / total) * 100)}%</span>`).join('');
  const hitShare = dl.parts.hit / total;
  const w = $('shareWarn');
  const msgs = [];
  if (hitShare > 0.4) msgs.push(`적중 보상이 하루 EXP의 ${Math.round(hitShare * 100)}%입니다. 결과만 쫓는 구조가 되지 않도록 40% 이하를 권장합니다.`);
  if (dl.raw > curve.cap) msgs.push(`하루 상한(${fmt(curve.cap)})에 걸려 ${fmt(dl.raw - curve.cap)} EXP가 버려집니다.`);
  w.hidden = !msgs.length; w.textContent = msgs.join(' ');

  drawChart(cum);

  const rows = [5, 10, 15, 20, 30, 40, 50];
  $('lvTable').innerHTML = `<thead><tr><th scope="col">레벨</th><th scope="col">직전 구간 필요 EXP</th><th scope="col">누적 EXP</th>${Object.keys(PERSONAS).map(p => `<th scope="col">${P_LABEL[p]} 유저</th>`).join('')}</tr></thead><tbody>` +
    rows.map(L => `<tr><th scope="row">Lv.${L}</th><td>${fmt(need(L - 1))}</td><td>${fmt(cum[L])}</td>${Object.keys(PERSONAS).map(p => `<td>${dayTxt(daysTo(cum, L, daily(acts[p]).perDay))}</td>`).join('')}</tr>`).join('') + '</tbody>';

  $('tierTable').innerHTML = `<thead><tr><th scope="col">티어</th><th scope="col">레벨</th><th scope="col">승급 조건 (레벨 외)</th><th scope="col">자동 보상</th><th scope="col">${P_LABEL[persona]} 유저 도달</th></tr></thead><tbody>` +
    TIERS.map((t, i) => `<tr><th scope="row"><span class="tier-dot" style="background:${t.color}"></span>${t.name}</th><td>Lv.${t.lv}${TIERS[i + 1] ? '~' + (TIERS[i + 1].lv - 1) : ''}</td><td>${t.cond}</td><td>${t.reward}</td><td>${t.lv === 1 ? '-' : dayTxt(daysTo(cum, t.lv, dl.perDay))}</td></tr>`).join('') + '</tbody>';
  syncXp();
}

function drawChart(cum) {
  const W = 640, H = 300, L = 48, R = 16, T = 14, B = 34;
  const series = Object.keys(PERSONAS).map(p => ({ p, per: daily(acts[p]).perDay }));
  const maxDays = Math.max(30, ...series.filter(s => s.per > 0).map(s => Math.min(daysTo(cum, MAX_LV, s.per), 3650)));
  const x = lv => L + ((lv - 1) / (MAX_LV - 1)) * (W - L - R);
  const y = d => H - B - (Math.min(d, maxDays) / maxDays) * (H - T - B);
  let svg = '';
  TIERS.forEach((t, i) => {
    const x0 = x(t.lv), x1 = TIERS[i + 1] ? x(TIERS[i + 1].lv) : W - R;
    svg += `<rect x="${x0}" y="${T}" width="${x1 - x0}" height="${H - T - B}" fill="${t.color}" opacity="${i % 2 ? 0.07 : 0.03}"/>`;
    svg += `<text x="${x0 + 3}" y="${T + 12}">${t.name}</text>`;
  });
  for (let k = 0; k <= 4; k++) {
    const d = (maxDays / 4) * k;
    svg += `<line x1="${L}" x2="${W - R}" y1="${y(d)}" y2="${y(d)}" stroke="#e3e1da"/><text x="${L - 6}" y="${y(d) + 4}" text-anchor="end">${dayTxt(Math.round(d))}</text>`;
  }
  [1, 10, 20, 30, 40, 50].forEach(lv => (svg += `<text x="${x(lv)}" y="${H - B + 16}" text-anchor="middle">Lv.${lv}</text>`));
  const colors = { light: '#9fa6ad', normal: '#1e6b4c', heavy: '#c9a23a' };
  series.forEach(s => {
    if (!(s.per > 0)) return;
    const pts = [];
    for (let lv = 1; lv <= MAX_LV; lv++) pts.push(`${x(lv).toFixed(1)},${y(daysTo(cum, lv, s.per)).toFixed(1)}`);
    const on = s.p === persona;
    svg += `<polyline points="${pts.join(' ')}" fill="none" stroke="${colors[s.p]}" stroke-width="${on ? 3 : 1.5}" ${on ? '' : 'stroke-dasharray="4 4"'}/>`;
  });
  svg += `<text x="${W - R}" y="${H - 4}" text-anchor="end">— 선택 유형 / 점선: 다른 유형 (가벼운=회색, 일반=초록, 헤비=황색)</text>`;
  $('chart').innerHTML = svg;
}

// ---------- 슬라이더 ----------
SOURCES.forEach(s => slider($('expSliders'), s, exp[s.id], v => (exp[s.id] = v), s.c));
let actInputs = {};
function buildActs() {
  $('actSliders').innerHTML = '';
  actInputs = {};
  ACTS.forEach(a => (actInputs[a.id] = slider($('actSliders'), a, acts[persona][a.id], v => (acts[persona][a.id] = v))));
}
CURVE.forEach(c => slider($('curveSliders'), c, curve[c.id], v => (curve[c.id] = v)));
document.querySelectorAll('.seg').forEach(b => b.addEventListener('click', () => {
  persona = b.dataset.p;
  document.querySelectorAll('.seg').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); });
  buildActs(); update();
}));
document.querySelectorAll('.seg').forEach(x => x.setAttribute('aria-pressed', x.classList.contains('on')));

// ---------- 와이어프레임: 경험치 바 ----------
const xp = { lv: 14, cur: 0 };
xp.cur = Math.round(need(14) * 0.9);
const tierOf = lv => [...TIERS].reverse().find(t => lv >= t.lv);
function syncXp() {
  const n = need(xp.lv);
  if (xp.cur >= n) xp.cur = n - 1;
  $('xpLv').textContent = `Lv.${xp.lv}`;
  $('xpNum').textContent = `${fmt(xp.cur)} / ${fmt(n)} EXP`;
  $('xpFill').style.width = (xp.cur / n) * 100 + '%';
  const t = tierOf(xp.lv);
  $('wTier').textContent = `${t.name} · Lv.${xp.lv}`;
  $('wAvatar').style.borderColor = t.color;
}
let lvTimer;
document.querySelectorAll('.wbtn').forEach(b => b.addEventListener('click', () => {
  const k = b.dataset.xp;
  const gain = k === 'pick' ? exp.pick : k === 'hit' ? exp.pick + exp.hit : exp.post;
  const label = k === 'pick' ? '픽 참여' : k === 'hit' ? '픽 적중' : '분석글';
  xp.cur += gain * 10; // 데모용: 한 번에 10회분
  $('xpLog').textContent = `${label} ×10 · +${fmt(gain * 10)} EXP`;
  let ups = [];
  while (xp.lv < MAX_LV && xp.cur >= need(xp.lv)) {
    const before = tierOf(xp.lv);
    xp.cur -= need(xp.lv); xp.lv++;
    const after = tierOf(xp.lv);
    ups.push(after !== before ? `${after.name} 승급 · ${after.reward}` : `Lv.${xp.lv} 배지 지급`);
  }
  if (ups.length) {
    $('lvupTxt').textContent = ups[ups.length - 1];
    $('lvup').hidden = false;
    clearTimeout(lvTimer);
    lvTimer = setTimeout(() => ($('lvup').hidden = true), 2600);
  }
  syncXp();
}));

// ---------- 와이어프레임: 랭킹 ----------
function renderRank(tab) {
  const seed = { week: 3, season: 7, friend: 11 }[tab];
  const base = { week: 2400, season: 61000, friend: 1900 }[tab];
  $('wRank').innerHTML = Array.from({ length: 7 }, (_, i) =>
    `<li><span class="r">${i + 1}</span><span class="av"></span><span class="nm" style="width:${50 + ((i * seed) % 5) * 9}%"></span><span class="sc">${fmt(base * (1 - i * 0.07))}</span></li>`).join('');
  $('wMe').innerHTML = `<span>내 순위 ${{ week: '128위', season: '1,042위', friend: '4위' }[tab]}</span><span>${fmt({ week: 860, season: 14200, friend: 1100 }[tab])} EXP</span>`;
}
document.querySelectorAll('.wt').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('.wt').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-selected', x === b); });
  renderRank(b.dataset.r);
}));

buildActs();
renderRank('week');
update();
